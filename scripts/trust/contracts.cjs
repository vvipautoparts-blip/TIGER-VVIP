'use strict';

const crypto = require('node:crypto');

const MAX_DEPTH = 16;
const MAX_ENTRIES = 512;
const MAX_STRING_LENGTH = 4096;
const POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = /^0{64}$/;
const COUNTRY = /^[A-Z]{2}$/;
const MAX_TRUST_PULSE_V2_LIFETIME_MS = 60 * 1000;

class TrustContractError extends Error {
  constructor(code) {
    super(code);
    this.name = 'TrustContractError';
    this.code = code;
  }
}

const TRUST_SCHEMAS = Object.freeze({
  TRUST_DNA: 'TIGER_TRUST_DNA_V1',
  EPOCH_VECTOR: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
  TRUST_PULSE: 'TIGER_TRUST_PULSE_V1',
  TRUST_PULSE_V2: 'TIGER_TRUST_PULSE_V2',
});

const TRUST_DIMENSIONS = Object.freeze([
  'IDENTITY',
  'SOURCE',
  'BUILD',
  'ARTIFACT',
  'RUNTIME',
  'POLICY',
  'COUNTRY',
  'RISK_SIGNAL',
  'REPLAY',
  'FRESHNESS',
  'TRANSPARENCY',
  'HARDWARE_ATTESTATION',
]);

function fail(code) {
  throw new TrustContractError(code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function normalizeCanonical(value, state, depth = 0) {
  if (depth > MAX_DEPTH) fail('TRUST_CANONICAL_INVALID');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) fail('TRUST_CANONICAL_INVALID');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('TRUST_CANONICAL_INVALID');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ENTRIES || state.seen.has(value)) fail('TRUST_CANONICAL_INVALID');
    state.seen.add(value);
    const out = value.map((entry) => normalizeCanonical(entry, state, depth + 1));
    state.seen.delete(value);
    return out;
  }
  if (!isPlainObject(value) || state.seen.has(value)) fail('TRUST_CANONICAL_INVALID');
  const keys = Object.keys(value).sort();
  state.entries += keys.length;
  if (keys.length > MAX_ENTRIES || state.entries > MAX_ENTRIES) fail('TRUST_CANONICAL_INVALID');
  state.seen.add(value);
  const out = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) fail('TRUST_CANONICAL_INVALID');
    out[key] = normalizeCanonical(value[key], state, depth + 1);
  }
  state.seen.delete(value);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(normalizeCanonical(value, { seen: new Set(), entries: 0 }));
}

function sha256Hex(value) {
  if (typeof value !== 'string' && !Buffer.isBuffer(value)) fail('TRUST_CANONICAL_INVALID');
  return crypto.createHash('sha256').update(value).digest('hex');
}

