'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REQUEST_MODULE = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'request.js');
const HANDLER = path.join(__dirname, '..', 'services', 'media-finalizer', 'src', 'handler.js');

const MEDIA_ID = '22222222-2222-4222-8222-222222222222';
const CAPTURE_RECEIPT_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'a'.repeat(64);
const SESSION = 'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3QifQ.eyJzdWIiOiJ1c2VyX293bmVyIn0.signature';

function digest(body) {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

function eventFor(payload, overrides = {}) {
  const body = Object.prototype.hasOwnProperty.call(overrides, 'body')
    ? overrides.body
    : JSON.stringify(payload);
  const hash = typeof body === 'string' ? digest(body) : '0'.repeat(64);
  return {
    requestContext: { http: { method: overrides.method || 'POST' } },
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-tiger-session': SESSION,
      'x-amz-content-sha256': hash,
      ...(overrides.headers || {})
    },
    body,
    isBase64Encoded: overrides.isBase64Encoded || false
  };
}

function requestApi() {
  assert.equal(fs.existsSync(REQUEST_MODULE), true, 'SEALED_MEDIA_REQUEST_MODULE_MISSING');
  return require(REQUEST_MODULE);
}

function assertCode(fn, code, statusCode) {
  assert.throws(fn, (error) => {
    assert.equal(error && error.code, code);
    if (statusCode !== undefined) assert.equal(error && error.statusCode, statusCode);
    return true;
  });
}

test('verified request accepts only POST JSON and returns a frozen listing request', () => {
  const { parseVerifiedRequest } = requestApi();
  const result = parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, finalizationToken: TOKEN }));
  assert.deepEqual(result, {
    kind: 'listing',
    mediaId: MEDIA_ID,
    token: TOKEN,
    sessionToken: SESSION,
    bodySha256: digest(JSON.stringify({ mediaId: MEDIA_ID, finalizationToken: TOKEN }))
  });
  assert.equal(Object.isFrozen(result), true);
});

test('verified request rejects non-POST methods and leaves OPTIONS to the handler preflight path', () => {
  const { parseVerifiedRequest } = requestApi();
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, finalizationToken: TOKEN }, { method: 'GET' })),
    'METHOD_NOT_ALLOWED',
    405
  );
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, finalizationToken: TOKEN }, { method: 'OPTIONS' })),
    'METHOD_NOT_ALLOWED',
    405
  );
});

test('verified request requires JSON content type, a bounded session token, and lowercase body hash', () => {
  const { parseVerifiedRequest } = requestApi();
  const payload = { mediaId: MEDIA_ID, finalizationToken: TOKEN };

  assertCode(
    () => parseVerifiedRequest(eventFor(payload, { headers: { 'content-type': 'text/plain' } })),
    'REQUEST_CONTENT_TYPE_INVALID',
    415
  );
  assertCode(
    () => parseVerifiedRequest(eventFor(payload, { headers: { 'x-tiger-session': '' } })),
    'REQUEST_SESSION_REQUIRED',
    401
  );
  assertCode(
    () => parseVerifiedRequest(eventFor(payload, { headers: { 'x-amz-content-sha256': digest(JSON.stringify(payload)).toUpperCase() } })),
    'REQUEST_BODY_HASH_INVALID',
    400
  );
});

test('verified request hashes the exact UTF-8 body bytes before JSON parsing', () => {
  const { parseVerifiedRequest } = requestApi();
  const canonical = JSON.stringify({ mediaId: MEDIA_ID, finalizationToken: TOKEN });
  const tampered = `${canonical} `;
  const event = eventFor(null, {
    body: tampered,
    headers: { 'x-amz-content-sha256': digest(canonical) }
  });
  assertCode(() => parseVerifiedRequest(event), 'REQUEST_BODY_HASH_MISMATCH', 400);
});

test('verified request enforces the exact body byte cap before expensive parsing', () => {
  const { parseVerifiedRequest, MAX_REQUEST_BYTES } = requestApi();
  assert.equal(Number.isSafeInteger(MAX_REQUEST_BYTES), true);
  assert.ok(MAX_REQUEST_BYTES >= 512 && MAX_REQUEST_BYTES <= 16 * 1024);
  const oversized = 'x'.repeat(MAX_REQUEST_BYTES + 1);
  const event = eventFor(null, { body: oversized });
  assertCode(() => parseVerifiedRequest(event), 'REQUEST_BODY_TOO_LARGE', 413);
});

test('verified request rejects malformed JSON, arrays, unknown fields, ambiguous ids and invalid identifiers', () => {
  const { parseVerifiedRequest } = requestApi();

  assertCode(() => parseVerifiedRequest(eventFor(null, { body: '{' })), 'REQUEST_JSON_INVALID', 400);
  assertCode(() => parseVerifiedRequest(eventFor([], {})), 'FINALIZATION_REQUEST_INVALID', 400);
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, finalizationToken: TOKEN, extra: true })),
    'FINALIZATION_REQUEST_INVALID',
    400
  );
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, captureReceiptId: CAPTURE_RECEIPT_ID, finalizationToken: TOKEN })),
    'FINALIZATION_REQUEST_INVALID',
    400
  );
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: 'not-a-uuid', finalizationToken: TOKEN })),
    'FINALIZATION_REQUEST_INVALID',
    400
  );
  assertCode(
    () => parseVerifiedRequest(eventFor({ mediaId: MEDIA_ID, finalizationToken: TOKEN.toUpperCase() })),
    'FINALIZATION_REQUEST_INVALID',
    400
  );
});

test('verified request supports the proof capture receipt shape without accepting client-authored digest fields', () => {
  const { parseVerifiedRequest } = requestApi();
  const result = parseVerifiedRequest(eventFor({ captureReceiptId: CAPTURE_RECEIPT_ID, finalizationToken: TOKEN }));
  assert.equal(result.kind, 'proof');
  assert.equal(result.captureReceiptId, CAPTURE_RECEIPT_ID);
  assert.equal(result.token, TOKEN);
  assert.equal(result.sessionToken, SESSION);

  assertCode(
    () => parseVerifiedRequest(eventFor({ captureReceiptId: CAPTURE_RECEIPT_ID, finalizationToken: TOKEN, captureDigest: 'b'.repeat(64) })),
    'FINALIZATION_REQUEST_INVALID',
    400
  );
});

test('verified request rejects base64 ambiguity instead of silently changing the signed byte domain', () => {
  const { parseVerifiedRequest } = requestApi();
  const payload = { mediaId: MEDIA_ID, finalizationToken: TOKEN };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const event = eventFor(null, { body, isBase64Encoded: true });
  assertCode(() => parseVerifiedRequest(event), 'REQUEST_ENCODING_UNSUPPORTED', 400);
});

test('handler composes the dedicated verified parser as the default port and keeps no second JSON parser authority', () => {
  assert.equal(fs.existsSync(HANDLER), true, 'MEDIA_FINALIZER_HANDLER_MISSING');
  const source = fs.readFileSync(HANDLER, 'utf8');
  assert.match(source, /require\(['"]\.\/request\.js['"]\)/);
  assert.match(source, /ports\.parseVerifiedRequest[\s\S]*:\s*parseVerifiedRequest/);
  assert.match(source, /request\s*=\s*parseRequest\s*\(\s*event\s*\)/);
  assert.doesNotMatch(source, /JSON\.parse\s*\(/);
  assert.doesNotMatch(source, /function\s+parseRequest\s*\(/);
});
