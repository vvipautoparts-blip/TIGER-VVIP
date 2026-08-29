'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const policy = require('../scripts/sovereignty/signed-policy-bundle.cjs');
const digest = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const bytes = Buffer.from('{"rules":["ALLOW_EXPLICIT_ONLY"]}', 'utf8');
const bundle = (overrides = {}) => ({
  schemaVersion: 'TIGER_SGF_SIGNED_POLICY_BUNDLE_V1',
  marketId: 'US', policyId: 'ads-us', version: 1,
  capabilities: ['ADS_DELIVERY', 'ADS_BILLING'], contentDigest: digest(bytes),
  issuedAt: '2026-08-29T09:00:00.000Z', validUntil: '2026-09-29T09:00:00.000Z',
  signature: { keyId: 'policy-kms-v1', algorithm: 'EXTERNAL_VERIFIER', value: 'opaque-signature' },
  ...overrides
});

test('policy bundle verifies exact bytes metadata and external signature', async () => {
  const result = await policy.verifySignedPolicyBundle({
    bundle: bundle(), payloadBytes: bytes, now: () => Date.parse('2026-08-29T10:00:00.000Z'),
    verifySignature: async ({ payload }) => typeof payload === 'string' && payload.includes(digest(bytes))
  });
  assert.equal(result.verified, true);
  assert.equal(result.marketId, 'US');
  assert.deepEqual(result.capabilities, ['ADS_DELIVERY', 'ADS_BILLING']);
  assert.equal(Object.isFrozen(result), true);
});

test('policy bundle rejects changed bytes and unsigned or invalid signatures', async () => {
  await assert.rejects(() => policy.verifySignedPolicyBundle({ bundle: bundle(), payloadBytes: Buffer.from('changed'), now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => true }), { code: 'SGF_POLICY_CONTENT_DIGEST_MISMATCH' });
  await assert.rejects(() => policy.verifySignedPolicyBundle({ bundle: bundle(), payloadBytes: bytes, now: () => Date.parse('2026-08-29T10:00:00.000Z') }), { code: 'SGF_POLICY_SIGNATURE_VERIFIER_REQUIRED' });
  await assert.rejects(() => policy.verifySignedPolicyBundle({ bundle: bundle(), payloadBytes: bytes, now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => false }), { code: 'SGF_POLICY_SIGNATURE_INVALID' });
});

test('policy bundle rejects expiry duplicate capabilities and malformed market metadata', async () => {
  const cases = [
    [bundle({ validUntil: '2026-08-29T09:30:00.000Z' }), 'SGF_POLICY_EXPIRED'],
    [bundle({ capabilities: ['PULSE', 'PULSE'] }), 'SGF_POLICY_CAPABILITIES_INVALID'],
    [bundle({ marketId: 'USA' }), 'SGF_POLICY_MARKET_INVALID']
  ];
  for (const [candidate, code] of cases) {
    await assert.rejects(() => policy.verifySignedPolicyBundle({ bundle: candidate, payloadBytes: bytes, now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => true }), { code });
  }
});

test('policy bundle forbids sovereign fallback fields', async () => {
  for (const patch of [{ defaultCountry: 'JO' }, { defaultCurrency: 'JOD' }, { fallbackMarket: 'JO' }]) {
    await assert.rejects(() => policy.verifySignedPolicyBundle({ bundle: bundle(patch), payloadBytes: bytes, now: () => Date.parse('2026-08-29T10:00:00.000Z'), verifySignature: async () => true }), { code: 'SGF_POLICY_FIELD_FORBIDDEN' });
  }
});
