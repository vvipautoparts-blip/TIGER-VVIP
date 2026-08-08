'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EvidenceError,
  canonicalJson,
  sha256Hex,
  assertSha40,
  assertSha256,
  assertIsoUtc,
  assertAllowedCapsuleEnvironment,
  assertNoForbiddenShape,
  deepFreeze,
} = require('../scripts/tsrf/evidence/contracts.cjs');

test('canonicalJson sorts object keys recursively and preserves array order', () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: 3 }, list: [{ b: 2, a: 1 }, 7] }),
    '{"a":{"x":3,"y":2},"list":[{"a":1,"b":2},7],"z":1}',
  );
});

test('canonicalJson rejects ambiguous or non-deterministic value types', () => {
  for (const value of [
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    undefined,
    () => {},
    Symbol('x'),
    1n,
    new Date('2026-08-08T00:00:00.000Z'),
    new Map([['a', 1]]),
  ]) {
    assert.throws(
      () => canonicalJson({ value }),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_CANONICAL_VALUE_INVALID',
    );
  }
});

test('sha256Hex returns lowercase SHA-256 for bytes and text', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assert.match(sha256Hex(Buffer.from('abc')), /^[0-9a-f]{64}$/);
});

test('strict hash validators accept only lowercase exact-length hex', () => {
  assert.doesNotThrow(() => assertSha40('source_sha', 'a'.repeat(40)));
  assert.doesNotThrow(() => assertSha256('artifact_sha256', 'b'.repeat(64)));

  for (const value of ['a'.repeat(39), 'A'.repeat(40), 'g'.repeat(40)]) {
    assert.throws(
      () => assertSha40('source_sha', value),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_SHA40_INVALID',
    );
  }

  for (const value of ['b'.repeat(63), 'B'.repeat(64), 'z'.repeat(64)]) {
    assert.throws(
      () => assertSha256('artifact_sha256', value),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_SHA256_INVALID',
    );
  }
});

test('UTC timestamp validator requires canonical ISO-8601 UTC timestamps', () => {
  assert.doesNotThrow(() => assertIsoUtc('generated_at', '2026-08-08T12:34:56.000Z'));
  for (const value of [
    '2026-08-08T12:34:56Z',
    '2026-08-08T15:34:56.000+03:00',
    'not-a-time',
  ]) {
    assert.throws(
      () => assertIsoUtc('generated_at', value),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_TIMESTAMP_INVALID',
    );
  }
});

test('capsule environment policy is fail closed', () => {
  assert.doesNotThrow(() =>
    assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'STAGING', 'TRUE'));
  assert.doesNotThrow(() =>
    assertAllowedCapsuleEnvironment('DB_REBUILD_PROOF_CAPSULE', 'LOCAL', 'NOT_APPLICABLE'));
  assert.doesNotThrow(() =>
    assertAllowedCapsuleEnvironment('JO_LEGAL_PROOF_CAPSULE', 'NON_RUNTIME', 'NOT_APPLICABLE'));

  assert.throws(
    () => assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'PRODUCTION', 'TRUE'),
    (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_ENVIRONMENT_BLOCKED',
  );
  assert.throws(
    () => assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'STAGING', 'FALSE'),
    (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_KILL_SWITCH_INVALID',
  );
  assert.throws(
    () => assertAllowedCapsuleEnvironment('DB_REBUILD_PROOF_CAPSULE', 'LOCAL', 'TRUE'),
    (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_KILL_SWITCH_INVALID',
  );
  assert.throws(
    () => assertAllowedCapsuleEnvironment('UNKNOWN_CAPSULE', 'LOCAL', 'NOT_APPLICABLE'),
    (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_CAPSULE_CLASS_UNSUPPORTED',
  );
});

test('authority-shaped metadata is rejected recursively', () => {
  for (const payload of [
    { ownerApproved: true },
    { validation_results: { productionReady: true } },
    { nested: { mergeAuthorized: 'yes' } },
    { nested: { authorization: 'anything' } },
  ]) {
    assert.throws(
      () => assertNoForbiddenShape(payload),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_FORBIDDEN_FIELD',
    );
  }
});

test('secret-shaped metadata keys are rejected recursively', () => {
  for (const payload of [
    { api_key: 'redacted' },
    { nested: { password: 'redacted' } },
    { metadata: { service_role: 'redacted' } },
    { metadata: { private_key: 'redacted' } },
  ]) {
    assert.throws(
      () => assertNoForbiddenShape(payload),
      (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_SECRET_FIELD',
    );
  }
});

test('ordinary bounded evidence metadata is allowed', () => {
  assert.doesNotThrow(() => assertNoForbiddenShape({
    validation_results: {
      contract: 'PASS',
      behavior: 'PASS',
      artifact_sha256: 'a'.repeat(64),
    },
  }));
});

test('deepFreeze recursively freezes evidence objects and arrays', () => {
  const value = deepFreeze({ nested: { list: [{ result: 'PASS' }] } });
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.nested), true);
  assert.equal(Object.isFrozen(value.nested.list), true);
  assert.equal(Object.isFrozen(value.nested.list[0]), true);
  assert.throws(() => {
    value.nested.list[0].result = 'BLOCKED';
  }, TypeError);
});
