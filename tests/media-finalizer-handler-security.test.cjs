'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const HANDLER_MODULE = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'handler.js');
const ORIGIN = 'https://vvip.example.test';
const TOKEN = 'a'.repeat(64);
const MEDIA_ID = '22222222-2222-4222-8222-222222222222';
const LISTING_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const RECEIPT_ID = '44444444-4444-4444-8444-444444444444';

function handlerApi() {
  return require(HANDLER_MODULE);
}

function event() {
  return {
    requestContext: { http: { method: 'POST' } },
    headers: { origin: ORIGIN }
  };
}

function listingRequest() {
  return Object.freeze({
    kind: 'listing',
    mediaId: MEDIA_ID,
    token: TOKEN,
    sessionToken: 'session-token'
  });
}

function proofRequest() {
  return Object.freeze({
    kind: 'proof',
    captureReceiptId: RECEIPT_ID,
    token: TOKEN,
    sessionToken: 'session-token'
  });
}

function sourceBytes() {
  return Buffer.from([0xff, 0xd8, 0x00, 0xff, 0xd9]);
}

function canonicalOutput() {
  return Object.freeze({
    data: Buffer.from([0xff, 0xd8, 0x01, 0xff, 0xd9]),
    info: Object.freeze({ format: 'jpeg', width: 640, height: 480 })
  });
}

function makePorts(overrides = {}) {
  const calls = [];
  const source = sourceBytes();
  const claim = {
    job_id: JOB_ID,
    media_id: MEDIA_ID,
    listing_id: LISTING_ID,
    source_storage_path: `${LISTING_ID}/${MEDIA_ID}/source.jpg`,
    expected_mime_type: 'image/jpeg',
    expected_byte_size: source.length,
    expected_width: 640,
    expected_height: 480,
    owner_subject: 'owner-a'
  };

  const storage = {
    from(bucket) {
      return Object.freeze({
        async download(objectPath, options) {
          calls.push(['download', bucket, objectPath, options]);
          return Object.freeze({ body: source, contentType: 'image/jpeg' });
        },
        async upload(objectPath, body, mime) {
          calls.push(['upload', bucket, objectPath, body.length, mime]);
          return true;
        },
        async remove(objectPath) {
          calls.push(['remove', bucket, objectPath]);
          return true;
        }
      });
    },
    async rpc(name, body) {
      calls.push(['rpc', name, body]);
      if (name === 'vvip_marketplace_claim_media_finalization') return { ...claim };
      if (name === 'vvip_marketplace_complete_media_finalization') return { finalization_state: 'CANONICAL' };
      if (name === 'vvip_marketplace_fail_media_finalization') return { ok: true };
      if (name === 'vvip_synapse_proof_capture_claim') {
        return { ok: true, source_storage_path: 'receipt/source.jpg' };
      }
      if (name === 'vvip_synapse_proof_capture_finalize') {
        return { ok: true, status: 'FINALIZED' };
      }
      throw Object.assign(new Error('UNEXPECTED_RPC'), { code: 'UNEXPECTED_RPC' });
    }
  };

  const base = {
    parseVerifiedRequest: () => listingRequest(),
    verifySessionToken: async () => Object.freeze({ authenticated: true, subject: 'owner-a', issuer: 'https://clerk.example.test' }),
    getSecretProvider: () => Object.freeze({ get: async () => Object.freeze({ supabaseUrl: 'https://project.supabase.co', apiKey: 'sb_secret_test_test_test' }) }),
    createSupabaseClient: () => storage,
    canonicalize: async () => canonicalOutput(),
    ...overrides
  };
  return { calls, ports: base, storage, claim, source };
}

function createTestHandler(ports) {
  const { createHandler } = handlerApi();
  assert.equal(typeof createHandler, 'function', 'MEDIA_FINALIZER_CREATE_HANDLER_MISSING');
  return createHandler(ports);
}

function responseBody(result) {
  return JSON.parse(String(result && result.body || '{}'));
}

function withOrigin(fn) {
  const prior = process.env.VVIP_MEDIA_ALLOWED_ORIGINS;
  process.env.VVIP_MEDIA_ALLOWED_ORIGINS = ORIGIN;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prior === undefined) delete process.env.VVIP_MEDIA_ALLOWED_ORIGINS;
      else process.env.VVIP_MEDIA_ALLOWED_ORIGINS = prior;
    });
}

test('bad request integrity fails before identity, secret, RPC, or storage access', async () => withOrigin(async () => {
  let identityCalls = 0;
  let secretCalls = 0;
  const { calls, ports } = makePorts({
    parseVerifiedRequest: () => { throw Object.assign(new Error('BODY_SHA256_MISMATCH'), { code: 'BODY_SHA256_MISMATCH', statusCode: 400 }); },
    verifySessionToken: async () => { identityCalls += 1; return { subject: 'owner-a' }; },
    getSecretProvider: () => ({ get: async () => { secretCalls += 1; return {}; } })
  });
  const result = await createTestHandler(ports)(event());
  assert.equal(result.statusCode, 400);
  assert.equal(responseBody(result).code, 'BODY_SHA256_MISMATCH');
  assert.equal(identityCalls, 0);
  assert.equal(secretCalls, 0);
  assert.deepEqual(calls, []);
}));

