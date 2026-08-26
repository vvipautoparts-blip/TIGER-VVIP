'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { computeReleaseDigest } = require('../scripts/tsrf/evidence/release-dna.cjs');
const {
  createGateEvidenceEnvelope,
  createProofCapsule,
  serializeProofCapsule,
} = require('../scripts/tsrf/evidence/proof-capsule.cjs');

const SHA40_A = 'a'.repeat(40);
const SHA40_B = 'b'.repeat(40);
const SHA64_1 = '1'.repeat(64);
const SHA64_2 = '2'.repeat(64);
const SHA64_3 = '3'.repeat(64);

function releaseDna() {
  return Object.freeze({
    dna_version: 'TSRF_RELEASE_DNA_V1',
    source_sha: SHA40_A,
    source_tree: SHA40_B,
    frontend_build_sha256: SHA64_1,
    backend_edge_build_sha256: SHA64_2,
    migration_digests: Object.freeze([
      Object.freeze({ path: 'supabase/migrations/a.sql', sha256: SHA64_1 }),
    ]),
    ai_policy_sha256: SHA64_1,
    prompt_sha256: SHA64_2,
    model_config_sha256: SHA64_3,
    tool_registry_sha256: SHA64_1,
    rls_sha256: SHA64_2,
    security_config_sha256: SHA64_3,
    environment_class: 'STAGING_CANDIDATE',
  });
}

function stagingProof(overrides = {}) {
  const dna = releaseDna();
  return {
    capsule_version: 'TSRF_PROOF_CAPSULE_V1',
    capsule_class: 'OTP_PROOF_CAPSULE',
    release_digest: computeReleaseDigest(dna),
    source_sha: dna.source_sha,
    source_tree: dna.source_tree,
    environment: 'STAGING',
    test_version: 'otp-rehearsal-v1',
    artifact_name: 'otp-proof.json',
    artifact_sha256: SHA64_1,
    started_at: '2026-08-08T12:00:00.000Z',
    completed_at: '2026-08-08T12:01:00.000Z',
    generated_at: '2026-08-08T12:01:05.000Z',
    kill_switch_state: 'TRUE',
    validation_results: { contract: 'PASS', behavior: 'PASS' },
    result: 'PASS',
    ...overrides,
  };
}

function create(proof = stagingProof(), overrides = {}) {
  return createProofCapsule({
    proof,
    trustedContext: {
      workflow_run_id: '31260000000',
      runner_identity: 'github-actions:Linux:X64',
    },
    expectedReleaseDna: releaseDna(),
    nowMs: Date.parse('2026-08-08T12:02:00.000Z'),
    maxAgeMs: 15 * 60 * 1000,
    futureSkewMs: 30 * 1000,
    ...overrides,
  });
}

test('valid STAGING proof receives CI identity only from trustedContext', () => {
  const capsule = create();
  assert.equal(capsule.workflow_run_id, '31260000000');
  assert.equal(capsule.runner_identity, 'github-actions:Linux:X64');
  assert.equal(capsule.environment, 'STAGING');
  assert.equal(capsule.kill_switch_state, 'TRUE');
  assert.equal(capsule.result, 'PASS');
  assert.equal(Object.isFrozen(capsule), true);
  assert.equal(Object.isFrozen(capsule.validation_results), true);
});

test('valid LOCAL DB rebuild proof uses NOT_APPLICABLE kill switch', () => {
  const proof = stagingProof({
    capsule_class: 'DB_REBUILD_PROOF_CAPSULE',
    environment: 'LOCAL',
    kill_switch_state: 'NOT_APPLICABLE',
    test_version: 'local-db-rebuild-v1',
  });
  const capsule = create(proof);
  assert.equal(capsule.environment, 'LOCAL');
  assert.equal(capsule.kill_switch_state, 'NOT_APPLICABLE');
});

test('proof cannot forge trusted workflow identity', () => {
  for (const field of ['workflow_run_id', 'runner_identity']) {
    assert.throws(
      () => create(stagingProof({ [field]: 'forged' })),
      (error) => error.code === 'EVIDENCE_TRUSTED_FIELD_FORGED',
    );
  }
});

test('proof is bound to exact Release DNA digest and source identity', () => {
  assert.throws(
    () => create(stagingProof({ release_digest: 'f'.repeat(64) })),
    (error) => error.code === 'EVIDENCE_RELEASE_DIGEST_MISMATCH',
  );
  assert.throws(
    () => create(stagingProof({ source_sha: 'c'.repeat(40) })),
    (error) => error.code === 'EVIDENCE_SOURCE_SHA_MISMATCH',
  );
  assert.throws(
    () => create(stagingProof({ source_tree: 'd'.repeat(40) })),
    (error) => error.code === 'EVIDENCE_SOURCE_TREE_MISMATCH',
  );
});

