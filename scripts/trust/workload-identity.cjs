'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');

const WORKLOAD_IDENTITY_SCHEMA = 'TIGER_WORKLOAD_IDENTITY_V1';
const MAX_WORKLOAD_IDENTITY_LIFETIME_MS = 5 * 60 * 1000;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const ENVIRONMENTS = new Set(['staging', 'production']);
const WORKLOAD_IDENTITY_KEYS = Object.freeze([
  'schema',
  'identity_class',
  'environment',
  'release_dna_sha256',
  'runtime_artifact_sha256',
  'workload_ref_sha256',
  'issuer_ref_sha256',
  'evidence_sha256',
  'issued_at_ms',
  'fresh_until_ms',
  'state',
]);
const trustedWorkloadIdentities = new WeakSet();

function fail(code) {
  throw new TrustContractError(code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function safeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function strongSha256(value) {
  return typeof value === 'string' && SHA256.test(value) && !ZERO_SHA256.test(value);
}

function safeNow(clock) {
  let value;
  try {
    value = clock();
  } catch {
    fail('TRUST_WORKLOAD_IDENTITY_TIME_INVALID');
  }
  if (!safeInt(value)) fail('TRUST_WORKLOAD_IDENTITY_TIME_INVALID');
  return value;
}

function validateWorkloadIdentity(value, { nowMs } = {}) {
  if (!safeInt(nowMs)) fail('TRUST_WORKLOAD_IDENTITY_TIME_INVALID');
  if (!hasExactKeys(value, WORKLOAD_IDENTITY_KEYS)
    || value.schema !== WORKLOAD_IDENTITY_SCHEMA
    || value.identity_class !== 'AUTHENTICATED_WORKLOAD_IDENTITY'
    || !ENVIRONMENTS.has(value.environment)
    || !strongSha256(value.release_dna_sha256)
    || !strongSha256(value.runtime_artifact_sha256)
    || !strongSha256(value.workload_ref_sha256)
    || !strongSha256(value.issuer_ref_sha256)
    || !strongSha256(value.evidence_sha256)
    || !safeInt(value.issued_at_ms)
    || !safeInt(value.fresh_until_ms)
    || value.state !== 'PASS') {
    fail('TRUST_WORKLOAD_IDENTITY_INVALID');
  }
  if (value.fresh_until_ms <= value.issued_at_ms
    || value.fresh_until_ms - value.issued_at_ms > MAX_WORKLOAD_IDENTITY_LIFETIME_MS
    || value.issued_at_ms > nowMs) {
    fail('TRUST_WORKLOAD_IDENTITY_FRESHNESS_INVALID');
  }
  if (nowMs >= value.fresh_until_ms) fail('TRUST_WORKLOAD_IDENTITY_STALE');
  return Object.freeze({ ...value });
}

function digestWorkloadIdentity(value, { nowMs } = {}) {
  return sha256Hex(canonicalJson(validateWorkloadIdentity(value, { nowMs })));
}

function createTrustedWorkloadIdentityAdapter({ authenticate, clock } = {}) {
  if (typeof authenticate !== 'function' || typeof clock !== 'function') {
    fail('TRUST_WORKLOAD_IDENTITY_ADAPTER_INVALID');
  }
  return Object.freeze({
    admit(candidate) {
      let authenticated;
      try {
        authenticated = authenticate(candidate);
      } catch {
        fail('TRUST_WORKLOAD_IDENTITY_ISSUER_UNTRUSTED');
      }
      if (!isPlainObject(authenticated)) fail('TRUST_WORKLOAD_IDENTITY_ISSUER_UNTRUSTED');
      const nowMs = safeNow(clock);
      const normalized = validateWorkloadIdentity(authenticated, { nowMs });
      trustedWorkloadIdentities.add(normalized);
      return normalized;
    },
  });
}

function isTrustedWorkloadIdentity(value) {
  return Boolean(value && typeof value === 'object' && trustedWorkloadIdentities.has(value));
}

module.exports = {
  WORKLOAD_IDENTITY_SCHEMA,
  MAX_WORKLOAD_IDENTITY_LIFETIME_MS,
  createTrustedWorkloadIdentityAdapter,
  validateWorkloadIdentity,
  digestWorkloadIdentity,
  isTrustedWorkloadIdentity,
};
