'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SENSITIVE_DECISIONS,
  createSimulationRequest,
  runSimulation,
  createDecisionPassport,
  verifyDecisionPassport,
} = require('../scripts/ai/tiger-mirror.js');

const scope = Object.freeze({ country: 'JO', sector: 'AUTOMOTIVE', resource: 'pricing:basic' });
const evidence = Object.freeze([
  Object.freeze({ sourceId: 'finance:JO:2026-08-07T10:00:00Z', freshness: 'fresh', confidence: 0.95 }),
  Object.freeze({ sourceId: 'analytics:JO:2026-08-07T10:00:00Z', freshness: 'fresh', confidence: 0.92 }),
]);

test('configured sensitive decisions require TIGER Mirror before approval readiness', () => {
  assert.equal(SENSITIVE_DECISIONS.has('change_prices'), true);
  assert.equal(SENSITIVE_DECISIONS.has('deploy_production'), true);
  assert.equal(SENSITIVE_DECISIONS.has('merge_pr'), true);
});

test('simulation request binds decision, scope, baseline, proposal, assumptions and evidence', () => {
  const request = createSimulationRequest({
    decisionType: 'change_prices',
    scope,
    baseline: { price: 10, demandIndex: 100, revenue: 1000, cost: 300 },
    proposal: { price: 9 },
    assumptions: { demandElasticity: -1.2, uncertaintyPct: 0.15 },
    evidence,
  });
  assert.equal(request.ok, true);
  assert.match(request.value.requestDigest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(request.value), true);
});

test('simulation produces immutable worst/base/best scenarios and remains explicitly simulated', () => {
  const request = createSimulationRequest({
    decisionType: 'change_prices', scope,
    baseline: { price: 10, demandIndex: 100, revenue: 1000, cost: 300 },
    proposal: { price: 9 }, assumptions: { demandElasticity: -1.2, uncertaintyPct: 0.15 }, evidence,
  });
  const simulation = runSimulation({ request: request.value, engineVersion: 'mirror-1.0.0' });
  assert.equal(simulation.stateClass, 'SIMULATED');
  assert.equal(simulation.engineVersion, 'mirror-1.0.0');
  assert.deepEqual(Object.keys(simulation.scenarios).sort(), ['base', 'best', 'worst']);
  assert.equal(simulation.scenarios.base.stateClass, 'SIMULATED');
  assert.equal(Object.isFrozen(simulation.scenarios), true);
});

test('stale evidence makes sensitive simulation insufficient for approval readiness', () => {
  const request = createSimulationRequest({
    decisionType: 'change_prices', scope,
    baseline: { price: 10, demandIndex: 100, revenue: 1000, cost: 300 },
    proposal: { price: 9 }, assumptions: { demandElasticity: -1.2, uncertaintyPct: 0.15 },
    evidence: [{ sourceId: 'finance:old', freshness: 'stale', confidence: 0.9 }],
  });
  const simulation = runSimulation({ request: request.value, engineVersion: 'mirror-1.0.0' });
  assert.equal(simulation.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(simulation.approvalReady, false);
});

test('Decision Passport binds exact proposal/simulation/evidence/risks/rollback and verifies content integrity', () => {
  const request = createSimulationRequest({
    decisionType: 'change_prices', scope,
    baseline: { price: 10, demandIndex: 100, revenue: 1000, cost: 300 },
    proposal: { price: 9 }, assumptions: { demandElasticity: -1.2, uncertaintyPct: 0.15 }, evidence,
  });
  const simulation = runSimulation({ request: request.value, engineVersion: 'mirror-1.0.0' });
  const passport = createDecisionPassport({
    passportId: 'TGR-2026-0001',
    proposal: request.value.proposal,
    scope,
    evidence,
    simulation,
    risks: [{ code: 'PRICE_DEMAND', level: 'MEDIUM' }],
    rollback: { available: true, action: 'restore_price', target: 10 },
    approvalLevel: 'L4',
    createdAt: '2026-08-07T10:10:00.000Z',
  });
  assert.match(passport.digest, /^[0-9a-f]{64}$/);
  assert.equal(verifyDecisionPassport(passport).ok, true);

  const tampered = { ...passport, proposal: { price: 8 } };
  assert.equal(verifyDecisionPassport(tampered).reasonCode, 'PASSPORT_DIGEST_MISMATCH');
});

test('passport cannot be approval-ready when simulation is missing or not ready', () => {
  assert.throws(() => createDecisionPassport({ passportId: 'TGR-2026-0002', proposal: { price: 9 }, scope, evidence, simulation: null, risks: [], rollback: { available: true }, approvalLevel: 'L4', createdAt: '2026-08-07T10:10:00.000Z' }), /simulation required/i);
});
