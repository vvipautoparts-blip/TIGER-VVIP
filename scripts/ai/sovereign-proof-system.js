'use strict';

const crypto = require('node:crypto');
const readiness = require('./sovereign-readiness-gate');

const { REQUIRED_GATES, evaluateReadiness } = readiness;
const GATE_MAP = new Map(REQUIRED_GATES.map((definition) => [definition.id, definition]));

const RELEASE_SCHEMA = 'TIGER_RELEASE_DNA_V1';
const EVIDENCE_SCHEMA = 'TIGER_EVIDENCE_CAPSULE_V1';
const PASSPORT_SCHEMA = 'TIGER_GOLDEN_RELEASE_PASSPORT_V1';
const HEX_256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40,64}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const RELEASE_FIELDS = Object.freeze([
  'commitSha',
  'frontendBuildHash',
  'backendBuildHash',
  'migrationDigests',
  'aiPolicyHash',
  'promptHash',
  'modelConfigHash',
  'toolRegistryHash',
  'rlsPolicyHash',
  'securityConfigHash',
  'environmentClass',
]);

const EVIDENCE_FIELDS = Object.freeze([
  'releaseDNA',
  'gate',
  'requirementId',
  'status',
  'evidenceClass',
  'environment',
  'reference',
  'verifiedAt',
  'evidenceSha256',
  'fixture',
  'simulated',
]);

const PROOF_FIELDS = Object.freeze(['releaseDNA', 'capsules']);
const PASSPORT_FIELDS = Object.freeze(['releaseDNA', 'capsules', 'issuedAt']);
const RELEASE_ENVIRONMENTS = new Set(['RELEASE_CANDIDATE', 'STAGING', 'PRODUCTION']);
const EVIDENCE_STATUSES = new Set(['PASS', 'PENDING', 'DEFERRED', 'ASSUMED', 'SIMULATED', 'FAIL', 'BLOCKED', 'UNKNOWN']);

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

function assertPlainObject(value, code) {
  if (!isPlainObject(value)) fail(code);
}

function assertExactKeys(value, allowed, code) {
  assertPlainObject(value, code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function assertBoundedString(value, min, max, code) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  if (/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(normalized)) fail(code);
  return normalized;
}

function assertHash(value, code) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!HEX_256.test(normalized)) fail(code);
  return normalized;
}

function assertBoolean(value, code) {
  if (typeof value !== 'boolean') fail(code);
  return value;
}

function assertIsoTime(value, code) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) fail(code);
  return new Date(timestamp).toISOString();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalize(value, stack = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('CANONICAL_VALUE_UNSUPPORTED');
    return value;
  }
  if (typeof value !== 'object') fail('CANONICAL_VALUE_UNSUPPORTED');
  if (stack.has(value)) fail('CANONICAL_VALUE_CYCLE');

  stack.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((item) => canonicalize(item, stack));
  } else {
    if (!isPlainObject(value)) fail('CANONICAL_VALUE_UNSUPPORTED');
    result = {};
    for (const key of Object.keys(value).sort()) {
      if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
      const child = value[key];
      if (child === undefined) fail('CANONICAL_VALUE_UNSUPPORTED');
      result[key] = canonicalize(child, stack);
    }
  }
  stack.delete(value);
  return result;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalStringify(value), 'utf8').digest('hex');
}

function normalizeMigrationDigests(value) {
  if (!Array.isArray(value) || value.length > 4096) fail('RELEASE_DNA_INVALID_MIGRATIONS');
  const seen = new Set();
  const normalized = value.map((entry) => {
    assertExactKeys(entry, ['path', 'sha256'], 'RELEASE_DNA_INVALID_MIGRATION');
    const migrationPath = assertBoundedString(entry.path, 1, 512, 'RELEASE_DNA_INVALID_MIGRATION_PATH');
    if (migrationPath.startsWith('/') || migrationPath.includes('\\') || migrationPath.split('/').includes('..')) {
      fail('RELEASE_DNA_INVALID_MIGRATION_PATH');
    }
    if (seen.has(migrationPath)) fail('RELEASE_DNA_DUPLICATE_MIGRATION');
    seen.add(migrationPath);
    return { path: migrationPath, sha256: assertHash(entry.sha256, 'RELEASE_DNA_INVALID_HASH') };
  });
  normalized.sort((left, right) => left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256));
  return normalized;
}

