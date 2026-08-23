'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ATTESTATION_RESULT_SCHEMA,
  MAX_ATTESTATION_LIFETIME_MS,
  createTrustedVerifierAdapter,
  validateAttestationResult,
  digestAttestationResult,
  isTrustedAttestationResult,
} = require('../scripts/trust/runtime-attestation.cjs');

const HEX = (c, n = 64) => c.repeat(n);
const NOW = 1_000_000;

function attestation(overrides = {}) {
  return {
    schema: 'TIGER_ATTESTATION_RESULT_V1',
    result_class: 'VERIFIED_RUNTIME_APPRAISAL',
    environment: 'staging',
    release_sha: HEX('a', 40),
    runtime_artifact_sha256: HEX('1'),
    verifier_ref_sha256: HEX('2'),
    attester_ref_sha256: HEX('3'),
    evidence_sha256: HEX('4'),
    appraisal_policy_sha256: HEX('5'),
    freshness_binding_sha256: HEX('6'),
    issued_at_ms: NOW - 30_000,
    fresh_until_ms: NOW + 120_000,
    state: 'PASS',
    ...overrides,
  };
}

function adapter() {
  return createTrustedVerifierAdapter({
    authenticate(external) {
      return external?.authenticated === true ? external.result : null;
    },
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    assert.equal(error?.message, code);
    return true;
  });
}

test('M13 normalized attestation result is closed, immutable, and digestable', () => {
  const result = validateAttestationResult(attestation(), { nowMs: NOW });
  assert.equal(result.schema, ATTESTATION_RESULT_SCHEMA);
  assert.ok(Object.isFrozen(result));
  assert.match(digestAttestationResult(result, { nowMs: NOW }), /^[0-9a-f]{64}$/);
  expectCode(
    () => validateAttestationResult({ ...attestation(), unexpected: true }, { nowMs: NOW }),
    'ATTESTATION_RESULT_INVALID',
  );
});

test('shape validation alone never grants trusted verifier provenance', () => {
  const shaped = validateAttestationResult(attestation(), { nowMs: NOW });
  assert.equal(isTrustedAttestationResult(shaped), false);

  const trusted = adapter().admit(
    { authenticated: true, result: attestation() },
    { nowMs: NOW },
  );
  assert.equal(isTrustedAttestationResult(trusted), true);
  assert.ok(Object.isFrozen(trusted));
});

test('trusted adapter fails closed when external authentication does not succeed', () => {
  expectCode(
    () => adapter().admit({ authenticated: false, result: attestation() }, { nowMs: NOW }),
    'ATTESTATION_VERIFIER_UNTRUSTED',
  );
});

test('attestation freshness is bounded by trusted time and the module-owned five-minute cap', () => {
  assert.equal(MAX_ATTESTATION_LIFETIME_MS, 5 * 60 * 1000);
  expectCode(
    () => validateAttestationResult(attestation({
      issued_at_ms: NOW - 10_000,
      fresh_until_ms: NOW - 1,
    }), { nowMs: NOW }),
    'ATTESTATION_RESULT_STALE',
  );
  expectCode(
    () => validateAttestationResult(attestation({
      issued_at_ms: NOW + 1,
      fresh_until_ms: NOW + 10_000,
    }), { nowMs: NOW }),
    'ATTESTATION_FRESHNESS_INVALID',
  );
  expectCode(
    () => validateAttestationResult(attestation({
      issued_at_ms: NOW - 1,
      fresh_until_ms: NOW - 1 + MAX_ATTESTATION_LIFETIME_MS + 1,
    }), { nowMs: NOW }),
    'ATTESTATION_FRESHNESS_INVALID',
  );
});

test('all-zero security digests and non-PASS appraisal fail closed', () => {
  for (const field of [
    'runtime_artifact_sha256',
    'verifier_ref_sha256',
    'attester_ref_sha256',
    'evidence_sha256',
    'appraisal_policy_sha256',
    'freshness_binding_sha256',
  ]) {
    expectCode(
      () => validateAttestationResult(attestation({ [field]: HEX('0') }), { nowMs: NOW }),
      'ATTESTATION_RESULT_INVALID',
    );
  }
  expectCode(
    () => validateAttestationResult(attestation({ state: 'BLOCKED' }), { nowMs: NOW }),
    'ATTESTATION_RESULT_INVALID',
  );
});

test('environment and release identifiers are exact closed values', () => {
  expectCode(
    () => validateAttestationResult(attestation({ environment: 'STAGING' }), { nowMs: NOW }),
    'ATTESTATION_RESULT_INVALID',
  );
  expectCode(
    () => validateAttestationResult(attestation({ release_sha: HEX('A', 40) }), { nowMs: NOW }),
    'ATTESTATION_RESULT_INVALID',
  );
});
