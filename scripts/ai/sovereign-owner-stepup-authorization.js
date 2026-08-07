'use strict';

const crypto = require('node:crypto');

const CHALLENGE_SCHEMA = 'TIGER_OWNER_STEPUP_CHALLENGE_V1';
const VERIFICATION_SCHEMA = 'TIGER_OWNER_STEPUP_VERIFICATION_V1';
const CONSUMPTION_SCHEMA = 'TIGER_OWNER_STEPUP_CONSUMPTION_V1';
const VERIFIER_SCHEMA = 'TIGER_TRUSTED_AUTHENTICATOR_VERIFIER_V1';
const HEX_256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const ACTION_ENVIRONMENTS = Object.freeze({
  MERGE_RELEASE: 'REPOSITORY',
  PROMOTE_DATABASE: 'PRODUCTION',
  ACTIVATE_PRODUCTION: 'PRODUCTION',
  CHANGE_PRICES: 'PRODUCTION',
  CHANGE_OWNER_SECURITY: 'PRODUCTION',
  CHANGE_AI_SECURITY_POLICY: 'PRODUCTION',
});

const ALLOWED_METHODS = new Set([
  'WEBAUTHN_PASSKEY',
  'IDP_PHISHING_RESISTANT_MFA',
]);
const REQUIRED_ASSURANCE = 'PHISHING_RESISTANT';

const CHALLENGE_INPUT_FIELDS = Object.freeze([
  'ownerSubject', 'action', 'releaseDigest', 'payloadDigest', 'scopeDigest', 'environment', 'now', 'ttlSeconds',
]);
const VERIFIER_INPUT_FIELDS = Object.freeze(['verifierId', 'verifyAssertion']);
const VERIFY_INPUT_FIELDS = Object.freeze(['challenge', 'trustedVerifier', 'authenticatorResponse', 'now']);
const RESULT_FIELDS = Object.freeze([
  'verified', 'ownerSubject', 'method', 'assurance', 'authenticatorReference', 'verifiedAt',
]);
const CONSUME_INPUT_FIELDS = Object.freeze([
  'verification', 'expectedOwnerSubject', 'expectedAction', 'expectedReleaseDigest', 'expectedPayloadDigest',
  'expectedScopeDigest', 'expectedEnvironment', 'now',
]);

const trustedVerifierBrand = new WeakSet();
const trustedVerifierMaterial = new WeakMap();
const verifiedStepUpBrand = new WeakSet();
const consumedVerifications = new WeakSet();

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

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value)) fail(code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function assertRequiredKeys(value, required, code) {
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(code);
  }
}

function boundedString(value, min, max, code, pattern = null) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  if (/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(normalized)) fail(code);
  if (pattern && !pattern.test(normalized)) fail(code);
  return normalized;
}

function hash256(value, code) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!HEX_256.test(normalized)) fail(code);
  return normalized;
}

