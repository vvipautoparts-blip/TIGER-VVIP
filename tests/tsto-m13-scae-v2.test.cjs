'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
} = require('../scripts/trust/contracts.cjs');
const { ACTION_PROFILE_IDS } = require('../scripts/trust/action-profiles.cjs');
const { evaluateSovereignAction } = require('../scripts/trust/scae.cjs');
const { createTrustedVerifierAdapter } = require('../scripts/trust/runtime-attestation.cjs');
const {
  createDeploymentAttestationBridge,
  deriveTrustPulseV2,
} = require('../scripts/trust/deployment-attestation-bridge.cjs');
const {
  createTrustedRevocationStateFixture,
} = require('./helpers/tsto-m14-revocation-fixture.cjs');

const HEX = (c, n = 64) => c.repeat(n);
const SHA = HEX('a', 40);
const TREE = HEX('b', 40);
const ARTIFACT = HEX('1');
const NOW = 1_700_000_000_000;
const MIGRATION = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function request() {
  return {
    profile_id: ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF,
    subject_ref: 'user:m13-synthetic-001',
    resource_ref: 'market-item:m13-synthetic-part-001',
    purpose: 'CONTACT_HANDOFF',
    country_code: 'JO',
  };
}

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
      probe_run_id: 'm13-scae-source-test',
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
    release_evidence_contract_sha256: HEX('2'),
    authority_policy_sha256: HEX('3'),
  };
}

function epochs() {
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

function trustedAttestation() {
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
      verifier_ref_sha256: HEX('4'),
      attester_ref_sha256: HEX('5'),
      evidence_sha256: HEX('6'),
      appraisal_policy_sha256: HEX('7'),
      freshness_binding_sha256: HEX('8'),
      issued_at_ms: NOW - 30_000,
      fresh_until_ms: NOW + 120_000,
      state: 'PASS',
    },
  }, { nowMs: NOW });
}

function trustedInputs() {
  const source = sourceReadiness();
  const dna = validateTrustDna(trustDna(source));
  const currentEpochs = validateEpochVector(epochs());
  const bridge = createDeploymentAttestationBridge({
    expectedSourceSha: SHA,
    expectedSourceTree: TREE,
    observedHeadSha: SHA,
    expectedEnvironment: 'staging',
    expectedArtifactSha256: ARTIFACT,
    trustDna: dna,
    epochVector: currentEpochs,
    clock: () => NOW,
  }).derive({
    sourceReadinessEvidence: source,
    releaseEvidence: releaseEvidence(),
    attestationResult: trustedAttestation(),
  });
  return {
    dna,
    currentEpochs,
    pulse: deriveTrustPulseV2(bridge),
  };
}

function proofs() {
  const dimensions = [
    'IDENTITY', 'SOURCE', 'ARTIFACT', 'RUNTIME', 'POLICY',
    'COUNTRY', 'RISK_SIGNAL', 'REPLAY', 'FRESHNESS',
  ];
  const chars = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return Object.fromEntries(dimensions.map((dimension, index) => [
    dimension,
    { status: 'PASS', digest_sha256: HEX(chars[index]) },
  ]));
}

function trustedContext({ pulseOverride, marketOverride, revocationStatus = 'PASS' } = {}) {
  const inputs = trustedInputs();
  const releaseDnaSha256 = inputs.pulse.release_dna_sha256;
  return {
    now_ms: NOW,
    trust_dna: inputs.dna,
    current_epochs: inputs.currentEpochs,
    trust_pulse: pulseOverride === undefined ? inputs.pulse : pulseOverride(inputs.pulse),
    proofs: proofs(),
    revocation_state: createTrustedRevocationStateFixture({
      request: request(),
      releaseDnaSha256,
      nowMs: NOW,
      status: revocationStatus,
    }),
    market_state: {
      whole_vehicle_ad: false,
      transaction_authority_enabled: false,
      source_durable: true,
      deployed_durable_verified: true,
      release_evidence_schema: 'market-contact-replay-release-evidence-v1',
      ...(marketOverride || {}),
    },
    replay_binding_sha256: HEX('b'),
  };
}

function assertBlocked(result, code) {
  assert.equal(result.schema, 'TIGER_SCAE_DECISION_V1');
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reason_codes.includes(code), `${code} missing from ${result.reason_codes.join(',')}`);
}

test('shape-valid copied Trust Pulse V2 cannot enter SCAE as trusted evidence', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ pulseOverride: (pulse) => ({ ...pulse }) }),
  });
  assertBlocked(result, 'TRUST_PULSE_UNTRUSTED');
});

test('trusted Bridge-derived Trust Pulse V2 can satisfy the existing SCAE proof model', () => {
  const result = evaluateSovereignAction({ request: request(), trustedContext: trustedContext() });
  assert.equal(result.decision, 'ALLOW');
  assert.deepEqual(result.reason_codes, []);
  assert.match(result.trust_pulse_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.issued_at_ms, NOW);
});

test('trusted M14 REVOKED state blocks even with a trusted Bridge-derived Trust Pulse V2', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ revocationStatus: 'REVOKED' }),
  });
  assertBlocked(result, 'TRUST_SIGNAL_REVOKED');
});

test('whole-vehicle prohibition overrides otherwise perfect runtime attestation', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ marketOverride: { whole_vehicle_ad: true } }),
  });
  assertBlocked(result, 'TRUST_MARKET_WHOLE_VEHICLE_FORBIDDEN');
});

test('transaction-authority prohibition overrides otherwise perfect runtime attestation', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ marketOverride: { transaction_authority_enabled: true } }),
  });
  assertBlocked(result, 'TRUST_MARKET_TRANSACTION_AUTHORITY_FORBIDDEN');
});
