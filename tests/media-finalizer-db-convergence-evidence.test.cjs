'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const helperPath = path.resolve(__dirname, '..', 'scripts', 'release', 'media-cell-db-convergence-evidence.cjs');
const classificationPath = path.resolve(__dirname, '..', 'config', 'media-finalizer-supabase-advisor-classification.json');

const PROJECT_REF = 'zelcngyyvbomuzokvuxo';
const REGION = 'ap-northeast-2';
const MIGRATIONS = ['20260816090001', '20260827120000', '20260828140000'];
const CHECK_NAMES = [
  'migrations',
  'jobTable',
  'canonicalColumns',
  'requestRpc',
  'trustedRpcs',
  'rls',
  'storage',
  'tokenLease',
];
const INTENTIONAL_REQUEST_RPC_WARNING =
  'authenticated_security_definer_function_executable_public_vvip_marketplace_request_media_finalization_target_media uuid';
const FIXED_MEDIA_TABLE_WARNING =
  'auth_allow_anonymous_sign_ins_public_vvip_marketplace_listing_media';
const FIXED_STORAGE_WARNING = 'auth_allow_anonymous_sign_ins_storage_objects';
const ADVISOR_SHA = crypto
  .createHash('sha256')
  .update(fs.readFileSync(classificationPath))
  .digest('hex');

function checks() {
  return Object.fromEntries(CHECK_NAMES.map((name) => [name, 'PASS']));
}

function advisors() {
  return {
    securityWarnings: [
      INTENTIONAL_REQUEST_RPC_WARNING,
      'rls_policy_always_true_public_unrelated_table',
    ],
    performanceWarnings: ['auth_rls_initplan_public_unrelated_table'],
  };
}

function validInput() {
  return {
    projectRef: PROJECT_REF,
    region: REGION,
    migrations: [...MIGRATIONS],
    checks: checks(),
    advisors: advisors(),
    advisorClassificationSha256: ADVISOR_SHA,
  };
}

function validLiveInput() {
  return {
    authority: {
      projectRef: PROJECT_REF,
      region: REGION,
    },
    verifierRow: {
      required_migrations: [...MIGRATIONS],
      contract_checks: checks(),
    },
    advisors: advisors(),
    advisorClassificationSha256: ADVISOR_SHA,
  };
}

test('deterministic media DB convergence helper exists', () => {
  assert.equal(fs.existsSync(helperPath), true, 'MEDIA_DB_CONVERGENCE_HELPER_MISSING');
});

test('helper maps the live verifier schema plus independently authenticated authority exactly', () => {
  const helper = require(helperPath);
  assert.equal(
    typeof helper.createMediaDbConvergenceEvidenceFromLive,
    'function',
    'MEDIA_DB_LIVE_EVIDENCE_ADAPTER_MISSING',
  );

  const adapted = helper.createMediaDbConvergenceEvidenceFromLive(validLiveInput());
  const direct = helper.createMediaDbConvergenceEvidence(validInput());
  assert.deepEqual(adapted, direct);
});

test('helper creates deterministic VERIFIED_LIVE evidence bound to live advisors', () => {
  const { createMediaDbConvergenceEvidence } = require(helperPath);
  const first = createMediaDbConvergenceEvidence(validInput());
  const reordered = validInput();
  reordered.advisors.securityWarnings.reverse();
  reordered.advisors.performanceWarnings.reverse();
  const second = createMediaDbConvergenceEvidence(reordered);

  assert.equal(first.state, 'VERIFIED_LIVE');
  assert.equal(first.evidence.projectRef, PROJECT_REF);
  assert.equal(first.evidence.region, REGION);
  assert.deepEqual(first.evidence.migrations, MIGRATIONS);
  assert.deepEqual(first.evidence.checks, checks());
  assert.deepEqual(
    first.evidence.advisors.securityWarnings,
    [...advisors().securityWarnings].sort(),
  );
  assert.deepEqual(
    first.evidence.advisors.performanceWarnings,
    [...advisors().performanceWarnings].sort(),
  );
  assert.equal(first.evidence.advisorClassificationSha256, ADVISOR_SHA);
  assert.match(first.evidenceSha256, /^[0-9a-f]{64}$/);
  assert.equal(first.evidenceSha256, second.evidenceSha256);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first).includes('timestamp'), false);
  assert.equal(JSON.stringify(first).includes('generatedAt'), false);
});

