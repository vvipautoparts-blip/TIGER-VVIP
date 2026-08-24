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
const {
  createPcalCandidate,
  verifyPcalCandidate,
} = require('../scripts/trust/pcal.cjs');
const {
  createTrustedRevocationStateFixture,
} = require('./helpers/tsto-m14-revocation-fixture.cjs');

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
  const releaseDnaSha256 = digestValidated(trustedDna, validateTrustDna);
  return {
    now_ms: 1500,
    trust_dna: trustedDna,
    current_epochs: currentEpochs,
    trust_pulse: {
      schema: 'TIGER_TRUST_PULSE_V1',
      evidence_class: 'SYNTHETIC_TEST_ONLY',
      release_dna_sha256: releaseDnaSha256,
      epoch_vector_sha256: digestValidated(currentEpochs, validateEpochVector),
      issued_at_ms: 1000,
      fresh_until_ms: 100000,
      state: 'PASS',
    },
    proofs: proofs(),
    revocation_state: createTrustedRevocationStateFixture({
      request: request(),
      releaseDnaSha256,
      nowMs: 1500,
    }),
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

function allowDecision(context = trustedContext(), req = request()) {
  const decision = evaluateSovereignAction({ request: req, trustedContext: context });
  assert.equal(decision.decision, 'ALLOW');
  return decision;
}

function candidate(context = trustedContext(), req = request()) {
  const decision = allowDecision(context, req);
  return createPcalCandidate({ decision, request: req, trustedContext: context });
}

function expectVerifyCode(result, ok, code) {
  assert.deepEqual(result, { ok, code });
  assert.ok(Object.isFrozen(result));
}

test('PCAL creation rejects BLOCKED decisions and accepts only matching ALLOW decisions', () => {
  const context = trustedContext();
  context.market_state = { ...context.market_state, deployed_durable_verified: false };
  const blocked = evaluateSovereignAction({ request: request(), trustedContext: context });
  assert.equal(blocked.decision, 'BLOCKED');
  assert.throws(
    () => createPcalCandidate({ decision: blocked, request: request(), trustedContext: context }),
    (error) => error && error.code === 'TRUST_DECISION_INVALID',
  );
});

test('PCAL candidate is exact, deterministic, one-use, short-lived, and non-sensitive', () => {
  const context = trustedContext();
  const req = request();
  const one = candidate(context, req);
  const two = candidate(trustedContext(), request());

  assert.deepEqual(one, two);
  assert.equal(one.schema, 'TIGER_PCAL_V1');
  assert.equal(one.candidate_mode, 'TEST_ONLY_SOURCE_CONTRACT');
  assert.equal(one.profile_id, ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF);
  assert.equal(one.action, ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF);
  assert.equal(one.issued_at_ms, 1500);
  assert.equal(one.expires_at_ms, 46500);
  assert.equal(one.max_uses, 1);
  assert.equal(one.proof_of_possession_sha256, null);
  assert.match(one.candidate_id_sha256, /^[0-9a-f]{64}$/);
  assert.match(one.audit_correlation_sha256, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(one));

  const serialized = JSON.stringify(one);
  for (const forbidden of ['market_state', 'proofs', 'trusted_signals', 'revocation_state', 'raw_nonce', 'private_intent', 'service_role']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('valid PCAL candidate verifies for exact scope before expiry and before use', () => {
  const context = trustedContext();
  expectVerifyCode(
    verifyPcalCandidate({
      pcal: candidate(context, request()),
      request: request(),
      trustedContext: context,
      consumeState: { uses: 0, replayed: false, revoked: false },
    }),
    true,
    'TRUST_PCAL_VERIFIED',
  );
});

test('expired, replayed, exhausted, revoked, and out-of-scope PCAL candidates fail closed', () => {
  const baseContext = trustedContext();
  const pcal = candidate(baseContext, request());

  const expiredContext = trustedContext();
  expiredContext.now_ms = pcal.expires_at_ms;
  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: expiredContext, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_LEASE_EXPIRED',
  );

  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: trustedContext(), consumeState: { uses: 0, replayed: true, revoked: false } }),
    false,
    'TRUST_LEASE_REPLAYED',
  );

  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: trustedContext(), consumeState: { uses: 1, replayed: false, revoked: false } }),
    false,
    'TRUST_LEASE_USE_EXHAUSTED',
  );

  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: trustedContext(), consumeState: { uses: 0, replayed: false, revoked: true } }),
    false,
    'TRUST_SIGNAL_REVOKED',
  );

  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: { ...request(), resource_ref: 'market-item:other' }, trustedContext: trustedContext(), consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_LEASE_SCOPE_MISMATCH',
  );
});

test('PCAL candidate dies when current epoch, DNA, Pulse, or replay binding changes', () => {
  const baseContext = trustedContext();
  const pcal = candidate(baseContext, request());

  const epochContext = trustedContext();
  epochContext.current_epochs = { ...epochContext.current_epochs, market_epoch: 14 };
  epochContext.trust_pulse = {
    ...epochContext.trust_pulse,
    epoch_vector_sha256: digestValidated(epochContext.current_epochs, validateEpochVector),
  };
  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: epochContext, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_EPOCH_MISMATCH',
  );

  const dnaContext = trustedContext();
  dnaContext.trust_dna = { ...dnaContext.trust_dna, source_sha: HEX('f', 40) };
  dnaContext.trust_pulse = {
    ...dnaContext.trust_pulse,
    release_dna_sha256: digestValidated(dnaContext.trust_dna, validateTrustDna),
  };
  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: dnaContext, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_DNA_RELEASE_MISMATCH',
  );

  const pulseContext = trustedContext();
  pulseContext.trust_pulse = { ...pulseContext.trust_pulse, fresh_until_ms: 120000 };
  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: pulseContext, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_PULSE_STALE',
  );

  const replayContext = trustedContext();
  replayContext.replay_binding_sha256 = HEX('c');
  expectVerifyCode(
    verifyPcalCandidate({ pcal, request: request(), trustedContext: replayContext, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_LEASE_REPLAYED',
  );
});

test('unknown fields or digest tampering invalidates the PCAL contract', () => {
  const context = trustedContext();
  const pcal = candidate(context, request());

  expectVerifyCode(
    verifyPcalCandidate({ pcal: { ...pcal, admin: true }, request: request(), trustedContext: context, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_LEASE_INVALID',
  );

  expectVerifyCode(
    verifyPcalCandidate({ pcal: { ...pcal, decision_sha256: HEX('0') }, request: request(), trustedContext: context, consumeState: { uses: 0, replayed: false, revoked: false } }),
    false,
    'TRUST_EVIDENCE_DIGEST_MISMATCH',
  );
});
