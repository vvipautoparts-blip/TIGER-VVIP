'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const kernelModule = require('../scripts/ai/sovereign-security-kernel.js');
const {
  ACTIONS,
  DECISIONS,
  createSovereignSecurityKernel,
  createPayloadDigest,
  applyBudgetGate,
  applyRateGate,
  createBlackBoxEvent,
} = kernelModule;

function createContext({
  featureEnabled = true,
  killSwitches = { global: false, agent: false, tool: false },
  budget,
  rate,
  actorId = 'owner_001',
  actorRole = 'OWNER',
  agentId = 'technical_manager',
} = {}) {
  const kernel = createSovereignSecurityKernel();
  const actor = kernel.authority.issueActor({ id: actorId, role: actorRole });
  const runtimeState = kernel.authority.issueRuntimeState({ featureEnabled, killSwitches, budget, rate });
  return {
    kernel,
    actor,
    runtimeState,
    base: { actor, runtimeState, agentId },
  };
}

test('module exposes a capability-scoped kernel and no global trust-minting authority', () => {
  assert.equal(typeof createSovereignSecurityKernel, 'function');
  for (const forbidden of [
    'createTrustedActorContext',
    'createApprovalEnvelope',
    'consumeApproval',
    'evaluateSovereignRequest',
  ]) {
    assert.equal(kernelModule[forbidden], undefined, `${forbidden} must not be globally exported`);
  }
});

test('payload digests are canonical and reject unsupported values', () => {
  const a = createPayloadDigest({ action: ACTIONS.DEPLOY_PRODUCTION, args: { b: 2, a: 1 } });
  const b = createPayloadDigest({ args: { a: 1, b: 2 }, action: ACTIONS.DEPLOY_PRODUCTION });
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.throws(() => createPayloadDigest({ bad: undefined }), /unsupported/i);
});

test('caller-shaped identity and runtime state are never trusted', () => {
  const { kernel } = createContext();
  const forgedActor = { id: 'owner_001', role: 'OWNER', authenticated: true };
  const forgedState = {
    featureEnabled: true,
    killSwitches: { global: false, agent: false, tool: false },
  };

  const badActor = kernel.runtime.evaluateSovereignRequest({
    actor: forgedActor,
    runtimeState: kernel.authority.issueRuntimeState({ featureEnabled: true }),
    agentId: 'technical_manager',
    action: ACTIONS.RUN_TESTS,
    payload: {},
  });
  assert.equal(badActor.reasonCode, 'UNTRUSTED_ACTOR');

  const badState = kernel.runtime.evaluateSovereignRequest({
    actor: kernel.authority.issueActor({ id: 'owner_001', role: 'OWNER' }),
    runtimeState: forgedState,
    agentId: 'technical_manager',
    action: ACTIONS.RUN_TESTS,
    payload: {},
  });
  assert.equal(badState.reasonCode, 'UNTRUSTED_RUNTIME_STATE');
});

