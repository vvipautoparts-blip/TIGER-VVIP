'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TrustContractError,
  TRUST_SCHEMAS,
  MAX_TRUST_PULSE_V2_LIFETIME_MS,
  canonicalJson,
  sha256Hex,
  validateTrustPulse,
} = require('../scripts/trust/contracts.cjs');
const {
  createTrustedVerifierAdapter,
} = require('../scripts/trust/runtime-attestation.cjs');
const {
  createDeploymentAttestationBridge,
  deriveTrustPulseV2,
  isTrustedTrustPulseV2,
} = require('../scripts/trust/deployment-attestation-bridge.cjs');

const SHA = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const ARTIFACT = '1'.repeat(64);
const NOW = 1_700_000_000_000;
const MIGRATION = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function sourceReadiness() {
  return {
    schema: 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1',
    source_sha: SHA,
    source_tree: TREE,
    state: 'SOURCE_VERIFIED',
    deployed_durable_verified: false,
    reviewed_replay_migration_sha256: MIGRATION,
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
      contact_replay_protection_durable: true,
    },
    source_contract: {
      contract_version: 'market-genesis-source-contract-v1',
      whole_vehicle_ads_forbidden: true,
      no_transaction: true,
      release_evidence_required_for_contact: true,
      retired_fallback_forbidden: true,
    },
  };
}

function releaseEvidence() {
  return {
    target_environment: 'staging',
    contact_replay_release_evidence: {
      schema_version: 'market-contact-replay-release-evidence-v1',
      environment: 'staging',
      release_sha: SHA,
      migration_sha256: MIGRATION,
      migration_applied: true,
      migration_applied_at: '2026-08-24T00:00:00.000Z',
      probe_completed_at: '2026-08-24T00:01:00.000Z',
      probe_run_id: 'm13-pulse-source-test',
      runtime_instance_count: 2,
      duplicate_nonce_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
      duplicate_consume_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
    },
  };
}

function trustDna(source) {
  return {
    schema: 'TIGER_TRUST_DNA_V1',
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: SHA,
    source_tree: TREE,
    source_readiness_sha256: sha256Hex(canonicalJson(source)),
    release_evidence_contract_sha256: '2'.repeat(64),
    authority_policy_sha256: '3'.repeat(64),
  };
}

function epochVector() {
  return {
    schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
    owner_epoch: 1,
    policy_epoch: 2,
    market_epoch: 3,
    ai_policy_epoch: 4,
    crypto_epoch: 5,
    country_epochs: [{ country_code: 'JO', epoch: 6 }],
  };
}

function trustedAttestation({ freshUntilMs = NOW + 120_000 } = {}) {
  const adapter = createTrustedVerifierAdapter({
    authenticate(external) {
      return external?.authenticated === true ? external.result : null;
    },
  });
  return adapter.admit({
    authenticated: true,
    result: {
      schema: 'TIGER_ATTESTATION_RESULT_V1',
      result_class: 'VERIFIED_RUNTIME_APPRAISAL',
      environment: 'staging',
      release_sha: SHA,
      runtime_artifact_sha256: ARTIFACT,
      verifier_ref_sha256: '4'.repeat(64),
      attester_ref_sha256: '5'.repeat(64),
      evidence_sha256: '6'.repeat(64),
      appraisal_policy_sha256: '7'.repeat(64),
      freshness_binding_sha256: '8'.repeat(64),
      issued_at_ms: NOW - 30_000,
      fresh_until_ms: freshUntilMs,
      state: 'PASS',
    },
  }, { nowMs: NOW });
}

function trustedBridge({ freshUntilMs } = {}) {
  const source = sourceReadiness();
  return createDeploymentAttestationBridge({
    expectedSourceSha: SHA,
    expectedSourceTree: TREE,
    observedHeadSha: SHA,
    expectedEnvironment: 'staging',
    expectedArtifactSha256: ARTIFACT,
    trustDna: trustDna(source),
    epochVector: epochVector(),
    clock: () => NOW,
  }).derive({
    sourceReadinessEvidence: source,
    releaseEvidence: releaseEvidence(),
    attestationResult: trustedAttestation({ freshUntilMs }),
  });
}

