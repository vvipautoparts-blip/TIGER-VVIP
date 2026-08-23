'use strict';

const crypto = require('node:crypto');

const ALLOWED_TOP_LEVEL = new Set([
  'authenticated_principal',
  'identity_issuer',
  'identity_subject',
  'action',
  'resource_type',
  'resource_id',
  'requested_scope',
  'authoritative_risk_tier',
  'required_proof_classes',
  'policy_version',
  'authority_version',
  'release_sha',
  'release_proof_ref',
  'request_nonce',
  'correlation_id',
  'server_created_at',
  'server_expires_at',
]);

const SCOPE_KEYS = new Set([
  'resource_scope',
  'sector_scope',
  'entity_scope',
  'geo_policy_scope',
]);

const RESOURCE_SCOPE_KEYS = new Set(['kind', 'ids']);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RISK_TIERS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

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
    if (DANGEROUS_KEYS.has(key)) fail('UNSAFE_PROTOTYPE_KEY_FORBIDDEN');
    assertSafeKeys(value[key]);
  }
}

function assertOnlyKeys(value, allowed, code) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(code + ':' + key);
  }
}

function boundedString(value, name, max = 512) {
  if (typeof value !== 'string') fail(name + '_INVALID');
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail(name + '_INVALID');
  if (normalized === '*') fail('SCOPE_WILDCARD_FORBIDDEN');
  return normalized;
}

function token(value, name, max = 128) {
  const normalized = boundedString(value, name, max);
  if (!/^[A-Za-z0-9._:/-]+$/.test(normalized)) fail(name + '_INVALID');
  return normalized;
}

function normalizeStringSet(value, name, maxItems = 64) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    fail(name + '_BOUNDED_SET_INVALID');
  }
  const normalized = value.map((entry) => boundedString(entry, name, 256));
  if (normalized.some((entry) => entry === '*')) fail('SCOPE_WILDCARD_FORBIDDEN');
  return Object.freeze([...new Set(normalized)].sort());
}

function normalizeScope(raw) {
  if (!isPlainObject(raw)) fail('SCOPE_BOUNDED_OBJECT_REQUIRED');
  assertSafeKeys(raw);
  assertOnlyKeys(raw, SCOPE_KEYS, 'CLIENT_SCOPE_FIELD_FORBIDDEN');

  const resource = raw.resource_scope;
  if (!isPlainObject(resource)) fail('RESOURCE_SCOPE_BOUNDED_OBJECT_REQUIRED');
  assertOnlyKeys(resource, RESOURCE_SCOPE_KEYS, 'CLIENT_RESOURCE_SCOPE_FIELD_FORBIDDEN');

  const kind = token(resource.kind, 'RESOURCE_SCOPE_KIND');
  if (kind.toLowerCase() === 'platform') fail('PLATFORM_WIDE_SCOPE_FORBIDDEN');

  const ids = normalizeStringSet(resource.ids, 'RESOURCE_SCOPE_IDS');
  if (ids.some((entry) => entry.toLowerCase() === 'all')) {
    fail('PLATFORM_WIDE_SCOPE_FORBIDDEN');
  }

  return deepFreeze({
    resource_scope: deepFreeze({ kind, ids }),
    sector_scope: normalizeStringSet(raw.sector_scope, 'SECTOR_SCOPE'),
    entity_scope: normalizeStringSet(raw.entity_scope, 'ENTITY_SCOPE'),
    geo_policy_scope: normalizeStringSet(raw.geo_policy_scope, 'GEO_POLICY_SCOPE'),
  });
}

function normalizeIssuer(value) {
  const issuer = boundedString(value, 'IDENTITY_ISSUER', 512);
  let parsed;
  try {
    parsed = new URL(issuer);
  } catch {
    fail('IDENTITY_ISSUER_INVALID');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    fail('IDENTITY_ISSUER_INVALID');
  }
  return issuer;
}

function normalizeSha(value) {
  const sha = boundedString(value, 'RELEASE_SHA', 64).toLowerCase();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha)) fail('RELEASE_SHA_INVALID');
  return sha;
}

function normalizeTimestamp(value, name) {
  const raw = boundedString(value, name, 64);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) fail(name + '_INVALID');
  return { ms, iso: new Date(ms).toISOString() };
}

function stableNormalize(value) {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === 'object') {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = stableNormalize(value[key]);
    return output;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function canonicalizeActionIntent(input) {
  if (!isPlainObject(input)) fail('ACTION_INTENT_INPUT_INVALID');
  assertSafeKeys(input);
  assertOnlyKeys(input, ALLOWED_TOP_LEVEL, 'CLIENT_FIELD_FORBIDDEN');

  const riskTier = boundedString(input.authoritative_risk_tier, 'AUTHORITATIVE_RISK_TIER', 16).toUpperCase();
  if (!RISK_TIERS.has(riskTier)) fail('AUTHORITATIVE_RISK_TIER_INVALID');

  const created = normalizeTimestamp(input.server_created_at, 'SERVER_CREATED_AT');
  const expires = normalizeTimestamp(input.server_expires_at, 'SERVER_EXPIRES_AT');
  if (expires.ms <= created.ms) fail('INTENT_EXPIRES_MUST_BE_AFTER_CREATED');
  if ((expires.ms - created.ms) > 120000) fail('INTENT_LIFETIME_EXCEEDS_120_SECONDS');

  const canonical = {
    principal: token(input.authenticated_principal, 'AUTHENTICATED_PRINCIPAL', 256),
    identity_issuer: normalizeIssuer(input.identity_issuer),
    identity_subject: boundedString(input.identity_subject, 'IDENTITY_SUBJECT', 256),
    action: token(input.action, 'ACTION', 128),
    resource_type: token(input.resource_type, 'RESOURCE_TYPE', 128),
    resource_id: boundedString(input.resource_id, 'RESOURCE_ID', 256),
    canonical_scope: normalizeScope(input.requested_scope),
    risk_tier: riskTier,
    required_proof_classes: normalizeStringSet(input.required_proof_classes, 'REQUIRED_PROOF_CLASSES', 32),
    policy_version: token(input.policy_version, 'POLICY_VERSION', 128),
    authority_version: token(input.authority_version, 'AUTHORITY_VERSION', 128),
    release_sha: normalizeSha(input.release_sha),
    release_proof_ref: boundedString(input.release_proof_ref, 'RELEASE_PROOF_REF', 512),
    request_nonce: boundedString(input.request_nonce, 'REQUEST_NONCE', 256),
    correlation_id: boundedString(input.correlation_id, 'CORRELATION_ID', 256),
    created_at: created.iso,
    expires_at: expires.iso,
  };

  return deepFreeze(canonical);
}

function digestActionIntent(canonicalIntent) {
  if (!isPlainObject(canonicalIntent)) fail('CANONICAL_ACTION_INTENT_INVALID');
  assertSafeKeys(canonicalIntent);
  return crypto.createHash('sha256').update(stableStringify(canonicalIntent), 'utf8').digest('hex');
}

function buildActionIntent(input) {
  const canonical = canonicalizeActionIntent(input);
  return deepFreeze({
    intent: canonical,
    intent_digest: digestActionIntent(canonical),
    execution_authority: false,
  });
}

module.exports = Object.freeze({
  canonicalizeActionIntent,
  digestActionIntent,
  buildActionIntent,
});
