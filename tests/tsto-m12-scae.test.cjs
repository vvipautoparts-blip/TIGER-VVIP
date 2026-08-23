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

const HEX = (c, n = 64) => c.repeat(n);

function request() {
  return {
    profile_id: ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF,
    subject_ref: 'user:synthetic-001',
    resource_ref: 'market-item:synthetic-part-001',
    purpose: 'CONTACT_HANDOFF',
    country_code: 'JO',
  };
}

function dna() {
  return {
    schema: 'TIGER_TRUST_DNA_V1',
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: HEX('a', 40),
    source_tree: HEX('b', 40),
    source_readiness_sha256: HEX('c'),
    release_evidence_contract_sha256: HEX('d'),
    authority_policy_sha256: HEX('e'),
  };
}

function epochs() {
  return {
    schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
    owner_epoch: 7,
    policy_epoch: 11,
    market_epoch: 13,
    ai_policy_epoch: 3,
    crypto_epoch: 2,
    country_epochs: [{ country_code: 'JO', epoch: 5 }],
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

function trustedContext() {
  const trustedDna = validateTrustDna(dna());
  const currentEpochs = validateEpochVector(epochs());
  return {
    now_ms: 1500,
    trust_dna: trustedDna,
    current_epochs: currentEpochs,
    trust_pulse: {
      schema: 'TIGER_TRUST_PULSE_V1',
      evidence_class: 'SYNTHETIC_TEST_ONLY',
      release_dna_sha256: digestValidated(trustedDna, validateTrustDna),
      epoch_vector_sha256: digestValidated(currentEpochs, validateEpochVector),
      issued_at_ms: 1000,
      fresh_until_ms: 2000,
      state: 'PASS',
    },
    proofs: proofs(),
    trusted_signals: {
      status: 'PASS',
      issuer_ref_sha256: HEX('a'),
    },
    market_state: {
      whole_vehicle_ad: false,
      transaction_authority_enabled: false,
      source_durable: true,
      deployed_durable_verified: true,
      release_evidence_schema: 'market-contact-replay-release-evidence-v1',
    },
    replay_binding_sha256: HEX('b'),
  };
}

function assertBlocked(result, code) {
  assert.equal(result.schema, 'TIGER_SCAE_DECISION_V1');
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reason_codes.includes(code), `${code} missing from ${result.reason_codes.join(',')}`);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.reason_codes));
}

test('caller cannot self-assert authority, time, epochs, environment, attestation, signal issuer, workflow identity, or geometry', () => {
  const attempts = [
    { allow: true },
    { now_ms: 1 },
    { current_epochs: epochs() },
    { environment: 'production' },
    { attestation_result: 'PASS' },
    { signal_issuer: 'trusted' },
    { workflow_identity: 'trusted-workflow' },
    { required_dimensions: ['IDENTITY'] },
  ];

  for (const extra of attempts) {
    assertBlocked(
      evaluateSovereignAction({ request: { ...request(), ...extra }, trustedContext: trustedContext() }),
      'TRUST_REQUEST_INVALID',
    );
  }
});

test('unknown action profile fails closed', () => {
  assertBlocked(
    evaluateSovereignAction({
      request: { ...request(), profile_id: 'UNKNOWN.ACTION' },
      trustedContext: trustedContext(),
    }),
    'TRUST_ACTION_PROFILE_UNKNOWN',
  );
});

test('missing mandatory proof dimension blocks the action', () => {
  const context = trustedContext();
  delete context.proofs.SOURCE;
  assertBlocked(
    evaluateSovereignAction({ request: request(), trustedContext: context }),
    'TRUST_PROOF_GEOMETRY_UNSATISFIED',
  );
});

test('stale Trust Pulse blocks the action using trusted time', () => {
  const context = trustedContext();
  context.now_ms = 2000;
  assertBlocked(
    evaluateSovereignAction({ request: request(), trustedContext: context }),
    'TRUST_PULSE_STALE',
  );
});

test('Trust DNA mismatch against the Pulse blocks the action', () => {
  const context = trustedContext();
  context.trust_dna = { ...context.trust_dna, source_sha: HEX('f', 40) };
  assertBlocked(
    evaluateSovereignAction({ request: request(), trustedContext: context }),
    'TRUST_DNA_RELEASE_MISMATCH',
  );
});

test('current sovereign epoch mismatch against the Pulse blocks the action', () => {
  const context = trustedContext();
  context.current_epochs = { ...context.current_epochs, market_epoch: 14 };
  assertBlocked(
    evaluateSovereignAction({ request: request(), trustedContext: context }),
    'TRUST_EPOCH_MISMATCH',
  );
});

test('trusted revocation signal blocks before nominal expiry', () => {
  const context = trustedContext();
  context.trusted_signals = { ...context.trusted_signals, status: 'REVOKED' };
  assertBlocked(
    evaluateSovereignAction({ request: request(), trustedContext: context }),
    'TRUST_SIGNAL_REVOKED',
  );
});

test('Market Genesis immutable laws and deployed-durable evidence are mandatory', () => {
  const cases = [
    ['whole_vehicle_ad', true, 'TRUST_MARKET_WHOLE_VEHICLE_FORBIDDEN'],
    ['transaction_authority_enabled', true, 'TRUST_MARKET_TRANSACTION_AUTHORITY_FORBIDDEN'],
    ['source_durable', false, 'TRUST_MARKET_SOURCE_DURABLE_UNPROVEN'],
    ['deployed_durable_verified', false, 'TRUST_MARKET_DEPLOYED_DURABLE_UNPROVEN'],
    ['release_evidence_schema', 'wrong-schema', 'TRUST_MARKET_RELEASE_EVIDENCE_INVALID'],
  ];

  for (const [field, value, code] of cases) {
    const context = trustedContext();
    context.market_state = { ...context.market_state, [field]: value };
    assertBlocked(
      evaluateSovereignAction({ request: request(), trustedContext: context }),
      code,
    );
  }
});

test('complete trusted synthetic context produces deterministic minimal ALLOW decision', () => {
  const one = evaluateSovereignAction({ request: request(), trustedContext: trustedContext() });
  const two = evaluateSovereignAction({ request: request(), trustedContext: trustedContext() });

  assert.deepEqual(one, two);
  assert.equal(one.schema, 'TIGER_SCAE_DECISION_V1');
  assert.equal(one.decision, 'ALLOW');
  assert.deepEqual(one.reason_codes, []);
  assert.equal(one.profile_id, ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF);
  assert.equal(one.profile_version, 1);
  assert.match(one.trust_dna_sha256, /^[0-9a-f]{64}$/);
  assert.match(one.epoch_vector_sha256, /^[0-9a-f]{64}$/);
  assert.match(one.trust_pulse_sha256, /^[0-9a-f]{64}$/);
  assert.match(one.proof_geometry_sha256, /^[0-9a-f]{64}$/);
  assert.match(one.evidence_set_sha256, /^[0-9a-f]{64}$/);
  assert.equal(one.issued_at_ms, 1500);
  assert.ok(Object.isFrozen(one));

  const serialized = JSON.stringify(one);
  assert.equal(serialized.includes('issuer_ref_sha256'), false);
  assert.equal(serialized.includes('replay_binding_sha256'), false);
  assert.equal(serialized.includes('market_state'), false);
  assert.equal(serialized.includes('proofs'), false);
});
