'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AGENTS,
  DEFAULT_LIMITS,
  createBoardroomSession,
  requestHandoff,
  recordEvidence,
  finalizeBoardroomDecision,
} = require('../scripts/ai/sovereign-boardroom.js');

const ownerScope = Object.freeze({ country: 'JO', sector: '*', resource: 'platform' });

test('boardroom exposes only the four approved AI agents with immutable maximum levels', () => {
  assert.deepEqual(Object.keys(AGENTS).sort(), [
    'financial_analytics_manager',
    'general_manager',
    'technical_manager',
    'user_assistant',
  ]);
  assert.equal(AGENTS.general_manager.maxLevel, 'L2');
  assert.equal(AGENTS.technical_manager.maxLevel, 'L3');
  assert.equal(AGENTS.financial_analytics_manager.maxLevel, 'L2');
  assert.equal(AGENTS.user_assistant.maxLevel, 'L2');
  for (const agent of Object.values(AGENTS)) assert.equal(Object.isFrozen(agent), true);
});

test('default orchestration limits are hard-bounded', () => {
  assert.ok(DEFAULT_LIMITS.maxHandoffs <= 8);
  assert.ok(DEFAULT_LIMITS.maxDepth <= 4);
  assert.ok(DEFAULT_LIMITS.maxToolCalls <= 12);
  assert.ok(DEFAULT_LIMITS.maxTokens <= 50000);
  assert.ok(DEFAULT_LIMITS.maxCostMicrousd <= 5000000);
  assert.ok(DEFAULT_LIMITS.maxElapsedMs <= 120000);
});

test('session starts with immutable scope and zero consumption', () => {
  const session = createBoardroomSession({
    correlationId: 'corr-board-0001',
    ownerId: 'owner_001',
    rootAgentId: 'general_manager',
    scope: ownerScope,
    startedAtMs: 1000,
  });
  assert.equal(session.scope.country, 'JO');
  assert.equal(Object.isFrozen(session.scope), true);
  assert.equal(session.usage.handoffs, 0);
  assert.equal(session.usage.toolCalls, 0);
});

test('handoff cannot widen country, sector or resource scope', () => {
  const session = createBoardroomSession({ correlationId: 'corr-board-0002', ownerId: 'owner_001', rootAgentId: 'general_manager', scope: ownerScope, startedAtMs: 1000 });
  const widened = requestHandoff({ session, fromAgentId: 'general_manager', toAgentId: 'financial_analytics_manager', scope: { country: '*', sector: '*', resource: 'platform' }, nowMs: 1100 });
  assert.equal(widened.ok, false);
  assert.equal(widened.reasonCode, 'SCOPE_EXPANSION_DENIED');

  const narrower = requestHandoff({ session, fromAgentId: 'general_manager', toAgentId: 'financial_analytics_manager', scope: { country: 'JO', sector: 'AUTOMOTIVE', resource: 'platform' }, nowMs: 1100 });
  assert.equal(narrower.ok, true);
});

test('cycle and excessive handoff depth fail closed', () => {
  let session = createBoardroomSession({ correlationId: 'corr-board-0003', ownerId: 'owner_001', rootAgentId: 'general_manager', scope: ownerScope, startedAtMs: 1000 });
  let handoff = requestHandoff({ session, fromAgentId: 'general_manager', toAgentId: 'technical_manager', scope: ownerScope, nowMs: 1100 });
  assert.equal(handoff.ok, true);
  session = handoff.session;
  handoff = requestHandoff({ session, fromAgentId: 'technical_manager', toAgentId: 'general_manager', scope: ownerScope, nowMs: 1200 });
  assert.equal(handoff.ok, false);
  assert.equal(handoff.reasonCode, 'HANDOFF_CYCLE_DENIED');
});

test('handoff never grants the receiving agent a level above its constitutional maximum', () => {
  const session = createBoardroomSession({ correlationId: 'corr-board-0004', ownerId: 'owner_001', rootAgentId: 'general_manager', scope: ownerScope, startedAtMs: 1000 });
  const handoff = requestHandoff({ session, fromAgentId: 'general_manager', toAgentId: 'financial_analytics_manager', scope: ownerScope, requestedLevel: 'L4', nowMs: 1100 });
  assert.equal(handoff.ok, false);
  assert.equal(handoff.reasonCode, 'PRIVILEGE_ELEVATION_DENIED');
});

test('evidence is bounded and stale/unknown evidence cannot support HIGH confidence material decision', () => {
  let session = createBoardroomSession({ correlationId: 'corr-board-0005', ownerId: 'owner_001', rootAgentId: 'general_manager', scope: ownerScope, startedAtMs: 1000 });
  let recorded = recordEvidence({ session, agentId: 'general_manager', sourceId: 'analytics:1', freshness: 'stale', confidence: 0.9, material: true });
  assert.equal(recorded.ok, true);
  session = recorded.session;
  const final = finalizeBoardroomDecision({ session, summary: 'Launch recommendation', recommendations: [{ title: 'Launch', risk: 'HIGH' }], requestedConfidence: 0.95, nowMs: 1300 });
  assert.equal(final.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(final.confidence < 0.8);
});

test('elapsed, token, tool-call and cost ceilings fail closed', () => {
  const session = createBoardroomSession({
    correlationId: 'corr-board-0006', ownerId: 'owner_001', rootAgentId: 'general_manager', scope: ownerScope, startedAtMs: 1000,
    usage: { handoffs: 0, toolCalls: DEFAULT_LIMITS.maxToolCalls, tokens: DEFAULT_LIMITS.maxTokens, costMicrousd: DEFAULT_LIMITS.maxCostMicrousd },
  });
  const final = finalizeBoardroomDecision({ session, summary: 'x', recommendations: [], requestedConfidence: 0.5, nowMs: 1000 + DEFAULT_LIMITS.maxElapsedMs + 1 });
  assert.equal(final.status, 'REFUSED');
  assert.equal(final.reasonCode, 'RESOURCE_LIMIT_EXCEEDED');
});
