'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const readiness = require('../scripts/ai/sovereign-readiness-gate');
const proof = require('../scripts/ai/sovereign-proof-system');

const H = (char) => char.repeat(64);

function release(overrides = {}) {
  return proof.createReleaseDNA({
    commitSha: '70f987d68ad2f73c8dc2a2d2f7aacc6c51115a89',
    frontendBuildHash: H('a'),
    backendBuildHash: H('b'),
    migrationDigests: [
      { path: 'supabase/migrations/001.sql', sha256: H('c') },
      { path: 'supabase/migrations/002.sql', sha256: H('d') },
    ],
    aiPolicyHash: H('e'),
    promptHash: H('f'),
    modelConfigHash: H('1'),
    toolRegistryHash: H('2'),
    rlsPolicyHash: H('3'),
    securityConfigHash: H('4'),
    environmentClass: 'RELEASE_CANDIDATE',
    ...overrides,
  });
}

test('identical Release DNA produces no changed components and no revalidation gates', () => {
  const current = release();
  const comparison = proof.compareReleaseDNA(current, current);
  const plan = proof.createRevalidationPlan({ previousReleaseDNA: current, nextReleaseDNA: current });

  assert.deepEqual(comparison.changedComponents, []);
  assert.deepEqual(comparison.migrationChanges, { added: [], removed: [], changed: [] });
  assert.equal(comparison.sameRelease, true);
  assert.deepEqual(plan.affectedGateIds, []);
  assert.equal(plan.fullRevalidationRequired, false);
  assert.equal(Object.isFrozen(plan), true);
});

test('prompt-only change reopens AI inference/eval/deploy proof without pretending unrelated legal review changed', () => {
  const previous = release();
  const next = release({ promptHash: H('9') });
  const plan = proof.createRevalidationPlan({ previousReleaseDNA: previous, nextReleaseDNA: next });

  assert.deepEqual(plan.changedComponents, ['promptHash']);
  assert.equal(plan.affectedGateIds.includes('AI_EVALS_CONTRACT'), true);
  assert.equal(plan.affectedGateIds.includes('MODEL_GATEWAY_STAGING_SMOKE'), true);
  assert.equal(plan.affectedGateIds.includes('LIVE_ADVERSARIAL_EVALS_STAGING'), true);
  assert.equal(plan.affectedGateIds.includes('AI_GATEWAY_PRODUCTION_DEPLOY'), true);
  assert.equal(plan.affectedGateIds.includes('PRODUCTION_POST_DEPLOY_SMOKE'), true);
  assert.equal(plan.affectedGateIds.includes('PRIVACY_LEGAL_REVIEW'), false);
  assert.equal(plan.fullRevalidationRequired, false);
});

test('migration and RLS changes reopen database safety, isolation, recovery, promotion and production database proof', () => {
  const previous = release();
  const next = release({
    migrationDigests: [
      { path: 'supabase/migrations/001.sql', sha256: H('c') },
      { path: 'supabase/migrations/002.sql', sha256: H('8') },
      { path: 'supabase/migrations/003.sql', sha256: H('7') },
    ],
    rlsPolicyHash: H('6'),
  });

  const comparison = proof.compareReleaseDNA(previous, next);
  assert.deepEqual(comparison.migrationChanges, {
    added: ['supabase/migrations/003.sql'],
    removed: [],
    changed: ['supabase/migrations/002.sql'],
  });

  const plan = proof.createRevalidationPlan({ previousReleaseDNA: previous, nextReleaseDNA: next });
  for (const gate of [
    'DANGEROUS_SQL',
    'CORE_DATABASE_MIGRATIONS_RLS_BACKUP',
    'SUPABASE_PREVIEW_APPLY',
    'RLS_RUNTIME_PROBES',
    'BACKUP_RESTORE_REHEARSAL',
    'ROLLBACK_DRILL',
    'OWNER_DB_PROMOTION_APPROVAL',
    'SUPABASE_PRODUCTION_APPLY',
    'PRODUCTION_POST_DEPLOY_SMOKE',
    'PRODUCTION_BACKUP_VERIFIED',
  ]) {
    assert.equal(plan.affectedGateIds.includes(gate), true, `${gate} must be reopened`);
  }
});

test('unclassified commit change fails closed by reopening all 45 gates', () => {
  const previous = release();
  const next = release({ commitSha: 'f'.repeat(40) });
  const plan = proof.createRevalidationPlan({ previousReleaseDNA: previous, nextReleaseDNA: next });

  assert.deepEqual(plan.changedComponents, ['commitSha']);
  assert.equal(plan.fullRevalidationRequired, true);
  assert.deepEqual(plan.affectedGateIds, readiness.REQUIRED_GATES.map((gate) => gate.id));
  assert.deepEqual(plan.unaffectedGateIds, []);
  assert.equal(plan.reasonCodes.includes('UNCLASSIFIED_COMMIT_DELTA_REQUIRES_FULL_REVALIDATION'), true);
});

test('environment-class change fails closed with full revalidation because evidence scope has changed', () => {
  const previous = release();
  const next = release({ environmentClass: 'STAGING' });
  const plan = proof.createRevalidationPlan({ previousReleaseDNA: previous, nextReleaseDNA: next });

  assert.equal(plan.fullRevalidationRequired, true);
  assert.equal(plan.affectedGateIds.length, 45);
  assert.equal(plan.reasonCodes.includes('ENVIRONMENT_CLASS_CHANGED_REQUIRES_FULL_REVALIDATION'), true);
});

test('change-impact planning never rebinds old Evidence Capsules or grants readiness authority', () => {
  const previous = release();
  const next = release({ toolRegistryHash: H('5') });
  const plan = proof.createRevalidationPlan({ previousReleaseDNA: previous, nextReleaseDNA: next });

  assert.equal(Object.hasOwn(plan, 'productionReady'), false);
  assert.equal(Object.hasOwn(plan, 'passport'), false);
  assert.equal(Object.hasOwn(plan, 'capsules'), false);
  assert.equal(plan.carryForwardAuthorized, false);
  assert.equal(plan.requiresFreshEvidenceCapsules, true);
  assert.equal(plan.affectedGateIds.includes('SAFE_TOOL_EXECUTORS_STAGING'), true);
  assert.equal(plan.affectedGateIds.includes('AI_BLACKBOX_REVIEW'), true);
  assert.equal(plan.affectedGateIds.includes('LIVE_ADVERSARIAL_EVALS_STAGING'), true);
});

test('comparison and revalidation inputs fail closed on malformed or authority-shaped data', () => {
  const current = release();
  assert.throws(() => proof.compareReleaseDNA({}, current), /RELEASE_DNA_INTEGRITY_INVALID/);
  assert.throws(
    () => proof.createRevalidationPlan({ previousReleaseDNA: current, nextReleaseDNA: current, ownerApproved: true }),
    /REVALIDATION_INPUT_UNKNOWN_FIELD/,
  );
});
