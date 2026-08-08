'use strict';

const {
  EvidenceError,
  CAPSULE_FIELDS,
  canonicalJson,
  assertSha40,
  assertSha256,
  assertIsoUtc,
  assertAllowedCapsuleEnvironment,
  assertNoForbiddenShape,
  deepFreeze,
} = require('./contracts.cjs');
const { computeReleaseDigest } = require('./release-dna.cjs');

const TRUSTED_FIELDS = new Set(['workflow_run_id', 'runner_identity']);
const PROOF_FIELDS = new Set(CAPSULE_FIELDS.filter((field) => !TRUSTED_FIELDS.has(field)));
const PASS_FACTS = new Set(['PASS', 'TRUE', 'NOT_APPLICABLE']);
const BLOCKED_FACTS = new Set(['PASS', 'BLOCKED', 'TRUE', 'NOT_APPLICABLE']);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertBoundedString(value, code, message, maxLength, pattern = null) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    (pattern && !pattern.test(value))
  ) {
    fail(code, message);
  }
  return value;
}

function assertTrustedContext(trustedContext) {
  if (!isPlainObject(trustedContext)) {
    fail('EVIDENCE_TRUSTED_CONTEXT_INVALID', 'Trusted CI context is invalid.');
  }
  const keys = Object.keys(trustedContext).sort();
  if (canonicalJson(keys) !== canonicalJson(['runner_identity', 'workflow_run_id'])) {
    fail('EVIDENCE_TRUSTED_CONTEXT_INVALID', 'Trusted CI context fields are invalid.');
  }
  assertBoundedString(
    trustedContext.workflow_run_id,
    'EVIDENCE_TRUSTED_CONTEXT_INVALID',
    'Trusted workflow run identity is invalid.',
    30,
    /^\d+$/,
  );
  assertBoundedString(
    trustedContext.runner_identity,
    'EVIDENCE_TRUSTED_CONTEXT_INVALID',
    'Trusted runner identity is invalid.',
    160,
    /^[A-Za-z0-9][A-Za-z0-9:._/-]*$/,
  );
}

function assertProofShape(proof) {
  if (!isPlainObject(proof)) {
    fail('EVIDENCE_PROOF_INVALID', 'Proof payload is invalid.');
  }

  for (const field of TRUSTED_FIELDS) {
    if (Object.hasOwn(proof, field)) {
      fail('EVIDENCE_TRUSTED_FIELD_FORGED', 'Trusted CI identity cannot be supplied by proof payload.');
    }
  }

  for (const key of Object.keys(proof)) {
    if (!PROOF_FIELDS.has(key)) {
      fail('EVIDENCE_UNKNOWN_FIELD', 'Proof payload contains an unknown field.');
    }
  }

  for (const field of PROOF_FIELDS) {
    if (!Object.hasOwn(proof, field)) {
      fail('EVIDENCE_REQUIRED_FIELD_MISSING', 'Proof payload is missing a required field.');
    }
  }

  assertNoForbiddenShape(proof);
}

function assertTimestamps(proof, nowMs, maxAgeMs, futureSkewMs) {
  for (const field of ['started_at', 'completed_at', 'generated_at']) {
    assertIsoUtc(field, proof[field]);
  }
  if (!Number.isSafeInteger(nowMs) || !Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0 ||
      !Number.isSafeInteger(futureSkewMs) || futureSkewMs < 0) {
    fail('EVIDENCE_TIME_POLICY_INVALID', 'Evidence time policy is invalid.');
  }

  const started = Date.parse(proof.started_at);
  const completed = Date.parse(proof.completed_at);
  const generated = Date.parse(proof.generated_at);

  if (completed < started || generated < completed) {
    fail('EVIDENCE_TIMESTAMP_ORDER_INVALID', 'Evidence timestamps are not internally ordered.');
  }
  if (started > nowMs + futureSkewMs || completed > nowMs + futureSkewMs || generated > nowMs + futureSkewMs) {
    fail('EVIDENCE_TIMESTAMP_FUTURE', 'Evidence timestamp exceeds future clock tolerance.');
  }
  if (nowMs - generated > maxAgeMs) {
    fail('EVIDENCE_STALE', 'Evidence exceeds the permitted freshness window.');
  }
}

