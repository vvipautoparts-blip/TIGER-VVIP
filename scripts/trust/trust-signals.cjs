'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');

const TRUST_SIGNAL_SCHEMA = 'TIGER_TRUST_SIGNAL_V1';
const TRUST_SIGNAL_CLASS = 'AUTHENTICATED_TRUST_SIGNAL';
const MAX_TRUST_SIGNAL_LIFETIME_MS = 5 * 60 * 1000;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const TRUSTED_SIGNALS = new WeakSet();
const SIGNAL_KEYS = Object.freeze([
  'schema',
  'signal_class',
  'status',
  'signal_type',
  'subject_ref_sha256',
  'resource_ref_sha256',
  'action_profile_ref_sha256',
  'country_ref_sha256',
  'release_dna_sha256',
  'issuer_ref_sha256',
  'sequence',
  'issued_at_ms',
  'fresh_until_ms',
  'evidence_sha256',
  'state',
]);
const DIGEST_FIELDS = Object.freeze([
  'subject_ref_sha256',
  'resource_ref_sha256',
  'action_profile_ref_sha256',
  'country_ref_sha256',
  'release_dna_sha256',
  'issuer_ref_sha256',
  'evidence_sha256',
]);

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

function boundedString(value, max = 128) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= max
    && value.trim() === value;
}

function nonNegativeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function strongSha256(value) {
  return typeof value === 'string' && SHA256.test(value) && !ZERO_SHA256.test(value);
}

function validateNowMs(nowMs) {
  if (!nonNegativeInt(nowMs)) fail('TRUST_SIGNAL_TIME_INVALID');
  return nowMs;
}

function validateTrustSignal(value, { nowMs } = {}) {
  validateNowMs(nowMs);

  if (!hasExactKeys(value, SIGNAL_KEYS)
    || value.schema !== TRUST_SIGNAL_SCHEMA
    || value.signal_class !== TRUST_SIGNAL_CLASS
    || !['PASS', 'REVOKED'].includes(value.status)
    || !boundedString(value.signal_type)
    || DIGEST_FIELDS.some((field) => !strongSha256(value[field]))
    || !nonNegativeInt(value.sequence)
    || !nonNegativeInt(value.issued_at_ms)
    || !nonNegativeInt(value.fresh_until_ms)
    || value.fresh_until_ms <= value.issued_at_ms
    || value.state !== 'PASS') {
    fail('TRUST_SIGNAL_INVALID');
  }

  if (value.issued_at_ms > nowMs
    || value.fresh_until_ms - value.issued_at_ms > MAX_TRUST_SIGNAL_LIFETIME_MS) {
    fail('TRUST_SIGNAL_FRESHNESS_INVALID');
  }
  if (nowMs >= value.fresh_until_ms) fail('TRUST_SIGNAL_STALE');

  return Object.freeze({
    schema: value.schema,
    signal_class: value.signal_class,
    status: value.status,
    signal_type: value.signal_type,
    subject_ref_sha256: value.subject_ref_sha256,
    resource_ref_sha256: value.resource_ref_sha256,
    action_profile_ref_sha256: value.action_profile_ref_sha256,
    country_ref_sha256: value.country_ref_sha256,
    release_dna_sha256: value.release_dna_sha256,
    issuer_ref_sha256: value.issuer_ref_sha256,
    sequence: value.sequence,
    issued_at_ms: value.issued_at_ms,
    fresh_until_ms: value.fresh_until_ms,
    evidence_sha256: value.evidence_sha256,
    state: value.state,
  });
}

function digestTrustSignal(value, { nowMs } = {}) {
  return sha256Hex(canonicalJson(validateTrustSignal(value, { nowMs })));
}

function isTrustedTrustSignal(value) {
  return Boolean(value && typeof value === 'object' && TRUSTED_SIGNALS.has(value));
}

function createTrustedSignalAdapter({ authenticate, clock } = {}) {
  if (typeof authenticate !== 'function' || typeof clock !== 'function') {
    fail('TRUST_SIGNAL_ADAPTER_INVALID');
  }

  return Object.freeze({
    admit(candidate) {
      let authenticated;
      try {
        authenticated = authenticate(candidate);
      } catch {
        fail('TRUST_SIGNAL_ISSUER_UNTRUSTED');
      }
      if (!authenticated || typeof authenticated !== 'object') {
        fail('TRUST_SIGNAL_ISSUER_UNTRUSTED');
      }

      const nowMs = validateNowMs(clock());
      const trusted = validateTrustSignal(authenticated, { nowMs });
      TRUSTED_SIGNALS.add(trusted);
      return trusted;
    },
  });
}

module.exports = {
  TRUST_SIGNAL_SCHEMA,
  TRUST_SIGNAL_CLASS,
  MAX_TRUST_SIGNAL_LIFETIME_MS,
  createTrustedSignalAdapter,
  validateTrustSignal,
  digestTrustSignal,
  isTrustedTrustSignal,
};
