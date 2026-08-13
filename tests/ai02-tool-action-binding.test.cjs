'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  DECISIONS,
  createTrustedActorContext,
  evaluateSovereignRequest,
} = require('../scripts/ai/sovereign-security-kernel.js');

const actor = () => createTrustedActorContext({ id: 'owner_001', role: 'OWNER' });
const context = () => ({
  featureEnabled: true,
  actor: actor(),
  agentId: 'technical_manager',
  killSwitches: { global: false, agent: false, tool: false },
});

test('low-level analytics action cannot carry a mutating create-pr tool', () => {
  const result = evaluateSovereignRequest({
    ...context(),
    action: ACTIONS.READ_ANALYTICS,
    payload: { dashboard: 'owner' },
    tool: { id: 'engineering.create_pr' },
  });

  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'TOOL_ACTION_MISMATCH');
});

test('tool level must match the policy level of its bound action', () => {
  const result = evaluateSovereignRequest({
    ...context(),
    action: ACTIONS.RUN_TESTS,
    payload: { suite: 'quality' },
    tool: { id: 'engineering.run_tests' },
  });

  assert.equal(result.decision, DECISIONS.ALLOW);
  assert.equal(result.reasonCode, 'POLICY_ALLOW');
});
