'use strict';

const INPUT_FIELDS = Object.freeze([
  'authorizationId',
  'verificationDigest',
  'ownerSubject',
  'action',
  'releaseDigest',
  'payloadDigest',
  'scopeDigest',
  'environment',
  'now',
]);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const HEX_256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set([
  'MERGE_RELEASE',
  'PROMOTE_DATABASE',
  'ACTIVATE_PRODUCTION',
  'CHANGE_PRICES',
  'CHANGE_OWNER_SECURITY',
  'CHANGE_AI_SECURITY_POLICY',
]);
const ENVIRONMENTS = new Set(['REPOSITORY', 'PRODUCTION']);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactInput(value) {
  if (!isPlainObject(value)) fail('STEPUP_CONSUMER_INPUT_INVALID');
  const allowed = new Set(INPUT_FIELDS);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key) || !allowed.has(key)) fail('STEPUP_CONSUMER_UNKNOWN_FIELD');
  }
  for (const key of INPUT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail('STEPUP_CONSUMER_REQUIRED_FIELD');
  }
}

function boundedString(value, min, max, code) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  if (/\u0000|[\u0001-\u001f]/.test(normalized)) fail(code);
  return normalized;
}

function hash(value, code) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!HEX_256.test(normalized)) fail(code);
  return normalized;
}

function isoTime(value, code) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) fail(code);
  return new Date(parsed).toISOString();
}

function normalizeInput(value) {
  exactInput(value);
  const authorizationId = String(value.authorizationId || '').trim().toLowerCase();
  if (!UUID.test(authorizationId)) fail('STEPUP_CONSUMER_AUTHORIZATION_ID_INVALID');
  const ownerSubject = boundedString(value.ownerSubject, 3, 256, 'STEPUP_CONSUMER_OWNER_INVALID');
  const action = String(value.action || '').trim().toUpperCase();
  if (!ACTIONS.has(action)) fail('STEPUP_CONSUMER_ACTION_INVALID');
  const environment = String(value.environment || '').trim().toUpperCase();
  if (!ENVIRONMENTS.has(environment)) fail('STEPUP_CONSUMER_ENVIRONMENT_INVALID');
  const expectedEnvironment = action === 'MERGE_RELEASE' ? 'REPOSITORY' : 'PRODUCTION';
  if (environment !== expectedEnvironment) fail('STEPUP_CONSUMER_ACTION_ENVIRONMENT_MISMATCH');

  return Object.freeze({
    authorizationId,
    verificationDigest: hash(value.verificationDigest, 'STEPUP_CONSUMER_VERIFICATION_INVALID'),
    ownerSubject,
    action,
    releaseDigest: hash(value.releaseDigest, 'STEPUP_CONSUMER_RELEASE_INVALID'),
    payloadDigest: hash(value.payloadDigest, 'STEPUP_CONSUMER_PAYLOAD_INVALID'),
    scopeDigest: hash(value.scopeDigest, 'STEPUP_CONSUMER_SCOPE_INVALID'),
    environment,
    now: isoTime(value.now, 'STEPUP_CONSUMER_TIME_INVALID'),
  });
}

function normalizeRpcResult(response) {
  if (!response || typeof response !== 'object' || response.error) {
    return Object.freeze({ ok: false, reasonCode: 'STEPUP_PERSISTENCE_UNAVAILABLE' });
  }
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!isPlainObject(row) || typeof row.ok !== 'boolean' || typeof row.reason_code !== 'string') {
    return Object.freeze({ ok: false, reasonCode: 'STEPUP_PERSISTENCE_RESULT_INVALID' });
  }
  const reasonCode = row.reason_code.trim();
  if (!/^[A-Z0-9_]{3,128}$/.test(reasonCode)) {
    return Object.freeze({ ok: false, reasonCode: 'STEPUP_PERSISTENCE_RESULT_INVALID' });
  }
  return Object.freeze({ ok: row.ok, reasonCode });
}

function createSupabaseStepUpConsumer({ client } = {}) {
  if (!client || typeof client.rpc !== 'function') {
    throw new TypeError('STEPUP_SUPABASE_CLIENT_INVALID');
  }

  return Object.freeze({
    async consume(input) {
      const normalized = normalizeInput(input);
      let response;
      try {
        response = await client.rpc('consume_ai_owner_stepup_authorization', {
          p_authorization_id: normalized.authorizationId,
          p_owner_subject: normalized.ownerSubject,
          p_action: normalized.action,
          p_release_digest: normalized.releaseDigest,
          p_payload_digest: normalized.payloadDigest,
          p_scope_digest: normalized.scopeDigest,
          p_environment: normalized.environment,
          p_now: normalized.now,
        });
      } catch {
        return Object.freeze({ ok: false, reasonCode: 'STEPUP_PERSISTENCE_UNAVAILABLE' });
      }
      return normalizeRpcResult(response);
    },
  });
}

module.exports = Object.freeze({
  createSupabaseStepUpConsumer,
});
