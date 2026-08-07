'use strict';

const { createPayloadDigest } = require('./sovereign-security-kernel.js');

const SENSITIVE_DECISIONS = Object.freeze(new Set([
  'change_prices',
  'deploy_production',
  'merge_pr',
  'country_activation',
  'ranking_policy_change',
]));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneSafe(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite simulation value.');
    return value;
  }
  if (Array.isArray(value)) return value.map(cloneSafe);
  if (!value || typeof value !== 'object') throw new TypeError('Unsupported simulation value.');
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError('Unsafe simulation key.');
    output[key] = cloneSafe(value[key]);
  }
  return output;
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0 || evidence.length > 32) throw new TypeError('Evidence is required.');
  return evidence.map((item) => {
    if (!item || typeof item !== 'object') throw new TypeError('Evidence item invalid.');
    const sourceId = String(item.sourceId || '').trim();
    const freshness = String(item.freshness || 'unknown');
    const confidence = Number(item.confidence);
    if (!sourceId || sourceId.length > 256 || !['fresh', 'stale', 'unknown'].includes(freshness) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new TypeError('Evidence item invalid.');
    }
    return { sourceId, freshness, confidence };
  });
}

function result(ok, reasonCode, extra = {}) {
  return deepFreeze({ ok, reasonCode, ...extra });
}

