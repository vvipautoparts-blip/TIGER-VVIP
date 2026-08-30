'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'supabase-client.js');
const BASE_URL = 'https://project.supabase.co';
const API_KEY = 'sb_secret_test_test_test';

function api() {
  return require(MODULE);
}

function headers(values = {}) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return Object.freeze({
    get(name) {
      return normalized.get(String(name).toLowerCase()) || null;
    }
  });
}

function stream(chunks, onRead) {
  let index = 0;
  return Object.freeze({
    getReader() {
      return Object.freeze({
        async read() {
          if (onRead) onRead(index);
          if (index >= chunks.length) return { done: true, value: undefined };
          const value = chunks[index];
          index += 1;
          return { done: false, value };
        },
        async cancel() {}
      });
    }
  });
}

function response({ status = 200, headerValues = {}, chunks = [], text = '' } = {}) {
  return Object.freeze({
    ok: status >= 200 && status < 300,
    status,
    headers: headers(headerValues),
    body: stream(chunks),
    text: async () => text
  });
}

function client(fetchImpl, overrides = {}) {
  const { createSupabaseClient } = api();
  return createSupabaseClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    fetch: fetchImpl,
    timeoutMs: 5_000,
    maxDownloadBytes: 10 * 1024 * 1024,
    ...overrides
  });
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error && error.code, code);
    assert.equal(String(error && error.message), code);
    assert.equal(String(error && error.message).includes(API_KEY), false);
    return true;
  });
}

test('RPC transport is fixed to one HTTPS origin, uses apikey only, and rejects redirects', async () => {
  const calls = [];
  const supabase = client(async (url, init) => {
    calls.push({ url, init });
    return response({ text: JSON.stringify([{ ok: true }]) });
  });

  const result = await supabase.rpc('vvip_marketplace_claim_media_finalization', { target_media: 'id' });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${BASE_URL}/rest/v1/rpc/vvip_marketplace_claim_media_finalization`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers.apikey, API_KEY);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.headers.authorization, undefined);
  assert.ok(calls[0].init.signal, 'RPC must carry an abort deadline signal');

  for (const bad of [
    'http://project.supabase.co',
    'https://user:pass@project.supabase.co',
    'https://project.supabase.co/evil',
    'https://project.supabase.co?redirect=https://evil.test',
    'https://project.supabase.co#fragment'
  ]) {
    const { createSupabaseClient } = api();
    assert.throws(() => createSupabaseClient({ baseUrl: bad, apiKey: API_KEY, fetch: async () => response() }), /MEDIA_SUPABASE_CONFIG_INVALID/);
  }
});

test('download rejects an oversized Content-Length before reading any body bytes', async () => {
  let reads = 0;
  const supabase = client(async (_url, init) => {
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal, 'download must carry an abort deadline signal');
    const body = stream([Buffer.from('12345')], () => { reads += 1; });
    return Object.freeze({
      ok: true,
      status: 200,
      headers: headers({ 'content-length': '5', 'content-type': 'image/jpeg' }),
      body,
      text: async () => ''
    });
  });

  await rejectsCode(
    supabase.download('listing-media', 'owner/media.jpg', { expectedBytes: 4 }),
    'MEDIA_SOURCE_SIZE_MISMATCH'
  );
  assert.equal(reads, 0, 'body must not be read after an impossible Content-Length');
});

test('download streams into a bounded buffer, aborts once bytes exceed the trusted claim, and requires exact final size', async () => {
  let observedSignal = null;
  const oversized = client(async (_url, init) => {
    observedSignal = init.signal;
    return response({
      headerValues: { 'content-type': 'image/jpeg' },
      chunks: [Buffer.from('123'), Buffer.from('456')]
    });
  });

  await rejectsCode(
    oversized.download('listing-media', 'owner/media.jpg', { expectedBytes: 5 }),
    'MEDIA_SOURCE_SIZE_MISMATCH'
  );
  assert.equal(observedSignal.aborted, true, 'oversized stream must be aborted immediately');

  const short = client(async () => response({
    headerValues: { 'content-type': 'image/jpeg' },
    chunks: [Buffer.from('1234')]
  }));
  await rejectsCode(
    short.download('listing-media', 'owner/media.jpg', { expectedBytes: 5 }),
    'MEDIA_SOURCE_SIZE_MISMATCH'
  );

  const exact = client(async () => response({
    headerValues: { 'content-length': '5', 'content-type': 'image/jpeg; charset=binary' },
    chunks: [Buffer.from('12'), Buffer.from('345')]
  }));
  const downloaded = await exact.download('listing-media', 'owner/media.jpg', { expectedBytes: 5 });
  assert.equal(downloaded.body.toString('utf8'), '12345');
  assert.equal(downloaded.contentType, 'image/jpeg');
  assert.equal(Object.isFrozen(downloaded), true);
});

test('download enforces the policy maximum even when no exact claim size is available', async () => {
  const supabase = client(async () => response({
    headerValues: { 'content-length': '11' },
    chunks: [Buffer.alloc(11)]
  }), { maxDownloadBytes: 10 });

  await rejectsCode(
    supabase.download('proof-capture-staging', 'receipt/capture.jpg'),
    'MEDIA_SOURCE_SIZE_INVALID'
  );
});

test('upload is non-upsert, content-addressed, fixed-origin, and never synthesizes a Bearer credential', async () => {
  const calls = [];
  const supabase = client(async (url, init) => {
    calls.push({ url, init });
    return response({ status: 201 });
  });
  const digest = 'a'.repeat(64);
  const canonicalPath = `11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${digest}.jpg`;

  await supabase.upload('listing-media-canonical', canonicalPath, Buffer.from('canonical'), 'image/jpeg');
  assert.equal(calls[0].url, `${BASE_URL}/storage/v1/object/listing-media-canonical/${canonicalPath}`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers.apikey, API_KEY);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.headers['x-upsert'], 'false');
  assert.equal(calls[0].init.headers['Content-Type'], 'image/jpeg');
  assert.ok(calls[0].init.signal, 'upload must carry an abort deadline signal');

  await rejectsCode(
    supabase.upload('listing-media-canonical', 'not-content-addressed.jpg', Buffer.from('x'), 'image/jpeg'),
    'MEDIA_CANONICAL_PATH_INVALID'
  );
});

test('storage path encoding cannot replace the configured host and remove treats 404 as idempotent success', async () => {
  const calls = [];
  const supabase = client(async (url, init) => {
    calls.push({ url, init });
    return response({ status: 404 });
  });

  const removed = await supabase.remove('listing-media', 'https://evil.test/../../object.jpg');
  assert.equal(removed, true);
  assert.equal(new URL(calls[0].url).origin, BASE_URL);
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers.apikey, API_KEY);
  assert.equal(calls[0].init.headers.Authorization, undefined);
});