function assertValidationResults(validationResults, result) {
  if (!isPlainObject(validationResults) || Object.keys(validationResults).length === 0) {
    fail('EVIDENCE_VALIDATION_RESULTS_INVALID', 'Validation results must be a non-empty object.');
  }

  const allowed = result === 'PASS' ? PASS_FACTS : BLOCKED_FACTS;
  for (const [key, value] of Object.entries(validationResults)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      fail('EVIDENCE_VALIDATION_RESULTS_INVALID', 'Validation result key is invalid.');
    }

    const isDigest = typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
    if (!isDigest && !allowed.has(value)) {
      if (result === 'PASS') {
        fail('EVIDENCE_PASS_NOT_PROVEN', 'PASS capsule contains a non-passing validation fact.');
      }
      fail('EVIDENCE_VALIDATION_RESULTS_INVALID', 'BLOCKED capsule contains an invalid validation fact.');
    }
  }
}

function createProofCapsule({
  proof,
  trustedContext,
  expectedReleaseDna,
  nowMs,
  maxAgeMs,
  futureSkewMs,
}) {
  assertProofShape(proof);
  assertTrustedContext(trustedContext);

  if (!expectedReleaseDna || typeof expectedReleaseDna !== 'object' || Array.isArray(expectedReleaseDna)) {
    fail('EVIDENCE_RELEASE_DNA_INVALID', 'Expected Release DNA is invalid.');
  }

  if (proof.capsule_version !== 'TSRF_PROOF_CAPSULE_V1') {
    fail('EVIDENCE_CAPSULE_VERSION_INVALID', 'Unsupported Proof Capsule version.');
  }
  if (!['PASS', 'BLOCKED'].includes(proof.result)) {
    fail('EVIDENCE_RESULT_INVALID', 'Proof Capsule result must be PASS or BLOCKED.');
  }

  assertAllowedCapsuleEnvironment(proof.capsule_class, proof.environment, proof.kill_switch_state);
  assertSha256('release_digest', proof.release_digest);
  assertSha40('source_sha', proof.source_sha);
  assertSha40('source_tree', proof.source_tree);
  assertSha256('artifact_sha256', proof.artifact_sha256);

  const expectedDigest = computeReleaseDigest(expectedReleaseDna);
  if (proof.release_digest !== expectedDigest) {
    fail('EVIDENCE_RELEASE_DIGEST_MISMATCH', 'Proof Capsule is bound to a different Release DNA digest.');
  }
  if (proof.source_sha !== expectedReleaseDna.source_sha) {
    fail('EVIDENCE_SOURCE_SHA_MISMATCH', 'Proof Capsule source SHA does not match Release DNA.');
  }
  if (proof.source_tree !== expectedReleaseDna.source_tree) {
    fail('EVIDENCE_SOURCE_TREE_MISMATCH', 'Proof Capsule source tree does not match Release DNA.');
  }

  assertBoundedString(
    proof.test_version,
    'EVIDENCE_TEST_VERSION_INVALID',
    'Proof test version is invalid.',
    128,
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
  );
  assertBoundedString(
    proof.artifact_name,
    'EVIDENCE_ARTIFACT_NAME_INVALID',
    'Proof artifact name is invalid.',
    180,
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
  );

  assertTimestamps(proof, nowMs, maxAgeMs, futureSkewMs);
  assertValidationResults(proof.validation_results, proof.result);

  const capsule = {
    capsule_version: proof.capsule_version,
    capsule_class: proof.capsule_class,
    release_digest: proof.release_digest,
    source_sha: proof.source_sha,
    source_tree: proof.source_tree,
    environment: proof.environment,
    test_version: proof.test_version,
    workflow_run_id: trustedContext.workflow_run_id,
    runner_identity: trustedContext.runner_identity,
    artifact_name: proof.artifact_name,
    artifact_sha256: proof.artifact_sha256,
    started_at: proof.started_at,
    completed_at: proof.completed_at,
    generated_at: proof.generated_at,
    kill_switch_state: proof.kill_switch_state,
    validation_results: { ...proof.validation_results },
    result: proof.result,
  };

  return deepFreeze(capsule);
}

function serializeProofCapsule(capsule) {
  if (!isPlainObject(capsule)) {
    fail('EVIDENCE_CAPSULE_INVALID', 'Proof Capsule is invalid.');
  }
  return `${canonicalJson(capsule)}\n`;
}

module.exports = {
  createProofCapsule,
  serializeProofCapsule,
};
