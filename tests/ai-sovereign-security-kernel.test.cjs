'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  DECISIONS,
  createPayloadDigest,
  createApprovalEnvelope,
  verifyApprovalEnvelope,
  consumeApproval,
  evaluateSovereignRequest,
  createBlackBoxEvent,
  applyBudgetGate,
  applyRateGate,
} = require('../scripts/ai/sovereign-security-kernel.js');

const BASE_CONTEXT = Object.freeze({
  featureEnabled: true,
  actor: Object.freeze({ id: 'owner_001', role: 'OWNER', authenticated: true }),
  agentId: 'technical_manager',
  scope: Object.freeze({ country: 'JO', sector: 'AUTOMOTIVE' }),
  killSwitches: Object.freeze({ global: false, agent: false, tool: false }),
});

test('payload digests are deterministic and reject unsupported values', () => {
  const left = createPayloadDigest({ action: ACTIONS.DEPLOY_PRODUCTION, target: 'release-42', args: { b: 2, a: 1 } });
  const right = createPayloadDigest({ args: { a: 1, b: 2 }, target: 'release-42', action: ACTIONS.DEPLOY_PRODUCTION });
  assert.equal(left, right);
  assert.match(left, /^[a-f0-9]{64}$/);
  assert.throws(() => createPayloadDigest({ bad: undefined }), /unsupported/i);
});

test('permanent-deny actions stay denied even for authenticated owner context', () => {
  for (const action of [ACTIONS.DELETE_DATA, ACTIONS.TRANSFER_FUNDS, ACTIONS.CHANGE_OWNER_PERMISSIONS]) {
    const result = evaluateSovereignRequest({ ...BASE_CONTEXT, action, payload: { target: 'x' } });
    assert.equal(result.decision, DECISIONS.DENY);
    assert.equal(result.reasonCode, 'PERMANENTLY_FORBIDDEN');
  }
});

