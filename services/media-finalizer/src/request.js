'use strict';

const crypto = require('node:crypto');

const MAX_REQUEST_BYTES = 4096;
const MAX_SESSION_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function requestFailure(code, statusCode) {
  const error = new Error(code);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function fail(code, statusCode) {
  throw requestFailure(code, statusCode);
}

function header(event, name) {
  const target = String(name || '').toLowerCase();
  const headers = event && event.headers && typeof event.headers === 'object'
    ? event.headers
    : {};
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== target) continue;
    return typeof value === 'string' ? value : String(value == null ? '' : value);
  }
  return '';
}

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = keys.slice().sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function parseVerifiedRequest(event) {
  const method = (event && event.requestContext && event.requestContext.http && event.requestContext.http.method)
    || (event && event.httpMethod)
    || '';
  if (method !== 'POST') fail('METHOD_NOT_ALLOWED', 405);
  if (event && event.isBase64Encoded === true) fail('REQUEST_ENCODING_UNSUPPORTED', 400);

  const contentType = header(event, 'content-type');
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) {
    fail('REQUEST_CONTENT_TYPE_INVALID', 415);
  }

  const sessionToken = header(event, 'x-tiger-session');
  if (
    !sessionToken
    || Buffer.byteLength(sessionToken, 'utf8') > MAX_SESSION_BYTES
    || /\s/.test(sessionToken)
  ) {
    fail('REQUEST_SESSION_REQUIRED', 401);
  }

  const bodySha256 = header(event, 'x-amz-content-sha256');
  if (!HASH_PATTERN.test(bodySha256)) fail('REQUEST_BODY_HASH_INVALID', 400);

  const body = typeof (event && event.body) === 'string' ? event.body : '';
  const bytes = Buffer.from(body, 'utf8');
  if (bytes.length > MAX_REQUEST_BYTES) fail('REQUEST_BODY_TOO_LARGE', 413);

  const actualDigest = crypto.createHash('sha256').update(bytes).digest();
  const expectedDigest = Buffer.from(bodySha256, 'hex');
  if (!crypto.timingSafeEqual(actualDigest, expectedDigest)) {
    fail('REQUEST_BODY_HASH_MISMATCH', 400);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (_) {
    fail('REQUEST_JSON_INVALID', 400);
  }

  const listing = exactObject(payload, ['mediaId', 'finalizationToken']);
  const proof = exactObject(payload, ['captureReceiptId', 'finalizationToken']);
  if (!(listing || proof)) fail('FINALIZATION_REQUEST_INVALID', 400);

  const token = String(payload.finalizationToken || '');
  if (!TOKEN_PATTERN.test(token)) fail('FINALIZATION_REQUEST_INVALID', 400);

  if (listing) {
    const mediaId = String(payload.mediaId || '');
    if (!UUID_PATTERN.test(mediaId)) fail('FINALIZATION_REQUEST_INVALID', 400);
    return Object.freeze({
      kind: 'listing',
      mediaId,
      token,
      sessionToken,
      bodySha256,
    });
  }

  const captureReceiptId = String(payload.captureReceiptId || '');
  if (!UUID_PATTERN.test(captureReceiptId)) fail('FINALIZATION_REQUEST_INVALID', 400);
  return Object.freeze({
    kind: 'proof',
    captureReceiptId,
    token,
    sessionToken,
    bodySha256,
  });
}

module.exports = Object.freeze({
  MAX_REQUEST_BYTES,
  parseVerifiedRequest,
  requestFailure,
});