test('helper fails closed when any required contract check is not PASS', () => {
  const { createMediaDbConvergenceEvidence } = require(helperPath);
  for (const name of CHECK_NAMES) {
    const input = validInput();
    input.checks[name] = 'FAIL';
    assert.throws(
      () => createMediaDbConvergenceEvidence(input),
      new RegExp(`MEDIA_DB_CONTRACT_CHECK_FAILED:${name}`),
    );
  }
});

test('helper blocks both release-fixed anonymous-sign-in advisor findings', () => {
  const { createMediaDbConvergenceEvidence } = require(helperPath);
  for (const cacheKey of [FIXED_MEDIA_TABLE_WARNING, FIXED_STORAGE_WARNING]) {
    const input = validInput();
    input.advisors.securityWarnings.push(cacheKey);
    assert.throws(
      () => createMediaDbConvergenceEvidence(input),
      new RegExp(`MEDIA_DB_ADVISOR_FIXED_WARNING_PRESENT:${cacheKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );
  }
});

test('helper accepts the exact intentional request-RPC advisor finding but blocks a new Media warning', () => {
  const { createMediaDbConvergenceEvidence } = require(helperPath);
  assert.doesNotThrow(() => createMediaDbConvergenceEvidence(validInput()));

  const input = validInput();
  input.advisors.performanceWarnings.push('index_advisor_public_vvip_media_finalization_jobs');
  assert.throws(
    () => createMediaDbConvergenceEvidence(input),
    /MEDIA_DB_ADVISOR_UNCLASSIFIED_MEDIA_WARNING:index_advisor_public_vvip_media_finalization_jobs/,
  );
});

test('helper rejects wrong project, region, migration set, and non-binding advisor digest', () => {
  const { createMediaDbConvergenceEvidence } = require(helperPath);

  const wrongProject = validInput();
  wrongProject.projectRef = 'wrong-project';
  assert.throws(() => createMediaDbConvergenceEvidence(wrongProject), /MEDIA_DB_PROJECT_REF_MISMATCH/);

  const wrongRegion = validInput();
  wrongRegion.region = 'us-east-1';
  assert.throws(() => createMediaDbConvergenceEvidence(wrongRegion), /MEDIA_DB_REGION_MISMATCH/);

  const wrongMigrations = validInput();
  wrongMigrations.migrations = [...MIGRATIONS].reverse();
  assert.throws(() => createMediaDbConvergenceEvidence(wrongMigrations), /MEDIA_DB_MIGRATION_SET_MISMATCH/);

  const malformedDigest = validInput();
  malformedDigest.advisorClassificationSha256 = 'not-a-sha';
  assert.throws(() => createMediaDbConvergenceEvidence(malformedDigest), /MEDIA_DB_ADVISOR_DIGEST_INVALID/);

  const nonBindingDigest = validInput();
  nonBindingDigest.advisorClassificationSha256 = 'a'.repeat(64) === ADVISOR_SHA ? 'b'.repeat(64) : 'a'.repeat(64);
  assert.throws(
    () => createMediaDbConvergenceEvidence(nonBindingDigest),
    /MEDIA_DB_ADVISOR_CLASSIFICATION_DIGEST_MISMATCH/,
  );
});

test('helper rejects missing or unknown fields in direct and live-adapter inputs', () => {
  const {
    createMediaDbConvergenceEvidence,
    createMediaDbConvergenceEvidenceFromLive,
  } = require(helperPath);

  const missing = validInput();
  delete missing.checks;
  assert.throws(() => createMediaDbConvergenceEvidence(missing), /MEDIA_DB_INPUT_KEYS_INVALID/);

  const unknown = validInput();
  unknown.timestamp = '2026-08-28T00:00:00Z';
  assert.throws(() => createMediaDbConvergenceEvidence(unknown), /MEDIA_DB_INPUT_KEYS_INVALID/);

  const liveUnknown = validLiveInput();
  liveUnknown.verifierRow.project_ref = PROJECT_REF;
  assert.throws(
    () => createMediaDbConvergenceEvidenceFromLive(liveUnknown),
    /MEDIA_DB_LIVE_VERIFIER_KEYS_INVALID/,
  );
});
