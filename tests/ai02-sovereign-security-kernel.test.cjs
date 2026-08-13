'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  DECISIONS,
  createTrustedActorContext,
  createPayloadDigest,
  createApprovalEnvelope,
  verifyApprovalEnvelope,
  evaluateSovereignRequest,
  applyBudgetGate,
  applyRateGate,
  createBlackBoxEvent,
} = require('../scripts/ai/sovereign-security-kernel.js');

const owner = () => createTrustedActorContext({ id: 'owner_001', role: 'OWNER' });
const staff = () => createTrustedActorContext({ id: 'staff_001', role: 'STAFF' });
const base = () => ({
  featureEnabled: true,
  actor: owner(),
  agentId: 'technical_manager',
  killSwitches: { global: false, agent: false, tool: false },
});

test('payload digests are canonical and reject unsupported values', () => {
  const a = createPayloadDigest({ action: ACTIONS.DEPLOY_PRODUCTION, args: { b: 2, a: 1 } });
  const b = createPayloadDigest({ args: { a: 1, b: 2 }, action: ACTIONS.DEPLOY_PRODUCTION });
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.throws(() => createPayloadDigest({ bad: undefined }), /unsupported/i);
});

test('caller-shaped identity is never treated as trusted server identity', () => {
  const forged = { id: 'owner_001', role: 'OWNER', authenticated: true };
  const result = evaluateSovereignRequest({
    ...base(),
    actor: forged,
    action: ACTIONS.RUN_TESTS,
    payload: {},
  });
  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'UNTRUSTED_ACTOR');
});

test('JSON copy of trusted identity loses trust', () => {
  const copied = JSON.parse(JSON.stringify(owner()));
  const result = evaluateSovereignRequest({ ...base(), actor: copied, action: ACTIONS.RUN_TESTS, payload: {} });
  assert.equal(result.reasonCode, 'UNTRUSTED_ACTOR');
});

test('permanent deny remains deny even for trusted owner', () => {
  for (const action of [ACTIONS.DELETE_DATA, ACTIONS.TRANSFER_FUNDS, ACTIONS.CHANGE_OWNER_PERMISSIONS]) {
    const result = evaluateSovereignRequest({ ...base(), action, payload: { target: 'x' } });
    assert.equal(result.decision, DECISIONS.DENY);
    assert.equal(result.reasonCode, 'PERMANENTLY_FORBIDDEN');
  }
});