function createReleaseDNA(input) {
  assertExactKeys(input, RELEASE_FIELDS, 'RELEASE_DNA_UNKNOWN_FIELD');
  for (const field of RELEASE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) fail('RELEASE_DNA_REQUIRED_FIELD');
  }

  const commitSha = String(input.commitSha || '').trim().toLowerCase();
  if (!GIT_COMMIT.test(commitSha)) fail('RELEASE_DNA_INVALID_COMMIT');

  const environmentClass = String(input.environmentClass || '').trim().toUpperCase();
  if (!RELEASE_ENVIRONMENTS.has(environmentClass)) fail('RELEASE_DNA_INVALID_ENVIRONMENT');

  const components = {
    commitSha,
    frontendBuildHash: assertHash(input.frontendBuildHash, 'RELEASE_DNA_INVALID_HASH'),
    backendBuildHash: assertHash(input.backendBuildHash, 'RELEASE_DNA_INVALID_HASH'),
    migrationDigests: normalizeMigrationDigests(input.migrationDigests),
    aiPolicyHash: assertHash(input.aiPolicyHash, 'RELEASE_DNA_INVALID_HASH'),
    promptHash: assertHash(input.promptHash, 'RELEASE_DNA_INVALID_HASH'),
    modelConfigHash: assertHash(input.modelConfigHash, 'RELEASE_DNA_INVALID_HASH'),
    toolRegistryHash: assertHash(input.toolRegistryHash, 'RELEASE_DNA_INVALID_HASH'),
    rlsPolicyHash: assertHash(input.rlsPolicyHash, 'RELEASE_DNA_INVALID_HASH'),
    securityConfigHash: assertHash(input.securityConfigHash, 'RELEASE_DNA_INVALID_HASH'),
    environmentClass,
  };

  const envelope = { schemaVersion: RELEASE_SCHEMA, components };
  const releaseDNA = {
    ...envelope,
    digest: sha256Canonical(envelope),
  };
  return deepFreeze(releaseDNA);
}

function verifyReleaseDNAIntegrity(releaseDNA) {
  try {
    assertExactKeys(releaseDNA, ['schemaVersion', 'components', 'digest'], 'RELEASE_DNA_INTEGRITY_INVALID');
    if (releaseDNA.schemaVersion !== RELEASE_SCHEMA || !HEX_256.test(String(releaseDNA.digest || ''))) return false;
    const rebuilt = createReleaseDNA(releaseDNA.components);
    return rebuilt.digest === releaseDNA.digest;
  } catch (_) {
    return false;
  }
}

function createEvidenceCapsule(input) {
  assertExactKeys(input, EVIDENCE_FIELDS, 'EVIDENCE_UNKNOWN_FIELD');
  for (const field of EVIDENCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) fail('EVIDENCE_REQUIRED_FIELD');
  }
  if (!verifyReleaseDNAIntegrity(input.releaseDNA)) fail('EVIDENCE_RELEASE_DNA_INVALID');

  const gateId = assertBoundedString(input.gate, 1, 128, 'EVIDENCE_UNKNOWN_GATE');
  const definition = GATE_MAP.get(gateId);
  if (!definition) fail('EVIDENCE_UNKNOWN_GATE');

  const status = String(input.status || '').trim().toUpperCase();
  if (!EVIDENCE_STATUSES.has(status)) fail('EVIDENCE_STATUS_INVALID');

  const evidenceClass = String(input.evidenceClass || '').trim().toUpperCase();
  if (!definition.allowedEvidenceClasses.includes(evidenceClass)) fail('EVIDENCE_CLASS_NOT_ACCEPTED');

  const environment = String(input.environment || '').trim().toUpperCase();
  if (!definition.allowedEnvironments.includes(environment)) fail('EVIDENCE_ENVIRONMENT_NOT_ACCEPTED');

  const envelope = {
    schemaVersion: EVIDENCE_SCHEMA,
    releaseDigest: input.releaseDNA.digest,
    gate: gateId,
    requirementId: assertBoundedString(input.requirementId, 1, 128, 'EVIDENCE_REQUIREMENT_INVALID'),
    status,
    evidenceClass,
    environment,
    reference: assertBoundedString(input.reference, 1, 2048, 'EVIDENCE_REFERENCE_INVALID'),
    verifiedAt: assertIsoTime(input.verifiedAt, 'EVIDENCE_TIME_INVALID'),
    evidenceSha256: assertHash(input.evidenceSha256, 'EVIDENCE_INVALID_HASH'),
    fixture: assertBoolean(input.fixture, 'EVIDENCE_FIXTURE_INVALID'),
    simulated: assertBoolean(input.simulated, 'EVIDENCE_SIMULATED_INVALID'),
  };

  return deepFreeze({ ...envelope, digest: sha256Canonical(envelope) });
}

