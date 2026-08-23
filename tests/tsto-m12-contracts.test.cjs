'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TrustContractError,
  TRUST_SCHEMAS,
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  validateTrustPulse,
  digestValidated,
} = require('../scripts/trust/contracts.cjs');

const SHA40_A = 'a'.repeat(40);
const SHA40_B = 'b'.repeat(40);
const SHA256_C = 'c'.repeat(64);
const SHA256_D = 'd'.repeat(64);
const SHA256_E = 'e'.repeat(64);
const SHA256_F = 'f'.repeat(64);
const SHA256_1 = '1'.repeat(64);

function validDna() {
  return {
    schema: 'TIGER_TRUST_DNA_V1',
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: SHA40_A,
    source_tree: SHA40_B,
    source_readiness_sha256: SHA256_C,
    release_evidence_contract_sha256: SHA256_D,
    authority_policy_sha256: SHA256_E,
  };
}

function validEpochs() {
  return {
    schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
    owner_epoch: 1,
    policy_epoch: 1,
    market_epoch: 1,
    ai_policy_epoch: 1,
    crypto_epoch: 1,
    country_epochs: [
      { country_code: 'JO', epoch: 1 },
      { country_code: 'US', epoch: 2 },
    ],
  };
}

function validPulse() {
  return {
    schema: 'TIGER_TRUST_PULSE_V1',
    evidence_class: 'SYNTHETIC_TEST_ONLY',
    release_dna_sha256: SHA256_F,
    epoch_vector_sha256: SHA256_1,
    issued_at_ms: 1000,
    fresh_until_ms: 2000,
    state: 'PASS',
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

test('canonicalJson recursively sorts object keys while preserving array order', () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: 3 }, list: ['b', 'a'] }),
    '{"a":{"x":3,"y":2},"list":["b","a"],"z":1}',
  );
});

test('canonicalJson rejects unsafe and non-canonical value classes', () => {
  expectCode(() => canonicalJson({ value: Number.NaN }), 'TRUST_CANONICAL_INVALID');
  expectCode(() => canonicalJson({ value: undefined }), 'TRUST_CANONICAL_INVALID');
  expectCode(() => canonicalJson(new Date()), 'TRUST_CANONICAL_INVALID');

  const cyclic = {};
  cyclic.self = cyclic;
  expectCode(() => canonicalJson(cyclic), 'TRUST_CANONICAL_INVALID');

  const polluted = JSON.parse('{"__proto__":{"polluted":true}}');
  expectCode(() => canonicalJson(polluted), 'TRUST_CANONICAL_INVALID');
});

test('sha256Hex is deterministic over UTF-8 canonical text', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('Trust DNA is exact, normalized, immutable, and closed', () => {
  const dna = validateTrustDna(validDna());
  assert.deepEqual(dna, validDna());
  assert.ok(Object.isFrozen(dna));
  assert.equal(dna.schema, TRUST_SCHEMAS.TRUST_DNA);
  assert.throws(() => { dna.repository = 'evil/repo'; }, TypeError);

  expectCode(
    () => validateTrustDna({ ...validDna(), extra: true }),
    'TRUST_DNA_INVALID',
  );
  expectCode(
    () => validateTrustDna({ ...validDna(), source_sha: 'A'.repeat(40) }),
    'TRUST_DNA_INVALID',
  );
});

test('epoch vector requires positive integers and canonical sorted unique countries', () => {
  const epochs = validateEpochVector(validEpochs());
  assert.ok(Object.isFrozen(epochs));
  assert.ok(Object.isFrozen(epochs.country_epochs));
  assert.ok(Object.isFrozen(epochs.country_epochs[0]));

  expectCode(
    () => validateEpochVector({ ...validEpochs(), owner_epoch: -1 }),
    'TRUST_EPOCH_VECTOR_INVALID',
  );
  expectCode(
    () => validateEpochVector({ ...validEpochs(), country_epochs: [
      { country_code: 'US', epoch: 2 },
      { country_code: 'JO', epoch: 1 },
    ] }),
    'TRUST_EPOCH_VECTOR_INVALID',
  );
  expectCode(
    () => validateEpochVector({ ...validEpochs(), country_epochs: [
      { country_code: 'JO', epoch: 1 },
      { country_code: 'JO', epoch: 2 },
    ] }),
    'TRUST_EPOCH_VECTOR_INVALID',
  );
});

test('synthetic Trust Pulse has strict freshness ordering and closed schema', () => {
  const pulse = validateTrustPulse(validPulse());
  assert.ok(Object.isFrozen(pulse));
  assert.equal(pulse.evidence_class, 'SYNTHETIC_TEST_ONLY');
  assert.equal(pulse.state, 'PASS');

  expectCode(
    () => validateTrustPulse({ ...validPulse(), fresh_until_ms: 1000 }),
    'TRUST_PULSE_INVALID',
  );
  expectCode(
    () => validateTrustPulse({ ...validPulse(), evidence_class: 'PRODUCTION' }),
    'TRUST_PULSE_INVALID',
  );
  expectCode(
    () => validateTrustPulse({ ...validPulse(), environment: 'production' }),
    'TRUST_PULSE_INVALID',
  );
});

test('digestValidated is stable across source key order and validates first', () => {
  const one = validDna();
  const two = {
    authority_policy_sha256: one.authority_policy_sha256,
    source_tree: one.source_tree,
    schema: one.schema,
    source_readiness_sha256: one.source_readiness_sha256,
    repository: one.repository,
    release_evidence_contract_sha256: one.release_evidence_contract_sha256,
    source_sha: one.source_sha,
  };

  assert.equal(
    digestValidated(one, validateTrustDna),
    digestValidated(two, validateTrustDna),
  );
  expectCode(
    () => digestValidated({ ...one, unexpected: 1 }, validateTrustDna),
    'TRUST_DNA_INVALID',
  );
});
