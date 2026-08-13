'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  DECISIONS,
  createSovereignSecurityKernel,
} = require('../scripts/ai/sovereign-security-kernel.js');

function context() {
  const kernel = createSovereignSecurityKernel();
  const actor = kernel.authority.issueActor({ id: 'owner_001', role: 'OWNER' });
  const runtimeState = kernel.authority.issueRuntimeState({
    featureEnabled: true,
    killSwitches: { global: false, agent: false, tool: false },
  });
  return { kernel, actor, runtimeState };
}

test('low-level analytics action cannot carry a mutating create-pr tool', () => {
  const { kernel, actor, runtimeState } = context();
  const result = kernel.runtime.evaluateSovereignRequest({
    actor,
    runtimeState,
    agentId: 'technical_manager',
    action: ACTIONS.READ_ANALYTICS,
    payload: { dashboard: 'owner' },
    tool: { id: 'engineering.create_pr' },
  });

  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'TOOL_ACTION_MISMATCH');
});

test('tool level must match the policy level of its bound action', () => {
  const { kernel, actor, runtimeState } = context();
  const result = kernel.runtime.evaluateSovereignRequest({
    actor,
    runtimeState,
    agentId: 'technical_manager',
    action: ACTIONS.RUN_TESTS,
    payload: { suite: 'quality' },
    tool: { id: 'engineering.run_tests' },
  });

  assert.equal(result.decision, DECISIONS.ALLOW);
  assert.equal(result.reasonCode, 'POLICY_ALLOW');
});
