'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');

const TRANSPARENCY_RESULT_SCHEMA = 'TIGER_TRANSPARENCY_RESULT_V1';
const MAX_TRANSPARENCY_LIVE_USE_MS = 5 * 60 * 1000;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const TRANSPARENCY_RESULT_KEYS = Object.freeze([
  'schema',
  'result_class',
  'release_dna_sha256',
  'runtime_artifact_sha256',
  'statement_sha256',
  'registry_ref_sha256',
  'verifier_ref_sha256',
  'receipt_sha256',
  'verified_at_ms',
  'fresh_until_ms',
  'state',
]);
const trustedTransparencyResults = new WeakSet();

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
    fail('TRUST_TRANSPARENCY_TIME_INVALID');
  }
  if (!safeInt(value)) fail('TRUST_TRANSPARENCY_TIME_INVALID');
  return value;
}

function validateTransparencyResult(value, { nowMs } = {}) {
  if (!safeInt(nowMs)) fail('TRUST_TRANSPARENCY_TIME_INVALID');
  if (!hasExactKeys(value, TRANSPARENCY_RESULT_KEYS)
    || value.schema !== TRANSPARENCY_RESULT_SCHEMA
    || value.result_class !== 'VERIFIED_TRANSPARENCY_STATEMENT'
    || !strongSha256(value.release_dna_sha256)
    || !strongSha256(value.runtime_artifact_sha256)
    || !strongSha256(value.statement_sha256)
    || !strongSha256(value.registry_ref_sha256)
    || !strongSha256(value.verifier_ref_sha256)
    || !strongSha256(value.receipt_sha256)
    || !safeInt(value.verified_at_ms)
    || !safeInt(value.fresh_until_ms)
    || value.state !== 'PASS') {
    fail('TRUST_TRANSPARENCY_INVALID');
  }
  if (value.fresh_until_ms <= value.verified_at_ms
    || value.fresh_until_ms - value.verified_at_ms > MAX_TRANSPARENCY_LIVE_USE_MS
    || value.verified_at_ms > nowMs) {
    fail('TRUST_TRANSPARENCY_FRESHNESS_INVALID');
  }
  if (nowMs >= value.fresh_until_ms) fail('TRUST_TRANSPARENCY_STALE');
  return Object.freeze({ ...value });
}

function digestTransparencyResult(value, { nowMs } = {}) {
  return sha256Hex(canonicalJson(validateTransparencyResult(value, { nowMs })));
}

function createTrustedTransparencyAdapter({ authenticate, clock } = {}) {
  if (typeof authenticate !== 'function' || typeof clock !== 'function') {
    fail('TRUST_TRANSPARENCY_ADAPTER_INVALID');
  }
  return Object.freeze({
    admit(candidate) {
      let authenticated;
      try {
        authenticated = authenticate(candidate);
      } catch {
        fail('TRUST_TRANSPARENCY_VERIFIER_UNTRUSTED');
      }
      if (!isPlainObject(authenticated)) fail('TRUST_TRANSPARENCY_VERIFIER_UNTRUSTED');
      const nowMs = safeNow(clock);
      const normalized = validateTransparencyResult(authenticated, { nowMs });
      trustedTransparencyResults.add(normalized);
      return normalized;
    },
  });
}

function isTrustedTransparencyResult(value) {
  return Boolean(value && typeof value === 'object' && trustedTransparencyResults.has(value));
}

module.exports = {
  TRANSPARENCY_RESULT_SCHEMA,
  MAX_TRANSPARENCY_LIVE_USE_MS,
  createTrustedTransparencyAdapter,
  validateTransparencyResult,
  digestTransparencyResult,
  isTrustedTransparencyResult,
};
