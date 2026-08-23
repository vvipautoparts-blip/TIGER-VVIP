'use strict';

const crypto = require('node:crypto');

const REQUEST_KEYS = new Set([
  'method',
  'url',
  'origin',
  'forwarded_proto',
  'content_type',
  'body_bytes',
  'headers',
  'fetch_metadata',
  'trusted_session',
  'csrf',
]);
const POLICY_KEYS = new Set([
  'allowed_origin',
  'endpoint_path',
  'max_body_bytes',
  'require_fetch_metadata',
]);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) fail('UNSAFE_REQUEST_KEY_FORBIDDEN');
    assertSafeKeys(value[key]);
  }
}

function assertOnlyKeys(value, allowed, code) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(code);
  }
}

function boundedString(value, code, max = 512) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail(code);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function timingSafeTextEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function parseAllowedOrigin(raw) {
  const value = boundedString(raw, 'POLICY_ORIGIN_INVALID', 512);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail('POLICY_ORIGIN_INVALID');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname && parsed.pathname !== '/')
  ) {
    fail('POLICY_ORIGIN_INVALID');
  }
  return parsed.origin;
}

function parseEndpointPath(raw) {
  const value = boundedString(raw, 'POLICY_PATH_INVALID', 256);
  if (!value.startsWith('/') || value.includes('?') || value.includes('#') || value.includes('\\')) {
    fail('POLICY_PATH_INVALID');
  }
  return value;
}

function validatePolicy(input) {
  if (!isPlainObject(input)) fail('PRIVILEGED_POLICY_INVALID');
  assertSafeKeys(input);
  assertOnlyKeys(input, POLICY_KEYS, 'PRIVILEGED_POLICY_FIELD_FORBIDDEN');

  const maxBody = input.max_body_bytes;
  if (!Number.isInteger(maxBody) || maxBody <= 0 || maxBody > 1048576) {
    fail('POLICY_BODY_LIMIT_INVALID');
  }
  if (typeof input.require_fetch_metadata !== 'boolean') {
    fail('POLICY_FETCH_METADATA_INVALID');
  }

  return Object.freeze({
    allowed_origin: parseAllowedOrigin(input.allowed_origin),
    endpoint_path: parseEndpointPath(input.endpoint_path),
    max_body_bytes: maxBody,
    require_fetch_metadata: input.require_fetch_metadata,
  });
}

function normalizeUrl(raw) {
  const value = boundedString(raw, 'URL_INVALID', 2048);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail('URL_INVALID');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail('HTTPS_REQUIRED');
  if (parsed.search || parsed.hash) fail('URL_METADATA_FORBIDDEN');
  return parsed;
}

function hasAuthorizationHeader(headers) {
  if (!isPlainObject(headers)) fail('HEADERS_INVALID');
  assertSafeKeys(headers);
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
}

function validateFetchMetadata(metadata, required) {
  if (metadata === null || metadata === undefined) {
    if (required) fail('FETCH_METADATA_REQUIRED');
    return false;
  }
  if (!isPlainObject(metadata)) fail('FETCH_METADATA_DENIED');
  assertSafeKeys(metadata);

  const allowedKeys = new Set(['site', 'mode', 'dest']);
  assertOnlyKeys(metadata, allowedKeys, 'FETCH_METADATA_DENIED');

  if (
    metadata.site !== 'same-origin' ||
    !['cors', 'same-origin'].includes(metadata.mode) ||
    metadata.dest !== 'empty'
  ) {
    fail('FETCH_METADATA_DENIED');
  }
  return true;
}

function validateTrustedSession(session) {
  if (!isPlainObject(session) || session.authenticated !== true) fail('SESSION_REQUIRED');
  assertSafeKeys(session);
  const allowed = new Set(['authenticated', 'principal', 'continuation_id', 'csrf_token_hash']);
  assertOnlyKeys(session, allowed, 'SESSION_REQUIRED');

  const principal = boundedString(session.principal, 'SESSION_REQUIRED', 256);
  const continuationId = boundedString(session.continuation_id, 'SESSION_REQUIRED', 256);
  const csrfHash = boundedString(session.csrf_token_hash, 'SESSION_REQUIRED', 64).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(csrfHash)) fail('SESSION_REQUIRED');

  return Object.freeze({
    principal,
    continuation_id: continuationId,
    csrf_token_hash: csrfHash,
  });
}

function validateCsrf(csrf, expectedHash) {
  if (!isPlainObject(csrf)) fail('CSRF_DENIED');
  assertSafeKeys(csrf);
  const allowed = new Set(['cookie_token', 'header_token']);
  assertOnlyKeys(csrf, allowed, 'CSRF_DENIED');

  const cookieToken = typeof csrf.cookie_token === 'string' ? csrf.cookie_token : '';
  const headerToken = typeof csrf.header_token === 'string' ? csrf.header_token : '';
  if (
    cookieToken.length < 8 ||
    headerToken.length < 8 ||
    cookieToken.length > 512 ||
    headerToken.length > 512 ||
    !timingSafeTextEqual(cookieToken, headerToken)
  ) {
    fail('CSRF_DENIED');
  }

  const actualHash = sha256(headerToken);
  if (!timingSafeTextEqual(actualHash, expectedHash)) fail('CSRF_DENIED');
  return true;
}

function validatePrivilegedRequest(input, policyInput) {
  if (!isPlainObject(input)) fail('PRIVILEGED_REQUEST_INVALID');
  assertSafeKeys(input);
  assertOnlyKeys(input, REQUEST_KEYS, 'REQUEST_FIELD_FORBIDDEN');

  const policy = validatePolicy(policyInput);

  if (String(input.method || '').toUpperCase() !== 'POST') fail('METHOD_NOT_ALLOWED');
  if (String(input.forwarded_proto || '').toLowerCase() !== 'https') fail('HTTPS_REQUIRED');

  const parsedUrl = normalizeUrl(input.url);
  const requestOrigin = boundedString(input.origin, 'ORIGIN_DENIED', 512);
  if (parsedUrl.origin !== policy.allowed_origin || requestOrigin !== policy.allowed_origin) {
    fail('ORIGIN_DENIED');
  }
  if (parsedUrl.pathname !== policy.endpoint_path) fail('PATH_DENIED');

  if (input.content_type !== 'application/json') fail('CONTENT_TYPE_DENIED');
  if (!Number.isInteger(input.body_bytes) || input.body_bytes < 0) fail('BODY_SIZE_INVALID');
  if (input.body_bytes > policy.max_body_bytes) fail('BODY_TOO_LARGE');

  if (hasAuthorizationHeader(input.headers || {})) fail('BROWSER_BEARER_FORBIDDEN');

  const fetchMetadataVerified = validateFetchMetadata(
    input.fetch_metadata,
    policy.require_fetch_metadata,
  );
  const trustedSession = validateTrustedSession(input.trusted_session);
  const csrfVerified = validateCsrf(input.csrf, trustedSession.csrf_token_hash);

  return deepFreeze({
    ok: true,
    method: 'POST',
    origin: policy.allowed_origin,
    path: policy.endpoint_path,
    principal: trustedSession.principal,
    continuation_id: trustedSession.continuation_id,
    content_type: 'application/json',
    body_bytes: input.body_bytes,
    csrf_verified: csrfVerified,
    fetch_metadata_verified: fetchMetadataVerified,
    execution_authority: false,
  });
}

module.exports = Object.freeze({
  validatePolicy,
  validatePrivilegedRequest,
});
