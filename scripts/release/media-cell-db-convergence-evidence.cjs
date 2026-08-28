'use strict';

const crypto = require('node:crypto');

const PROJECT_REF = 'zelcngyyvbomuzokvuxo';
const REGION = 'ap-northeast-2';
const REQUIRED_MIGRATIONS = Object.freeze(['20260816090001', '20260827120000']);
const REQUIRED_CHECKS = Object.freeze([
  'migrations',
  'jobTable',
  'canonicalColumns',
  'requestRpc',
  'trustedRpcs',
  'rls',
  'storage',
  'tokenLease',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function assertExactKeys(value, allowed, unknownCode, invalidCode) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(invalidCode);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  for (const key of actual) if (!expected.includes(key)) fail(unknownCode);
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) fail(invalidCode);
}

function validateMigrationSet(migrations) {
  if (!Array.isArray(migrations) || migrations.length !== REQUIRED_MIGRATIONS.length) {
    fail('MEDIA_DB_CONVERGENCE_MIGRATIONS_INVALID');
  }
  const normalized = [...migrations].sort();
  const expected = [...REQUIRED_MIGRATIONS].sort();
  if (new Set(normalized).size !== expected.length || normalized.some((value, index) => value !== expected[index])) {
    fail('MEDIA_DB_CONVERGENCE_MIGRATIONS_INVALID');
  }
}

function validateChecks(checks) {
  assertExactKeys(
    checks,
    REQUIRED_CHECKS,
    'MEDIA_DB_CONVERGENCE_CHECKS_INVALID',
    'MEDIA_DB_CONVERGENCE_CHECKS_INVALID',
  );
  for (const name of REQUIRED_CHECKS) {
    if (checks[name] !== 'PASS') fail(`MEDIA_DB_CONVERGENCE_CHECK_FAILED:${name}`);
  }
}

function validateInput(input) {
  assertExactKeys(
    input,
    ['projectRef', 'region', 'migrations', 'checks', 'advisorClassificationSha256'],
    'MEDIA_DB_CONVERGENCE_INPUT_UNKNOWN',
    'MEDIA_DB_CONVERGENCE_INPUT_INVALID',
  );
  if (input.projectRef !== PROJECT_REF) fail('MEDIA_DB_CONVERGENCE_PROJECT_INVALID');
  if (input.region !== REGION) fail('MEDIA_DB_CONVERGENCE_REGION_INVALID');
  validateMigrationSet(input.migrations);
  validateChecks(input.checks);
  if (!SHA256_PATTERN.test(input.advisorClassificationSha256 || '')) {
    fail('MEDIA_DB_CONVERGENCE_ADVISOR_DIGEST_INVALID');
  }
}

function createMediaDbConvergenceEvidence(input = {}) {
  validateInput(input);
  const authority = {
    schemaVersion: 'tiger-media-db-convergence-v1',
    state: 'VERIFIED_LIVE',
    projectRef: PROJECT_REF,
    region: REGION,
    migrations: [...REQUIRED_MIGRATIONS],
    checks: Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, 'PASS'])),
    advisorClassificationSha256: input.advisorClassificationSha256,
  };
  const evidenceSha256 = crypto.createHash('sha256').update(canonicalJson(authority)).digest('hex');
  return canonicalize({ ...authority, evidenceSha256 });
}

module.exports = Object.freeze({
  PROJECT_REF,
  REGION,
  REQUIRED_MIGRATIONS,
  REQUIRED_CHECKS,
  canonicalJson,
  createMediaDbConvergenceEvidence,
});
