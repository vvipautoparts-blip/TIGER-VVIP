'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');
const {
  isTrustedTrustSignal,
  validateTrustSignal,
  digestTrustSignal,
} = require('./trust-signals.cjs');

const REVOCATION_STATE_SCHEMA = 'TIGER_REVOCATION_STATE_V1';
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const TRUSTED_REVOCATION_STATES = new WeakSet();
const SCOPE_KEYS = Object.freeze([
  'subject_ref_sha256',
  'resource_ref_sha256',
  'action_profile_ref_sha256',
  'country_ref_sha256',
  'release_dna_sha256',
]);
const STATE_KEYS = Object.freeze([
  'schema',
  'signal_digest_sha256',
  'scope_digest_sha256',
  'issuer_ref_sha256',
  'release_dna_sha256',
  'sequence',
  'effective_status',
  'issued_at_ms',
  'fresh_until_ms',
  'state',
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

function validateSignalScope(value) {
  if (!hasExactKeys(value, SCOPE_KEYS)
    || SCOPE_KEYS.some((field) => !strongSha256(value[field]))) {
    fail('TRUST_SIGNAL_SCOPE_INVALID');
  }
  return Object.freeze({
    subject_ref_sha256: value.subject_ref_sha256,
    resource_ref_sha256: value.resource_ref_sha256,
    action_profile_ref_sha256: value.action_profile_ref_sha256,
    country_ref_sha256: value.country_ref_sha256,
    release_dna_sha256: value.release_dna_sha256,
  });
}

function digestSignalScope(value) {
  return sha256Hex(canonicalJson(validateSignalScope(value)));
}

function signalMatchesScope(signal, expectedScope) {
  return SCOPE_KEYS.every((field) => signal[field] === expectedScope[field]);
}

function validateRevocationState(value, { nowMs } = {}) {
  validateNowMs(nowMs);
  if (!hasExactKeys(value, STATE_KEYS)
    || value.schema !== REVOCATION_STATE_SCHEMA
    || !strongSha256(value.signal_digest_sha256)
    || !strongSha256(value.scope_digest_sha256)
    || !strongSha256(value.issuer_ref_sha256)
    || !strongSha256(value.release_dna_sha256)
    || !nonNegativeInt(value.sequence)
    || !['PASS', 'REVOKED'].includes(value.effective_status)
    || !nonNegativeInt(value.issued_at_ms)
    || !nonNegativeInt(value.fresh_until_ms)
    || value.fresh_until_ms <= value.issued_at_ms
    || value.state !== 'PASS') {
    fail('TRUST_REVOCATION_STATE_INVALID');
  }
  if (value.issued_at_ms > nowMs) fail('TRUST_SIGNAL_FRESHNESS_INVALID');
  if (nowMs >= value.fresh_until_ms) fail('TRUST_SIGNAL_STALE');

  return Object.freeze({
    schema: value.schema,
    signal_digest_sha256: value.signal_digest_sha256,
    scope_digest_sha256: value.scope_digest_sha256,
    issuer_ref_sha256: value.issuer_ref_sha256,
    release_dna_sha256: value.release_dna_sha256,
    sequence: value.sequence,
    effective_status: value.effective_status,
    issued_at_ms: value.issued_at_ms,
    fresh_until_ms: value.fresh_until_ms,
    state: value.state,
  });
}

function digestRevocationState(value, { nowMs } = {}) {
  return sha256Hex(canonicalJson(validateRevocationState(value, { nowMs })));
}

function isTrustedRevocationState(value) {
  return Boolean(value && typeof value === 'object' && TRUSTED_REVOCATION_STATES.has(value));
}

function createRevocationStateResolver({ clock } = {}) {
  if (typeof clock !== 'function') fail('TRUST_SIGNAL_RESOLVER_INVALID');
  const observed = new Map();

  return Object.freeze({
    observe({ signal, expectedScope } = {}) {
      if (!isTrustedTrustSignal(signal)) fail('TRUST_SIGNAL_UNTRUSTED');

      const nowMs = validateNowMs(clock());
      const trustedSignal = validateTrustSignal(signal, { nowMs });
      const scope = validateSignalScope(expectedScope);
      if (!signalMatchesScope(trustedSignal, scope)) fail('TRUST_SIGNAL_SCOPE_MISMATCH');

      const scopeDigest = digestSignalScope(scope);
      const signalDigest = digestTrustSignal(trustedSignal, { nowMs });
      const observationKey = `${trustedSignal.issuer_ref_sha256}:${scopeDigest}`;
      const prior = observed.get(observationKey);

      if (prior) {
        if (trustedSignal.sequence < prior.sequence) fail('TRUST_SIGNAL_SEQUENCE_ROLLBACK');
        if (trustedSignal.sequence === prior.sequence) {
          if (signalDigest !== prior.signalDigest) fail('TRUST_SIGNAL_SEQUENCE_CONFLICT');
          return prior.state;
        }
      }

      const state = Object.freeze({
        schema: REVOCATION_STATE_SCHEMA,
        signal_digest_sha256: signalDigest,
        scope_digest_sha256: scopeDigest,
        issuer_ref_sha256: trustedSignal.issuer_ref_sha256,
        release_dna_sha256: trustedSignal.release_dna_sha256,
        sequence: trustedSignal.sequence,
        effective_status: trustedSignal.status,
        issued_at_ms: trustedSignal.issued_at_ms,
        fresh_until_ms: trustedSignal.fresh_until_ms,
        state: 'PASS',
      });
      TRUSTED_REVOCATION_STATES.add(state);
      observed.set(observationKey, Object.freeze({
        sequence: trustedSignal.sequence,
        signalDigest,
        state,
      }));
      return state;
    },
  });
}

module.exports = {
  REVOCATION_STATE_SCHEMA,
  createRevocationStateResolver,
  validateSignalScope,
  digestSignalScope,
  validateRevocationState,
  digestRevocationState,
  isTrustedRevocationState,
};
