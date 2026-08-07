'use strict';

const crypto = require('node:crypto');
const proof = require('./sovereign-proof-system');

const EVIDENCE_SCHEMA = 'TIGER_EVIDENCE_ATTESTATION_V1';
const OWNER_SCHEMA = 'TIGER_OWNER_DECISION_RECEIPT_V1';
const REGISTRY_SCHEMA = 'TIGER_TRUSTED_KEY_REGISTRY_V1';
const HEX_256 = /^[0-9a-f]{64}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const PUBLIC_KEY_PEM = /^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const PURPOSES = new Set(['EVIDENCE_SIGNER', 'OWNER_DECISION_SIGNER']);
const KEY_STATUSES = new Set(['ACTIVE', 'REVOKED']);
const OWNER_ACTIONS = new Set(['MERGE_RELEASE', 'PROMOTE_DATABASE', 'ACTIVATE_PRODUCTION']);
const OWNER_DECISIONS = new Set(['APPROVE', 'REJECT']);
const OWNER_ENVIRONMENTS = new Set(['REPOSITORY', 'STAGING', 'PRODUCTION']);

const OWNER_ACTION_ENVIRONMENTS = Object.freeze({
  MERGE_RELEASE: 'REPOSITORY',
  PROMOTE_DATABASE: 'PRODUCTION',
  ACTIVATE_PRODUCTION: 'PRODUCTION',
});

const KEY_FIELDS = Object.freeze([
  'keyId', 'purpose', 'algorithm', 'publicKeyPem', 'status', 'validFrom', 'validTo',
]);
const EVIDENCE_UNSIGNED_FIELDS = Object.freeze([
  'schemaVersion', 'keyId', 'capsuleDigest', 'releaseDigest', 'gate', 'evidenceSha256', 'issuedAt', 'expiresAt',
]);
const EVIDENCE_SIGNED_FIELDS = Object.freeze([...EVIDENCE_UNSIGNED_FIELDS, 'signature']);
const EVIDENCE_VERIFY_FIELDS = Object.freeze(['capsule', 'attestation', 'trustedKeys', 'now']);
const OWNER_UNSIGNED_FIELDS = Object.freeze([
  'schemaVersion', 'receiptId', 'keyId', 'ownerSubject', 'action', 'releaseDigest', 'payloadDigest', 'scopeDigest',
  'environment', 'decision', 'reasonCode', 'nonce', 'issuedAt', 'expiresAt',
]);
const OWNER_SIGNED_FIELDS = Object.freeze([...OWNER_UNSIGNED_FIELDS, 'signature']);
const OWNER_VERIFY_FIELDS = Object.freeze([
  'receipt', 'trustedKeys', 'releaseDNA', 'expectedAction', 'expectedPayloadDigest', 'expectedScopeDigest',
  'expectedOwnerSubject', 'now',
]);

