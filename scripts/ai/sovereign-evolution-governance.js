'use strict';

const { scopeContained } = require('./sovereign-boardroom.js');

const LEVELS = Object.freeze(['L1', 'L2', 'L3', 'L4']);
const SAFE_PREDICT_RESPONSES = Object.freeze(new Set([
  'OBSERVE',
  'CAPACITY_REVIEW',
  'SECURITY_REVIEW',
  'COST_REVIEW',
  'PERFORMANCE_REVIEW',
  'OWNER_REVIEW',
]));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function result(ok, reasonCode, extra = {}) {
  return deepFreeze({ ok, reasonCode, ...extra });
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new TypeError('Scope required.');
  const output = {
    country: String(scope.country || '').trim(),
    sector: String(scope.sector || '').trim(),
    resource: String(scope.resource || '').trim(),
  };
  if (!output.country || !output.sector || !output.resource) throw new TypeError('Scope invalid.');
  return deepFreeze(output);
}

function createMission({ id, metric, baseline, target, maxCostIncreasePct, scope, createdAt } = {}) {
  const missionId = String(id || '').trim();
  const normalizedMetric = String(metric || '').trim();
  const timestamp = Date.parse(String(createdAt || ''));
  if (!missionId || !normalizedMetric || !Number.isFinite(baseline) || !Number.isFinite(target) || !Number.isFinite(maxCostIncreasePct) || maxCostIncreasePct < 0 || !Number.isFinite(timestamp)) {
    throw new TypeError('Mission contract invalid.');
  }
  return deepFreeze({
    id: missionId,
    metric: normalizedMetric,
    baseline,
    target,
    currentValue: baseline,
    maxCostIncreasePct,
    currentCostIncreasePct: 0,
    scope: normalizeScope(scope),
    status: 'ACTIVE',
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString(),
  });
}

function updateMission({ mission, metric, observedValue, costIncreasePct, scope, observedAt = new Date().toISOString() } = {}) {
  if (!mission || mission.status !== 'ACTIVE') return result(false, 'MISSION_NOT_ACTIVE');
  if (metric !== undefined && metric !== mission.metric) return result(false, 'MISSION_CONTRACT_CHANGE_DENIED');
  let normalizedScope;
  try {
    normalizedScope = normalizeScope(scope || mission.scope);
  } catch {
    return result(false, 'MISSION_SCOPE_INVALID');
  }
  if (!scopeContained(mission.scope, normalizedScope)) return result(false, 'MISSION_SCOPE_EXPANSION_DENIED');
  if (!Number.isFinite(observedValue)) return result(false, 'MISSION_VALUE_INVALID');
  const cost = costIncreasePct === undefined ? mission.currentCostIncreasePct : costIncreasePct;
  if (!Number.isFinite(cost) || cost < 0) return result(false, 'MISSION_COST_INVALID');
  const budgetExceeded = cost > mission.maxCostIncreasePct;
  const targetReached = mission.target >= mission.baseline ? observedValue >= mission.target : observedValue <= mission.target;
  const status = budgetExceeded ? 'BLOCKED_COST_CEILING' : targetReached ? 'TARGET_REACHED' : 'ACTIVE';
  return result(true, 'MISSION_UPDATED', {
    mission: deepFreeze({
      ...mission,
      currentValue: observedValue,
      currentCostIncreasePct: cost,
      scope: normalizedScope,
      status,
      updatedAt: new Date(observedAt).toISOString(),
    }),
  });
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) throw new TypeError('Evidence is required.');
  return evidence.slice(0, 20).map((item) => {
    const sourceId = String(item?.sourceId || '').trim();
    const freshness = String(item?.freshness || 'unknown');
    const confidence = Number(item?.confidence);
    if (!sourceId || !['fresh', 'stale', 'unknown'].includes(freshness) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('Evidence is invalid.');
    return { sourceId, freshness, confidence };
  });
}

