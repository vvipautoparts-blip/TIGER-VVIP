'use strict';

const {
  canonicalJson,
  sha256Hex,
  TrustContractError,
} = require('./contracts.cjs');

const ATTESTATION_RESULT_SCHEMA = 'TIGER_ATTESTATION_RESULT_V1';
const ATTESTATION_RESULT_CLASS = 'VERIFIED_RUNTIME_APPRAISAL';
const MAX_ATTESTATION_LIFETIME_MS = 5 * 60 * 1000;

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const ENVIRONMENTS = new Set(['staging', 'production']);
const SECURITY_DIGEST_FIELDS = Object.freeze([
  'runtime_artifact_sha256',
  'verifier_ref_sha256',
  'attester_ref_sha256',
  'evidence_sha256',
  'appraisal_policy_sha256',
  'freshness_binding_sha256',
]);
const RESULT_KEYS = Object.freeze([
  'schema',
  'result_class',
  'environment',
  'release_sha',
  ...SECURITY_DIGEST_FIELDS,
  'issued_at_ms',
  'fresh_until_ms',
  'state',
]);

const trustedResults = new WeakSet();

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

function isNonNegativeSafeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isSecurityDigest(value) {
  return typeof value === 'string'
    && SHA256.test(value)
    && !ZERO_SHA256.test(value);
}

function trustedNow(options) {
  const nowMs = options?.nowMs;
  if (!isNonNegativeSafeInt(nowMs)) fail('ATTESTATION_FRESHNESS_INVALID');
  return nowMs;
}

function validateAttestationResult(value, options = {}) {
  const nowMs = trustedNow(options);

  if (!hasExactKeys(value, RESULT_KEYS)
    || value.schema !== ATTESTATION_RESULT_SCHEMA
    || value.result_class !== ATTESTATION_RESULT_CLASS
    || !ENVIRONMENTS.has(value.environment)
    || !SHA40.test(value.release_sha)
    || value.state !== 'PASS'
    || SECURITY_DIGEST_FIELDS.some((field) => !isSecurityDigest(value[field]))
    || !isNonNegativeSafeInt(value.issued_at_ms)
    || !isNonNegativeSafeInt(value.fresh_until_ms)) {
    fail('ATTESTATION_RESULT_INVALID');
  }

  if (value.fresh_until_ms <= value.issued_at_ms
    || value.fresh_until_ms - value.issued_at_ms > MAX_ATTESTATION_LIFETIME_MS
    || value.issued_at_ms > nowMs) {
    fail('ATTESTATION_FRESHNESS_INVALID');
  }

  if (value.fresh_until_ms <= nowMs) fail('ATTESTATION_RESULT_STALE');

  return Object.freeze({
    schema: value.schema,
    result_class: value.result_class,
    environment: value.environment,
    release_sha: value.release_sha,
    runtime_artifact_sha256: value.runtime_artifact_sha256,
    verifier_ref_sha256: value.verifier_ref_sha256,
    attester_ref_sha256: value.attester_ref_sha256,
    evidence_sha256: value.evidence_sha256,
    appraisal_policy_sha256: value.appraisal_policy_sha256,
    freshness_binding_sha256: value.freshness_binding_sha256,
    issued_at_ms: value.issued_at_ms,
    fresh_until_ms: value.fresh_until_ms,
    state: value.state,
  });
}

function digestAttestationResult(value, options = {}) {
  return sha256Hex(canonicalJson(validateAttestationResult(value, options)));
}

function isTrustedAttestationResult(value) {
  return Boolean(value && typeof value === 'object' && trustedResults.has(value));
}

function createTrustedVerifierAdapter({ authenticate } = {}) {
  if (typeof authenticate !== 'function') fail('ATTESTATION_VERIFIER_UNTRUSTED');

  return Object.freeze({
    admit(externalResult, options = {}) {
      let authenticated;
      try {
        authenticated = authenticate(externalResult);
      } catch {
        fail('ATTESTATION_VERIFIER_UNTRUSTED');
      }
      if (!isPlainObject(authenticated)) fail('ATTESTATION_VERIFIER_UNTRUSTED');
      const normalized = validateAttestationResult(authenticated, options);
      trustedResults.add(normalized);
      return normalized;
    },
  });
}

module.exports = {
  ATTESTATION_RESULT_SCHEMA,
  ATTESTATION_RESULT_CLASS,
  MAX_ATTESTATION_LIFETIME_MS,
  createTrustedVerifierAdapter,
  validateAttestationResult,
  digestAttestationResult,
  isTrustedAttestationResult,
};
