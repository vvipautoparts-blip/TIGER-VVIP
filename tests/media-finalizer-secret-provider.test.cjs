'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'secret-provider.js');

function api() {
  return require(MODULE);
}

function secretString(overrides = {}) {
  return JSON.stringify({
    supabaseUrl: 'https://project.supabase.co',
    apiKey: 'sb_secret_test_test_test',
    ...overrides
  });
}

test('secret provider requests only the configured secret id and returns frozen normalized credentials', async () => {
  const { createSecretProvider } = api();
  const calls = [];
  const provider = createSecretProvider({
    secretId: 'prod/tiger/media-finalizer/supabase',
    now: () => 1000,
    cacheTtlMs: 60_000,
    getSecretValue: async (input) => {
      calls.push(input);
      return { SecretString: secretString() };
    }
  });

  const value = await provider.get();
  assert.deepEqual(calls, [{ SecretId: 'prod/tiger/media-finalizer/supabase' }]);
  assert.deepEqual(value, {
    supabaseUrl: 'https://project.supabase.co',
    apiKey: 'sb_secret_test_test_test'
  });
  assert.equal(Object.isFrozen(value), true);
});

test('secret provider uses a bounded TTL cache and forced refresh replaces prior value', async () => {
  const { createSecretProvider } = api();
  let now = 10_000;
  let calls = 0;
  const provider = createSecretProvider({
    secretId: 'secret-id',
    now: () => now,
    cacheTtlMs: 5_000,
    getSecretValue: async () => {
      calls += 1;
      return { SecretString: secretString({ apiKey: `sb_secret_test_test_${calls}` }) };
    }
  });

  const first = await provider.get();
  const cached = await provider.get();
  assert.equal(calls, 1);
  assert.equal(cached, first);

  const refreshed = await provider.get({ forceRefresh: true });
  assert.equal(calls, 2);
  assert.notEqual(refreshed.apiKey, first.apiKey);

  now += 5_001;
  await provider.get();
  assert.equal(calls, 3, 'expired cache must be reloaded');
});

test('secret provider rejects unsafe URL/key documents and never embeds secret bytes in public errors', async () => {
  const { createSecretProvider } = api();
  const leaked = 'sb_secret_test_test_leak';
  const invalidDocuments = [
    '{}',
    JSON.stringify({ supabaseUrl: 'http://project.supabase.co', apiKey: leaked }),
    JSON.stringify({ supabaseUrl: 'https://user:pass@project.supabase.co', apiKey: leaked }),
    JSON.stringify({ supabaseUrl: 'https://project.supabase.co/evil/path', apiKey: leaked }),
    JSON.stringify({ supabaseUrl: 'https://project.supabase.co?next=https://evil.test', apiKey: leaked }),
    JSON.stringify({ supabaseUrl: 'https://project.supabase.co', apiKey: 'legacy-service-role-key' }),
    JSON.stringify({ supabaseUrl: 'https://project.supabase.co', apiKey: `sb_secret_bad key` }),
    'not-json'
  ];

  for (const SecretString of invalidDocuments) {
    const provider = createSecretProvider({
      secretId: 'secret-id',
      getSecretValue: async () => ({ SecretString })
    });
    await assert.rejects(provider.get(), (error) => {
      assert.equal(error && error.code, 'MEDIA_SECRET_INVALID');
      assert.equal(String(error && error.message), 'MEDIA_SECRET_INVALID');
      assert.equal(String(error && error.stack).includes(leaked), false);
      return true;
    });
  }
});

test('secret transport failures are redacted and configuration is bounded', async () => {
  const { createSecretProvider } = api();
  const provider = createSecretProvider({
    secretId: 'secret-id',
    cacheTtlMs: 99_999_999,
    getSecretValue: async () => {
      throw new Error('provider detail with sensitive backend metadata');
    }
  });

  await assert.rejects(provider.get(), (error) => {
    assert.equal(error && error.code, 'MEDIA_SECRET_UNAVAILABLE');
    assert.equal(String(error && error.message), 'MEDIA_SECRET_UNAVAILABLE');
    assert.equal(String(error && error.message).includes('backend'), false);
    return true;
  });
});
