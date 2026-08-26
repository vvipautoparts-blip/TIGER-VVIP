'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function digest(value) { const v = text(value).toLowerCase(); return DIGEST_RE.test(v) ? v : null; }
function sha(value) { const v = text(value).toLowerCase(); return SHA_RE.test(v) ? v : null; }
function freezeDeep(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); for (const child of Object.values(value)) freezeDeep(child); return value; }
function sha256(value) { return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`; }

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('supply chain policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('supply chain policy must be TSN-26 fail-closed');
  if (!Array.isArray(policy.allowed_sbom) || policy.allowed_sbom.length === 0) throw new Error('allowed SBOM formats are required');
  return policy;
}

function verifySupplyChainEvidence(input, { policy: rawPolicy, evaluatedAt = new Date() } = {}) {
  const policy = validatePolicy(rawPolicy);
  if (!(evaluatedAt instanceof Date) || !Number.isFinite(evaluatedAt.getTime())) throw new Error('trusted evaluation time is required');
  const evidence = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const failures = [];

  const repository = text(evidence.repository);
  const sourceSha = sha(evidence.source_sha);
  const artifact = evidence.artifact && typeof evidence.artifact === 'object' ? evidence.artifact : {};
  const artifactName = text(artifact.name);
  const artifactDigest = digest(artifact.digest);
  if (repository !== policy.repository) failures.push('REPOSITORY_MISMATCH');
  if (!sourceSha) failures.push('SOURCE_SHA_INVALID');
  if (!artifactName) failures.push('ARTIFACT_NAME_REQUIRED');
  if (!artifactDigest) failures.push('ARTIFACT_DIGEST_INVALID');

  const provenance = evidence.provenance && typeof evidence.provenance === 'object' ? evidence.provenance : {};
  const provenanceDigest = digest(provenance.digest);
  const provenanceSubjectDigest = digest(provenance.subject_digest);
  const provenanceSourceSha = sha(provenance.source_sha);
  const provenanceRef = text(provenance.attestation_ref);
  if (provenance.verified !== true) failures.push('PROVENANCE_NOT_VERIFIED');
  if (text(provenance.predicate_type) !== policy.slsa_predicate_type) failures.push('SLSA_PREDICATE_TYPE_MISMATCH');
  if (text(provenance.slsa_version) !== policy.slsa_version) failures.push('SLSA_VERSION_MISMATCH');
  if (!provenanceRef) failures.push('PROVENANCE_REF_INVALID');
  if (!provenanceDigest) failures.push('PROVENANCE_DIGEST_INVALID');
  if (!provenanceSubjectDigest || (artifactDigest && provenanceSubjectDigest !== artifactDigest)) failures.push('PROVENANCE_ARTIFACT_DIGEST_MISMATCH');
  if (!provenanceSourceSha || (sourceSha && provenanceSourceSha !== sourceSha)) failures.push('PROVENANCE_SOURCE_SHA_MISMATCH');
  if (!text(provenance.builder_identity)) failures.push('PROVENANCE_BUILDER_IDENTITY_REQUIRED');

  const sbom = evidence.sbom && typeof evidence.sbom === 'object' ? evidence.sbom : {};
  const sbomDigest = digest(sbom.digest);
  const sbomArtifactDigest = digest(sbom.artifact_digest);
  const sbomRef = text(sbom.attestation_ref);
  const sbomAllowed = policy.allowed_sbom.some((item) => item.format === text(sbom.format) && item.spec_version === text(sbom.spec_version));
  if (sbom.verified !== true) failures.push('SBOM_NOT_VERIFIED');
  if (!sbomAllowed) failures.push('SBOM_SPEC_VERSION_NOT_ALLOWED');
  if (!sbomRef) failures.push('SBOM_REF_INVALID');
  if (!sbomDigest) failures.push('SBOM_DIGEST_INVALID');
  if (!sbomArtifactDigest || (artifactDigest && sbomArtifactDigest !== artifactDigest)) failures.push('SBOM_ARTIFACT_DIGEST_MISMATCH');

  const sigstore = evidence.sigstore && typeof evidence.sigstore === 'object' ? evidence.sigstore : {};
  const bundleRef = text(sigstore.bundle_ref);
  const bundleDigest = digest(sigstore.bundle_digest);
  if (sigstore.verified !== true) failures.push('SIGSTORE_NOT_VERIFIED');
  if (policy.sigstore.certificate_identity_required && sigstore.certificate_identity_verified !== true) failures.push('SIGSTORE_CERTIFICATE_IDENTITY_NOT_VERIFIED');
  if (policy.sigstore.trusted_root_required && sigstore.trusted_root_verified !== true) failures.push('SIGSTORE_TRUSTED_ROOT_NOT_VERIFIED');
  if (policy.sigstore.transparency_inclusion_required && sigstore.transparency_inclusion_verified !== true) failures.push('SIGSTORE_TRANSPARENCY_INCLUSION_NOT_VERIFIED');
  if (text(sigstore.transparency_log) !== policy.sigstore.transparency_log) failures.push('SIGSTORE_TRANSPARENCY_LOG_MISMATCH');
  if (!bundleRef) failures.push('SIGSTORE_BUNDLE_REF_INVALID');
  if (!bundleDigest) failures.push('SIGSTORE_BUNDLE_DIGEST_INVALID');

  const uniqueFailures = [...new Set(failures)].sort();
  const payload = {
    proof_version: 'TIGER_SUPPLY_CHAIN_PROOF_V1',
    policy_id: policy.policy_id,
    reference: 'TSN-26',
    evaluated_at: evaluatedAt.toISOString(),
    repository: repository || null,
    source_sha: sourceSha,
    artifact_name: artifactName || null,
    artifact_digest: artifactDigest,
    slsa_version: text(provenance.slsa_version) || null,
    slsa_predicate_type: text(provenance.predicate_type) || null,
    provenance_ref: provenanceRef || null,
    provenance_digest: provenanceDigest,
    sbom_format: text(sbom.format) || null,
    sbom_spec_version: text(sbom.spec_version) || null,
    sbom_ref: sbomRef || null,
    sbom_digest: sbomDigest,
    sigstore_bundle_ref: bundleRef || null,
    sigstore_bundle_digest: bundleDigest,
    certificate_identity_verified: sigstore.certificate_identity_verified === true,
    trusted_root_verified: sigstore.trusted_root_verified === true,
    transparency_inclusion_verified: sigstore.transparency_inclusion_verified === true,
    failures: uniqueFailures,
    status: uniqueFailures.length === 0 ? 'PASS' : 'FAIL',
  };
  const proofDigest = sha256(payload);
  return freezeDeep({ ...payload, ref: sourceSha ? `proof://supply-chain/${sourceSha}` : null, digest: proofDigest });
}

module.exports = Object.freeze({ verifySupplyChainEvidence, validatePolicy });