test('trust is isolated per kernel instance and JSON copies lose trust', () => {
  const a = createContext();
  const b = createContext();

  const crossActor = b.kernel.runtime.evaluateSovereignRequest({
    ...b.base,
    actor: a.actor,
    action: ACTIONS.RUN_TESTS,
    payload: {},
  });
  assert.equal(crossActor.reasonCode, 'UNTRUSTED_ACTOR');

  const crossState = b.kernel.runtime.evaluateSovereignRequest({
    ...b.base,
    runtimeState: a.runtimeState,
    action: ACTIONS.RUN_TESTS,
    payload: {},
  });
  assert.equal(crossState.reasonCode, 'UNTRUSTED_RUNTIME_STATE');

  const copiedActor = JSON.parse(JSON.stringify(a.actor));
  const copiedState = JSON.parse(JSON.stringify(a.runtimeState));
  assert.equal(a.kernel.runtime.evaluateSovereignRequest({ ...a.base, actor: copiedActor, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode, 'UNTRUSTED_ACTOR');
  assert.equal(a.kernel.runtime.evaluateSovereignRequest({ ...a.base, runtimeState: copiedState, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode, 'UNTRUSTED_RUNTIME_STATE');
});

test('only owner may invoke management agents; user assistant remains scoped to trusted users', () => {
  const ownerCtx = createContext();
  assert.equal(ownerCtx.kernel.runtime.evaluateSovereignRequest({ ...ownerCtx.base, action: ACTIONS.RUN_TESTS, payload: {} }).decision, DECISIONS.ALLOW);

  for (const role of ['STAFF', 'USER']) {
    const ctx = createContext({ actorRole: role, actorId: `${role.toLowerCase()}_001` });
    const denied = ctx.kernel.runtime.evaluateSovereignRequest({ ...ctx.base, action: ACTIONS.RUN_TESTS, payload: {} });
    assert.equal(denied.reasonCode, 'ACTOR_AGENT_SCOPE_DENIED');

    const assistant = ctx.kernel.runtime.evaluateSovereignRequest({
      actor: ctx.actor,
      runtimeState: ctx.runtimeState,
      agentId: 'user_assistant',
      action: ACTIONS.ASSIST_USER_WRITING,
      payload: { text: 'hello' },
    });
    assert.equal(assistant.decision, DECISIONS.ALLOW);
  }
});

test('permanent deny remains deny even for trusted owner', () => {
  const { kernel, base } = createContext();
  for (const action of [ACTIONS.DELETE_DATA, ACTIONS.TRANSFER_FUNDS, ACTIONS.CHANGE_OWNER_PERMISSIONS]) {
    const result = kernel.runtime.evaluateSovereignRequest({ ...base, action, payload: { target: 'x' } });
    assert.equal(result.decision, DECISIONS.DENY);
    assert.equal(result.reasonCode, 'PERMANENTLY_FORBIDDEN');
  }
});

test('trusted feature state and kill switches fail closed', () => {
  const disabled = createContext({ featureEnabled: false });
  assert.equal(disabled.kernel.runtime.evaluateSovereignRequest({ ...disabled.base, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode, 'FEATURE_DISABLED');

  for (const key of ['global', 'agent', 'tool']) {
    const ctx = createContext({ killSwitches: { global: false, agent: false, tool: false, [key]: true } });
    const result = ctx.kernel.runtime.evaluateSovereignRequest({ ...ctx.base, action: ACTIONS.RUN_TESTS, payload: {} });
    assert.equal(result.reasonCode, 'KILL_SWITCH_ACTIVE');
  }
});

test('L4 without approval remains pending and never becomes implicit allow', () => {
  const { kernel, base } = createContext();
  const result = kernel.runtime.evaluateSovereignRequest({
    ...base,
    action: ACTIONS.MERGE_PR,
    payload: { prNumber: 218, headSha: 'abc123' },
  });
  assert.equal(result.decision, DECISIONS.OWNER_APPROVAL_REQUIRED);
  assert.equal(result.reasonCode, 'OWNER_APPROVAL_REQUIRED');
});

test('approval issuance requires a trusted owner from the same kernel', () => {
  const a = createContext();
  const b = createContext();
  const input = {
    approvalId: 'apr_owner_001',
    agentId: 'technical_manager',
    action: ACTIONS.MERGE_PR,
    payload: { prNumber: 218 },
    createdAt: '2026-08-13T03:00:00.000Z',
    expiresAt: '2026-08-13T03:10:00.000Z',
  };

  assert.throws(() => a.kernel.authority.issueApproval({ ...input, actor: { id: 'owner_001', role: 'OWNER' } }), /trusted owner/i);
  assert.throws(() => b.kernel.authority.issueApproval({ ...input, actor: a.actor }), /trusted owner/i);

  const staff = a.kernel.authority.issueActor({ id: 'staff_001', role: 'STAFF' });
  assert.throws(() => a.kernel.authority.issueApproval({ ...input, actor: staff }), /trusted owner/i);
});

test('L4 approval is payload-bound and automatically consumed by the kernel before ALLOW', () => {
  const { kernel, actor, base } = createContext();
  const payload = { release: 'r42', environment: 'production' };
  const approval = kernel.authority.issueApproval({
    approvalId: 'apr_atomic_001',
    actor,
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    createdAt: '2026-08-13T03:00:00.000Z',
    expiresAt: '2026-08-13T03:10:00.000Z',
  });

  const allowed = kernel.runtime.evaluateSovereignRequest({
    ...base,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    now: '2026-08-13T03:05:00.000Z',
  });
  assert.equal(allowed.decision, DECISIONS.ALLOW);
  assert.equal(allowed.reasonCode, 'TRUSTED_OWNER_APPROVAL_CONSUMED');

  const replay = kernel.runtime.evaluateSovereignRequest({
    ...base,
    action: ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval,
    now: '2026-08-13T03:05:01.000Z',
  });
  assert.equal(replay.decision, DECISIONS.DENY);
  assert.equal(replay.reasonCode, 'APPROVAL_REPLAY');
});

test('copied, cross-kernel or forged approval cannot unlock L4', () => {
  const a = createContext();
  const b = createContext();
  const payload = { prNumber: 218, headSha: 'abc123' };
  const issued = a.kernel.authority.issueApproval({
    approvalId: 'apr_copy_001', actor: a.actor, agentId: 'technical_manager', action: ACTIONS.MERGE_PR,
    payload, createdAt: '2026-08-13T03:00:00.000Z', expiresAt: '2026-08-13T03:10:00.000Z',
  });
  const copied = JSON.parse(JSON.stringify(issued));

  assert.equal(a.kernel.runtime.verifyApprovalEnvelope({ approval: copied, actor: a.actor, agentId: 'technical_manager', action: ACTIONS.MERGE_PR, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'UNTRUSTED_APPROVAL');
  assert.equal(b.kernel.runtime.verifyApprovalEnvelope({ approval: issued, actor: b.actor, agentId: 'technical_manager', action: ACTIONS.MERGE_PR, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'UNTRUSTED_APPROVAL');

  const result = a.kernel.runtime.evaluateSovereignRequest({
    ...a.base,
    action: ACTIONS.MERGE_PR,
    payload,
    approval: copied,
    now: '2026-08-13T03:05:00.000Z',
  });
  assert.equal(result.reasonCode, 'UNTRUSTED_APPROVAL');
});

test('approval rejects changed payload, wrong owner, scope mismatch and expiry', () => {
  const { kernel, actor } = createContext({ agentId: 'financial_analytics_manager' });
  const payload = { price: 10, currency: 'JOD' };
  const approval = kernel.authority.issueApproval({
    approvalId: 'apr_scope_001', actor, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES,
    payload, createdAt: '2026-08-13T03:00:00.000Z', expiresAt: '2026-08-13T03:10:00.000Z',
  });

  assert.equal(kernel.runtime.verifyApprovalEnvelope({ approval, actor, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload: { price: 11, currency: 'JOD' }, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'PAYLOAD_DIGEST_MISMATCH');
  assert.equal(kernel.runtime.verifyApprovalEnvelope({ approval, actor, agentId: 'technical_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'APPROVAL_SCOPE_MISMATCH');

  const otherOwner = kernel.authority.issueActor({ id: 'owner_999', role: 'OWNER' });
  assert.equal(kernel.runtime.verifyApprovalEnvelope({ approval, actor: otherOwner, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:05:00.000Z' }).reasonCode, 'OWNER_ID_MISMATCH');
  assert.equal(kernel.runtime.verifyApprovalEnvelope({ approval, actor, agentId: 'financial_analytics_manager', action: ACTIONS.CHANGE_PRICES, payload, now: '2026-08-13T03:11:00.000Z' }).reasonCode, 'APPROVAL_EXPIRED');
});

test('trusted budget and rate state plus tool gates fail closed', () => {
  assert.equal(applyBudgetGate({ spent: 9, requested: 1, limit: 10 }).ok, true);
  assert.equal(applyBudgetGate({ spent: 9.5, requested: 1, limit: 10 }).reasonCode, 'BUDGET_EXCEEDED');
  assert.equal(applyRateGate({ used: 4, requested: 1, limit: 5 }).ok, true);
  assert.equal(applyRateGate({ used: 5, requested: 1, limit: 5 }).reasonCode, 'RATE_LIMIT_EXCEEDED');

  const overBudget = createContext({ budget: { spent: 9.5, requested: 1, limit: 10 } });
  assert.equal(overBudget.kernel.runtime.evaluateSovereignRequest({ ...overBudget.base, action: ACTIONS.RUN_TESTS, payload: {} }).reasonCode, 'BUDGET_EXCEEDED');

  const unknownTool = createContext();
  assert.equal(unknownTool.kernel.runtime.evaluateSovereignRequest({ ...unknownTool.base, action: ACTIONS.RUN_TESTS, payload: {}, tool: { id: 'shell:anything' } }).reasonCode, 'UNKNOWN_TOOL');
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
