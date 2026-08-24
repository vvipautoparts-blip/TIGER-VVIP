'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WORKLOAD_IDENTITY_SCHEMA,
  MAX_WORKLOAD_IDENTITY_LIFETIME_MS,
  createTrustedWorkloadIdentityAdapter,
  validateWorkloadIdentity,
  digestWorkloadIdentity,
  isTrustedWorkloadIdentity,
} = require('../scripts/trust/workload-identity.cjs');

const HEX = (c) => c.repeat(64);
const NOW = 1_700_000_000_000;

function identity(overrides = {}) {
  return {
    schema: 'TIGER_WORKLOAD_IDENTITY_V1',
    identity_class: 'AUTHENTICATED_WORKLOAD_IDENTITY',
    environment: 'staging',
    release_dna_sha256: HEX('1'),
    runtime_artifact_sha256: HEX('2'),
    workload_ref_sha256: HEX('3'),
    issuer_ref_sha256: HEX('4'),
    evidence_sha256: HEX('5'),
    issued_at_ms: NOW - 1_000,
    fresh_until_ms: NOW + 60_000,
    state: 'PASS',
    ...overrides,
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    assert.equal(error?.message, code);
    return true;
  });
}

function adapter(clock = () => NOW) {
  return createTrustedWorkloadIdentityAdapter({
    authenticate(candidate) {
      return candidate?.authenticated === true ? candidate.identity : null;
    },
    clock,
  });
}

test('M15 workload identity constants are source-owned', () => {
  assert.equal(WORKLOAD_IDENTITY_SCHEMA, 'TIGER_WORKLOAD_IDENTITY_V1');
  assert.equal(MAX_WORKLOAD_IDENTITY_LIFETIME_MS, 5 * 60 * 1000);
});

test('workload identity contract is exact and rejects zero security digests', () => {
  assert.equal(validateWorkloadIdentity(identity(), { nowMs: NOW }).schema, WORKLOAD_IDENTITY_SCHEMA);
  expectCode(
    () => validateWorkloadIdentity({ ...identity(), admin: true }, { nowMs: NOW }),
    'TRUST_WORKLOAD_IDENTITY_INVALID',
  );
  expectCode(
    () => validateWorkloadIdentity(identity({ evidence_sha256: HEX('0') }), { nowMs: NOW }),
    'TRUST_WORKLOAD_IDENTITY_INVALID',
  );
});

test('trusted time enforces future, overlong, and expired workload identity rejection', () => {
  expectCode(
    () => validateWorkloadIdentity(identity({ issued_at_ms: NOW + 1 }), { nowMs: NOW }),
    'TRUST_WORKLOAD_IDENTITY_FRESHNESS_INVALID',
  );
  expectCode(
    () => validateWorkloadIdentity(identity({ issued_at_ms: NOW, fresh_until_ms: NOW + MAX_WORKLOAD_IDENTITY_LIFETIME_MS + 1 }), { nowMs: NOW }),
    'TRUST_WORKLOAD_IDENTITY_FRESHNESS_INVALID',
  );
  expectCode(
    () => validateWorkloadIdentity(identity({ fresh_until_ms: NOW }), { nowMs: NOW }),
    'TRUST_WORKLOAD_IDENTITY_STALE',
  );
});

test('adapter authentication is mandatory and adapter clock owns freshness', () => {
  expectCode(
    () => adapter().admit({ authenticated: false, identity: identity() }),
    'TRUST_WORKLOAD_IDENTITY_ISSUER_UNTRUSTED',
  );

  const staleAdapter = adapter(() => NOW + 120_000);
  expectCode(
    () => staleAdapter.admit({ authenticated: true, identity: identity() }),
    'TRUST_WORKLOAD_IDENTITY_STALE',
  );
});

test('only admitted original workload identity carries provenance', () => {
  const trusted = adapter().admit({ authenticated: true, identity: identity() });
  assert.equal(isTrustedWorkloadIdentity(trusted), true);
  assert.equal(Object.isFrozen(trusted), true);
  assert.match(digestWorkloadIdentity(trusted, { nowMs: NOW }), /^[0-9a-f]{64}$/);

  const copy = { ...trusted };
  const parsed = JSON.parse(JSON.stringify(trusted));
  assert.equal(isTrustedWorkloadIdentity(copy), false);
  assert.equal(isTrustedWorkloadIdentity(parsed), false);
  assert.deepEqual(validateWorkloadIdentity(copy, { nowMs: NOW }), copy);
});
