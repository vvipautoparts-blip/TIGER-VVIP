'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const PASSPORT_VERSION = 'TIGER_SOVEREIGN_RELEASE_PASSPORT_V1';
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const PROMOTABLE_COMPARE_STATUSES = new Set(['ahead', 'identical']);

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('release passport policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('release passport policy must be TSN-26 fail-closed');
  if (policy.promotion_target_branch !== 'main') throw new Error('release passport promotion target must be main');
  if (policy.production_activation_allowed !== false) throw new Error('release passport may not authorize production activation');
  if (policy.proofs_must_bind_source_sha !== true) throw new Error('release passport proofs must bind exact source sha');
  if (policy.require_current_base_ancestry !== true) throw new Error('release passport must require current target-base ancestry');
  if (!policy.required_proofs || typeof policy.required_proofs !== 'object' || Array.isArray(policy.required_proofs)) throw new Error('release passport required proofs are missing');
  if (!Object.hasOwn(policy.required_proofs, 'repository_governance')) throw new Error('release passport repository governance proof is required');
  return policy;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRef(value, label, failures) {
  const normalized = text(value);
  if (!normalized) failures.push(`${label}_REF_INVALID`);
  return normalized || null;
}

function normalizeDigest(value, label, failures) {
  const normalized = text(value).toLowerCase();
  if (!DIGEST_RE.test(normalized)) failures.push(`${label}_DIGEST_INVALID`);
  return DIGEST_RE.test(normalized) ? normalized : null;
}

function normalizeSha(value, label, failures) {
  const normalized = text(value).toLowerCase();
  if (!SHA_RE.test(normalized)) failures.push(`${label}_SHA_INVALID`);
  return SHA_RE.test(normalized) ? normalized : null;
}

function normalizeCounter(value, label, failures) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failures.push(`${label}_INVALID`);
    return null;
  }
  return value;
}

function normalizeInstant(value, label, failures) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    failures.push(`${label}_TIME_INVALID`);
    return null;
  }
  return date;
}

function assessSource(raw, policy, failures) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const repository = text(source.repository);
  const branch = text(source.branch);
  const baseBranch = text(source.base_branch);
  const compareStatus = text(source.compare_status).toLowerCase();
  const localFailuresBefore = failures.length;

  if (repository !== policy.expected_repository) failures.push('SOURCE_REPOSITORY_MISMATCH');
  if (!branch) failures.push('SOURCE_BRANCH_REQUIRED');
  if (baseBranch !== policy.promotion_target_branch) failures.push('SOURCE_BASE_BRANCH_MISMATCH');
  if (branch && branch === baseBranch) failures.push('SOURCE_BRANCH_MUST_DIFFER_FROM_TARGET');

  const commitSha = normalizeSha(source.commit_sha, 'SOURCE_COMMIT', failures);
  const treeSha = normalizeSha(source.tree_sha, 'SOURCE_TREE', failures);
  const baseSha = normalizeSha(source.base_sha, 'SOURCE_BASE', failures);
  const mergeBaseSha = normalizeSha(source.merge_base_sha, 'SOURCE_MERGE_BASE', failures);
  const aheadBy = normalizeCounter(source.ahead_by, 'SOURCE_AHEAD_BY', failures);
  const behindBy = normalizeCounter(source.behind_by, 'SOURCE_BEHIND_BY', failures);

  if (!PROMOTABLE_COMPARE_STATUSES.has(compareStatus)) {
    failures.push(`SOURCE_COMPARE_STATUS_BLOCKED:${compareStatus || 'missing'}`);
  }
  if (behindBy !== null && behindBy > 0) failures.push('SOURCE_BEHIND_TARGET');
  if (baseSha && mergeBaseSha && baseSha !== mergeBaseSha) failures.push('SOURCE_BASE_ANCESTRY_MISMATCH');

  if (compareStatus === 'ahead' && aheadBy !== null && aheadBy === 0) {
    failures.push('SOURCE_COMPARE_COUNTS_INCONSISTENT');
  }
  if (compareStatus === 'identical' && ((aheadBy !== null && aheadBy !== 0) || (behindBy !== null && behindBy !== 0))) {
    failures.push('SOURCE_COMPARE_COUNTS_INCONSISTENT');
  }

  return {
    value: {
      repository: repository || null,
      branch: branch || null,
      commit_sha: commitSha,
      tree_sha: treeSha,
      base_branch: baseBranch || null,
      base_sha: baseSha,
      merge_base_sha: mergeBaseSha,
      compare_status: compareStatus || null,
      ahead_by: aheadBy,
      behind_by: behindBy,
    },
    exact: failures.length === localFailuresBefore,
  };
}

function assessConstitution(raw, policy, failures) {
  const constitution = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const id = text(constitution.id);
  const signingPolicyId = text(constitution.signing_policy_id);
  if (id !== policy.required_constitution_id) failures.push('CONSTITUTION_ID_MISMATCH');
  if (!signingPolicyId) failures.push('CONSTITUTION_SIGNING_POLICY_REQUIRED');
  return {
    id: id || null,
    digest: normalizeDigest(constitution.digest, 'CONSTITUTION', failures),
    signing_policy_id: signingPolicyId || null,
  };
}

