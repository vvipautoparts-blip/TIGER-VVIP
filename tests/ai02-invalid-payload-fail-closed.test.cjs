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
  const runtimeState = kernel.authority.issueRuntimeState({ featureEnabled: true });
  return { kernel, actor, runtimeState };
}

test('malformed L4 payload without approval returns DENY instead of throwing', () => {
  const { kernel, actor, runtimeState } = context();
  const cyclic = { target: 'production' };
  cyclic.self = cyclic;

  let result;
  assert.doesNotThrow(() => {
    result = kernel.runtime.evaluateSovereignRequest({
      actor,
      runtimeState,
      agentId: 'security_sentinel',
      action: ACTIONS.DEPLOY_PRODUCTION,
      payload: cyclic,
    });
  });

  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'INVALID_PAYLOAD');
});

test('malformed payload cannot crash approval verification or bypass binding', () => {
  const { kernel, actor, runtimeState } = context();
  const validPayload = { prNumber: 218, headSha: 'abc123' };
  const approval = kernel.authority.issueApproval({
    approvalId: 'apr_invalid_payload_001',
    actor,
    agentId: 'security_sentinel',
    action: ACTIONS.MERGE_PR,
    payload: validPayload,
    createdAt: '2026-08-13T03:00:00.000Z',
    expiresAt: '2026-08-13T03:10:00.000Z',
  });

  let result;
  assert.doesNotThrow(() => {
    result = kernel.runtime.evaluateSovereignRequest({
      actor,
      runtimeState,
      agentId: 'security_sentinel',
      action: ACTIONS.MERGE_PR,
      payload: { prNumber: 218, bad: undefined },
      approval,
      now: '2026-08-13T03:05:00.000Z',
    });
  });

  assert.equal(result.decision, DECISIONS.DENY);
  assert.equal(result.reasonCode, 'INVALID_PAYLOAD');
});