const trustedRegistryBrand = new WeakSet();
const trustedRegistryMaterial = new WeakMap();

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
    if (!Number.isFinite(value)) fail('ATTESTATION_CANONICAL_VALUE_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (!isPlainObject(value)) fail('ATTESTATION_CANONICAL_VALUE_INVALID');
  const pairs = [];
  for (const key of Object.keys(value).sort()) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (value[key] === undefined) fail('ATTESTATION_CANONICAL_VALUE_INVALID');
    pairs.push(`${JSON.stringify(key)}:${stableJson(value[key])}`);
  }
  return `{${pairs.join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : Buffer.from(stableJson(value), 'utf8')).digest('hex');
}

function decodeEd25519Signature(value, code) {
  const normalized = boundedString(value, 80, 96, code);
  if (!BASE64.test(normalized) || normalized.length % 4 !== 0) fail(code);
  const bytes = Buffer.from(normalized, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== normalized) fail(code);
  return bytes;
}

function normalizePublicKeyPem(value) {
  const pem = boundedString(value, 64, 4096, 'TRUSTED_KEY_PUBLIC_KEY_INVALID');
  if (!PUBLIC_KEY_PEM.test(pem)) fail('TRUSTED_KEY_PUBLIC_KEY_INVALID');
  let keyObject;
  try {
    keyObject = crypto.createPublicKey(pem);
  } catch (_) {
    fail('TRUSTED_KEY_PUBLIC_KEY_INVALID');
  }
  if (keyObject.type !== 'public' || keyObject.asymmetricKeyType !== 'ed25519') {
    fail('TRUSTED_KEY_ALGORITHM_UNSUPPORTED');
  }
  const canonicalPem = keyObject.export({ type: 'spki', format: 'pem' }).toString();
  const der = keyObject.export({ type: 'spki', format: 'der' });
  return { keyObject, publicKeyPem: canonicalPem, fingerprintSha256: crypto.createHash('sha256').update(der).digest('hex') };
}

function createTrustedKeyRegistry(entries) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 64) fail('TRUSTED_KEY_REGISTRY_INVALID');
  const ids = new Set();
  const material = new Map();
  const keys = entries.map((entry) => {
    assertExactKeys(entry, KEY_FIELDS, 'TRUSTED_KEY_UNKNOWN_FIELD');
    assertRequiredKeys(entry, KEY_FIELDS, 'TRUSTED_KEY_REQUIRED_FIELD');

    const keyId = boundedString(entry.keyId, 3, 128, 'TRUSTED_KEY_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
    if (ids.has(keyId)) fail('TRUSTED_KEY_DUPLICATE_ID');
    ids.add(keyId);

    const purpose = String(entry.purpose || '').trim().toUpperCase();
    if (!PURPOSES.has(purpose)) fail('TRUSTED_KEY_PURPOSE_INVALID');
    if (entry.algorithm !== 'Ed25519') fail('TRUSTED_KEY_ALGORITHM_UNSUPPORTED');
    const status = String(entry.status || '').trim().toUpperCase();
    if (!KEY_STATUSES.has(status)) fail('TRUSTED_KEY_STATUS_INVALID');
    const validFrom = isoTime(entry.validFrom, 'TRUSTED_KEY_VALIDITY_INVALID');
    const validTo = isoTime(entry.validTo, 'TRUSTED_KEY_VALIDITY_INVALID');
    if (Date.parse(validTo) <= Date.parse(validFrom)) fail('TRUSTED_KEY_VALIDITY_INVALID');

    const parsedKey = normalizePublicKeyPem(entry.publicKeyPem);
    material.set(keyId, parsedKey.keyObject);
    return deepFreeze({
      keyId,
      purpose,
      algorithm: 'Ed25519',
      publicKeyPem: parsedKey.publicKeyPem,
      fingerprintSha256: parsedKey.fingerprintSha256,
      status,
      validFrom,
      validTo,
    });
  });

  keys.sort((left, right) => left.keyId.localeCompare(right.keyId));
  const registry = deepFreeze({ schemaVersion: REGISTRY_SCHEMA, keys });
  trustedRegistryBrand.add(registry);
  trustedRegistryMaterial.set(registry, material);
  return registry;
}

function isTrustedKeyRegistry(registry) {
  return Boolean(registry && trustedRegistryBrand.has(registry) && trustedRegistryMaterial.has(registry));
}

function findTrustedKey(registry, keyId, expectedPurpose, now) {
  if (!isTrustedKeyRegistry(registry)) fail('TRUSTED_KEY_REGISTRY_UNVERIFIED');
  const normalizedId = boundedString(keyId, 3, 128, 'TRUSTED_KEY_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
  const record = registry.keys.find((entry) => entry.keyId === normalizedId);
  if (!record) fail('TRUSTED_KEY_NOT_FOUND');
  if (record.purpose !== expectedPurpose) fail('TRUSTED_KEY_PURPOSE_MISMATCH');
  if (record.status === 'REVOKED') fail('TRUSTED_KEY_REVOKED');
  if (record.status !== 'ACTIVE') fail('TRUSTED_KEY_STATUS_INVALID');
  const nowMs = Date.parse(now);
  if (nowMs < Date.parse(record.validFrom) || nowMs > Date.parse(record.validTo)) fail('TRUSTED_KEY_NOT_VALID_NOW');
  const keyObject = trustedRegistryMaterial.get(registry).get(normalizedId);
  if (!keyObject) fail('TRUSTED_KEY_MATERIAL_MISSING');
  return { record, keyObject };
}

function normalizeEvidenceUnsigned(input) {
  assertExactKeys(input, EVIDENCE_UNSIGNED_FIELDS, 'EVIDENCE_ATTESTATION_UNKNOWN_FIELD');
  assertRequiredKeys(input, EVIDENCE_UNSIGNED_FIELDS, 'EVIDENCE_ATTESTATION_REQUIRED_FIELD');
  if (input.schemaVersion !== EVIDENCE_SCHEMA) fail('EVIDENCE_ATTESTATION_SCHEMA_INVALID');
  const issuedAt = isoTime(input.issuedAt, 'EVIDENCE_ATTESTATION_TIME_INVALID');
  const expiresAt = isoTime(input.expiresAt, 'EVIDENCE_ATTESTATION_TIME_INVALID');
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) fail('EVIDENCE_ATTESTATION_TIME_INVALID');
  return {
    schemaVersion: EVIDENCE_SCHEMA,
    keyId: boundedString(input.keyId, 3, 128, 'TRUSTED_KEY_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    capsuleDigest: hash256(input.capsuleDigest, 'EVIDENCE_ATTESTATION_HASH_INVALID'),
    releaseDigest: hash256(input.releaseDigest, 'EVIDENCE_ATTESTATION_HASH_INVALID'),
    gate: boundedString(input.gate, 1, 128, 'EVIDENCE_ATTESTATION_GATE_INVALID'),
    evidenceSha256: hash256(input.evidenceSha256, 'EVIDENCE_ATTESTATION_HASH_INVALID'),
    issuedAt,
    expiresAt,
  };
}

function buildEvidenceAttestationMessage(input) {
  const normalized = normalizeEvidenceUnsigned(input);
  return Buffer.from(`TIGER:EVIDENCE:ATTESTATION:V1\n${stableJson(normalized)}`, 'utf8');
}

function normalizeEvidenceSigned(input) {
  assertExactKeys(input, EVIDENCE_SIGNED_FIELDS, 'EVIDENCE_ATTESTATION_UNKNOWN_FIELD');
  assertRequiredKeys(input, EVIDENCE_SIGNED_FIELDS, 'EVIDENCE_ATTESTATION_REQUIRED_FIELD');
  const unsigned = {};
  for (const field of EVIDENCE_UNSIGNED_FIELDS) unsigned[field] = input[field];
  const normalized = normalizeEvidenceUnsigned(unsigned);
  return { ...normalized, signature: boundedString(input.signature, 80, 96, 'EVIDENCE_ATTESTATION_SIGNATURE_INVALID') };
}

function verifyEvidenceAttestation(input) {
  assertExactKeys(input, EVIDENCE_VERIFY_FIELDS, 'EVIDENCE_VERIFICATION_UNKNOWN_FIELD');
  assertRequiredKeys(input, EVIDENCE_VERIFY_FIELDS, 'EVIDENCE_VERIFICATION_REQUIRED_FIELD');
  if (!proof.verifyEvidenceCapsuleIntegrity(input.capsule)) fail('EVIDENCE_CAPSULE_INTEGRITY_INVALID');
  const now = isoTime(input.now, 'EVIDENCE_ATTESTATION_NOW_INVALID');
  const normalized = normalizeEvidenceSigned(input.attestation);

  if (
    normalized.capsuleDigest !== input.capsule.digest
    || normalized.releaseDigest !== input.capsule.releaseDigest
    || normalized.gate !== input.capsule.gate
    || normalized.evidenceSha256 !== input.capsule.evidenceSha256
  ) {
    fail('EVIDENCE_ATTESTATION_BINDING_MISMATCH');
  }
  if (Date.parse(normalized.issuedAt) < Date.parse(input.capsule.verifiedAt)) fail('EVIDENCE_ATTESTATION_TIME_INVALID');
  if (Date.parse(now) < Date.parse(normalized.issuedAt)) fail('EVIDENCE_ATTESTATION_NOT_YET_VALID');
  if (Date.parse(now) > Date.parse(normalized.expiresAt)) fail('EVIDENCE_ATTESTATION_EXPIRED');

  const { record, keyObject } = findTrustedKey(input.trustedKeys, normalized.keyId, 'EVIDENCE_SIGNER', now);
  if (Date.parse(normalized.issuedAt) < Date.parse(record.validFrom) || Date.parse(normalized.expiresAt) > Date.parse(record.validTo)) {
    fail('EVIDENCE_ATTESTATION_KEY_WINDOW_INVALID');
  }

  const unsigned = {};
  for (const field of EVIDENCE_UNSIGNED_FIELDS) unsigned[field] = normalized[field];
  const signature = decodeEd25519Signature(normalized.signature, 'EVIDENCE_ATTESTATION_SIGNATURE_INVALID');
  const verified = crypto.verify(null, buildEvidenceAttestationMessage(unsigned), keyObject, signature);
  if (!verified) fail('EVIDENCE_ATTESTATION_SIGNATURE_INVALID');

  return deepFreeze({
    verified: true,
    schemaVersion: EVIDENCE_SCHEMA,
    keyId: normalized.keyId,
    keyFingerprintSha256: record.fingerprintSha256,
    capsuleDigest: normalized.capsuleDigest,
    releaseDigest: normalized.releaseDigest,
    gate: normalized.gate,
    evidenceSha256: normalized.evidenceSha256,
    issuedAt: normalized.issuedAt,
    expiresAt: normalized.expiresAt,
    attestationDigest: sha256(normalized),
  });
}

function normalizeOwnerUnsigned(input) {
  assertExactKeys(input, OWNER_UNSIGNED_FIELDS, 'OWNER_RECEIPT_UNKNOWN_FIELD');
  assertRequiredKeys(input, OWNER_UNSIGNED_FIELDS, 'OWNER_RECEIPT_REQUIRED_FIELD');
  if (input.schemaVersion !== OWNER_SCHEMA) fail('OWNER_RECEIPT_SCHEMA_INVALID');
  const action = String(input.action || '').trim().toUpperCase();
  if (!OWNER_ACTIONS.has(action)) fail('OWNER_RECEIPT_ACTION_INVALID');
  const environment = String(input.environment || '').trim().toUpperCase();
  if (!OWNER_ENVIRONMENTS.has(environment)) fail('OWNER_RECEIPT_ENVIRONMENT_INVALID');
  const decision = String(input.decision || '').trim().toUpperCase();
  if (!OWNER_DECISIONS.has(decision)) fail('OWNER_RECEIPT_DECISION_INVALID');
  const issuedAt = isoTime(input.issuedAt, 'OWNER_RECEIPT_TIME_INVALID');
  const expiresAt = isoTime(input.expiresAt, 'OWNER_RECEIPT_TIME_INVALID');
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) fail('OWNER_RECEIPT_TIME_INVALID');
  return {
    schemaVersion: OWNER_SCHEMA,
    receiptId: boundedString(input.receiptId, 8, 128, 'OWNER_RECEIPT_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    keyId: boundedString(input.keyId, 3, 128, 'TRUSTED_KEY_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    ownerSubject: boundedString(input.ownerSubject, 3, 256, 'OWNER_RECEIPT_OWNER_INVALID'),
    action,
    releaseDigest: hash256(input.releaseDigest, 'OWNER_RECEIPT_HASH_INVALID'),
    payloadDigest: hash256(input.payloadDigest, 'OWNER_RECEIPT_HASH_INVALID'),
    scopeDigest: hash256(input.scopeDigest, 'OWNER_RECEIPT_HASH_INVALID'),
    environment,
    decision,
    reasonCode: boundedString(input.reasonCode, 3, 128, 'OWNER_RECEIPT_REASON_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    nonce: boundedString(input.nonce, 12, 256, 'OWNER_RECEIPT_NONCE_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    issuedAt,
    expiresAt,
  };
}

function buildOwnerDecisionReceiptMessage(input) {
  const normalized = normalizeOwnerUnsigned(input);
  return Buffer.from(`TIGER:OWNER:DECISION:V1\n${stableJson(normalized)}`, 'utf8');
}

function normalizeOwnerSigned(input) {
  assertExactKeys(input, OWNER_SIGNED_FIELDS, 'OWNER_RECEIPT_UNKNOWN_FIELD');
  assertRequiredKeys(input, OWNER_SIGNED_FIELDS, 'OWNER_RECEIPT_REQUIRED_FIELD');
  const unsigned = {};
  for (const field of OWNER_UNSIGNED_FIELDS) unsigned[field] = input[field];
  const normalized = normalizeOwnerUnsigned(unsigned);
  return { ...normalized, signature: boundedString(input.signature, 80, 96, 'OWNER_RECEIPT_SIGNATURE_INVALID') };
}

function verifyOwnerDecisionReceipt(input) {
  assertExactKeys(input, OWNER_VERIFY_FIELDS, 'OWNER_RECEIPT_VERIFICATION_UNKNOWN_FIELD');
  assertRequiredKeys(input, OWNER_VERIFY_FIELDS, 'OWNER_RECEIPT_VERIFICATION_REQUIRED_FIELD');
  if (!proof.verifyReleaseDNAIntegrity(input.releaseDNA)) fail('OWNER_RECEIPT_RELEASE_DNA_INVALID');
  const now = isoTime(input.now, 'OWNER_RECEIPT_NOW_INVALID');
  const expectedAction = String(input.expectedAction || '').trim().toUpperCase();
  if (!OWNER_ACTIONS.has(expectedAction)) fail('OWNER_RECEIPT_EXPECTED_ACTION_INVALID');
  const expectedPayloadDigest = hash256(input.expectedPayloadDigest, 'OWNER_RECEIPT_EXPECTED_HASH_INVALID');
  const expectedScopeDigest = hash256(input.expectedScopeDigest, 'OWNER_RECEIPT_EXPECTED_HASH_INVALID');
  const expectedOwnerSubject = boundedString(input.expectedOwnerSubject, 3, 256, 'OWNER_RECEIPT_EXPECTED_OWNER_INVALID');
  const normalized = normalizeOwnerSigned(input.receipt);

  if (normalized.releaseDigest !== input.releaseDNA.digest) fail('OWNER_RECEIPT_RELEASE_MISMATCH');
  if (normalized.payloadDigest !== expectedPayloadDigest) fail('OWNER_RECEIPT_PAYLOAD_MISMATCH');
  if (normalized.scopeDigest !== expectedScopeDigest) fail('OWNER_RECEIPT_SCOPE_MISMATCH');
  if (normalized.ownerSubject !== expectedOwnerSubject) fail('OWNER_RECEIPT_OWNER_MISMATCH');
  if (normalized.action !== expectedAction) fail('OWNER_RECEIPT_ACTION_MISMATCH');
  if (normalized.environment !== OWNER_ACTION_ENVIRONMENTS[normalized.action]) fail('OWNER_RECEIPT_ENVIRONMENT_INVALID');
  if (normalized.decision !== 'APPROVE') fail('OWNER_RECEIPT_NOT_APPROVED');
  if (Date.parse(now) < Date.parse(normalized.issuedAt)) fail('OWNER_RECEIPT_NOT_YET_VALID');
  if (Date.parse(now) > Date.parse(normalized.expiresAt)) fail('OWNER_RECEIPT_EXPIRED');

  const { record, keyObject } = findTrustedKey(input.trustedKeys, normalized.keyId, 'OWNER_DECISION_SIGNER', now);
  if (Date.parse(normalized.issuedAt) < Date.parse(record.validFrom) || Date.parse(normalized.expiresAt) > Date.parse(record.validTo)) {
    fail('OWNER_RECEIPT_KEY_WINDOW_INVALID');
  }

  const unsigned = {};
  for (const field of OWNER_UNSIGNED_FIELDS) unsigned[field] = normalized[field];
  const signature = decodeEd25519Signature(normalized.signature, 'OWNER_RECEIPT_SIGNATURE_INVALID');
  if (!crypto.verify(null, buildOwnerDecisionReceiptMessage(unsigned), keyObject, signature)) {
    fail('OWNER_RECEIPT_SIGNATURE_INVALID');
  }

  return deepFreeze({
    verified: true,
    schemaVersion: OWNER_SCHEMA,
    receiptId: normalized.receiptId,
    keyId: normalized.keyId,
    keyFingerprintSha256: record.fingerprintSha256,
    ownerSubject: normalized.ownerSubject,
    action: normalized.action,
    releaseDigest: normalized.releaseDigest,
    payloadDigest: normalized.payloadDigest,
    scopeDigest: normalized.scopeDigest,
    environment: normalized.environment,
    decision: normalized.decision,
    reasonCode: normalized.reasonCode,
    nonce: normalized.nonce,
    issuedAt: normalized.issuedAt,
    expiresAt: normalized.expiresAt,
    receiptDigest: sha256(normalized),
    replayConsumed: false,
    requiresPersistentConsumption: true,
  });
}

module.exports = Object.freeze({
  OWNER_ACTION_ENVIRONMENTS,
  createTrustedKeyRegistry,
  isTrustedKeyRegistry,
  buildEvidenceAttestationMessage,
  verifyEvidenceAttestation,
  buildOwnerDecisionReceiptMessage,
  verifyOwnerDecisionReceipt,
});