function rawV2(overrides = {}) {
  return {
    schema: 'TIGER_TRUST_PULSE_V2',
    evidence_class: 'ATTESTED_RUNTIME_RESULT',
    release_dna_sha256: '1'.repeat(64),
    epoch_vector_sha256: '2'.repeat(64),
    deployment_evidence_sha256: '3'.repeat(64),
    attestation_result_sha256: '4'.repeat(64),
    runtime_artifact_sha256: '5'.repeat(64),
    verifier_ref_sha256: '6'.repeat(64),
    attester_ref_sha256: '7'.repeat(64),
    issued_at_ms: NOW,
    fresh_until_ms: NOW + 60_000,
    state: 'PASS',
    ...overrides,
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof TrustContractError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    return true;
  });
}

test('M12 Trust Pulse V1 semantics remain unchanged', () => {
  const v1 = {
    schema: 'TIGER_TRUST_PULSE_V1',
    evidence_class: 'SYNTHETIC_TEST_ONLY',
    release_dna_sha256: 'a'.repeat(64),
    epoch_vector_sha256: 'b'.repeat(64),
    issued_at_ms: 1000,
    fresh_until_ms: 2000,
    state: 'PASS',
  };
  const normalized = validateTrustPulse(v1);
  assert.deepEqual(normalized, v1);
  assert.equal(normalized.schema, TRUST_SCHEMAS.TRUST_PULSE);
});

test('V2 shape validation does not create trusted provenance', () => {
  const normalized = validateTrustPulse(rawV2());
  assert.equal(normalized.schema, TRUST_SCHEMAS.TRUST_PULSE_V2);
  assert.equal(normalized.evidence_class, 'ATTESTED_RUNTIME_RESULT');
  assert.equal(isTrustedTrustPulseV2(normalized), false);
  assert.ok(Object.isFrozen(normalized));
});

test('V2 is closed, rejects zero security digests, and enforces the 60 second cap', () => {
  assert.equal(MAX_TRUST_PULSE_V2_LIFETIME_MS, 60_000);
  expectCode(() => validateTrustPulse({ ...rawV2(), unexpected: true }), 'TRUST_PULSE_INVALID');
  expectCode(
    () => validateTrustPulse(rawV2({ verifier_ref_sha256: '0'.repeat(64) })),
    'TRUST_PULSE_INVALID',
  );
  expectCode(
    () => validateTrustPulse(rawV2({ fresh_until_ms: NOW + 60_001 })),
    'TRUST_PULSE_INVALID',
  );
});

test('trusted V2 Pulse can only be derived from a trusted bridge and is bound to its evidence', () => {
  const bridge = trustedBridge();
  const pulse = deriveTrustPulseV2(bridge);
  assert.equal(pulse.schema, 'TIGER_TRUST_PULSE_V2');
  assert.equal(pulse.evidence_class, 'ATTESTED_RUNTIME_RESULT');
  assert.equal(pulse.release_dna_sha256, bridge.trust_dna_sha256);
  assert.equal(pulse.epoch_vector_sha256, bridge.epoch_vector_sha256);
  assert.equal(pulse.deployment_evidence_sha256, bridge.deployment_evidence_sha256);
  assert.equal(pulse.attestation_result_sha256, bridge.attestation_result_sha256);
  assert.equal(pulse.runtime_artifact_sha256, bridge.runtime_artifact_sha256);
  assert.equal(pulse.verifier_ref_sha256, bridge.verifier_ref_sha256);
  assert.equal(pulse.attester_ref_sha256, bridge.attester_ref_sha256);
  assert.equal(pulse.issued_at_ms, NOW);
  assert.equal(pulse.fresh_until_ms, NOW + 60_000);
  assert.equal(isTrustedTrustPulseV2(pulse), true);
  assert.ok(Object.isFrozen(pulse));

  expectCode(() => deriveTrustPulseV2({ ...bridge }), 'TRUST_PULSE_UNTRUSTED');
});

test('V2 Pulse never outlives its source attestation', () => {
  const bridge = trustedBridge({ freshUntilMs: NOW + 25_000 });
  const pulse = deriveTrustPulseV2(bridge);
  assert.equal(pulse.fresh_until_ms, NOW + 25_000);
  assert.equal(pulse.fresh_until_ms <= bridge.attestation_fresh_until_ms, true);
});
