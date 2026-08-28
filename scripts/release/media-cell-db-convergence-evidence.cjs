'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_REF = 'zelcngyyvbomuzokvuxo';
const REGION = 'ap-northeast-2';
const REQUIRED_MIGRATIONS = Object.freeze([
  '20260816090001',
  '20260827120000',
  '20260828140000',
]);
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
const ADVISOR_CLASSIFICATION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'config',
  'media-finalizer-supabase-advisor-classification.json',
);

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

const ADVISOR_CLASSIFICATION = Object.freeze(
  JSON.parse(fs.readFileSync(ADVISOR_CLASSIFICATION_PATH, 'utf8')),
);
const ADVISOR_CLASSIFICATION_SHA256 = crypto
  .createHash('sha256')
  .update(canonicalJson(ADVISOR_CLASSIFICATION))
  .digest('hex');
const FIXED_ADVISOR_CACHE_KEYS = new Set(
  ADVISOR_CLASSIFICATION.classifications
    .filter((entry) => entry.status === 'FIXED')
    .map((entry) => entry.cacheKey),
);
const INTENTIONAL_ADVISOR_CACHE_KEYS = new Set(
  ADVISOR_CLASSIFICATION.classifications
    .filter((entry) => entry.status === 'INTENTIONAL_AND_TESTED')
    .map((entry) => entry.cacheKey),
);

function assertExactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code);
  }
}

function validateMigrationSet(migrations) {
  if (
    !Array.isArray(migrations)
    || migrations.length !== REQUIRED_MIGRATIONS.length
    || migrations.some((value, index) => value !== REQUIRED_MIGRATIONS[index])
  ) {
    fail('MEDIA_DB_MIGRATION_SET_MISMATCH');
  }
}

function validateChecks(checks) {
  assertExactKeys(checks, REQUIRED_CHECKS, 'MEDIA_DB_CHECK_KEYS_INVALID');
  for (const name of REQUIRED_CHECKS) {
    if (checks[name] !== 'PASS') fail(`MEDIA_DB_CONTRACT_CHECK_FAILED:${name}`);
  }
}

function validateWarningArray(value) {
  if (!Array.isArray(value) || value.length > 256) fail('MEDIA_DB_ADVISOR_RESULTS_INVALID');
  const seen = new Set();
  for (const warning of value) {
    if (typeof warning !== 'string' || warning.length < 1 || warning.length > 512) {
      fail('MEDIA_DB_ADVISOR_RESULTS_INVALID');
    }
    if (seen.has(warning)) fail('MEDIA_DB_ADVISOR_RESULTS_INVALID');
    seen.add(warning);
  }
}

function isMediaSpecificAdvisorWarning(cacheKey) {
  return /(?:vvip_media_finalization_jobs|vvip_marketplace_(?:listing_media|request_media_finalization|claim_media_finalization|complete_media_finalization|fail_media_finalization)|listing_media_canonical|media_finalization)/i.test(cacheKey);
}

function validateAndNormalizeAdvisors(advisors) {
  assertExactKeys(
    advisors,
    ['securityWarnings', 'performanceWarnings'],
    'MEDIA_DB_ADVISOR_RESULTS_INVALID',
  );
  validateWarningArray(advisors.securityWarnings);
  validateWarningArray(advisors.performanceWarnings);

  const allWarnings = [...advisors.securityWarnings, ...advisors.performanceWarnings];
  for (const cacheKey of allWarnings) {
    if (FIXED_ADVISOR_CACHE_KEYS.has(cacheKey)) {
      fail(`MEDIA_DB_ADVISOR_FIXED_WARNING_PRESENT:${cacheKey}`);
    }
    if (INTENTIONAL_ADVISOR_CACHE_KEYS.has(cacheKey)) continue;
    if (isMediaSpecificAdvisorWarning(cacheKey)) {
      fail(`MEDIA_DB_ADVISOR_UNCLASSIFIED_MEDIA_WARNING:${cacheKey}`);
    }
  }

  return Object.freeze({
    securityWarnings: Object.freeze([...advisors.securityWarnings].sort()),
    performanceWarnings: Object.freeze([...advisors.performanceWarnings].sort()),
  });
}

function validateInput(input) {
  assertExactKeys(
    input,
    ['projectRef', 'region', 'migrations', 'checks', 'advisors', 'advisorClassificationSha256'],
    'MEDIA_DB_INPUT_KEYS_INVALID',
  );
  if (input.projectRef !== PROJECT_REF) fail('MEDIA_DB_PROJECT_REF_MISMATCH');
  if (input.region !== REGION) fail('MEDIA_DB_REGION_MISMATCH');
  validateMigrationSet(input.migrations);
  validateChecks(input.checks);
  if (!SHA256_PATTERN.test(input.advisorClassificationSha256 || '')) {
    fail('MEDIA_DB_ADVISOR_DIGEST_INVALID');
  }
  if (input.advisorClassificationSha256 !== ADVISOR_CLASSIFICATION_SHA256) {
    fail('MEDIA_DB_ADVISOR_CLASSIFICATION_DIGEST_MISMATCH');
  }
  return validateAndNormalizeAdvisors(input.advisors);
}

function createMediaDbConvergenceEvidence(input = {}) {
  const advisors = validateInput(input);
  const evidence = canonicalize({
    schemaVersion: 'tiger-media-db-convergence-v2',
    projectRef: PROJECT_REF,
    region: REGION,
    migrations: [...REQUIRED_MIGRATIONS],
    checks: Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, 'PASS'])),
    advisors,
    advisorClassificationSha256: ADVISOR_CLASSIFICATION_SHA256,
  });
  const evidenceSha256 = crypto.createHash('sha256').update(canonicalJson(evidence)).digest('hex');
  return canonicalize({
    state: 'VERIFIED_LIVE',
    evidence,
    evidenceSha256,
  });
}

function createMediaDbConvergenceEvidenceFromLive(input = {}) {
  assertExactKeys(
    input,
    ['authority', 'verifierRow', 'advisors', 'advisorClassificationSha256'],
    'MEDIA_DB_LIVE_INPUT_KEYS_INVALID',
  );
  assertExactKeys(
    input.authority,
    ['projectRef', 'region'],
    'MEDIA_DB_LIVE_AUTHORITY_KEYS_INVALID',
  );
  assertExactKeys(
    input.verifierRow,
    ['required_migrations', 'contract_checks'],
    'MEDIA_DB_LIVE_VERIFIER_KEYS_INVALID',
  );

  return createMediaDbConvergenceEvidence({
    projectRef: input.authority.projectRef,
    region: input.authority.region,
    migrations: input.verifierRow.required_migrations,
    checks: input.verifierRow.contract_checks,
    advisors: input.advisors,
    advisorClassificationSha256: input.advisorClassificationSha256,
  });
}

module.exports = Object.freeze({
  PROJECT_REF,
  REGION,
  REQUIRED_MIGRATIONS,
  REQUIRED_CHECKS,
  ADVISOR_CLASSIFICATION_SHA256,
  canonicalJson,
  createMediaDbConvergenceEvidence,
  createMediaDbConvergenceEvidenceFromLive,
});