function createPredictAlert({ alertId, metric, observed, threshold, direction, horizonHours, evidence, recommendedResponse } = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  if (!SAFE_PREDICT_RESPONSES.has(recommendedResponse)) throw new TypeError('Evidence-backed safe response class required.');
  if (!['ABOVE', 'BELOW'].includes(direction) || !Number.isFinite(observed) || !Number.isFinite(threshold) || !Number.isFinite(horizonHours) || horizonHours <= 0 || horizonHours > 720) {
    throw new TypeError('Prediction contract invalid.');
  }
  const value = deepFreeze({
    alertId: String(alertId || '').slice(0, 128),
    metric: String(metric || '').slice(0, 128),
    observed,
    threshold,
    direction,
    horizonHours,
    evidence: normalizedEvidence,
    recommendedResponse,
    warningOnly: true,
    stateClass: 'PREDICTED',
  });
  return result(true, 'PREDICT_ALERT_READY', { value });
}

function createEvolutionProposal({ proposalId, problem, evidenceIds, branch, patchSummary, testPlan } = {}) {
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0 || !Array.isArray(testPlan) || testPlan.length === 0) throw new TypeError('Evolution evidence and tests required.');
  const safeBranch = String(branch || '').trim();
  if (!/^feat\/[A-Za-z0-9._/-]{1,180}$/.test(safeBranch)) throw new TypeError('Evolution branch invalid.');
  return deepFreeze({
    proposalId: String(proposalId || '').slice(0, 128),
    problem: String(problem || '').slice(0, 2000),
    evidenceIds: evidenceIds.slice(0, 32).map((value) => String(value).slice(0, 256)),
    branch: safeBranch,
    patchSummary: String(patchSummary || '').slice(0, 3000),
    testPlan: testPlan.slice(0, 32).map((value) => String(value).slice(0, 512)),
    allowedLifecycle: deepFreeze(['BRANCH', 'PATCH', 'TEST', 'PR']),
    mergeAllowed: false,
    deployAllowed: false,
    status: 'PROPOSAL_ONLY',
  });
}

function recordShadowDecision({ agentId, recommendationDigest, humanDecision, actualOutcomeScore, observedAt } = {}) {
  if (!/^[0-9a-f]{64}$/i.test(String(recommendationDigest || '')) || !Number.isFinite(actualOutcomeScore) || actualOutcomeScore < 0 || actualOutcomeScore > 1) throw new TypeError('Shadow record invalid.');
  return deepFreeze({
    agentId: String(agentId || '').slice(0, 128),
    recommendationDigest: recommendationDigest.toLowerCase(),
    humanDecision: String(humanDecision || '').slice(0, 64),
    actualOutcomeScore,
    observedAt: new Date(observedAt).toISOString(),
    mode: 'SHADOW',
    executed: false,
  });
}

function evaluateTrustScore({ currentLevel, score, sampleSize, ownerApprovedIncrease = false } = {}) {
  const currentIndex = LEVELS.indexOf(currentLevel);
  if (currentIndex < 0 || !Number.isFinite(score) || score < 0 || score > 1 || !Number.isInteger(sampleSize) || sampleSize < 0) throw new TypeError('Trust score input invalid.');

  let desiredIndex = 0;
  if (sampleSize >= 300 && score >= 0.95) desiredIndex = 1;
  else if (sampleSize >= 100 && score >= 0.8) desiredIndex = 1;
  else if (sampleSize >= 100 && score >= 0.6) desiredIndex = Math.min(currentIndex, 1);
  else desiredIndex = 0;

  if (score < 0.5) desiredIndex = 0;
  if (score >= 0.95 && sampleSize >= 1000) desiredIndex = 2;

  const recommendedLevel = LEVELS[desiredIndex];
  if (desiredIndex > currentIndex) {
    return deepFreeze({
      recommendedLevel,
      autoApplicable: ownerApprovedIncrease === true,
      reasonCode: ownerApprovedIncrease ? 'OWNER_APPROVED_INCREASE' : 'OWNER_APPROVAL_REQUIRED_FOR_INCREASE',
      score,
      sampleSize,
    });
  }
  if (desiredIndex < currentIndex) {
    return deepFreeze({ recommendedLevel, autoApplicable: true, reasonCode: 'AUTONOMY_REDUCTION', score, sampleSize });
  }
  return deepFreeze({ recommendedLevel, autoApplicable: true, reasonCode: 'NO_LEVEL_CHANGE', score, sampleSize });
}

module.exports = Object.freeze({
  createMission,
  updateMission,
  createPredictAlert,
  createEvolutionProposal,
  recordShadowDecision,
  evaluateTrustScore,
});