test('feature flag and kill switches fail closed', () => {
  assert.equal(evaluateSovereignRequest({ ...base(), featureEnabled: false, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode, 'FEATURE_DISABLED');
  for (const key of ['global', 'agent', 'tool']) {
    const result = evaluateSovereignRequest({
      ...base(),
      action: ACTIONS.RUN_TESTS,
      payload: {},
      killSwitches: { global: false, agent: false, tool: false, [key]: true },
    });
    assert.equal(result.reasonCode, 'KILL_SWITCH_ACTIVE');
  }
});

test('ordinary allowed action requires trusted actor and matching agent scope', () => {
  const allowed = evaluateSovereignRequest({ ...base(), action: ACTIONS.RUN_TESTS, payload: {} });
  assert.equal(allowed.decision, DECISIONS.ALLOW);
  assert.equal(allowed.reasonCode, 'POLICY_ALLOW');

  const denied = evaluateSovereignRequest({ ...base(), actor: staff(), agentId: 'user_assistant', action: ACTIONS.RUN_TESTS, payload: {} });
  assert.equal(denied.reasonCode, 'AGENT_SCOPE_DENIED');
});

test('L4 without approval remains pending and never becomes implicit allow', () => {
  const result = evaluateSovereignRequest({
    ...base(),
    action: ACTIONS.MERGE_PR,
    payload: { prNumber: 220, headSha: 'abc123' },
  });
  assert.equal(result.decision, DECISIONS.OWNER_APPROVAL_REQUIRED);
  assert.equal(result.reasonCode, 'OWNER_APPROVAL_REQUIRED');
});

test('L4 approval must be payload-bound, trusted and atomically consumed before ALLOW', () => {
  const actor = owner();
  const payload = { release: 'r42', environment: 'production' };
  const approval = createApprovalEnvelope({
    approvalId: 'apr_atomic_001',
    ownerId: actor.id,
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    createdAt: '2026-08-13T03:00:00.000Z',
    expiresAt: '2026-08-13T03:10:00.000Z',
  });

  const noStore = evaluateSovereignRequest({
    ...base(), actor,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    now: '2026-08-13T03:05:00.000Z',
  });
  assert.equal(noStore.decision, DECISIONS.DENY);
  assert.equal(noStore.reasonCode, 'CONSUMPTION_STORE_REQUIRED');

  const consumedApprovalIds = new Set();
  const allowed = evaluateSovereignRequest({
    ...base(), actor,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    consumedApprovalIds,
    now: '2026-08-13T03:05:00.000Z',
  });
  assert.equal(allowed.decision, DECISIONS.ALLOW);
  assert.equal(allowed.reasonCode, 'TRUSTED_OWNER_APPROVAL_CONSUMED');
  assert.equal(consumedApprovalIds.has('apr_atomic_001'), true);

  const replay = evaluateSovereignRequest({
    ...base(), actor,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    consumedApprovalIds,
    now: '2026-08-13T03:05:01.000Z',
  });
  assert.equal(replay.decision, DECISIONS.DENY);
  assert.equal(replay.reasonCode, 'APPROVAL_REPLAY');
});

test('copied or forged approval cannot unlock L4', () => {
  const actor = owner();
  const payload = { prNumber: 220, headSha: 'abc123' };
  const issued = createApprovalEnvelope({
    approvalId: 'apr_copy_001', ownerId: actor.id, agentId: 'technical_manager', action: ACTIONS.MERGE_PR,
    payload, createdAt: '2026-08-13T03:00:00.000Z', expiresAt: '2026-08-13T03:10:00.000Z',
  });
  const copied = JSON.parse(JSON.stringify(issued));
  const verification = verifyApprovalEnvelope({ approval: copied, actor, agentId: 'technical_manager', action: ACTIONS.MERGE_PR, payload, now: '2026-08-13T03:05:00.000Z' });
  assert.equal(verification.ok, false);
  assert.equal(verification.reasonCode, 'UNTRUSTED_APPROVAL');

  const result = evaluateSovereignRequest({
    ...base(), actor,
    action: ACTIONS.MERGE_PR,
    payload,
    approval: copied,
    consumedApprovalIds: new Set(),
    now: '2026-08-13T03:05:00.000Z',
  });
  assert.equal(result.reasonCode, 'UNTRUSTED_APPROVAL');
});

test('approval rejects changed payload, wrong owner, scope mismatch and expiry', () => {
  const actor = owner();
  const payload = { price: 10, currency: 'JOD' };
  const approval = createApprovalEnvelope({
    approvalId: 'apr_scope_001', ownerId: actor.id, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES,
    payload, createdAt: '2026-08-13T03:00:00.000Z', expiresAt: '2026-08-13T03:10:00.000Z',
  });
  assert.equal(verifyApprovalEnvelope({ approval, actor, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload: { price: 11, currency: 'JOD' }, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'PAYLOAD_DIGEST_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor, agentId: 'technical_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'APPROVAL_SCOPE_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor: createTrustedActorContext({ id: 'owner_999', role: 'OWNER' }), agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'OWNER_ID_MISMATCH');
  assert.equal(verifyApprovalEnvelope({ approval, actor, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:11:00.000Z' }).reasonCode, 'APPROVAL_EXPIRED');
});

test('budget, rate and tool gates fail closed', () => {
  assert.equal(applyBudgetGate({ spent: 9, requested: 1, limit: 10 }).ok, true);
  assert.equal(applyBudgetGate({ spent: 9.5, requested: 1, limit: 10 }).reasonCode, 'BUDGET_EXCEEDED');
  assert.equal(applyRateGate({ used: 4, requested: 1, limit: 5 }).ok, true);
  assert.equal(applyRateGate({ used: 5, requested: 1, limit: 5 }).reasonCode, 'RATE_LIMIT_EXCEEDED');

  assert.equal(evaluateSovereignRequest({ ...base(), action: ACTIONS.RUN_TESTS, payload: {}, tool: { id: 'shell:anything' } }).reasonCode, 'UNKNOWN_TOOL');
  assert.equal(evaluateSovereignRequest({ ...base(), actor: staff(), agentId: 'user_assistant', action: ACTIONS.ASSIST_USER_WRITING, payload: {}, tool: { id: 'engineering.run_tests' } }).reasonCode, 'TOOL_SCOPE_DENIED');
});

test('black-box events keep only allowlisted metadata and are immutable', () => {
  const event = createBlackBoxEvent({
    correlationId: 'corr_001', actorId: 'owner_001', agentId: 'technical_manager', action: ACTIONS.RUN_TESTS,
    decision: DECISIONS.ALLOW, reasonCode: 'POLICY_ALLOW',
    metadata: { target: 'quality-gate', country: 'JO', token: 'secret', rawPrompt: 'private', arbitrary: 'drop-me' },
    now: () => '2026-08-13T03:05:00.000Z', idFactory: () => 'evt_001',
  });
  assert.deepEqual(event.metadata, { target: 'quality-gate', country: 'JO' });
  assert.equal(Object.isFrozen(event), true);
  assert.equal(JSON.stringify(event).includes('drop-me'), false);
  assert.equal(JSON.stringify(event).includes('secret'), false);
});
