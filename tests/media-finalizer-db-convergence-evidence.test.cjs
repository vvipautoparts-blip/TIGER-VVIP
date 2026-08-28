'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = path.resolve(__dirname, '..', 'scripts', 'release', 'media-cell-db-convergence-evidence.cjs');
const moduleExists = fs.existsSync(MODULE);
const helper = moduleExists ? require(MODULE) : null;

const PROJECT_REF = 'zelcngyyvbomuzokvuxo';
const REGION = 'ap-northeast-2';
const MIGRATIONS = ['20260816090001', '20260827120000'];
const ADVISOR_SHA = 'a'.repeat(64);

function validInput() {
  return {
    projectRef: PROJECT_REF,
    region: REGION,
    migrations: [...MIGRATIONS],
    checks: {
      migrations: 'PASS',
      jobTable: 'PASS',
      canonicalColumns: 'PASS',
      requestRpc: 'PASS',
      trustedRpcs: 'PASS',
      rls: 'PASS',
      storage: 'PASS',
      tokenLease: 'PASS',
    },
    advisorClassificationSha256: ADVISOR_SHA,
  };
}

test('deterministic convergence evidence helper exists', () => {
  assert.equal(moduleExists, true, 'MEDIA_DB_CONVERGENCE_EVIDENCE_MODULE_MISSING');
});

test('creates deterministic VERIFIED_LIVE evidence for the exact Seoul DB contract', { skip: !moduleExists }, () => {
  const { createMediaDbConvergenceEvidence, canonicalJson } = helper;
  const first = createMediaDbConvergenceEvidence(validInput());
  const reordered = validInput();
  reordered.checks = {
    storage: 'PASS',
    migrations: 'PASS',
    tokenLease: 'PASS',
    jobTable: 'PASS',
    rls: 'PASS',
    trustedRpcs: 'PASS',
    requestRpc: 'PASS',
    canonicalColumns: 'PASS',
  };
  const second = createMediaDbConvergenceEvidence(reordered);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-media-db-convergence-v1');
  assert.equal(first.state, 'VERIFIED_LIVE');
  assert.equal(first.projectRef, PROJECT_REF);
  assert.equal(first.region, REGION);
  assert.deepEqual(first.migrations, MIGRATIONS);
  assert.equal(first.advisorClassificationSha256, ADVISOR_SHA);
  assert.match(first.evidenceSha256, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(canonicalJson(first), /timestamp|createdAt|updatedAt/i);

  const authority = { ...first };
  delete authority.evidenceSha256;
  assert.equal(
    first.evidenceSha256,
    crypto.createHash('sha256').update(canonicalJson(authority)).digest('hex'),
  );
});

test('fails closed when any required contract check is not PASS', { skip: !moduleExists }, () => {
  const { createMediaDbConvergenceEvidence } = helper;
  const input = validInput();
  input.checks.storage = 'FAIL';
  assert.throws(() => createMediaDbConvergenceEvidence(input), /MEDIA_DB_CONVERGENCE_CHECK_FAILED:storage/);
});

test('rejects a project, region, migration set, or advisor digest outside the authority', { skip: !moduleExists }, () => {
  const { createMediaDbConvergenceEvidence } = helper;
  const wrongProject = validInput();
  wrongProject.projectRef = 'aaaaaaaaaaaaaaaaaaaa';
  assert.throws(() => createMediaDbConvergenceEvidence(wrongProject), /MEDIA_DB_CONVERGENCE_PROJECT_INVALID/);

  const wrongRegion = validInput();
  wrongRegion.region = 'us-east-1';
  assert.throws(() => createMediaDbConvergenceEvidence(wrongRegion), /MEDIA_DB_CONVERGENCE_REGION_INVALID/);

  const wrongMigrations = validInput();
  wrongMigrations.migrations = ['20260816090001'];
  assert.throws(() => createMediaDbConvergenceEvidence(wrongMigrations), /MEDIA_DB_CONVERGENCE_MIGRATIONS_INVALID/);

  const extraMigration = validInput();
  extraMigration.migrations.push('20260828120000');
  assert.throws(() => createMediaDbConvergenceEvidence(extraMigration), /MEDIA_DB_CONVERGENCE_MIGRATIONS_INVALID/);

  const badAdvisorDigest = validInput();
  badAdvisorDigest.advisorClassificationSha256 = 'not-a-digest';
  assert.throws(() => createMediaDbConvergenceEvidence(badAdvisorDigest), /MEDIA_DB_CONVERGENCE_ADVISOR_DIGEST_INVALID/);
});

test('rejects missing and unknown fields instead of silently widening evidence', { skip: !moduleExists }, () => {
  const { createMediaDbConvergenceEvidence } = helper;
  const missing = validInput();
  delete missing.checks.rls;
  assert.throws(() => createMediaDbConvergenceEvidence(missing), /MEDIA_DB_CONVERGENCE_CHECKS_INVALID/);

  const unknown = validInput();
  unknown.timestamp = '2026-08-28T00:00:00Z';
  assert.throws(() => createMediaDbConvergenceEvidence(unknown), /MEDIA_DB_CONVERGENCE_INPUT_UNKNOWN/);

  const nestedUnknown = validInput();
  nestedUnknown.checks.extra = 'PASS';
  assert.throws(() => createMediaDbConvergenceEvidence(nestedUnknown), /MEDIA_DB_CONVERGENCE_CHECKS_INVALID/);
});
