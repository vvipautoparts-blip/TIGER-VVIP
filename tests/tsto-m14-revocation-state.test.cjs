'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTrustedSignalAdapter,
  validateTrustSignal,
} = require('../scripts/trust/trust-signals.cjs');
const {
  REVOCATION_STATE_SCHEMA,
  createRevocationStateResolver,
  validateRevocationState,
  digestRevocationState,
  digestSignalScope,
  isTrustedRevocationState,
} = require('../scripts/trust/revocation-state.cjs');

const HEX = (c) => c.repeat(64);
const NOW = 3_000_000;

function scope(overrides = {}) {
  return {
    subject_ref_sha256: HEX('1'),
    resource_ref_sha256: HEX('2'),
    action_profile_ref_sha256: HEX('3'),
    country_ref_sha256: HEX('4'),
    release_dna_sha256: HEX('5'),
    ...overrides,
  };
}

function signal(overrides = {}) {
  return {
    schema: 'TIGER_TRUST_SIGNAL_V1',
    signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
    status: 'PASS',
    signal_type: 'SESSION_RISK',
    ...scope(),
    issuer_ref_sha256: HEX('6'),
    sequence: 1,
    issued_at_ms: NOW - 10_000,
    fresh_until_ms: NOW + 60_000,
    evidence_sha256: HEX('7'),
    state: 'PASS',
    ...overrides,
  };
}

function trustedSignal(value = signal(), now = NOW) {
  const adapter = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate,
    clock: () => now,
  });
  return adapter.admit(value);
}

function resolver(now = NOW) {
  return createRevocationStateResolver({ clock: () => now });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    assert.equal(error?.message, code);
    return true;
  });
}

test('revocation state is closed, immutable, digestable, and provenance protected', () => {
  const value = resolver().observe({ signal: trustedSignal(), expectedScope: scope() });
  assert.equal(value.schema, REVOCATION_STATE_SCHEMA);
  assert.equal(value.effective_status, 'PASS');
  assert.equal(value.scope_digest_sha256, digestSignalScope(scope()));
  assert.ok(Object.isFrozen(value));
  assert.equal(isTrustedRevocationState(value), true);
  assert.match(digestRevocationState(value, { nowMs: NOW }), /^[0-9a-f]{64}$/);

  const shaped = validateRevocationState(value, { nowMs: NOW });
  assert.equal(isTrustedRevocationState(shaped), false);
  assert.equal(isTrustedRevocationState({ ...value }), false);
  assert.equal(isTrustedRevocationState(JSON.parse(JSON.stringify(value))), false);

  expectCode(
    () => validateRevocationState({ ...value, unexpected: true }, { nowMs: NOW }),
    'TRUST_REVOCATION_STATE_INVALID',
  );
});

test('merely shape-valid signals cannot mint trusted revocation state', () => {
  const shapedSignal = validateTrustSignal(signal(), { nowMs: NOW });
  expectCode(
    () => resolver().observe({ signal: shapedSignal, expectedScope: scope() }),
    'TRUST_SIGNAL_UNTRUSTED',
  );
});

test('resolver requires exact capability scope and release binding', () => {
  const r = resolver();
  const trusted = trustedSignal();

  for (const field of [
    'subject_ref_sha256',
    'resource_ref_sha256',
    'action_profile_ref_sha256',
    'country_ref_sha256',
    'release_dna_sha256',
  ]) {
    expectCode(
      () => r.observe({
        signal: trusted,
        expectedScope: scope({ [field]: HEX('8') }),
      }),
      'TRUST_SIGNAL_SCOPE_MISMATCH',
    );
  }
});

test('higher sequence supersedes lower sequence for the same scope and issuer', () => {
  const r = resolver();
  const first = r.observe({
    signal: trustedSignal(signal({ sequence: 4, status: 'PASS' })),
    expectedScope: scope(),
  });
  const second = r.observe({
    signal: trustedSignal(signal({ sequence: 5, status: 'REVOKED', evidence_sha256: HEX('8') })),
    expectedScope: scope(),
  });

  assert.equal(first.sequence, 4);
  assert.equal(first.effective_status, 'PASS');
  assert.equal(second.sequence, 5);
  assert.equal(second.effective_status, 'REVOKED');
});

test('older PASS cannot erase a newer REVOKED state', () => {
  const r = resolver();
  r.observe({
    signal: trustedSignal(signal({ sequence: 9, status: 'REVOKED', evidence_sha256: HEX('8') })),
    expectedScope: scope(),
  });

  expectCode(
    () => r.observe({
      signal: trustedSignal(signal({ sequence: 8, status: 'PASS' })),
      expectedScope: scope(),
    }),
    'TRUST_SIGNAL_SEQUENCE_ROLLBACK',
  );
});

test('same-sequence identical signal is idempotent but conflicting signal fails closed', () => {
  const r = resolver();
  const original = trustedSignal(signal({ sequence: 11, status: 'REVOKED' }));
  const first = r.observe({ signal: original, expectedScope: scope() });
  const duplicate = trustedSignal(signal({ sequence: 11, status: 'REVOKED' }));
  const second = r.observe({ signal: duplicate, expectedScope: scope() });

  assert.equal(second, first);

  expectCode(
    () => r.observe({
      signal: trustedSignal(signal({
        sequence: 11,
        status: 'PASS',
        evidence_sha256: HEX('8'),
      })),
      expectedScope: scope(),
    }),
    'TRUST_SIGNAL_SEQUENCE_CONFLICT',
  );
});

test('resolver clock is authoritative and stale signals/states fail closed', () => {
  const expired = signal({
    issued_at_ms: NOW - 20_000,
    fresh_until_ms: NOW - 1,
  });

  const adapter = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate,
    clock: () => NOW - 10_000,
  });
  const wasTrustedEarlier = adapter.admit(expired);

  expectCode(
    () => resolver(NOW).observe({ signal: wasTrustedEarlier, expectedScope: scope() }),
    'TRUST_SIGNAL_STALE',
  );

  const live = resolver().observe({ signal: trustedSignal(), expectedScope: scope() });
  expectCode(
    () => validateRevocationState(live, { nowMs: live.fresh_until_ms }),
    'TRUST_SIGNAL_STALE',
  );
});

test('scope and state outputs are evidence-minimized', () => {
  const r = resolver();
  const state = r.observe({ signal: trustedSignal(), expectedScope: scope() });
  const serialized = JSON.stringify(state).toLowerCase();

  for (const forbidden of [
    'nonce', 'password', 'credential', 'private_key', 'database_url',
    'subject_ref"', 'resource_ref"', 'country_code', 'precise_location',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  assert.deepEqual(Object.keys(state).sort(), [
    'effective_status',
    'fresh_until_ms',
    'issued_at_ms',
    'issuer_ref_sha256',
    'release_dna_sha256',
    'schema',
    'scope_digest_sha256',
    'sequence',
    'signal_digest_sha256',
    'state',
  ].sort());
});
