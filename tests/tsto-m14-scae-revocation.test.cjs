'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  digestValidated,
} = require('../scripts/trust/contracts.cjs');
const { ACTION_PROFILE_IDS } = require('../scripts/trust/action-profiles.cjs');
const { evaluateSovereignAction } = require('../scripts/trust/scae.cjs');
const { createTrustedSignalAdapter } = require('../scripts/trust/trust-signals.cjs');
const { createRevocationStateResolver } = require('../scripts/trust/revocation-state.cjs');

const HEX = (c, n = 64) => c.repeat(n);
const NOW = 4_000_000;

function request(overrides = {}) {
  return {
    profile_id: ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF,
    subject_ref: 'user:m14-synthetic-001',
    resource_ref: 'market-item:m14-synthetic-part-001',
    purpose: 'CONTACT_HANDOFF',
    country_code: 'JO',
    ...overrides,
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

function scopeFor(req, releaseDnaSha256, overrides = {}) {
  return {
    subject_ref_sha256: sha256Hex(req.subject_ref),
    resource_ref_sha256: sha256Hex(req.resource_ref),
    action_profile_ref_sha256: sha256Hex(req.profile_id),
    country_ref_sha256: sha256Hex(req.country_code),
    release_dna_sha256: releaseDnaSha256,
    ...overrides,
  };
}

function trustedRevocationState({
  req = request(),
  releaseDnaSha256,
  status = 'PASS',
  sequence = 1,
  issuedAt = NOW - 10_000,
  freshUntil = NOW + 60_000,
  scopeOverride = {},
} = {}) {
  const scope = scopeFor(req, releaseDnaSha256, scopeOverride);
  const adapter = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate,
    clock: () => NOW,
  });
  const signal = adapter.admit({
    schema: 'TIGER_TRUST_SIGNAL_V1',
    signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
    status,
    signal_type: 'AUTHORIZATION_RISK',
    ...scope,
    issuer_ref_sha256: HEX('f'),
    sequence,
    issued_at_ms: issuedAt,
    fresh_until_ms: freshUntil,
    evidence_sha256: HEX('9'),
    state: 'PASS',
  });
  return createRevocationStateResolver({ clock: () => NOW }).observe({
    signal,
    expectedScope: scope,
  });
}

function trustedContext({
  revocation = 'PASS',
  revocationState,
  includeRevocation = true,
  now = NOW,
  marketOverride = {},
  proofOverride,
} = {}) {
  const trustedDna = validateTrustDna(dna());
  const currentEpochs = validateEpochVector(epochs());
  const releaseDnaSha256 = digestValidated(trustedDna, validateTrustDna);
  const context = {
    now_ms: now,
    trust_dna: trustedDna,
    current_epochs: currentEpochs,
    trust_pulse: {
      schema: 'TIGER_TRUST_PULSE_V1',
      evidence_class: 'SYNTHETIC_TEST_ONLY',
      release_dna_sha256: releaseDnaSha256,
      epoch_vector_sha256: digestValidated(currentEpochs, validateEpochVector),
      issued_at_ms: NOW - 20_000,
      fresh_until_ms: NOW + 120_000,
      state: 'PASS',
    },
    proofs: proofs(),
    market_state: {
      whole_vehicle_ad: false,
      transaction_authority_enabled: false,
      source_durable: true,
      deployed_durable_verified: true,
      release_evidence_schema: 'market-contact-replay-release-evidence-v1',
      ...marketOverride,
    },
    replay_binding_sha256: HEX('b'),
  };
  if (includeRevocation) {
    context.revocation_state = revocationState || trustedRevocationState({
      releaseDnaSha256,
      status: revocation,
    });
  }
  if (typeof proofOverride === 'function') proofOverride(context.proofs);
  return context;
}

function assertBlocked(result, code) {
  assert.equal(result.schema, 'TIGER_SCAE_DECISION_V1');
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reason_codes.includes(code), `${code} missing from ${result.reason_codes.join(',')}`);
}

test('missing M14 revocation state fails closed with a specific reason', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ includeRevocation: false }),
  });
  assertBlocked(result, 'TRUST_SIGNAL_MISSING');
});

test('shape-valid copied revocation state cannot enter SCAE as trusted evidence', () => {
  const context = trustedContext();
  context.revocation_state = { ...context.revocation_state };
  const result = evaluateSovereignAction({ request: request(), trustedContext: context });
  assertBlocked(result, 'TRUST_SIGNAL_UNTRUSTED');
});

test('trusted stale revocation state blocks using SCAE trusted time', () => {
  const base = trustedContext();
  const releaseDnaSha256 = digestValidated(base.trust_dna, validateTrustDna);
  const liveEarlier = trustedRevocationState({
    releaseDnaSha256,
    issuedAt: NOW - 20_000,
    freshUntil: NOW + 1_000,
  });
  base.revocation_state = liveEarlier;
  base.now_ms = NOW + 1_000;

  const result = evaluateSovereignAction({ request: request(), trustedContext: base });
  assertBlocked(result, 'TRUST_SIGNAL_STALE');
});

test('trusted revocation state with wrong exact scope fails closed', () => {
  const context = trustedContext();
  const releaseDnaSha256 = digestValidated(context.trust_dna, validateTrustDna);
  context.revocation_state = trustedRevocationState({
    releaseDnaSha256,
    scopeOverride: { subject_ref_sha256: HEX('8') },
  });
  const result = evaluateSovereignAction({ request: request(), trustedContext: context });
  assertBlocked(result, 'TRUST_SIGNAL_SCOPE_MISMATCH');
});

test('trusted REVOKED state blocks the exact governed capability', () => {
  const result = evaluateSovereignAction({
    request: request(),
    trustedContext: trustedContext({ revocation: 'REVOKED' }),
  });
  assertBlocked(result, 'TRUST_SIGNAL_REVOKED');
});

test('trusted PASS satisfies only signal requirement and cannot bypass proof geometry', () => {
  const context = trustedContext({
    proofOverride: (entries) => { delete entries.SOURCE; },
  });
  const result = evaluateSovereignAction({ request: request(), trustedContext: context });
  assertBlocked(result, 'TRUST_PROOF_GEOMETRY_UNSATISFIED');
});

test('whole-vehicle and transaction prohibitions override perfect M14 signal evidence', () => {
  assertBlocked(
    evaluateSovereignAction({
      request: request(),
      trustedContext: trustedContext({ marketOverride: { whole_vehicle_ad: true } }),
    }),
    'TRUST_MARKET_WHOLE_VEHICLE_FORBIDDEN',
  );
  assertBlocked(
    evaluateSovereignAction({
      request: request(),
      trustedContext: trustedContext({ marketOverride: { transaction_authority_enabled: true } }),
    }),
    'TRUST_MARKET_TRANSACTION_AUTHORITY_FORBIDDEN',
  );
});

test('complete trusted M14 PASS context can satisfy existing SCAE model', () => {
  const result = evaluateSovereignAction({ request: request(), trustedContext: trustedContext() });
  assert.equal(result.decision, 'ALLOW');
  assert.deepEqual(result.reason_codes, []);
});