function positiveInt(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function strongSha256(value) {
  return typeof value === 'string' && SHA256.test(value) && !ZERO_SHA256.test(value);
}

function validateTrustDna(value) {
  const keys = [
    'schema',
    'repository',
    'source_sha',
    'source_tree',
    'source_readiness_sha256',
    'release_evidence_contract_sha256',
    'authority_policy_sha256',
  ];
  if (!hasExactKeys(value, keys)
    || value.schema !== TRUST_SCHEMAS.TRUST_DNA
    || value.repository !== 'vvipautoparts-blip/TIGER-VVIP'
    || !SHA40.test(value.source_sha)
    || !SHA40.test(value.source_tree)
    || !SHA256.test(value.source_readiness_sha256)
    || !SHA256.test(value.release_evidence_contract_sha256)
    || !SHA256.test(value.authority_policy_sha256)) {
    fail('TRUST_DNA_INVALID');
  }
  return deepFreeze({
    schema: value.schema,
    repository: value.repository,
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    source_readiness_sha256: value.source_readiness_sha256,
    release_evidence_contract_sha256: value.release_evidence_contract_sha256,
    authority_policy_sha256: value.authority_policy_sha256,
  });
}

function validateEpochVector(value) {
  const keys = [
    'schema',
    'owner_epoch',
    'policy_epoch',
    'market_epoch',
    'ai_policy_epoch',
    'crypto_epoch',
    'country_epochs',
  ];
  if (!hasExactKeys(value, keys)
    || value.schema !== TRUST_SCHEMAS.EPOCH_VECTOR
    || !positiveInt(value.owner_epoch)
    || !positiveInt(value.policy_epoch)
    || !positiveInt(value.market_epoch)
    || !positiveInt(value.ai_policy_epoch)
    || !positiveInt(value.crypto_epoch)
    || !Array.isArray(value.country_epochs)
    || value.country_epochs.length < 1
    || value.country_epochs.length > 64) {
    fail('TRUST_EPOCH_VECTOR_INVALID');
  }

  const seen = new Set();
  let previous = '';
  const countries = [];
  for (const item of value.country_epochs) {
    if (!hasExactKeys(item, ['country_code', 'epoch'])
      || !COUNTRY.test(item.country_code)
      || !positiveInt(item.epoch)
      || seen.has(item.country_code)
      || (previous && item.country_code <= previous)) {
      fail('TRUST_EPOCH_VECTOR_INVALID');
    }
    seen.add(item.country_code);
    previous = item.country_code;
    countries.push(deepFreeze({ country_code: item.country_code, epoch: item.epoch }));
  }

  return deepFreeze({
    schema: value.schema,
    owner_epoch: value.owner_epoch,
    policy_epoch: value.policy_epoch,
    market_epoch: value.market_epoch,
    ai_policy_epoch: value.ai_policy_epoch,
    crypto_epoch: value.crypto_epoch,
    country_epochs: Object.freeze(countries),
  });
}

function validateTrustPulseV1(value) {
  const keys = [
    'schema',
    'evidence_class',
    'release_dna_sha256',
    'epoch_vector_sha256',
    'issued_at_ms',
    'fresh_until_ms',
    'state',
  ];
  if (!hasExactKeys(value, keys)
    || value.schema !== TRUST_SCHEMAS.TRUST_PULSE
    || value.evidence_class !== 'SYNTHETIC_TEST_ONLY'
    || !SHA256.test(value.release_dna_sha256)
    || !SHA256.test(value.epoch_vector_sha256)
    || !nonNegativeInt(value.issued_at_ms)
    || !positiveInt(value.fresh_until_ms)
    || value.fresh_until_ms <= value.issued_at_ms
    || value.state !== 'PASS') {
    fail('TRUST_PULSE_INVALID');
  }
  return deepFreeze({
    schema: value.schema,
    evidence_class: value.evidence_class,
    release_dna_sha256: value.release_dna_sha256,
    epoch_vector_sha256: value.epoch_vector_sha256,
    issued_at_ms: value.issued_at_ms,
    fresh_until_ms: value.fresh_until_ms,
    state: value.state,
  });
}

function validateTrustPulseV2(value) {
  const keys = [
    'schema',
    'evidence_class',
    'release_dna_sha256',
    'epoch_vector_sha256',
    'deployment_evidence_sha256',
    'attestation_result_sha256',
    'runtime_artifact_sha256',
    'verifier_ref_sha256',
    'attester_ref_sha256',
    'issued_at_ms',
    'fresh_until_ms',
    'state',
  ];
  const digestFields = [
    'release_dna_sha256',
    'epoch_vector_sha256',
    'deployment_evidence_sha256',
    'attestation_result_sha256',
    'runtime_artifact_sha256',
    'verifier_ref_sha256',
    'attester_ref_sha256',
  ];
  if (!hasExactKeys(value, keys)
    || value.schema !== TRUST_SCHEMAS.TRUST_PULSE_V2
    || value.evidence_class !== 'ATTESTED_RUNTIME_RESULT'
    || digestFields.some((field) => !strongSha256(value[field]))
    || !nonNegativeInt(value.issued_at_ms)
    || !positiveInt(value.fresh_until_ms)
    || value.fresh_until_ms <= value.issued_at_ms
    || value.fresh_until_ms - value.issued_at_ms > MAX_TRUST_PULSE_V2_LIFETIME_MS
    || value.state !== 'PASS') {
    fail('TRUST_PULSE_INVALID');
  }
  return deepFreeze({
    schema: value.schema,
    evidence_class: value.evidence_class,
    release_dna_sha256: value.release_dna_sha256,
    epoch_vector_sha256: value.epoch_vector_sha256,
    deployment_evidence_sha256: value.deployment_evidence_sha256,
    attestation_result_sha256: value.attestation_result_sha256,
    runtime_artifact_sha256: value.runtime_artifact_sha256,
    verifier_ref_sha256: value.verifier_ref_sha256,
    attester_ref_sha256: value.attester_ref_sha256,
    issued_at_ms: value.issued_at_ms,
    fresh_until_ms: value.fresh_until_ms,
    state: value.state,
  });
}

function validateTrustPulse(value) {
  if (isPlainObject(value) && value.schema === TRUST_SCHEMAS.TRUST_PULSE_V2) {
    return validateTrustPulseV2(value);
  }
  return validateTrustPulseV1(value);
}

function digestValidated(value, validator) {
  if (typeof validator !== 'function') fail('TRUST_CANONICAL_INVALID');
  return sha256Hex(canonicalJson(validator(value)));
}

module.exports = {
  TrustContractError,
  TRUST_SCHEMAS,
  TRUST_DIMENSIONS,
  MAX_TRUST_PULSE_V2_LIFETIME_MS,
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  validateTrustPulse,
  digestValidated,
};