function createSimulationRequest({ decisionType, scope, baseline, proposal, assumptions, evidence } = {}) {
  if (!SENSITIVE_DECISIONS.has(decisionType)) return result(false, 'DECISION_NOT_SIMULATION_CONFIGURED');
  try {
    const normalized = {
      decisionType,
      scope: cloneSafe(scope),
      baseline: cloneSafe(baseline),
      proposal: cloneSafe(proposal),
      assumptions: cloneSafe(assumptions),
      evidence: normalizeEvidence(evidence),
    };
    const requestDigest = createPayloadDigest(normalized);
    return result(true, 'SIMULATION_REQUEST_READY', { value: deepFreeze({ ...normalized, requestDigest }) });
  } catch {
    return result(false, 'SIMULATION_REQUEST_INVALID');
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pricingScenario(request, uncertaintySign) {
  const baselinePrice = Number(request.baseline.price);
  const newPrice = Number(request.proposal.price);
  const baselineDemand = Number(request.baseline.demandIndex);
  const baselineRevenue = Number(request.baseline.revenue);
  const baselineCost = Number(request.baseline.cost);
  const elasticity = Number(request.assumptions.demandElasticity);
  const uncertainty = clamp(Number(request.assumptions.uncertaintyPct) || 0, 0, 1);
  if (![baselinePrice, newPrice, baselineDemand, baselineRevenue, baselineCost, elasticity].every(Number.isFinite) || baselinePrice <= 0 || newPrice < 0) {
    throw new TypeError('Pricing simulation inputs invalid.');
  }

  const priceChange = (newPrice - baselinePrice) / baselinePrice;
  const expectedDemandChange = elasticity * priceChange;
  const adjustedDemandChange = expectedDemandChange + (uncertaintySign * uncertainty * Math.max(Math.abs(expectedDemandChange), 0.05));
  const demandIndex = Math.max(0, baselineDemand * (1 + adjustedDemandChange));
  const revenueRatio = baselinePrice > 0 && baselineDemand > 0
    ? (newPrice * demandIndex) / (baselinePrice * baselineDemand)
    : 0;
  const revenue = Math.max(0, baselineRevenue * revenueRatio);
  const variableCostRatio = baselineDemand > 0 ? demandIndex / baselineDemand : 1;
  const cost = Math.max(0, baselineCost * variableCostRatio);
  const profit = revenue - cost;

  return deepFreeze({
    stateClass: 'SIMULATED',
    price: newPrice,
    demandIndex: Number(demandIndex.toFixed(4)),
    revenue: Number(revenue.toFixed(4)),
    cost: Number(cost.toFixed(4)),
    profit: Number(profit.toFixed(4)),
    demandChangePct: Number((adjustedDemandChange * 100).toFixed(4)),
  });
}

function genericScenario(request, uncertaintySign) {
  const uncertainty = clamp(Number(request.assumptions.uncertaintyPct) || 0.1, 0, 1);
  return deepFreeze({
    stateClass: 'SIMULATED',
    proposalDigest: createPayloadDigest(request.proposal),
    uncertaintyAdjustment: Number((uncertaintySign * uncertainty).toFixed(4)),
  });
}

function runSimulation({ request, engineVersion } = {}) {
  if (!request || !SENSITIVE_DECISIONS.has(request.decisionType) || !request.requestDigest) throw new TypeError('Simulation request required.');
  const version = String(engineVersion || '').trim();
  if (!version || version.length > 128) throw new TypeError('Engine version required.');
  const evidenceReady = request.evidence.length > 0 && request.evidence.every((item) => item.freshness === 'fresh' && item.confidence >= 0.5);
  const scenario = request.decisionType === 'change_prices' ? pricingScenario : genericScenario;
  const scenarios = deepFreeze({
    worst: scenario(request, -1),
    base: scenario(request, 0),
    best: scenario(request, 1),
  });
  const status = evidenceReady ? 'READY' : 'INSUFFICIENT_EVIDENCE';
  const output = {
    stateClass: 'SIMULATED',
    status,
    approvalReady: evidenceReady,
    engineVersion: version,
    requestDigest: request.requestDigest,
    evidenceDigest: createPayloadDigest(request.evidence),
    assumptions: request.assumptions,
    scenarios,
  };
  output.simulationDigest = createPayloadDigest(output);
  return deepFreeze(output);
}

function passportMaterial(value) {
  return {
    passportId: value.passportId,
    proposal: value.proposal,
    scope: value.scope,
    evidence: value.evidence,
    simulation: value.simulation,
    risks: value.risks,
    rollback: value.rollback,
    approvalLevel: value.approvalLevel,
    createdAt: value.createdAt,
    stateClass: value.stateClass,
    approvalReady: value.approvalReady,
  };
}

function createDecisionPassport({ passportId, proposal, scope, evidence, simulation, risks = [], rollback, approvalLevel, createdAt } = {}) {
  if (!simulation || simulation.stateClass !== 'SIMULATED') throw new TypeError('Simulation required for Decision Passport.');
  const id = String(passportId || '').trim();
  const timestamp = String(createdAt || '').trim();
  if (!id || id.length > 128 || !Number.isFinite(Date.parse(timestamp))) throw new TypeError('Passport identity invalid.');
  if (!['L1', 'L2', 'L3', 'L4'].includes(approvalLevel)) throw new TypeError('Approval level invalid.');

  const passport = {
    passportId: id,
    proposal: cloneSafe(proposal),
    scope: cloneSafe(scope),
    evidence: normalizeEvidence(evidence),
    simulation: cloneSafe(simulation),
    risks: cloneSafe(risks),
    rollback: cloneSafe(rollback),
    approvalLevel,
    createdAt: new Date(timestamp).toISOString(),
    stateClass: 'SIMULATED',
    approvalReady: simulation.approvalReady === true,
  };
  passport.digest = createPayloadDigest(passportMaterial(passport));
  return deepFreeze(passport);
}

function verifyDecisionPassport(passport) {
  if (!passport || typeof passport !== 'object' || typeof passport.digest !== 'string') return result(false, 'PASSPORT_INVALID');
  try {
    const expected = createPayloadDigest(passportMaterial(passport));
    if (expected !== passport.digest) return result(false, 'PASSPORT_DIGEST_MISMATCH');
    if (passport.stateClass !== 'SIMULATED' || passport.simulation?.stateClass !== 'SIMULATED') return result(false, 'PASSPORT_STATE_INVALID');
    return result(true, 'PASSPORT_VALID', { approvalReady: passport.approvalReady === true });
  } catch {
    return result(false, 'PASSPORT_INVALID');
  }
}

module.exports = Object.freeze({
  SENSITIVE_DECISIONS,
  createSimulationRequest,
  runSimulation,
  createDecisionPassport,
  verifyDecisionPassport,
});
