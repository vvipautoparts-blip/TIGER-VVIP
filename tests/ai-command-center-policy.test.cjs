'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  AGENTS,
  DECISIONS,
  FEATURE_FLAGS,
  evaluatePolicy,
  authorizeAction,
  createApprovalRequest,
  createAuditRecord,
} = require('../scripts/ai/vvip-ai-command-center.js');

test('AI Command Center starts disabled by default', () => {
  assert.equal(FEATURE_FLAGS.AI_COMMAND_CENTER_ENABLED, false);
});

test('registers only the four approved AI-01 agents', () => {
  assert.deepEqual(
    Object.keys(AGENTS).sort(),
    [
      'financial_analytics_manager',
      'general_manager',
      'technical_manager',
      'user_assistant',
    ],
  );
});

test('permanently denies destructive and financial-control actions', () => {
  for (const action of [
    ACTIONS.DELETE_DATA,
    ACTIONS.TRANSFER_FUNDS,
    ACTIONS.CHANGE_OWNER_PERMISSIONS,
  ]) {
    const result = evaluatePolicy(action);
    assert.equal(result.decision, DECISIONS.DENY);
    assert.equal(result.reasonCode, 'PERMANENTLY_FORBIDDEN');
  }
});

test('requires owner approval for merge, production deploy, and pricing changes', () => {
  for (const action of [
    ACTIONS.MERGE_PR,
    ACTIONS.DEPLOY_PRODUCTION,
    ACTIONS.CHANGE_PRICES,
  ]) {
    const result = evaluatePolicy(action);
    assert.equal(result.decision, DECISIONS.OWNER_APPROVAL_REQUIRED);
    assert.equal(result.level, 'L4');
  }
});

test('allows approved read, reporting, testing, and proposal operations at policy level', () => {
  assert.equal(evaluatePolicy(ACTIONS.READ_ANALYTICS).decision, DECISIONS.ALLOW);
  assert.equal(evaluatePolicy(ACTIONS.GENERATE_REPORT).decision, DECISIONS.ALLOW);
  assert.equal(evaluatePolicy(ACTIONS.RUN_TESTS).decision, DECISIONS.ALLOW);
  assert.equal(evaluatePolicy(ACTIONS.PROPOSE_CODE_PATCH).decision, DECISIONS.ALLOW);
});

test('unknown actions fail closed', () => {
  const result = evaluatePolicy('invented_action');
  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'UNKNOWN_ACTION');
});

test('runtime authorization fails closed while the feature flag is disabled', () => {
  const result = authorizeAction({
    agentId: 'technical_manager',
    action: ACTIONS.RUN_TESTS,
  });
  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'FEATURE_DISABLED');
});

test('agent scope blocks actions assigned to another specialist', () => {
  const result = authorizeAction({
    agentId: 'user_assistant',
    action: ACTIONS.RUN_TESTS,
    featureEnabled: true,
  });
  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'AGENT_SCOPE_DENIED');
});

test('owner approval unlocks only an allowed L4 request, never a permanent denial', () => {
  const deploy = authorizeAction({
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    featureEnabled: true,
    ownerApproved: true,
  });
  assert.equal(deploy.decision, DECISIONS.ALLOW);
  assert.equal(deploy.reasonCode, 'OWNER_APPROVAL_VERIFIED');

  const forbidden = authorizeAction({
    agentId: 'technical_manager',
    action: ACTIONS.DELETE_DATA,
    featureEnabled: true,
    ownerApproved: true,
  });
  assert.equal(forbidden.decision, DECISIONS.DENY);
  assert.equal(forbidden.reasonCode, 'PERMANENTLY_FORBIDDEN');
});

test('creates approval requests only for owner-gated actions', () => {
  const request = createApprovalRequest({
    agentId: 'financial_analytics_manager',
    action: ACTIONS.CHANGE_PRICES,
    requestedBy: 'owner-console',
    summary: 'Proposed pricing change after revenue analysis.',
    now: () => '2026-08-07T06:35:00.000Z',
    idFactory: () => 'approval-test-001',
  });

  assert.equal(request.id, 'approval-test-001');
  assert.equal(request.status, 'PENDING_OWNER_APPROVAL');
  assert.equal(request.action, ACTIONS.CHANGE_PRICES);
  assert.equal(request.createdAt, '2026-08-07T06:35:00.000Z');

  assert.throws(
    () => createApprovalRequest({
      agentId: 'technical_manager',
      action: ACTIONS.RUN_TESTS,
      requestedBy: 'owner-console',
      summary: 'Run tests.',
    }),
    /does not require owner approval/i,
  );
});

test('audit records keep an allowlisted metadata envelope and drop secret-like fields', () => {
  const record = createAuditRecord({
    agentId: 'technical_manager',
    action: ACTIONS.PROPOSE_CODE_PATCH,
    decision: DECISIONS.ALLOW,
    reasonCode: 'POLICY_ALLOW',
    requestedBy: 'owner-console',
    metadata: {
      target: 'scripts/example.js',
      prNumber: 41,
      token: 'must-not-be-recorded',
      ['pass' + 'word']: 'must-not-be-recorded',
      rawPrompt: 'must-not-be-recorded',
    },
    now: () => '2026-08-07T06:36:00.000Z',
    idFactory: () => 'audit-test-001',
  });

  assert.equal(record.id, 'audit-test-001');
  assert.deepEqual(record.metadata, {
    target: 'scripts/example.js',
    prNumber: 41,
  });
  assert.equal(JSON.stringify(record).includes('must-not-be-recorded'), false);
});

test('user assistant can help with writing but cannot cross into management controls', () => {
  const writing = authorizeAction({
    agentId: 'user_assistant',
    action: ACTIONS.ASSIST_USER_WRITING,
    featureEnabled: true,
  });
  assert.equal(writing.decision, DECISIONS.ALLOW);

  const pricing = authorizeAction({
    agentId: 'user_assistant',
    action: ACTIONS.CHANGE_PRICES,
    featureEnabled: true,
    ownerApproved: true,
  });
  assert.equal(pricing.decision, DECISIONS.DENY);
  assert.equal(pricing.reasonCode, 'AGENT_SCOPE_DENIED');
});