function isoTime(value, code) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) fail(code);
  return new Date(parsed).toISOString();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function stableJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('STEPUP_CANONICAL_VALUE_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (!isPlainObject(value)) fail('STEPUP_CANONICAL_VALUE_INVALID');
  const pairs = [];
  for (const key of Object.keys(value).sort()) {
    if (UNSAFE_KEYS.has(key) || value[key] === undefined) fail('STEPUP_CANONICAL_VALUE_INVALID');
    pairs.push(`${JSON.stringify(key)}:${stableJson(value[key])}`);
  }
  return `{${pairs.join(',')}}`;
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(stableJson(value), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function normalizeActionEnvironment(actionValue, environmentValue) {
  const action = String(actionValue || '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(ACTION_ENVIRONMENTS, action)) fail('STEPUP_ACTION_INVALID');
  const environment = String(environmentValue || '').trim().toUpperCase();
  if (environment !== ACTION_ENVIRONMENTS[action]) fail('STEPUP_ACTION_ENVIRONMENT_MISMATCH');
  return { action, environment };
}

function createTrustedAuthenticatorVerifier(input) {
  assertExactKeys(input, VERIFIER_INPUT_FIELDS, 'STEPUP_VERIFIER_UNKNOWN_FIELD');
  assertRequiredKeys(input, VERIFIER_INPUT_FIELDS, 'STEPUP_VERIFIER_REQUIRED_FIELD');
  const verifierId = boundedString(input.verifierId, 3, 128, 'STEPUP_VERIFIER_ID_INVALID', SAFE_ID);
  if (typeof input.verifyAssertion !== 'function') fail('STEPUP_VERIFIER_FUNCTION_INVALID');

  const verifier = deepFreeze({ schemaVersion: VERIFIER_SCHEMA, verifierId });
  trustedVerifierBrand.add(verifier);
  trustedVerifierMaterial.set(verifier, input.verifyAssertion);
  return verifier;
}

function createOwnerStepUpChallenge(input) {
  assertExactKeys(input, CHALLENGE_INPUT_FIELDS, 'STEPUP_CHALLENGE_UNKNOWN_FIELD');
  assertRequiredKeys(input, CHALLENGE_INPUT_FIELDS, 'STEPUP_CHALLENGE_REQUIRED_FIELD');

  const ownerSubject = boundedString(input.ownerSubject, 3, 256, 'STEPUP_OWNER_INVALID');
  const { action, environment } = normalizeActionEnvironment(input.action, input.environment);
  const releaseDigest = hash256(input.releaseDigest, 'STEPUP_RELEASE_DIGEST_INVALID');
  const payloadDigest = hash256(input.payloadDigest, 'STEPUP_PAYLOAD_DIGEST_INVALID');
  const scopeDigest = hash256(input.scopeDigest, 'STEPUP_SCOPE_DIGEST_INVALID');
  const issuedAt = isoTime(input.now, 'STEPUP_CHALLENGE_TIME_INVALID');
  if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 30 || input.ttlSeconds > 300) {
    fail('STEPUP_CHALLENGE_TTL_INVALID');
  }

  const challengeId = `stepup_${crypto.randomBytes(24).toString('base64url')}`;
  const nonceHash = crypto.createHash('sha256').update(challengeId, 'utf8').digest('hex');
  const expiresAt = new Date(Date.parse(issuedAt) + (input.ttlSeconds * 1000)).toISOString();

  const envelope = {
    schemaVersion: CHALLENGE_SCHEMA,
    challengeId,
    ownerSubject,
    action,
    releaseDigest,
    payloadDigest,
    scopeDigest,
    environment,
    nonceHash,
    issuedAt,
    expiresAt,
  };
  return deepFreeze({ ...envelope, digest: sha256(envelope) });
}

function verifyChallengeIntegrity(challenge) {
  try {
    assertExactKeys(
      challenge,
      ['schemaVersion', 'challengeId', 'ownerSubject', 'action', 'releaseDigest', 'payloadDigest', 'scopeDigest', 'environment', 'nonceHash', 'issuedAt', 'expiresAt', 'digest'],
      'STEPUP_CHALLENGE_INTEGRITY_INVALID',
    );
    if (challenge.schemaVersion !== CHALLENGE_SCHEMA) return false;
    const { action, environment } = normalizeActionEnvironment(challenge.action, challenge.environment);
    const envelope = {
      schemaVersion: CHALLENGE_SCHEMA,
      challengeId: boundedString(challenge.challengeId, 20, 256, 'STEPUP_CHALLENGE_ID_INVALID', /^stepup_[A-Za-z0-9_-]+$/),
      ownerSubject: boundedString(challenge.ownerSubject, 3, 256, 'STEPUP_OWNER_INVALID'),
      action,
      releaseDigest: hash256(challenge.releaseDigest, 'STEPUP_RELEASE_DIGEST_INVALID'),
      payloadDigest: hash256(challenge.payloadDigest, 'STEPUP_PAYLOAD_DIGEST_INVALID'),
      scopeDigest: hash256(challenge.scopeDigest, 'STEPUP_SCOPE_DIGEST_INVALID'),
      environment,
      nonceHash: hash256(challenge.nonceHash, 'STEPUP_NONCE_HASH_INVALID'),
      issuedAt: isoTime(challenge.issuedAt, 'STEPUP_CHALLENGE_TIME_INVALID'),
      expiresAt: isoTime(challenge.expiresAt, 'STEPUP_CHALLENGE_TIME_INVALID'),
    };
    if (Date.parse(envelope.expiresAt) <= Date.parse(envelope.issuedAt)) return false;
    return sha256(envelope) === challenge.digest;
  } catch (_) {
    return false;
  }
}

async function verifyOwnerStepUp(input) {
  assertExactKeys(input, VERIFY_INPUT_FIELDS, 'STEPUP_VERIFY_UNKNOWN_FIELD');
  assertRequiredKeys(input, VERIFY_INPUT_FIELDS, 'STEPUP_VERIFY_REQUIRED_FIELD');
  if (!verifyChallengeIntegrity(input.challenge)) fail('STEPUP_CHALLENGE_INTEGRITY_INVALID');
  if (!trustedVerifierBrand.has(input.trustedVerifier) || !trustedVerifierMaterial.has(input.trustedVerifier)) {
    fail('STEPUP_VERIFIER_UNTRUSTED');
  }

  const now = isoTime(input.now, 'STEPUP_VERIFY_TIME_INVALID');
  if (Date.parse(now) < Date.parse(input.challenge.issuedAt)) fail('STEPUP_CHALLENGE_NOT_YET_VALID');
  if (Date.parse(now) > Date.parse(input.challenge.expiresAt)) fail('STEPUP_CHALLENGE_EXPIRED');

  const verifyAssertion = trustedVerifierMaterial.get(input.trustedVerifier);
  const result = await verifyAssertion({
    authenticatorResponse: input.authenticatorResponse,
    challengeId: input.challenge.challengeId,
    challengeDigest: input.challenge.digest,
    expectedOwnerSubject: input.challenge.ownerSubject,
    action: input.challenge.action,
    releaseDigest: input.challenge.releaseDigest,
    payloadDigest: input.challenge.payloadDigest,
    scopeDigest: input.challenge.scopeDigest,
    environment: input.challenge.environment,
    expiresAt: input.challenge.expiresAt,
  });

  assertExactKeys(result, RESULT_FIELDS, 'STEPUP_VERIFIER_RESULT_UNKNOWN_FIELD');
  assertRequiredKeys(result, RESULT_FIELDS, 'STEPUP_VERIFIER_RESULT_REQUIRED_FIELD');
  if (result.verified !== true) fail('STEPUP_AUTHENTICATION_FAILED');

  const ownerSubject = boundedString(result.ownerSubject, 3, 256, 'STEPUP_OWNER_INVALID');
  if (ownerSubject !== input.challenge.ownerSubject) fail('STEPUP_OWNER_MISMATCH');
  const method = String(result.method || '').trim().toUpperCase();
  if (!ALLOWED_METHODS.has(method)) fail('STEPUP_METHOD_NOT_ALLOWED');
  const assurance = String(result.assurance || '').trim().toUpperCase();
  if (assurance !== REQUIRED_ASSURANCE) fail('STEPUP_ASSURANCE_INSUFFICIENT');
  const authenticatorReference = boundedString(result.authenticatorReference, 3, 2048, 'STEPUP_AUTHENTICATOR_REFERENCE_INVALID');
  const verifiedAt = isoTime(result.verifiedAt, 'STEPUP_VERIFIED_TIME_INVALID');
  if (Date.parse(verifiedAt) < Date.parse(input.challenge.issuedAt) || Date.parse(verifiedAt) > Date.parse(now)) {
    fail('STEPUP_VERIFIED_TIME_INVALID');
  }

  const envelope = {
    schemaVersion: VERIFICATION_SCHEMA,
    verified: true,
    verifierId: input.trustedVerifier.verifierId,
    challengeId: input.challenge.challengeId,
    challengeDigest: input.challenge.digest,
    ownerSubject,
    action: input.challenge.action,
    releaseDigest: input.challenge.releaseDigest,
    payloadDigest: input.challenge.payloadDigest,
    scopeDigest: input.challenge.scopeDigest,
    environment: input.challenge.environment,
    nonceHash: input.challenge.nonceHash,
    method,
    assurance,
    authenticatorReferenceHash: crypto.createHash('sha256').update(authenticatorReference, 'utf8').digest('hex'),
    verifiedAt,
    expiresAt: input.challenge.expiresAt,
  };
  const verification = deepFreeze({ ...envelope, digest: sha256(envelope) });
  verifiedStepUpBrand.add(verification);
  return verification;
}

function consumeVerifiedStepUp(input) {
  assertExactKeys(input, CONSUME_INPUT_FIELDS, 'STEPUP_CONSUME_UNKNOWN_FIELD');
  assertRequiredKeys(input, CONSUME_INPUT_FIELDS, 'STEPUP_CONSUME_REQUIRED_FIELD');
  if (!input.verification || !verifiedStepUpBrand.has(input.verification)) fail('STEPUP_VERIFICATION_UNTRUSTED');
  if (consumedVerifications.has(input.verification)) fail('STEPUP_ALREADY_CONSUMED');

  const now = isoTime(input.now, 'STEPUP_CONSUME_TIME_INVALID');
  const ownerSubject = boundedString(input.expectedOwnerSubject, 3, 256, 'STEPUP_EXPECTED_OWNER_INVALID');
  const { action, environment } = normalizeActionEnvironment(input.expectedAction, input.expectedEnvironment);
  const releaseDigest = hash256(input.expectedReleaseDigest, 'STEPUP_EXPECTED_RELEASE_INVALID');
  const payloadDigest = hash256(input.expectedPayloadDigest, 'STEPUP_EXPECTED_PAYLOAD_INVALID');
  const scopeDigest = hash256(input.expectedScopeDigest, 'STEPUP_EXPECTED_SCOPE_INVALID');
  const verification = input.verification;

  if (verification.ownerSubject !== ownerSubject) fail('STEPUP_OWNER_MISMATCH');
  if (verification.action !== action) fail('STEPUP_ACTION_MISMATCH');
  if (verification.releaseDigest !== releaseDigest) fail('STEPUP_RELEASE_MISMATCH');
  if (verification.payloadDigest !== payloadDigest) fail('STEPUP_PAYLOAD_MISMATCH');
  if (verification.scopeDigest !== scopeDigest) fail('STEPUP_SCOPE_MISMATCH');
  if (verification.environment !== environment) fail('STEPUP_ENVIRONMENT_MISMATCH');
  if (Date.parse(now) < Date.parse(verification.verifiedAt)) fail('STEPUP_NOT_YET_VALID');
  if (Date.parse(now) > Date.parse(verification.expiresAt)) fail('STEPUP_VERIFICATION_EXPIRED');

  consumedVerifications.add(verification);
  return deepFreeze({
    schemaVersion: CONSUMPTION_SCHEMA,
    authorized: true,
    verificationDigest: verification.digest,
    ownerSubject,
    action,
    releaseDigest,
    payloadDigest,
    scopeDigest,
    environment,
    consumedAt: now,
    requiresPersistentConsumption: true,
  });
}

module.exports = Object.freeze({
  ACTION_ENVIRONMENTS,
  ALLOWED_METHODS: Object.freeze([...ALLOWED_METHODS]),
  createTrustedAuthenticatorVerifier,
  createOwnerStepUpChallenge,
  verifyOwnerStepUp,
  consumeVerifiedStepUp,
});
