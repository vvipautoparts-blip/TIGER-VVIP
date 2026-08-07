'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMission,
  updateMission,
  createPredictAlert,
  createEvolutionProposal,
  recordShadowDecision,
  evaluateTrustScore,
} = require('../scripts/ai/sovereign-evolution-governance.js');

const scope = Object.freeze({ country: 'JO', sector: 'AUTOMOTIVE', resource: 'listing-flow' });

test('mission binds a single metric, target, cost ceiling and immutable scope', () => {
  const mission = createMission({ id: 'M-0043', metric: 'listing_completion_rate', baseline: 0.62, target: 0.75, maxCostIncreasePct: 5, scope, createdAt: '2026-08-07T10:15:00Z' });
  assert.equal(mission.metric, 'listing_completion_rate');
  assert.equal(Object.isFrozen(mission.scope), true);
  assert.equal(mission.status, 'ACTIVE');
});

test('mission updates cannot silently broaden metric or scope', () => {
  const mission = createMission({ id: 'M-0044', metric: 'listing_completion_rate', baseline: 0.62, target: 0.75, maxCostIncreasePct: 5, scope, createdAt: '2026-08-07T10:15:00Z' });
  assert.equal(updateMission({ mission, metric: 'revenue', observedValue: 0.66, scope }).reasonCode, 'MISSION_CONTRACT_CHANGE_DENIED');
  assert.equal(updateMission({ mission, observedValue: 0.66, scope: { country: '*', sector: '*', resource: 'platform' } }).reasonCode, 'MISSION_SCOPE_EXPANSION_DENIED');
  assert.equal(updateMission({ mission, observedValue: 0.66, costIncreasePct: 2, scope }).ok, true);
});

test('predict alerts require evidence and never contain an execution command', () => {
  const alert = createPredictAlert({
    alertId: 'PRED-001', metric: 'storage_utilization', observed: 0.78, threshold: 0.82,
    direction: 'ABOVE', horizonHours: 36,
    evidence: [{ sourceId: 'storage:metrics', freshness: 'fresh', confidence: 0.95 }],
    recommendedResponse: 'CAPACITY_REVIEW',
  });
  assert.equal(alert.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(alert.value, 'execute'), false);
  assert.throws(() => createPredictAlert({ alertId: 'PRED-002', metric: 'x', observed: 1, threshold: 2, direction: 'ABOVE', horizonHours: 24, evidence: [], recommendedResponse: 'DELETE_DATA' }), /evidence/i);
});

test('Evolution proposal is constrained to branch patch test PR and excludes merge/deploy', () => {
  const proposal = createEvolutionProposal({
    proposalId: 'EVO-001', problem: 'Android image processing latency', evidenceIds: ['perf:android:1'],
    branch: 'feat/evo-android-image-latency', patchSummary: 'Reduce redundant processing', testPlan: ['node --test tests/pr36*.test.cjs'],
  });
  assert.deepEqual(proposal.allowedLifecycle, ['BRANCH', 'PATCH', 'TEST', 'PR']);
  assert.equal(proposal.allowedLifecycle.includes('MERGE'), false);
  assert.equal(proposal.allowedLifecycle.includes('DEPLOY'), false);
});

test('Shadow AI records recommendation and outcome without execution authority', () => {
  const shadow = recordShadowDecision({ agentId: 'financial_analytics_manager', recommendationDigest: 'a'.repeat(64), humanDecision: 'REJECT', actualOutcomeScore: 0.7, observedAt: '2026-08-07T10:20:00Z' });
  assert.equal(shadow.mode, 'SHADOW');
  assert.equal(shadow.executed, false);
});

test('Trust Score may automatically reduce autonomy but cannot increase without owner approval', () => {
  const degraded = evaluateTrustScore({ currentLevel: 'L3', score: 0.61, sampleSize: 200, ownerApprovedIncrease: false });
  assert.equal(degraded.recommendedLevel, 'L2');
  assert.equal(degraded.autoApplicable, true);

  const strong = evaluateTrustScore({ currentLevel: 'L1', score: 0.98, sampleSize: 500, ownerApprovedIncrease: false });
  assert.equal(strong.recommendedLevel, 'L2');
  assert.equal(strong.autoApplicable, false);
  assert.equal(strong.reasonCode, 'OWNER_APPROVAL_REQUIRED_FOR_INCREASE');

  const approved = evaluateTrustScore({ currentLevel: 'L1', score: 0.98, sampleSize: 500, ownerApprovedIncrease: true });
  assert.equal(approved.autoApplicable, true);
});