test('stale, future, and misordered timestamps fail closed', () => {
  assert.throws(
    () => create(stagingProof({
      started_at: '2026-08-08T10:58:00.000Z',
      completed_at: '2026-08-08T10:59:00.000Z',
      generated_at: '2026-08-08T11:00:00.000Z',
    })),
    (error) => error.code === 'EVIDENCE_STALE',
  );
  assert.throws(
    () => create(stagingProof({ generated_at: '2026-08-08T12:03:00.000Z' })),
    (error) => error.code === 'EVIDENCE_TIMESTAMP_FUTURE',
  );
  assert.throws(
    () => create(stagingProof({
      started_at: '2026-08-08T12:01:30.000Z',
      completed_at: '2026-08-08T12:01:00.000Z',
    })),
    (error) => error.code === 'EVIDENCE_TIMESTAMP_ORDER_INVALID',
  );
});

test('Production, unknown fields, unsupported classes, and authority shapes are rejected', () => {
  assert.throws(
    () => create(stagingProof({ environment: 'PRODUCTION' })),
    (error) => error.code === 'EVIDENCE_ENVIRONMENT_BLOCKED',
  );
  assert.throws(
    () => create(stagingProof({ unexpected: 'x' })),
    (error) => error.code === 'EVIDENCE_UNKNOWN_FIELD',
  );
  assert.throws(
    () => create(stagingProof({ capsule_class: 'UNKNOWN_CAPSULE' })),
    (error) => error.code === 'EVIDENCE_CAPSULE_CLASS_UNSUPPORTED',
  );
  assert.throws(
    () => create(stagingProof({ validation_results: { ownerApproved: true } })),
    (error) => error.code === 'EVIDENCE_FORBIDDEN_FIELD',
  );
});

test('artifact digest and bounded trusted context are validated', () => {
  assert.throws(
    () => create(stagingProof({ artifact_sha256: 'ABC' })),
    (error) => error.code === 'EVIDENCE_SHA256_INVALID',
  );
  assert.throws(
    () => create(stagingProof(), { trustedContext: { workflow_run_id: '', runner_identity: 'x' } }),
    (error) => error.code === 'EVIDENCE_TRUSTED_CONTEXT_INVALID',
  );
});

test('inconclusive or failed validation cannot be represented as PASS', () => {
  for (const result of ['SKIPPED', 'CANCELLED', 'INCONCLUSIVE']) {
    assert.throws(
      () => create(stagingProof({ result })),
      (error) => error.code === 'EVIDENCE_RESULT_INVALID',
    );
  }
  assert.throws(
    () => create(stagingProof({ validation_results: { contract: 'PASS', behavior: 'FAIL' } })),
    (error) => error.code === 'EVIDENCE_PASS_NOT_PROVEN',
  );
});

test('BLOCKED is representable without being promoted to PASS', () => {
  const capsule = create(stagingProof({
    result: 'BLOCKED',
    validation_results: { contract: 'PASS', behavior: 'BLOCKED' },
  }));
  assert.equal(capsule.result, 'BLOCKED');
});

test('canonical serializer is deterministic and newline terminated', () => {
  const capsule = create();
  const serialized = serializeProofCapsule(capsule);
  assert.equal(serialized.endsWith('\n'), true);
  assert.equal(serialized, serializeProofCapsule(capsule));
  assert.deepEqual(JSON.parse(serialized), capsule);
});

test('validated proof capsules extend into typed gate evidence without copying trusted source identity', () => {
  const capsule = create();
  const envelope = createGateEvidenceEnvelope({
    capsule,
    gateId: 'P08',
    evidenceClass: 'DATABASE_CONVERGENCE',
    subject: 'sha256:' + SHA64_1,
  });

  assert.equal(envelope.gate_id, 'P08');
  assert.equal(envelope.evidence_class, 'DATABASE_CONVERGENCE');
  assert.equal(envelope.observed_at, capsule.generated_at);
  assert.equal(envelope.facts.capsule_result, 'PASS');
  assert.equal(envelope.facts.contract, 'PASS');
  assert.equal(Object.hasOwn(envelope, 'source_sha'), false);
  assert.equal(Object.hasOwn(envelope, 'source_tree'), false);
  assert.match(envelope.proof_capsule_digest, /^[0-9a-f]{64}$/);
});
