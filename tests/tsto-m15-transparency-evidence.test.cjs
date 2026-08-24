'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TRANSPARENCY_RESULT_SCHEMA,
  MAX_TRANSPARENCY_LIVE_USE_MS,
  createTrustedTransparencyAdapter,
  validateTransparencyResult,
  digestTransparencyResult,
  isTrustedTransparencyResult,
} = require('../scripts/trust/transparency-evidence.cjs');

const HEX = (c) => c.repeat(64);
const NOW = 1_700_000_000_000;

function transparency(overrides = {}) {
  return {
    schema: 'TIGER_TRANSPARENCY_RESULT_V1',
    result_class: 'VERIFIED_TRANSPARENCY_STATEMENT',
    release_dna_sha256: HEX('1'),
    runtime_artifact_sha256: HEX('2'),
    statement_sha256: HEX('3'),
    registry_ref_sha256: HEX('4'),
    verifier_ref_sha256: HEX('5'),
    receipt_sha256: HEX('6'),
    verified_at_ms: NOW - 1_000,
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
  return createTrustedTransparencyAdapter({
    authenticate(candidate) {
      return candidate?.verified === true ? candidate.result : null;
    },
    clock,
  });
}

test('M15 transparency constants are source-owned', () => {
  assert.equal(TRANSPARENCY_RESULT_SCHEMA, 'TIGER_TRANSPARENCY_RESULT_V1');
  assert.equal(MAX_TRANSPARENCY_LIVE_USE_MS, 5 * 60 * 1000);
});

test('transparency result contract is exact and rejects zero security digests', () => {
  assert.equal(validateTransparencyResult(transparency(), { nowMs: NOW }).schema, TRANSPARENCY_RESULT_SCHEMA);
  expectCode(
    () => validateTransparencyResult({ ...transparency(), log_url: 'https://example.invalid' }, { nowMs: NOW }),
    'TRUST_TRANSPARENCY_INVALID',
  );
  expectCode(
    () => validateTransparencyResult(transparency({ receipt_sha256: HEX('0') }), { nowMs: NOW }),
    'TRUST_TRANSPARENCY_INVALID',
  );
});

test('trusted time enforces future, overlong, and stale transparency rejection', () => {
  expectCode(
    () => validateTransparencyResult(transparency({ verified_at_ms: NOW + 1 }), { nowMs: NOW }),
    'TRUST_TRANSPARENCY_FRESHNESS_INVALID',
  );
  expectCode(
    () => validateTransparencyResult(transparency({ verified_at_ms: NOW, fresh_until_ms: NOW + MAX_TRANSPARENCY_LIVE_USE_MS + 1 }), { nowMs: NOW }),
    'TRUST_TRANSPARENCY_FRESHNESS_INVALID',
  );
  expectCode(
    () => validateTransparencyResult(transparency({ fresh_until_ms: NOW }), { nowMs: NOW }),
    'TRUST_TRANSPARENCY_STALE',
  );
});

test('adapter authentication is mandatory and adapter clock owns freshness', () => {
  expectCode(
    () => adapter().admit({ verified: false, result: transparency() }),
    'TRUST_TRANSPARENCY_VERIFIER_UNTRUSTED',
  );

  const staleAdapter = adapter(() => NOW + 120_000);
  expectCode(
    () => staleAdapter.admit({ verified: true, result: transparency() }),
    'TRUST_TRANSPARENCY_STALE',
  );
});

test('only admitted original transparency result carries provenance', () => {
  const trusted = adapter().admit({ verified: true, result: transparency() });
  assert.equal(isTrustedTransparencyResult(trusted), true);
  assert.equal(Object.isFrozen(trusted), true);
  assert.match(digestTransparencyResult(trusted, { nowMs: NOW }), /^[0-9a-f]{64}$/);

  const copy = { ...trusted };
  const parsed = JSON.parse(JSON.stringify(trusted));
  assert.equal(isTrustedTransparencyResult(copy), false);
  assert.equal(isTrustedTransparencyResult(parsed), false);
  assert.deepEqual(validateTransparencyResult(copy, { nowMs: NOW }), copy);
});
