'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const compiler = require('../scripts/sovereignty/sovereign-compiler.cjs');
const D = (c) => `sha256:${c.repeat(64)}`;
const requirements = () => [
  { id: 'LEGAL', expiryRequired: true },
  { id: 'TAX', expiryRequired: false },
  { id: 'PRIVACY', expiryRequired: true },
  { id: 'SECURITY', expiryRequired: true },
  { id: 'OPERATIONS', expiryRequired: true }
];
const evidence = () => ({
  LEGAL: { digest: D('1'), validUntil: '2026-09-30T00:00:00.000Z' },
  TAX: { digest: D('2'), validUntil: null },
  PRIVACY: { digest: D('3'), validUntil: '2026-09-30T00:00:00.000Z' },
  SECURITY: { digest: D('4'), validUntil: '2026-09-30T00:00:00.000Z' },
  OPERATIONS: { digest: D('5'), validUntil: '2026-09-30T00:00:00.000Z' }
});
const base = (overrides = {}) => ({
  marketId: 'US', capability: 'ADS_DELIVERY', policyDigest: D('a'), releaseDigest: D('b'),
  requirements: requirements(), evidence: evidence(), now: () => Date.parse('2026-08-29T10:00:00.000Z'), ...overrides
});

test('compiler deterministically returns READY_FOR_OWNER_SEAL from explicit valid evidence', () => {
  const a = compiler.compileSovereignReadiness(base());
  const reversedEvidence = Object.fromEntries(Object.entries(evidence()).reverse());
  const b = compiler.compileSovereignReadiness(base({ evidence: reversedEvidence }));
  assert.equal(a.status, 'READY_FOR_OWNER_SEAL');
  assert.deepEqual(a.codes, []);
  assert.equal(a.compileDigest, b.compileDigest);
  assert.match(a.compileDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(a), true);
});

test('compiler returns deterministic deny codes for missing invalid or expired evidence', () => {
  const e = evidence();
  delete e.LEGAL;
  e.PRIVACY = { digest: 'bad', validUntil: '2026-09-30T00:00:00.000Z' };
  e.SECURITY.validUntil = '2026-08-01T00:00:00.000Z';
  const result = compiler.compileSovereignReadiness(base({ evidence: e }));
  assert.equal(result.status, 'DENY');
  assert.deepEqual(result.codes, [
    'DENY_LEGAL_MISSING',
    'DENY_PRIVACY_DIGEST_INVALID',
    'DENY_SECURITY_EXPIRED'
  ]);
});

test('compiler has no AI force-pass or fallback-market bypass', () => {
  for (const field of ['forcePass', 'aiOverride', 'fallbackMarket', 'defaultCountry']) {
    assert.throws(() => compiler.compileSovereignReadiness(base({ [field]: true })), { code: 'SGF_COMPILER_FIELD_FORBIDDEN' });
  }
});

test('compiler rejects floating release and ambiguous requirement policy', () => {
  assert.throws(() => compiler.compileSovereignReadiness(base({ releaseDigest: 'latest' })), { code: 'SGF_COMPILER_RELEASE_INVALID' });
  assert.throws(() => compiler.compileSovereignReadiness(base({ requirements: [{ id: 'LEGAL', expiryRequired: true }, { id: 'LEGAL', expiryRequired: true }] })), { code: 'SGF_COMPILER_REQUIREMENTS_INVALID' });
});
