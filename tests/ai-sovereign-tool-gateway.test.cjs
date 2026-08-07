'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TOOL_IDS,
  TOOL_REGISTRY,
  validateToolRequest,
  evaluateToolRequest,
  createTrustedApprovalReceipt,
  executeRegisteredTool,
} = require('../scripts/ai/sovereign-tool-registry.js');

const owner = Object.freeze({ id: 'owner_001', role: 'OWNER', authenticated: true });

test('registry contains only explicit bounded platform tools and no permanent-denial executor', () => {
  assert.deepEqual([...TOOL_IDS].sort(), [
    'engineering.create_pr',
    'engineering.deploy_production',
    'engineering.merge_pr',
    'engineering.run_tests',
    'finance.change_prices',
    'finance.read_metrics',
    'platform.read_analytics',
    'user.assist_writing',
  ]);
  for (const forbidden of ['shell', 'delete_data', 'transfer_funds', 'change_owner_permissions']) {
    assert.equal(TOOL_IDS.some((id) => id.includes(forbidden)), false);
  }
});

test('all definitions are immutable and declare agent scope, level, mutability, timeout and idempotency', () => {
  for (const definition of Object.values(TOOL_REGISTRY)) {
    assert.equal(Object.isFrozen(definition), true);
    assert.ok(['L1', 'L2', 'L3', 'L4'].includes(definition.level));
    assert.ok(Array.isArray(definition.allowedAgents));
    assert.ok(definition.allowedAgents.length > 0);
    assert.equal(typeof definition.mutating, 'boolean');
    assert.equal(typeof definition.timeoutMs, 'number');
    assert.equal(typeof definition.requiresIdempotency, 'boolean');
    assert.equal(typeof definition.requiresOwnerApproval, 'boolean');
    if (definition.level === 'L4') assert.equal(definition.requiresOwnerApproval, true);
    if (definition.mutating) assert.equal(definition.requiresIdempotency, true);
  }
});

test('client cannot invent tools, override definitions, inject authority fields or use prototype-polluting keys', () => {
  const base = {
    toolId: 'engineering.run_tests',
    agentId: 'technical_manager',
    arguments: { suite: 'quality-gate' },
    correlationId: 'corr-tool-0001',
  };

  assert.equal(validateToolRequest({ ...base, toolId: 'shell:anything' }).reasonCode, 'UNKNOWN_TOOL');
  for (const injected of [
    { level: 'L1' },
    { mutating: false },
    { requiresOwnerApproval: false },
    { ownerApproved: true },
    { executor: 'shell' },
  ]) {
    assert.equal(validateToolRequest({ ...base, ...injected }).reasonCode, 'UNKNOWN_FIELD');
  }

  const polluted = JSON.parse('{"toolId":"engineering.run_tests","agentId":"technical_manager","arguments":{"__proto__":{"admin":true},"suite":"quality-gate"},"correlationId":"corr-tool-0002"}');
  assert.equal(validateToolRequest(polluted).reasonCode, 'ARGUMENT_KEY_DENIED');
});

test('tool argument schemas are exact and reject unknown, oversized or wrong-type values', () => {
  const valid = validateToolRequest({
    toolId: 'engineering.create_pr',
    agentId: 'technical_manager',
    arguments: { branch: 'feat/safe-change', title: 'Safe change', body: 'Reviewed change', base: 'main' },
    correlationId: 'corr-tool-0003',
    idempotencyKey: 'idem-create-pr-0003',
  });
  assert.equal(valid.ok, true);

  assert.equal(validateToolRequest({
    toolId: 'engineering.create_pr',
    agentId: 'technical_manager',
    arguments: { branch: 'feat/x', title: 'x', body: 'x', base: 'main', force: true },
    correlationId: 'corr-tool-0004', idempotencyKey: 'idem-create-pr-0004',
  }).reasonCode, 'ARGUMENT_UNKNOWN_FIELD');

  assert.equal(validateToolRequest({
    toolId: 'engineering.run_tests', agentId: 'technical_manager',
    arguments: { suite: 'x'.repeat(257) }, correlationId: 'corr-tool-0005',
  }).reasonCode, 'ARGUMENT_INVALID');
});

test('agent scope and runtime kill switch fail closed before execution', () => {
  const wrongAgent = evaluateToolRequest({
    request: { toolId: 'engineering.run_tests', agentId: 'user_assistant', arguments: { suite: 'quality-gate' }, correlationId: 'corr-tool-0006' },
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L3' },
  });
  assert.equal(wrongAgent.reasonCode, 'TOOL_AGENT_SCOPE_DENIED');

  const killed = evaluateToolRequest({
    request: { toolId: 'engineering.run_tests', agentId: 'technical_manager', arguments: { suite: 'quality-gate' }, correlationId: 'corr-tool-0007' },
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: true, maxLevel: 'L3' },
  });
  assert.equal(killed.reasonCode, 'KILL_SWITCH_ACTIVE');
});

test('mutating tools require bounded idempotency and L4 tools require a trusted exact receipt', () => {
  assert.equal(validateToolRequest({
    toolId: 'engineering.create_pr', agentId: 'technical_manager',
    arguments: { branch: 'feat/x', title: 'x', body: 'x', base: 'main' }, correlationId: 'corr-tool-0008',
  }).reasonCode, 'IDEMPOTENCY_REQUIRED');

  const request = {
    toolId: 'engineering.merge_pr',
    agentId: 'technical_manager',
    arguments: { prNumber: 143, expectedHeadSha: 'abcdef123456' },
    correlationId: 'corr-tool-0009',
    idempotencyKey: 'idem-merge-0009',
  };
  const pending = evaluateToolRequest({ request, actor: owner, featureEnabled: true, runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' } });
  assert.equal(pending.reasonCode, 'OWNER_APPROVAL_REQUIRED');

  const receipt = createTrustedApprovalReceipt({ ownerId: owner.id, request, approvalId: 'apr-db-0009' });
  const allowed = evaluateToolRequest({ request, actor: owner, featureEnabled: true, runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' }, approvalReceipt: receipt });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.reasonCode, 'TOOL_AUTHORIZED');

  const copied = JSON.parse(JSON.stringify(receipt));
  assert.equal(evaluateToolRequest({ request, actor: owner, featureEnabled: true, runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' }, approvalReceipt: copied }).reasonCode, 'UNTRUSTED_APPROVAL_RECEIPT');
});

test('executor is server-registered, receives sanitized request only, and missing executor fails closed', async () => {
  const request = {
    toolId: 'engineering.run_tests', agentId: 'technical_manager',
    arguments: { suite: 'quality-gate' }, correlationId: 'corr-tool-0010',
  };
  let received;
  const output = await executeRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L3' },
    executors: {
      'engineering.run_tests': async (safeRequest) => {
        received = safeRequest;
        return { status: 'PASS', testCount: 1 };
      },
    },
  });
  assert.equal(output.ok, true);
  assert.equal(received.toolId, 'engineering.run_tests');
  assert.deepEqual(received.arguments, { suite: 'quality-gate' });

  const missing = await executeRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L3' },
    executors: {},
  });
  assert.equal(missing.reasonCode, 'EXECUTOR_NOT_REGISTERED');
});
