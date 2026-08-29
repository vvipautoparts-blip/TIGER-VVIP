'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const lease = require('../scripts/sovereignty/owner-execution-lease.cjs');
const D = (c) => `sha256:${c.repeat(64)}`;
const base = (overrides = {}) => ({
  schemaVersion: 'TIGER_SGF_OWNER_EXECUTION_LEASE_V1',
  rootId: 'OWNER_ROOT', ownerSubject: 'owner_subject_1', standingPrivilege: false,
  action: 'ACTIVATE_MARKET_CAPABILITY', marketId: 'US', capability: 'ADS_BILLING',
  releaseDigest: D('1'), policyDigest: D('2'), payloadDigest: D('3'),
  nonce: 'abcdefabcdefabcdefabcdefabcdefab',
  issuedAt: '2026-08-29T10:00:00.000Z', expiresAt: '2026-08-29T10:04:00.000Z',
  authenticatorAssurance: 'PHISHING_RESISTANT',
  signature: { keyId: 'owner-root-signing-v1', algorithm: 'EXTERNAL_VERIFIER', value: 'opaque-signature' },
  ...overrides
});
const context = (overrides = {}) => ({
  ownerSubject: 'owner_subject_1', action: 'ACTIVATE_MARKET_CAPABILITY', marketId: 'US', capability: 'ADS_BILLING',
  releaseDigest: D('1'), policyDigest: D('2'), payloadDigest: D('3'), ...overrides
});

test('owner lease authorizes one bounded phishing-resistant owner action', async () => {
  const result = await lease.authorizeOwnerExecutionLease({
    lease: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'),
    verifySignature: async () => true, consumeNonce: async () => true
  });
  assert.deepEqual(result, { rootId: 'OWNER_ROOT', ownerSubject: 'owner_subject_1', action: 'ACTIVATE_MARKET_CAPABILITY', authorized: true });
  assert.equal(Object.isFrozen(result), true);
});

test('owner lease forbids standing root privilege and weak authenticator assurance', async () => {
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base({ standingPrivilege: true }), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_STANDING_PRIVILEGE_FORBIDDEN' });
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base({ authenticatorAssurance: 'PASSWORD_ONLY' }), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_AUTHENTICATOR_INSUFFICIENT' });
});

test('owner lease prevents scope widening replay and long-lived privilege', async () => {
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base(), context: context({ marketId: 'DE' }), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_CONTEXT_MISMATCH' });
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base({ expiresAt: '2026-08-29T10:15:00.000Z' }), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_TTL_EXCEEDED' });
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => false }), { code: 'SGF_OWNER_LEASE_REPLAY_DENIED' });
});

test('owner lease requires external signature verification and exact release identity', async () => {
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_SIGNATURE_VERIFIER_REQUIRED' });
  await assert.rejects(() => lease.authorizeOwnerExecutionLease({ lease: base({ releaseDigest: 'latest' }), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => true }), { code: 'SGF_OWNER_LEASE_RELEASE_INVALID' });
});
