'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TRUST_SIGNAL_SCHEMA,
  TRUST_SIGNAL_CLASS,
  MAX_TRUST_SIGNAL_LIFETIME_MS,
  createTrustedSignalAdapter,
  validateTrustSignal,
  digestTrustSignal,
  isTrustedTrustSignal,
} = require('../scripts/trust/trust-signals.cjs');

const HEX = (c) => c.repeat(64);
const NOW = 2_000_000;

function signal(overrides = {}) {
  return {
    schema: 'TIGER_TRUST_SIGNAL_V1',
    signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
    status: 'PASS',
    signal_type: 'SESSION_RISK',
    subject_ref_sha256: HEX('1'),
    resource_ref_sha256: HEX('2'),
    action_profile_ref_sha256: HEX('3'),
    country_ref_sha256: HEX('4'),
    release_dna_sha256: HEX('5'),
    issuer_ref_sha256: HEX('6'),
    sequence: 7,
    issued_at_ms: NOW - 10_000,
    fresh_until_ms: NOW + 60_000,
    evidence_sha256: HEX('7'),
    state: 'PASS',
    ...overrides,
  };
}

function adapter({ now = NOW, authenticate } = {}) {
  return createTrustedSignalAdapter({
    authenticate: authenticate || ((external) => (
      external?.authenticated === true ? external.signal : null
    )),
    clock: () => now,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    assert.equal(error?.message, code);
    return true;
  });
}

test('M14 signal contract is exact, immutable, and digestable', () => {
  const value = validateTrustSignal(signal(), { nowMs: NOW });
  assert.equal(value.schema, TRUST_SIGNAL_SCHEMA);
  assert.equal(value.signal_class, TRUST_SIGNAL_CLASS);
  assert.ok(Object.isFrozen(value));
  assert.match(digestTrustSignal(value, { nowMs: NOW }), /^[0-9a-f]{64}$/);

  expectCode(
    () => validateTrustSignal({ ...signal(), unexpected: true }, { nowMs: NOW }),
    'TRUST_SIGNAL_INVALID',
  );
});

test('shape validation alone never grants trusted signal provenance', () => {
  const shaped = validateTrustSignal(signal(), { nowMs: NOW });
  assert.equal(isTrustedTrustSignal(shaped), false);

  const trusted = adapter().admit({ authenticated: true, signal: signal() });
  assert.equal(isTrustedTrustSignal(trusted), true);
  assert.ok(Object.isFrozen(trusted));

  assert.equal(isTrustedTrustSignal({ ...trusted }), false);
  assert.equal(isTrustedTrustSignal(JSON.parse(JSON.stringify(trusted))), false);
});

test('trusted adapter fails closed when external authentication fails', () => {
  expectCode(
    () => adapter().admit({ authenticated: false, signal: signal() }),
    'TRUST_SIGNAL_ISSUER_UNTRUSTED',
  );
});

test('trusted adapter owns current time and rejects invalid clock output', () => {
  const external = {
    authenticated: true,
    signal: signal({ issued_at_ms: NOW - 5_000, fresh_until_ms: NOW + 5_000 }),
    nowMs: NOW - 999_999,
  };
  const trusted = adapter().admit(external);
  assert.equal(isTrustedTrustSignal(trusted), true);

  const badClock = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate.signal,
    clock: () => -1,
  });
  expectCode(
    () => badClock.admit({ signal: signal() }),
    'TRUST_SIGNAL_TIME_INVALID',
  );
});

test('signal freshness is bounded by trusted time and a module-owned five-minute cap', () => {
  assert.equal(MAX_TRUST_SIGNAL_LIFETIME_MS, 5 * 60 * 1000);

  expectCode(
    () => validateTrustSignal(signal({
      issued_at_ms: NOW - 20_000,
      fresh_until_ms: NOW - 1,
    }), { nowMs: NOW }),
    'TRUST_SIGNAL_STALE',
  );

  expectCode(
    () => validateTrustSignal(signal({
      issued_at_ms: NOW + 1,
      fresh_until_ms: NOW + 10_000,
    }), { nowMs: NOW }),
    'TRUST_SIGNAL_FRESHNESS_INVALID',
  );

  expectCode(
    () => validateTrustSignal(signal({
      issued_at_ms: NOW - 1,
      fresh_until_ms: NOW - 1 + MAX_TRUST_SIGNAL_LIFETIME_MS + 1,
    }), { nowMs: NOW }),
    'TRUST_SIGNAL_FRESHNESS_INVALID',
  );
});

test('all security digests reject all-zero values', () => {
  for (const field of [
    'subject_ref_sha256',
    'resource_ref_sha256',
    'action_profile_ref_sha256',
    'country_ref_sha256',
    'release_dna_sha256',
    'issuer_ref_sha256',
    'evidence_sha256',
  ]) {
    expectCode(
      () => validateTrustSignal(signal({ [field]: HEX('0') }), { nowMs: NOW }),
      'TRUST_SIGNAL_INVALID',
    );
  }
});

test('status, class, schema, sequence and state are closed', () => {
  for (const override of [
    { schema: 'TIGER_TRUST_SIGNAL_V2' },
    { signal_class: 'SELF_ASSERTED' },
    { status: 'ALLOW' },
    { sequence: -1 },
    { sequence: 1.5 },
    { state: 'BLOCKED' },
  ]) {
    expectCode(
      () => validateTrustSignal(signal(override), { nowMs: NOW }),
      'TRUST_SIGNAL_INVALID',
    );
  }

  const revoked = validateTrustSignal(signal({ status: 'REVOKED' }), { nowMs: NOW });
  assert.equal(revoked.status, 'REVOKED');
});
