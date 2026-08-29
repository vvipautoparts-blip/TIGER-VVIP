'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../scripts/sovereignty/genome-execution-seal.cjs');

const D = (c) => `sha256:${c.repeat(64)}`;
const base = () => ({
  schemaVersion: 'TIGER_SGF_EXECUTION_SEAL_V1',
  subject: 'user_123',
  action: 'CREATE_PULSE_QUOTE',
  marketId: 'US',
  capability: 'PULSE',
  genomeDigest: D('1'),
  releaseDigest: D('2'),
  policyDigest: D('3'),
  passportDigest: D('4'),
  nonce: '0123456789abcdef0123456789abcdef',
  issuedAt: '2026-08-29T10:00:00.000Z',
  expiresAt: '2026-08-29T10:03:00.000Z',
  signature: { keyId: 'execution-key-v1', algorithm: 'EXTERNAL_VERIFIER', value: 'opaque-signature' }
});
const context = () => ({
  subject: 'user_123', action: 'CREATE_PULSE_QUOTE', marketId: 'US', capability: 'PULSE',
  genomeDigest: D('1'), releaseDigest: D('2'), policyDigest: D('3'), passportDigest: D('4')
});

test('execution seal authorizes one exact short-lived operation', async () => {
  let consumed = 0;
  const result = await gate.authorizeExecutionSeal({
    seal: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'),
    verifySignature: async () => true,
    consumeNonce: async (nonce) => { consumed += 1; return nonce === base().nonce; }
  });
  assert.equal(result.authorized, true);
  assert.equal(result.subject, 'user_123');
  assert.equal(result.action, 'CREATE_PULSE_QUOTE');
  assert.equal(consumed, 1);
  assert.equal(Object.isFrozen(result), true);
});

test('execution seal denies scope widening or cross-context reuse', async () => {
  for (const patch of [
    { subject: 'user_999' }, { action: 'ACTIVATE_MARKET' }, { marketId: 'DE' }, { capability: 'ADS_BILLING' },
    { genomeDigest: D('9') }, { releaseDigest: D('a') }, { policyDigest: D('b') }, { passportDigest: D('c') }
  ]) {
    await assert.rejects(() => gate.authorizeExecutionSeal({
      seal: base(), context: { ...context(), ...patch }, now: () => Date.parse('2026-08-29T10:01:00.000Z'),
      verifySignature: async () => true, consumeNonce: async () => true
    }), { code: 'SGF_EXECUTION_CONTEXT_MISMATCH' });
  }
});

test('execution seal enforces short TTL signature and anti-replay', async () => {
  await assert.rejects(() => gate.authorizeExecutionSeal({
    seal: { ...base(), expiresAt: '2026-08-29T10:10:00.000Z' }, context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'),
    verifySignature: async () => true, consumeNonce: async () => true
  }), { code: 'SGF_EXECUTION_TTL_EXCEEDED' });
  await assert.rejects(() => gate.authorizeExecutionSeal({
    seal: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), consumeNonce: async () => true
  }), { code: 'SGF_EXECUTION_SIGNATURE_VERIFIER_REQUIRED' });
  await assert.rejects(() => gate.authorizeExecutionSeal({
    seal: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => false, consumeNonce: async () => true
  }), { code: 'SGF_EXECUTION_SIGNATURE_INVALID' });
  await assert.rejects(() => gate.authorizeExecutionSeal({
    seal: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true
  }), { code: 'SGF_EXECUTION_NONCE_CONSUMER_REQUIRED' });
  await assert.rejects(() => gate.authorizeExecutionSeal({
    seal: base(), context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'), verifySignature: async () => true, consumeNonce: async () => false
  }), { code: 'SGF_EXECUTION_REPLAY_DENIED' });
});

test('execution seal rejects expired future malformed and floating release values', async () => {
  const cases = [
    [{ expiresAt: '2026-08-29T10:00:30.000Z' }, 'SGF_EXECUTION_EXPIRED'],
    [{ issuedAt: '2026-08-29T10:02:00.000Z', expiresAt: '2026-08-29T10:04:00.000Z' }, 'SGF_EXECUTION_NOT_YET_VALID'],
    [{ nonce: 'short' }, 'SGF_EXECUTION_NONCE_INVALID'],
    [{ releaseDigest: 'latest' }, 'SGF_EXECUTION_RELEASE_INVALID']
  ];
  for (const [patch, code] of cases) {
    await assert.rejects(() => gate.authorizeExecutionSeal({
      seal: { ...base(), ...patch }, context: context(), now: () => Date.parse('2026-08-29T10:01:00.000Z'),
      verifySignature: async () => true, consumeNonce: async () => true
    }), { code });
  }
});
