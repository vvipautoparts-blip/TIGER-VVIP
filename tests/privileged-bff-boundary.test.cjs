'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const boundary = require('../scripts/security/privileged-bff-boundary.js');

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

const CSRF = 'csrf-proof-7b2f1e0d';

function policy(overrides = {}) {
  return {
    allowed_origin: 'https://app.example',
    endpoint_path: '/privileged/action',
    max_body_bytes: 32768,
    require_fetch_metadata: true,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    method: 'POST',
    url: 'https://app.example/privileged/action',
    origin: 'https://app.example',
    forwarded_proto: 'https',
    content_type: 'application/json',
    body_bytes: 512,
    headers: {},
    fetch_metadata: {
      site: 'same-origin',
      mode: 'cors',
      dest: 'empty',
    },
    trusted_session: {
      authenticated: true,
      principal: 'user:owner',
      continuation_id: 'continuation:001',
      csrf_token_hash: sha256(CSRF),
    },
    csrf: {
      cookie_token: CSRF,
      header_token: CSRF,
    },
    ...overrides,
  };
}

test('valid privileged request returns a frozen bounded transport projection, never execution authority', () => {
  const result = boundary.validatePrivilegedRequest(request(), policy());

  assert.equal(result.ok, true);
  assert.equal(result.method, 'POST');
  assert.equal(result.origin, 'https://app.example');
  assert.equal(result.path, '/privileged/action');
  assert.equal(result.principal, 'user:owner');
  assert.equal(result.continuation_id, 'continuation:001');
  assert.equal(result.csrf_verified, true);
  assert.equal(result.execution_authority, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.hasOwn(result, 'csrf'), false);
  assert.equal(Object.hasOwn(result, 'headers'), false);
});

test('mutation boundary is POST-only, HTTPS-only, and exact-origin/path', () => {
  assert.throws(() => boundary.validatePrivilegedRequest(request({ method: 'GET' }), policy()), /METHOD_NOT_ALLOWED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ forwarded_proto: 'http' }), policy()), /HTTPS_REQUIRED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ origin: 'https://evil.example' }), policy()), /ORIGIN_DENIED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ url: 'https://app.example/privileged/other' }), policy()), /PATH_DENIED/);
});

test('privileged endpoint rejects all URL query/fragment material so tokens and secrets cannot leak there', () => {
  for (const url of [
    'https://app.example/privileged/action?token=secret-123',
    'https://app.example/privileged/action?intent=opaque-ref',
    'https://app.example/privileged/action#secret',
  ]) {
    assert.throws(() => boundary.validatePrivilegedRequest(request({ url }), policy()), /URL_METADATA_FORBIDDEN/);
  }
});

test('cookie continuation requires session-bound csrf cookie/header agreement using server-held digest', () => {
  assert.throws(
    () => boundary.validatePrivilegedRequest(request({ csrf: { cookie_token: CSRF, header_token: 'different' } }), policy()),
    /CSRF_DENIED/,
  );
  assert.throws(
    () => boundary.validatePrivilegedRequest(request({ csrf: { cookie_token: '', header_token: '' } }), policy()),
    /CSRF_DENIED/,
  );
  assert.throws(
    () => boundary.validatePrivilegedRequest(request({
      trusted_session: {
        ...request().trusted_session,
        csrf_token_hash: sha256('another-token'),
      },
    }), policy()),
    /CSRF_DENIED/,
  );
});

test('missing, unauthenticated, or ambiguous trusted session evidence fails closed', () => {
  assert.throws(() => boundary.validatePrivilegedRequest(request({ trusted_session: null }), policy()), /SESSION_REQUIRED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({
    trusted_session: { ...request().trusted_session, authenticated: false },
  }), policy()), /SESSION_REQUIRED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({
    trusted_session: { ...request().trusted_session, principal: '' },
  }), policy()), /SESSION_REQUIRED/);
});

test('Fetch Metadata is enforced when policy requires it and contradictory cross-site requests are denied', () => {
  assert.throws(() => boundary.validatePrivilegedRequest(request({ fetch_metadata: null }), policy()), /FETCH_METADATA_REQUIRED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({
    fetch_metadata: { site: 'cross-site', mode: 'cors', dest: 'empty' },
  }), policy()), /FETCH_METADATA_DENIED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({
    fetch_metadata: { site: 'same-origin', mode: 'navigate', dest: 'document' },
  }), policy()), /FETCH_METADATA_DENIED/);
});

test('content type and server-measured body size are bounded', () => {
  assert.throws(() => boundary.validatePrivilegedRequest(request({ content_type: 'text/plain' }), policy()), /CONTENT_TYPE_DENIED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ content_type: 'application/json; charset=utf-8' }), policy()), /CONTENT_TYPE_DENIED/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ body_bytes: 32769 }), policy()), /BODY_TOO_LARGE/);
  assert.throws(() => boundary.validatePrivilegedRequest(request({ body_bytes: -1 }), policy()), /BODY_SIZE_INVALID/);
});

test('browser bearer Authorization is rejected for privileged continuation requests', () => {
  assert.throws(() => boundary.validatePrivilegedRequest(request({
    headers: { Authorization: 'Bearer browser-secret-token' },
  }), policy()), /BROWSER_BEARER_FORBIDDEN/);
});

test('opaque failures never echo bearer/csrf/session secret material', () => {
  const bearer = 'Bearer do-not-echo-very-secret';
  let error;
  try {
    boundary.validatePrivilegedRequest(request({ headers: { authorization: bearer } }), policy());
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.doesNotMatch(error.message, /do-not-echo|very-secret|csrf-proof|continuation:001/i);
});