function verifyEvidenceCapsuleIntegrity(capsule) {
  try {
    assertExactKeys(
      capsule,
      [
        'schemaVersion', 'releaseDigest', 'gate', 'requirementId', 'status', 'evidenceClass', 'environment',
        'reference', 'verifiedAt', 'evidenceSha256', 'fixture', 'simulated', 'digest',
      ],
      'EVIDENCE_INTEGRITY_INVALID',
    );
    if (capsule.schemaVersion !== EVIDENCE_SCHEMA) return false;
    if (!HEX_256.test(String(capsule.releaseDigest || '')) || !HEX_256.test(String(capsule.digest || ''))) return false;
    if (!HEX_256.test(String(capsule.evidenceSha256 || ''))) return false;
    if (!GATE_MAP.has(capsule.gate)) return false;
    if (typeof capsule.fixture !== 'boolean' || typeof capsule.simulated !== 'boolean') return false;
    if (!EVIDENCE_STATUSES.has(String(capsule.status || '').toUpperCase())) return false;
    if (!Number.isFinite(Date.parse(String(capsule.verifiedAt || '')))) return false;
    const envelope = {
      schemaVersion: capsule.schemaVersion,
      releaseDigest: capsule.releaseDigest,
      gate: capsule.gate,
      requirementId: capsule.requirementId,
      status: capsule.status,
      evidenceClass: capsule.evidenceClass,
      environment: capsule.environment,
      reference: capsule.reference,
      verifiedAt: capsule.verifiedAt,
      evidenceSha256: capsule.evidenceSha256,
      fixture: capsule.fixture,
      simulated: capsule.simulated,
    };
    return sha256Canonical(envelope) === capsule.digest;
  } catch (_) {
    return false;
  }
}

function evidenceRoot(capsules) {
  const leaves = capsules
    .map((capsule) => ({ gate: capsule.gate, digest: capsule.digest }))
    .sort((left, right) => left.gate.localeCompare(right.gate) || left.digest.localeCompare(right.digest));
  return sha256Canonical({ schemaVersion: 'TIGER_EVIDENCE_ROOT_V1', leaves });
}

function evaluateProofReadiness(input) {
  assertExactKeys(input, PROOF_FIELDS, 'PROOF_INPUT_UNKNOWN_FIELD');
  if (!verifyReleaseDNAIntegrity(input.releaseDNA)) fail('PROOF_RELEASE_DNA_INVALID');
  if (!Array.isArray(input.capsules)) fail('PROOF_CAPSULES_INVALID');

  const exact = [];
  let staleCapsuleCount = 0;
  for (const capsule of input.capsules) {
    if (!verifyEvidenceCapsuleIntegrity(capsule)) fail('EVIDENCE_INTEGRITY_INVALID');
    if (capsule.releaseDigest !== input.releaseDNA.digest) {
      staleCapsuleCount += 1;
      continue;
    }
    exact.push(capsule);
  }

  const readinessRecords = exact.map((capsule) => ({
    gate: capsule.gate,
    status: capsule.simulated ? 'SIMULATED' : capsule.status,
    evidenceClass: capsule.evidenceClass,
    environment: capsule.environment,
    reference: capsule.reference,
    verifiedAt: capsule.verifiedAt,
    fixture: capsule.fixture || capsule.simulated,
  }));
  const readinessResult = evaluateReadiness(readinessRecords);
  const root = evidenceRoot(exact);
  const productionReady = readinessResult.productionReady && staleCapsuleCount === 0;

  return deepFreeze({
    status: productionReady ? 'TIGER_SOVEREIGN_PROOF_100' : 'TIGER_SOVEREIGN_PROOF_BLOCKED',
    productionReady,
    releaseDigest: input.releaseDNA.digest,
    evidenceRootHash: root,
    exactCapsuleCount: exact.length,
    staleCapsuleCount,
    readiness: readinessResult,
  });
}

function createGoldenReleasePassport(input) {
  assertExactKeys(input, PASSPORT_FIELDS, 'PASSPORT_INPUT_UNKNOWN_FIELD');
  if (!Object.prototype.hasOwnProperty.call(input, 'releaseDNA') || !Object.prototype.hasOwnProperty.call(input, 'capsules')) {
    fail('PASSPORT_REQUIRED_FIELD');
  }

  const result = evaluateProofReadiness({ releaseDNA: input.releaseDNA, capsules: input.capsules });
  if (!result.productionReady) fail('GOLDEN_PASSPORT_BLOCKED');
  if (!Object.prototype.hasOwnProperty.call(input, 'issuedAt')) fail('PASSPORT_ISSUED_AT_REQUIRED');

  const envelope = {
    schemaVersion: PASSPORT_SCHEMA,
    status: 'TIGER_GOLDEN_RELEASE_PASSPORT_ISSUED',
    releaseDigest: input.releaseDNA.digest,
    evidenceRootHash: result.evidenceRootHash,
    totalGates: REQUIRED_GATES.length,
    productionReady: true,
    issuedAt: assertIsoTime(input.issuedAt, 'PASSPORT_ISSUED_AT_INVALID'),
  };

  return deepFreeze({ ...envelope, digest: sha256Canonical(envelope) });
}

module.exports = Object.freeze({
  REQUIRED_GATES,
  createReleaseDNA,
  verifyReleaseDNAIntegrity,
  createEvidenceCapsule,
  verifyEvidenceCapsuleIntegrity,
  evaluateProofReadiness,
  createGoldenReleasePassport,
});
