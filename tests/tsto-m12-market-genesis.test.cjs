'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateTrustDna,
  validateEpochVector,
  digestValidated,
} = require('../scripts/trust/contracts.cjs');
const { ACTION_PROFILE_IDS } = require('../scripts/trust/action-profiles.cjs');
const { evaluateSovereignAction } = require('../scripts/trust/scae.cjs');
const { createPcalCandidate } = require('../scripts/trust/pcal.cjs');
const {
  deriveMarketGenesisTrustState,
} = require('../scripts/trust/market-genesis-evidence.cjs');
const {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  REVIEWED_REPLAY_MIGRATION_SHA256,
} = require('../scripts/marketplace/market-release-evidence-contract.js');
const {
  validateMarketSourceReadinessEvidence,
} = require('../scripts/marketplace/market-source-readiness-evidence.js');

const HEX = (c, n = 64) => c.repeat(n);
const SOURCE_SHA = HEX('a', 40);
const SOURCE_TREE = HEX('b', 40);

function sourceReadiness() {
  return {
    schema: 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1',
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    state: 'SOURCE_VERIFIED',
    deployed_durable_verified: false,
    reviewed_replay_migration_sha256: REVIEWED_REPLAY_MIGRATION_SHA256,
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

function deploymentEvidence() {
  return {
    target_environment: 'staging',
    contact_replay_release_evidence: {
      schema_version: RELEASE_EVIDENCE_SCHEMA_VERSION,
      environment: 'staging',
      release_sha: SOURCE_SHA,
      migration_sha256: REVIEWED_REPLAY_MIGRATION_SHA256,
      migration_applied: true,
      migration_applied_at: '2026-08-23T20:00:00.000Z',
      probe_completed_at: '2026-08-23T20:05:00.000Z',
      probe_run_id: 'synthetic-m12-integration',
      runtime_instance_count: 2,
      duplicate_nonce_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
      duplicate_consume_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
    },
  };
}

function request() {
  return {
    profile_id: ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF,
    subject_ref: 'user:synthetic-001',
    resource_ref: 'market-item:synthetic-part-001',
    purpose: 'CONTACT_HANDOFF',
    country_code: 'JO',
  };
}

function baseTrustedContext(marketState) {
  const dna = validateTrustDna({
    schema: 'TIGER_TRUST_DNA_V1',
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    source_readiness_sha256: HEX('c'),
    release_evidence_contract_sha256: HEX('d'),
    authority_policy_sha256: HEX('e'),
  });
  const epochs = validateEpochVector({
    schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
    owner_epoch: 7,
    policy_epoch: 11,
    market_epoch: 13,
    ai_policy_epoch: 3,
    crypto_epoch: 2,
    country_epochs: [{ country_code: 'JO', epoch: 5 }],
  });
  const dimensions = [
    'IDENTITY', 'SOURCE', 'ARTIFACT', 'RUNTIME', 'POLICY',
    'COUNTRY', 'RISK_SIGNAL', 'REPLAY', 'FRESHNESS',
  ];
  return {
    now_ms: 1500,
    trust_dna: dna,
    current_epochs: epochs,
    trust_pulse: {
      schema: 'TIGER_TRUST_PULSE_V1',
      evidence_class: 'SYNTHETIC_TEST_ONLY',
      release_dna_sha256: digestValidated(dna, validateTrustDna),
      epoch_vector_sha256: digestValidated(epochs, validateEpochVector),
      issued_at_ms: 1000,
      fresh_until_ms: 100000,
      state: 'PASS',
    },
    proofs: Object.fromEntries(dimensions.map((dimension, index) => [
      dimension,
      { status: 'PASS', digest_sha256: String(index + 1).repeat(64) },
    ])),
    trusted_signals: { status: 'PASS', issuer_ref_sha256: HEX('f') },
    market_state: marketState,
    replay_binding_sha256: HEX('9'),
  };
}

function derive({ source = sourceReadiness(), release = deploymentEvidence(), wholeVehicleAd = false, transactionAuthorityEnabled = false } = {}) {
  return deriveMarketGenesisTrustState({
    sourceReadinessEvidence: source,
    releaseEvidence: release,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedHeadSha: SOURCE_SHA,
    observedHeadSha: SOURCE_SHA,
    wholeVehicleAd,
    transactionAuthorityEnabled,
  });
}

test('M11 source readiness is valid source evidence and explicitly not deployed durability', () => {
  const source = sourceReadiness();
  const result = validateMarketSourceReadinessEvidence(source, {
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
  });
  assert.equal(result.ok, true);
  assert.equal(source.authority.contact_replay_protection_durable, true);
  assert.equal(source.deployed_durable_verified, false);
});

test('M11 source evidence alone cannot derive deployed-durable Market state', () => {
  const marketState = derive({ release: null });
  assert.equal(marketState.source_durable, true);
  assert.equal(marketState.deployed_durable_verified, false);
  assert.notEqual(marketState.release_evidence_schema, RELEASE_EVIDENCE_SCHEMA_VERSION);

  const decision = evaluateSovereignAction({
    request: request(),
    trustedContext: baseTrustedContext(marketState),
  });
  assert.equal(decision.decision, 'BLOCKED');
  assert.ok(decision.reason_codes.includes('TRUST_MARKET_DEPLOYED_DURABLE_UNPROVEN'));
});

test('valid M10 deployment evidence plus valid M11 source evidence derives the only eligible Market state', () => {
  const marketState = derive();
  assert.deepEqual(marketState, {
    whole_vehicle_ad: false,
    transaction_authority_enabled: false,
    source_durable: true,
    deployed_durable_verified: true,
    release_evidence_schema: RELEASE_EVIDENCE_SCHEMA_VERSION,
  });
  assert.ok(Object.isFrozen(marketState));

  const context = baseTrustedContext(marketState);
  const decision = evaluateSovereignAction({ request: request(), trustedContext: context });
  assert.equal(decision.decision, 'ALLOW');

  const pcal = createPcalCandidate({ decision, request: request(), trustedContext: context });
  assert.equal(pcal.action, ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF);
  assert.equal(pcal.max_uses, 1);
  assert.equal(pcal.expires_at_ms - pcal.issued_at_ms, 45000);
});

test('wrong M10 migration/replay evidence cannot derive deployed durability', () => {
  const release = deploymentEvidence();
  release.contact_replay_release_evidence.migration_sha256 = HEX('0');
  const marketState = derive({ release });
  assert.equal(marketState.source_durable, true);
  assert.equal(marketState.deployed_durable_verified, false);

  const decision = evaluateSovereignAction({
    request: request(),
    trustedContext: baseTrustedContext(marketState),
  });
  assert.equal(decision.decision, 'BLOCKED');
});

test('whole-vehicle and transaction prohibitions remain stronger than complete trust evidence', () => {
  const vehicleState = derive({ wholeVehicleAd: true });
  const vehicleDecision = evaluateSovereignAction({
    request: request(),
    trustedContext: baseTrustedContext(vehicleState),
  });
  assert.equal(vehicleDecision.decision, 'BLOCKED');
  assert.ok(vehicleDecision.reason_codes.includes('TRUST_MARKET_WHOLE_VEHICLE_FORBIDDEN'));

  const transactionState = derive({ transactionAuthorityEnabled: true });
  const transactionDecision = evaluateSovereignAction({
    request: request(),
    trustedContext: baseTrustedContext(transactionState),
  });
  assert.equal(transactionDecision.decision, 'BLOCKED');
  assert.ok(transactionDecision.reason_codes.includes('TRUST_MARKET_TRANSACTION_AUTHORITY_FORBIDDEN'));
});

test('source evidence that attempts to claim deployed durability is rejected before authority derivation', () => {
  const source = { ...sourceReadiness(), deployed_durable_verified: true };
  const marketState = derive({ source });
  assert.equal(marketState.source_durable, false);
  assert.equal(marketState.deployed_durable_verified, false);
});