test('unknown action and unauthenticated actor fail closed', () => {
  assert.equal(
    evaluateSovereignRequest({ ...BASE_CONTEXT, action: 'invented', payload: {} }).reasonCode,
    'UNKNOWN_ACTION',
  );
  assert.equal(
    evaluateSovereignRequest({ ...BASE_CONTEXT, actor: { id: 'x', role: 'OWNER', authenticated: false }, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode,
    'AUTHENTICATION_REQUIRED',
  );
});

test('global, agent, and tool kill switches deny execution before any approval logic', () => {
  for (const key of ['global', 'agent', 'tool']) {
    const result = evaluateSovereignRequest({
      ...BASE_CONTEXT,
      action: ACTIONS.RUN_TESTS,
      payload: {},
      killSwitches: { global: false, agent: false, tool: false, [key]: true },
    });
    assert.equal(result.decision, DECISIONS.DENY);
    assert.equal(result.reasonCode, 'KILL_SWITCH_ACTIVE');
  }
});

test('L4 request requires a trusted payload-bound approval', () => {
  const payload = { release: 'r42', environment: 'production' };
  const pending = evaluateSovereignRequest({ ...BASE_CONTEXT, action: ACTIONS.DEPLOY_PRODUCTION, payload });
  assert.equal(pending.decision, DECISIONS.OWNER_APPROVAL_REQUIRED);

  const approval = createApprovalEnvelope({
    approvalId: 'apr_001',
    ownerId: 'owner_001',
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    createdAt: '2026-08-07T09:00:00.000Z',
    expiresAt: '2026-08-07T09:10:00.000Z',
  });

  const verified = verifyApprovalEnvelope({
    approval,
    actor: BASE_CONTEXT.actor,
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    now: '2026-08-07T09:05:00.000Z',
  });
  assert.equal(verified.ok, true);

  const allowed = evaluateSovereignRequest({
    ...BASE_CONTEXT,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    now: '2026-08-07T09:05:00.000Z',
  });
  assert.equal(allowed.decision, DECISIONS.ALLOW);
  assert.equal(allowed.reasonCode, 'TRUSTED_OWNER_APPROVAL');
});

test('approval cannot be reused for changed payload, wrong agent, wrong owner, or after expiry', () => {
  const payload = { price: 10, currency: 'JOD' };
  const approval = createApprovalEnvelope({
    approvalId: 'apr_002',
    ownerId: 'owner_001',
    agentId: 'financial_analytics_manager',
    action: ACTIONS.CHANGE_PRICES,
    payload,
    createdAt: '2026-08-07T09:00:00.000Z',
    expiresAt: '2026-08-07T09:10:00.000Z',
  });

  assert.equal(verifyApprovalEnvelope({ approval, actor: { id: 'owner_001', role: 'OWNER', authenticated: true }, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload: { price: 11, currency: 'JOD' }, now: '2026-08-07T09:05:00.000Z' }).reasonCode, 'PAYLOAD_DIGEST_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor: { id: 'owner_001', role: 'OWNER', authenticated: true }, agentId: 'technical_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-07T09:05:00.000Z' }).reasonCode, 'APPROVAL_SCOPE_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor: { id: 'owner_999', role: 'OWNER', authenticated: true }, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-07T09:05:00.000Z' }).reasonCode, 'OWNER_ID_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor: { id: 'owner_001', role: 'OWNER', authenticated: true }, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-07T09:11:00.000Z' }).reasonCode, 'APPROVAL_EXPIRED');
});

test('approval consumption is one-time and replay fails closed', () => {
  const store = new Set();
  const approval = createApprovalEnvelope({
    approvalId: 'apr_003', ownerId: 'owner_001', agentId: 'technical_manager',
    action: ACTIONS.MERGE_PR, payload: { prNumber: 140 },
    createdAt: '2026-08-07T09:00:00.000Z', expiresAt: '2026-08-07T09:10:00.000Z',
  });
  assert.equal(consumeApproval({ approval, consumedIds: store }).ok, true);
  assert.equal(consumeApproval({ approval, consumedIds: store }).reasonCode, 'APPROVAL_REPLAY');
});

test('budget and rate gates fail closed at or beyond configured ceilings', () => {
  assert.equal(applyBudgetGate({ spent: 9, requested: 1, limit: 10 }).ok, true);
  assert.equal(applyBudgetGate({ spent: 9.5, requested: 1, limit: 10 }).reasonCode, 'BUDGET_EXCEEDED');
  assert.equal(applyRateGate({ used: 4, requested: 1, limit: 5 }).ok, true);
  assert.equal(applyRateGate({ used: 5, requested: 1, limit: 5 }).reasonCode, 'RATE_LIMIT_EXCEEDED');
});

test('tool requests require allowlisted tool ids and matching agent scope', () => {
  const unknown = evaluateSovereignRequest({ ...BASE_CONTEXT, action: ACTIONS.RUN_TESTS, payload: {}, tool: { id: 'shell:anything', allowedAgents: ['technical_manager'] } });
  assert.equal(unknown.reasonCode, 'UNKNOWN_TOOL');

  const wrongAgent = evaluateSovereignRequest({ ...BASE_CONTEXT, agentId: 'user_assistant', action: ACTIONS.ASSIST_USER_WRITING, payload: {}, tool: { id: 'engineering.run_tests', allowedAgents: ['technical_manager'] } });
  assert.equal(wrongAgent.reasonCode, 'TOOL_SCOPE_DENIED');
});

test('black-box events are allowlisted, redacted, immutable projections', () => {
  const event = createBlackBoxEvent({
    correlationId: 'corr_001',
    actorId: 'owner_001',
    agentId: 'technical_manager',
    action: ACTIONS.RUN_TESTS,
    decision: DECISIONS.ALLOW,
    reasonCode: 'POLICY_ALLOW',
    metadata: {
      target: 'quality-gate',
      country: 'JO',
      token: ['never', 'persist'].join('-'),
      rawPrompt: ['private', 'prompt'].join('-'),
      arbitrary: 'drop-me',
    },
    now: () => '2026-08-07T09:05:00.000Z',
    idFactory: () => 'evt_001',
  });
  assert.equal(event.id, 'evt_001');
  assert.deepEqual(event.metadata, { target: 'quality-gate', country: 'JO' });
  assert.equal(Object.isFrozen(event), true);
  assert.equal(JSON.stringify(event).includes('drop-me'), false);
});
