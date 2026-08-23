'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const reverification = require('../scripts/security/federated-reverification-adapter.js');

const DIGEST = 'a'.repeat(64);

function capabilities(overrides = {}) {
  return {
    ok: true,
    provider: 'clerk',
    privileged_reverification_methods: ['PASSWORD', 'TOTP'],
    phishing_resistant_methods: [],
    capability_version: '2026-08-23',
    ...overrides,
  };
}

function verified(overrides = {}) {
  return {
    ok: true,
    reason_code: 'PROVIDER_REVERIFICATION_VERIFIED',
    provider: 'clerk',
    method_class: 'TOTP',
    evidence_ref: 'provider-reverify:rev_001',
    principal: 'user:owner',
    bound_intent_digest: DIGEST,
    challenge_ref: 'challenge:001',
    freshness_seconds: 12,
    replay_state: 'UNCONSUMED',
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    provider: 'clerk',
    requested_method_class: 'TOTP',
    evidence_ref: 'provider-reverify:rev_001',
    principal: 'user:owner',
    intent_digest: DIGEST,
    challenge_ref: 'challenge:001',
    max_freshness_seconds: 60,
    ...overrides,
  };
}

function adapter(overrides = {}) {
  return reverification.createReverificationAdapter({
    getProviderCapabilities: async () => capabilities(),
    verifyProviderEvidence: async () => verified(),
    ...overrides,
  });
}

test('adapter requires both provider-capability discovery and provider evidence verification ports', () => {
  assert.throws(() => reverification.createReverificationAdapter({}), /capabil|provider|verify/i);
});

test('verified supported reverification returns only bounded proof metadata and never execution authority', async () => {
  const result = await adapter().verifyForIntent(input());

  assert.deepEqual(result, {
    ok: true,
    reason_code: 'REVERIFICATION_VERIFIED',
    provider: 'clerk',
    method_class: 'TOTP',
    evidence_ref: 'provider-reverify:rev_001',
    freshness_seconds: 12,
    phishing_resistant: false,
    execution_authority: false,
  });
});

test('provider capability discovery is mandatory before evidence verification', async () => {
  let verificationCalls = 0;
  const instance = adapter({
    getProviderCapabilities: async () => ({ ok: false, reason_code: 'CAPABILITIES_UNAVAILABLE' }),
    verifyProviderEvidence: async () => {
      verificationCalls += 1;
      return verified();
    },
  });

  const result = await instance.verifyForIntent(input());
  assert.equal(result.ok, false);
  assert.equal(result.reason_code, 'REVERIFICATION_PROVIDER_CAPABILITIES_UNAVAILABLE');
  assert.equal(verificationCalls, 0);
});

test('Passkey/WebAuthn privileged reverification is denied unless exact provider capability declares it', async () => {
  let verificationCalls = 0;
  const unsupported = adapter({
    verifyProviderEvidence: async () => {
      verificationCalls += 1;
      return verified({ method_class: 'PASSKEY' });
    },
  });

  const denied = await unsupported.verifyForIntent(input({ requested_method_class: 'PASSKEY' }));
  assert.equal(denied.ok, false);
  assert.equal(denied.reason_code, 'REVERIFICATION_METHOD_UNSUPPORTED');
  assert.equal(verificationCalls, 0);

  const supported = adapter({
    getProviderCapabilities: async () => capabilities({
      privileged_reverification_methods: ['PASSKEY'],
      phishing_resistant_methods: ['PASSKEY'],
    }),
    verifyProviderEvidence: async () => verified({ method_class: 'PASSKEY' }),
  });

  const allowed = await supported.verifyForIntent(input({ requested_method_class: 'PASSKEY' }));
  assert.equal(allowed.ok, true);
  assert.equal(allowed.method_class, 'PASSKEY');
  assert.equal(allowed.phishing_resistant, true);
});

test('provider verification must bind principal, exact intent digest, challenge and requested method', async () => {
  for (const bad of [
    { principal: 'user:other' },
    { bound_intent_digest: 'b'.repeat(64) },
    { challenge_ref: 'challenge:other' },
    { method_class: 'PASSWORD' },
    { evidence_ref: 'provider-reverify:other' },
  ]) {
    const instance = adapter({ verifyProviderEvidence: async () => verified(bad) });
    const result = await instance.verifyForIntent(input());
    assert.equal(result.ok, false);
    assert.equal(result.reason_code, 'REVERIFICATION_BINDING_MISMATCH');
  }
});

test('stale or replayed provider evidence fails closed', async () => {
  const stale = adapter({
    verifyProviderEvidence: async () => verified({ freshness_seconds: 61 }),
  });
  assert.deepEqual(await stale.verifyForIntent(input()), {
    ok: false,
    reason_code: 'REVERIFICATION_STALE',
    execution_authority: false,
  });

  const replayed = adapter({
    verifyProviderEvidence: async () => verified({ replay_state: 'CONSUMED' }),
  });
  assert.deepEqual(await replayed.verifyForIntent(input()), {
    ok: false,
    reason_code: 'REVERIFICATION_REPLAY_OR_CONFLICT',
    execution_authority: false,
  });
});

test('browser/provider raw credentials are rejected before capability or verification ports are called', async () => {
  let calls = 0;
  const instance = adapter({
    getProviderCapabilities: async () => { calls += 1; return capabilities(); },
    verifyProviderEvidence: async () => { calls += 1; return verified(); },
  });

  for (const injected of [
    { provider_token: 'secret' },
    { session_token: 'secret' },
    { authorization: 'Bearer secret' },
    { password: 'secret' },
    { otp: '123456' },
    { passkey_private_key: 'secret' },
  ]) {
    await assert.rejects(instance.verifyForIntent(input(injected)), /credential|secret|forbidden|field/i);
  }
  assert.equal(calls, 0);
});

test('unknown provider reason or transport failure maps to opaque fail-closed outcomes', async () => {
  const unknown = adapter({
    verifyProviderEvidence: async () => ({ ok: false, reason_code: 'SOME_PROVIDER_INTERNAL_DETAIL' }),
  });
  assert.deepEqual(await unknown.verifyForIntent(input()), {
    ok: false,
    reason_code: 'REVERIFICATION_DENIED',
    execution_authority: false,
  });

  const unavailable = adapter({
    verifyProviderEvidence: async () => { throw new Error('provider internal token detail'); },
  });
  assert.deepEqual(await unavailable.verifyForIntent(input()), {
    ok: false,
    reason_code: 'REVERIFICATION_PROVIDER_UNAVAILABLE',
    execution_authority: false,
  });
});