test('bad JWT fails before Secrets Manager, RPC, or storage access', async () => withOrigin(async () => {
  let secretCalls = 0;
  const { calls, ports } = makePorts({
    verifySessionToken: async () => { throw Object.assign(new Error('IDENTITY_SIGNATURE_INVALID'), { code: 'IDENTITY_SIGNATURE_INVALID', statusCode: 401 }); },
    getSecretProvider: () => ({ get: async () => { secretCalls += 1; return {}; } })
  });
  const result = await createTestHandler(ports)(event());
  assert.equal(result.statusCode, 401);
  assert.equal(responseBody(result).code, 'IDENTITY_SIGNATURE_INVALID');
  assert.equal(secretCalls, 0);
  assert.deepEqual(calls, []);
}));

test('valid JWT with a different trusted claim owner fails before any source download', async () => withOrigin(async () => {
  const { calls, ports, claim } = makePorts();
  const originalFactory = ports.createSupabaseClient;
  ports.createSupabaseClient = (...args) => {
    const storage = originalFactory(...args);
    const originalRpc = storage.rpc.bind(storage);
    storage.rpc = async (name, body) => {
      if (name === 'vvip_marketplace_claim_media_finalization') return { ...claim, owner_subject: 'owner-b' };
      return originalRpc(name, body);
    };
    return storage;
  };

  const result = await createTestHandler(ports)(event());
  assert.equal(result.statusCode, 403);
  assert.equal(responseBody(result).code, 'MEDIA_FINALIZATION_OWNER_MISMATCH');
  assert.equal(calls.some((entry) => entry[0] === 'download'), false, 'OWNER_MISMATCH_MUST_PRECEDE_SOURCE_DOWNLOAD');
  assert.equal(calls.some((entry) => entry[0] === 'upload'), false, 'OWNER_MISMATCH_MUST_PRECEDE_CANONICAL_UPLOAD');
}));

test('correct identity plus capability completes listing finalization through bounded storage', async () => withOrigin(async () => {
  const { calls, ports, source } = makePorts();
  const result = await createTestHandler(ports)(event());
  const body = responseBody(result);
  assert.equal(result.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mediaId, MEDIA_ID);
  assert.equal(body.state, 'CANONICAL');

  const download = calls.find((entry) => entry[0] === 'download');
  assert.deepEqual(download.slice(1, 3), ['listing-media', `${LISTING_ID}/${MEDIA_ID}/source.jpg`]);
  assert.deepEqual(download[3], { expectedBytes: source.length });
  assert.equal(calls.some((entry) => entry[0] === 'upload' && entry[1] === 'listing-media-canonical'), true);
  assert.equal(calls.some((entry) => entry[0] === 'rpc' && entry[1] === 'vvip_marketplace_complete_media_finalization'), true);
}));

test('completion failure never reports success and emits only a stable redacted code', async () => withOrigin(async () => {
  const leaked = `sensitive-${TOKEN}`;
  const { calls, ports, storage } = makePorts();
  const originalRpc = storage.rpc.bind(storage);
  storage.rpc = async (name, body) => {
    if (name === 'vvip_marketplace_complete_media_finalization') {
      const error = new Error(leaked);
      error.code = 'MEDIA_COMPLETE_FAILED';
      throw error;
    }
    return originalRpc(name, body);
  };

  const result = await createTestHandler(ports)(event());
  const body = responseBody(result);
  assert.notEqual(result.statusCode, 200);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'MEDIA_COMPLETE_FAILED');
  assert.equal(result.body.includes(TOKEN), false);
  assert.equal(result.body.includes('sensitive-'), false);
  assert.equal(calls.some((entry) => entry[0] === 'rpc' && entry[1] === 'vvip_marketplace_fail_media_finalization'), true);
}));

test('claim replay errors remain stable and do not echo capability material', async () => withOrigin(async () => {
  const { ports, storage } = makePorts();
  storage.rpc = async (name) => {
    if (name === 'vvip_marketplace_claim_media_finalization') {
      throw Object.assign(new Error(`MEDIA_FINALIZATION_JOB_NOT_FOUND ${TOKEN}`), { code: 'MEDIA_FINALIZATION_JOB_NOT_FOUND' });
    }
    throw Object.assign(new Error('UNEXPECTED_RPC'), { code: 'UNEXPECTED_RPC' });
  };

  const result = await createTestHandler(ports)(event());
  const body = responseBody(result);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'MEDIA_FINALIZATION_JOB_NOT_FOUND');
  assert.equal(result.body.includes(TOKEN), false);
}));

test('proof capture retains server receipt lineage and reuses the injected canonicalizer without client ownership claims', async () => withOrigin(async () => {
  let canonicalizeCalls = 0;
  const { calls, ports } = makePorts({
    parseVerifiedRequest: () => proofRequest(),
    canonicalize: async () => {
      canonicalizeCalls += 1;
      return canonicalOutput();
    }
  });

  const result = await createTestHandler(ports)(event());
  const body = responseBody(result);
  assert.equal(result.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.captureReceiptId, RECEIPT_ID);
  assert.equal(canonicalizeCalls, 1);

  const claim = calls.find((entry) => entry[0] === 'rpc' && entry[1] === 'vvip_synapse_proof_capture_claim');
  assert.ok(claim, 'PROOF_CAPTURE_CLAIM_MISSING');
  assert.equal(claim[2].p_receipt_id, RECEIPT_ID);
  assert.equal(Object.hasOwn(claim[2], 'owner_subject'), false);
  assert.equal(Object.hasOwn(claim[2], 'actorSubject'), false);
  assert.equal(calls.some((entry) => entry[0] === 'rpc' && entry[1] === 'vvip_synapse_proof_capture_finalize'), true);
}));
