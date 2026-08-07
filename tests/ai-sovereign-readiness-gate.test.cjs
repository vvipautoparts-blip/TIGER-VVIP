'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  REQUIRED_GATES,
  evaluateReadiness,
  buildPendingEvidenceTemplate,
} = require('../scripts/ai/sovereign-readiness-gate.js');

const stagingRunbookPath = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_STAGING_RUNBOOK.md');
const productionChecklistPath = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_PRODUCTION_CHECKLIST.md');
const currentReadinessPath = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_CURRENT_READINESS.md');
const exampleEvidencePath = path.join(__dirname, '..', 'data', 'ai', 'sovereign-readiness-evidence.example.json');

function makeRealPassEvidence(gate, index) {
  return {
    gate: gate.id,
    status: 'PASS',
    evidenceClass: gate.allowedEvidenceClasses[0],
    environment: gate.allowedEnvironments[0],
    reference: `evidence://verified/${String(index).padStart(3, '0')}`,
    verifiedAt: `2026-08-07T${String(10 + Math.floor(index / 50)).padStart(2, '0')}:${String(index % 50).padStart(2, '0')}:00.000Z`,
    fixture: false,
  };
}

test('readiness gate covers repository, core manual, staging, security, legal, recovery, owner and production evidence', () => {
  assert.ok(REQUIRED_GATES.length >= 35);
  const ids = new Set(REQUIRED_GATES.map((gate) => gate.id));
  for (const required of [
    'AUTOMATED_QUALITY_GATE',
    'CODEQL',
    'DEPENDENCY_REVIEW',
    'CORE_PR36_REAL_IMAGE_UPLOAD_MANUAL',
    'MANUAL_OWNER_AI_BROWSER',
    'AI_BLACKBOX_REVIEW',
    'SUPABASE_PREVIEW_APPLY',
    'RLS_RUNTIME_PROBES',
    'MODEL_GATEWAY_STAGING_SMOKE',
    'LIVE_ADVERSARIAL_EVALS_STAGING',
    'BACKUP_RESTORE_REHEARSAL',
    'INCIDENT_RUNBOOK_DRILL',
    'PRIVACY_LEGAL_REVIEW',
    'SECRET_HISTORY_INVENTORY_ROTATION',
    'OWNER_MERGE_APPROVAL',
    'OWNER_DB_PROMOTION_APPROVAL',
    'OWNER_PRODUCTION_ACTIVATION',
    'SUPABASE_PRODUCTION_APPLY',
    'AI_GATEWAY_PRODUCTION_DEPLOY',
    'PRODUCTION_POST_DEPLOY_SMOKE',
  ]) assert.equal(ids.has(required), true, `missing ${required}`);
  assert.equal(new Set(REQUIRED_GATES.map((gate) => gate.id)).size, REQUIRED_GATES.length);
});

test('pending/deferred/assumed/simulated/test-fixture or missing evidence blocks 100 percent', () => {
  const template = buildPendingEvidenceTemplate('2026-08-07T10:00:00.000Z');
  const pending = evaluateReadiness(template);
  assert.equal(pending.productionReady, false);
  assert.equal(pending.readinessPercent, 0);
  assert.equal(pending.blockedCount, REQUIRED_GATES.length);

  const fixture = REQUIRED_GATES.map((gate, index) => ({
    ...makeRealPassEvidence(gate, index),
    evidenceClass: 'TEST_FIXTURE',
    environment: 'TEST',
    fixture: true,
  }));
  const fixtureResult = evaluateReadiness(fixture, { allowFixtureCompleteness: true });
  assert.equal(fixtureResult.candidateCompletenessPercent, 100);
  assert.equal(fixtureResult.productionReady, false);
  assert.ok(fixtureResult.blockers.some((item) => item.reasonCode === 'NON_REAL_EVIDENCE'));
});

test('wrong evidence class or environment fails the exact gate instead of counting as pass', () => {
  const evidence = REQUIRED_GATES.map(makeRealPassEvidence);
  const target = evidence.find((item) => item.gate === 'MODEL_GATEWAY_STAGING_SMOKE');
  target.environment = 'LOCAL';
  const result = evaluateReadiness(evidence);
  assert.equal(result.productionReady, false);
  assert.ok(result.blockers.some((item) => item.gate === 'MODEL_GATEWAY_STAGING_SMOKE' && item.reasonCode === 'ENVIRONMENT_NOT_ACCEPTED'));
});

test('production sequence requires owner activation before production apply/deploy and post-deploy smoke last', () => {
  const evidence = REQUIRED_GATES.map(makeRealPassEvidence);
  const ownerActivation = evidence.find((item) => item.gate === 'OWNER_PRODUCTION_ACTIVATION');
  const dbApply = evidence.find((item) => item.gate === 'SUPABASE_PRODUCTION_APPLY');
  const aiDeploy = evidence.find((item) => item.gate === 'AI_GATEWAY_PRODUCTION_DEPLOY');
  const smoke = evidence.find((item) => item.gate === 'PRODUCTION_POST_DEPLOY_SMOKE');

  ownerActivation.verifiedAt = '2026-08-07T12:00:00.000Z';
  dbApply.verifiedAt = '2026-08-07T11:00:00.000Z';
  aiDeploy.verifiedAt = '2026-08-07T11:30:00.000Z';
  smoke.verifiedAt = '2026-08-07T10:30:00.000Z';

  const result = evaluateReadiness(evidence);
  assert.equal(result.productionReady, false);
  assert.ok(result.blockers.some((item) => item.reasonCode === 'PRODUCTION_SEQUENCE_INVALID'));
});

test('only complete real correctly-scoped and correctly-ordered PASS evidence can reach productionReady true', () => {
  const evidence = REQUIRED_GATES.map(makeRealPassEvidence);
  const timestamps = {
    OWNER_PRODUCTION_ACTIVATION: '2026-08-07T11:00:00.000Z',
    SUPABASE_PRODUCTION_APPLY: '2026-08-07T11:10:00.000Z',
    AI_GATEWAY_PRODUCTION_DEPLOY: '2026-08-07T11:20:00.000Z',
    PRODUCTION_POST_DEPLOY_SMOKE: '2026-08-07T11:30:00.000Z',
  };
  for (const [gate, verifiedAt] of Object.entries(timestamps)) evidence.find((item) => item.gate === gate).verifiedAt = verifiedAt;

  const result = evaluateReadiness(evidence);
  assert.equal(result.readinessPercent, 100);
  assert.equal(result.blockedCount, 0);
  assert.equal(result.productionReady, true);
  assert.equal(result.status, 'TIGER_SOVEREIGN_READINESS_100');
});

test('readiness operational artifacts exist and explicitly prohibit false 100 percent claims', () => {
  for (const file of [stagingRunbookPath, productionChecklistPath, currentReadinessPath, exampleEvidencePath]) assert.equal(fs.existsSync(file), true);
  const combined = [stagingRunbookPath, productionChecklistPath, currentReadinessPath].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.match(combined, /TIGER_SOVEREIGN_READINESS=100%/);
  assert.match(combined, /PENDING/);
  assert.match(combined, /owner/i);
  assert.match(combined, /staging/i);
  assert.match(combined, /production/i);
});
