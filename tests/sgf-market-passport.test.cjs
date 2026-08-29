'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../scripts/sovereignty/market-activation-passport.cjs');

const D = (c) => `sha256:${c.repeat(64)}`;
const base = () => ({
  schemaVersion: 'TIGER_SGF_MARKET_ACTIVATION_PASSPORT_V1',
  marketId: 'US',
  capability: 'ADS_BILLING',
  genomeDigest: D('1'),
  releaseDigest: D('2'),
  legalEvidenceDigest: D('3'),
  securityEvidenceDigest: D('4'),
  paymentEvidenceDigest: D('5'),
  privacyEvidenceDigest: D('6'),
  operationsEvidenceDigest: D('7'),
  ownerAuthorizationDigest: D('8'),
  issuedAt: '2026-08-29T09:00:00.000Z',
  expiresAt: '2026-08-30T09:00:00.000Z',
  revocationState: 'ACTIVE',
  signature: { keyId: 'owner-root-kms-key-v1', algorithm: 'EXTERNAL_VERIFIER', value: 'opaque-signature' }
});
const context = () => ({
  marketId: 'US',
  capability: 'ADS_BILLING',
  genomeDigest: D('1'),
  releaseDigest: D('2')
});

test('passport authorizes only an exact market capability genome and release match', async () => {
  const result = await gate.authorizeMarketPassport({
    passport: base(),
    context: context(),
    now: () => Date.parse('2026-08-29T10:00:00.000Z'),
    verifySignature: async () => true
  });
  assert.deepEqual(result, {
    marketId: 'US', capability: 'ADS_BILLING', genomeDigest: D('1'), releaseDigest: D('2'), authorized: true
  });
  assert.equal(Object.isFrozen(result), true);
});

test('passport fails closed on cross-market capability genome or release reuse', async () => {
  for (const override of [
    { marketId: 'DE' },
    { capability: 'PULSE' },
    { genomeDigest: D('9') },
    { releaseDigest: D('a') }
  ]) {
    await assert.rejects(() => gate.authorizeMarketPassport({
      passport: base(), context: { ...context(), ...override },
      now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => true
    }), { code: 'SGF_PASSPORT_CONTEXT_MISMATCH' });
  }
});

test('passport requires a successful external signature verifier', async () => {
  await assert.rejects(() => gate.authorizeMarketPassport({ passport: base(), context: context(), now: () => Date.parse('2026-08-29T10:00:00.000Z') }), { code: 'SGF_PASSPORT_SIGNATURE_VERIFIER_REQUIRED' });
  await assert.rejects(() => gate.authorizeMarketPassport({ passport: base(), context: context(), now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => false }), { code: 'SGF_PASSPORT_SIGNATURE_INVALID' });
});

test('passport rejects expired revoked malformed and floating release authority', async () => {
  const cases = [
    [{ expiresAt: '2026-08-29T09:30:00.000Z' }, 'SGF_PASSPORT_EXPIRED'],
    [{ revocationState: 'REVOKED' }, 'SGF_PASSPORT_REVOKED'],
    [{ marketId: 'USA' }, 'SGF_PASSPORT_MARKET_INVALID'],
    [{ releaseDigest: 'latest' }, 'SGF_PASSPORT_RELEASE_INVALID']
  ];
  for (const [patch, code] of cases) {
    await assert.rejects(() => gate.authorizeMarketPassport({
      passport: { ...base(), ...patch }, context: context(),
      now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => true
    }), { code });
  }
});