function assessSupplyChain(raw, policy, failures) {
  const supply = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const slsaVersion = text(supply.slsa_version);
  if (slsaVersion !== policy.required_slsa_version) failures.push('SLSA_VERSION_MISMATCH');

  const normalized = {
    slsa_version: slsaVersion || null,
    provenance_ref: normalizeRef(supply.provenance_ref, 'PROVENANCE', failures),
    provenance_digest: normalizeDigest(supply.provenance_digest, 'PROVENANCE', failures),
    sbom_ref: normalizeRef(supply.sbom_ref, 'SBOM', failures),
    sbom_digest: normalizeDigest(supply.sbom_digest, 'SBOM', failures),
    signature_transparency_ref: normalizeRef(supply.signature_transparency_ref, 'SIGNATURE_TRANSPARENCY', failures),
    signature_transparency_digest: normalizeDigest(supply.signature_transparency_digest, 'SIGNATURE_TRANSPARENCY', failures),
    artifact_ref: normalizeRef(supply.artifact_ref, 'ARTIFACT', failures),
    artifact_digest: normalizeDigest(supply.artifact_digest, 'ARTIFACT', failures),
  };

  if (policy.provenance_required !== true) failures.push('POLICY_PROVENANCE_REQUIREMENT_INVALID');
  if (policy.sbom_required !== true) failures.push('POLICY_SBOM_REQUIREMENT_INVALID');
  if (policy.signature_transparency_required !== true) failures.push('POLICY_SIGNATURE_TRANSPARENCY_REQUIREMENT_INVALID');
  return normalized;
}

function assessProofs(raw, policy, expectedSourceSha, now, failures) {
  const proofs = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = {};

  for (const name of Object.keys(policy.required_proofs).sort()) {
    const rule = policy.required_proofs[name];
    const proof = proofs[name];
    if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
      failures.push(`PROOF_MISSING:${name}`);
      normalized[name] = { status: 'MISSING', ref: null, as_of: null, digest: null, source_sha: null };
      continue;
    }

    const status = text(proof.status);
    const ref = text(proof.ref);
    const digest = text(proof.digest).toLowerCase();
    const sourceSha = text(proof.source_sha).toLowerCase();
    const sourceShaValid = SHA_RE.test(sourceSha);
    const asOf = new Date(proof.as_of);

    if (status !== 'PASS') failures.push(`PROOF_FAILED:${name}`);
    if (!ref) failures.push(`PROOF_REF_INVALID:${name}`);
    if (!DIGEST_RE.test(digest)) failures.push(`PROOF_DIGEST_INVALID:${name}`);
    if (!sourceShaValid) failures.push(`PROOF_SOURCE_SHA_INVALID:${name}`);
    else if (expectedSourceSha && sourceSha !== expectedSourceSha) failures.push(`PROOF_SOURCE_SHA_MISMATCH:${name}`);

    if (!Number.isFinite(asOf.getTime())) {
      failures.push(`PROOF_TIME_INVALID:${name}`);
    } else {
      const ageMs = now.getTime() - asOf.getTime();
      if (ageMs < 0) failures.push(`PROOF_FROM_FUTURE:${name}`);
      else if (!Number.isInteger(rule.max_age_seconds) || rule.max_age_seconds <= 0 || ageMs > rule.max_age_seconds * 1000) failures.push(`PROOF_STALE:${name}`);
    }

    normalized[name] = {
      status: status || 'UNKNOWN',
      ref: ref || null,
      as_of: Number.isFinite(asOf.getTime()) ? asOf.toISOString() : null,
      digest: DIGEST_RE.test(digest) ? digest : null,
      source_sha: sourceShaValid ? sourceSha : null,
    };
  }
  return normalized;
}

function generateReleasePassport(input, { policy: rawPolicy, now = new Date() } = {}) {
  const policy = validatePolicy(rawPolicy);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('trusted current time is required');
  const sourceInput = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const failures = [];

  const generatedAt = normalizeInstant(sourceInput.generated_at, 'PASSPORT_GENERATED_AT', failures);
  if (generatedAt && generatedAt > now) failures.push('PASSPORT_FROM_FUTURE');

  const source = assessSource(sourceInput.source, policy, failures);
  const constitution = assessConstitution(sourceInput.constitution, policy, failures);
  const supplyChain = assessSupplyChain(sourceInput.supply_chain, policy, failures);
  const proofs = assessProofs(sourceInput.proofs, policy, source.value.commit_sha, now, failures);

  const uniqueFailures = [...new Set(failures)].sort();
  const ready = uniqueFailures.length === 0;
  const payload = {
    passport_version: PASSPORT_VERSION,
    policy_id: policy.policy_id,
    reference: 'TSN-26',
    generated_at: generatedAt ? generatedAt.toISOString() : null,
    target_branch: policy.promotion_target_branch,
    proof_source_binding: 'EXACT_COMMIT',
    target_base_binding: 'EXACT_CURRENT_ANCESTRY',
    source: source.value,
    source_identity_exact: source.exact,
    constitution,
    supply_chain: supplyChain,
    proofs,
    failures: uniqueFailures,
    status: ready ? 'READY_FOR_CONTROLLED_PROMOTION' : 'BLOCKED',
    promotion_allowed: ready,
    merge_performed: false,
    production_activation_allowed: false,
  };
  const passportDigest = sha256(payload);
  return freezeDeep({
    ...payload,
    passport_id: `TRP-${passportDigest.slice('sha256:'.length, 'sha256:'.length + 16)}`,
    passport_digest: passportDigest,
  });
}

module.exports = Object.freeze({
  PASSPORT_VERSION,
  generateReleasePassport,
  validatePolicy,
});
