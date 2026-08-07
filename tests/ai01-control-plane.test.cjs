#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {
  ACTION_STATES,
  AGENTS,
  CAPABILITIES,
  RISK_LEVELS,
  createControlPlane
} = require('../scripts/ai/vvip-ai-control-plane.js');

function makePlane(overrides = {}) {
  let nextId = 0;
  let tick = 0;
  return createControlPlane({
    now: () => `2026-08-07T15:00:${String(tick++).padStart(2, '0')}Z`,
    idFactory: () => `req-${++nextId}`,
    ownerAuthorizer: (actor) => actor?.type === 'owner',
    gatewayAuthorizer: (actor) => actor?.type === 'gateway',
    ...overrides
  });
}

function baseInput(overrides = {}) {
  return {
    agentId: 'ai-technical-manager',
    capability: 'technical.change.propose',
    idempotencyKey: 'ai01-test-key-0001',
    payload: { summary: 'Review cache policy' },
    ...overrides
  };
}

test('registry contains the four approved AI roles and L0-L3 risk levels', () => {
  assert.deepEqual(Object.keys(AGENTS).sort(), [
    'ai-financial-analytics-manager',
    'ai-general-manager',
    'ai-technical-manager',
    'ai-user-assistant'
  ]);
  assert.deepEqual(Object.values(RISK_LEVELS), [
    'L0_READ',
    'L1_PROPOSE',
    'L2_REVERSIBLE_EXECUTION',
    'L3_OWNER_APPROVAL_REQUIRED'
  ]);
});

test('AI-01 defaults to dry-run with the execution kill switch enabled', () => {
  const state = makePlane().getRuntimeState();
  assert.equal(state.mode, 'AI01_DRY_RUN');
  assert.equal(state.executionEnabled, false);
  assert.equal(state.killSwitchEnabled, true);
});

test('unknown and cross-agent capabilities are denied by default', () => {
  const plane = makePlane();
  assert.throws(
    () => plane.submit(baseInput({ capability: 'does.not.exist' })),
    (error) => error.code === 'UNKNOWN_CAPABILITY'
  );
  assert.throws(
    () => plane.submit(baseInput({ agentId: 'ai-user-assistant', capability: 'production.change.request', idempotencyKey: 'ai01-cross-agent-1' })),
    (error) => error.code === 'CAPABILITY_NOT_ASSIGNED'
  );
});

test('caller cannot forge risk, state, approval, or request identity fields', () => {
  const plane = makePlane();
  for (const forged of [
    { risk: RISK_LEVELS.L0_READ },
    { state: ACTION_STATES.APPROVED },
    { approval: { actorType: 'owner' } },
    { id: 'forged' }
  ]) {
    assert.throws(
      () => plane.submit(baseInput({ ...forged, idempotencyKey: `ai01-forged-${Object.keys(forged)[0]}` })),
      (error) => error.code === 'REQUEST_TAMPERED'
    );
  }
});

test('L3 capability always requires verified owner approval', () => {
  const plane = makePlane();
  const request = plane.submit(baseInput({
    agentId: 'ai-general-manager',
    capability: 'role.change.request',
    idempotencyKey: 'ai01-owner-approval-1'
  }));
  assert.equal(request.risk, RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED);
  assert.equal(request.state, ACTION_STATES.APPROVAL_REQUIRED);
  assert.throws(
    () => plane.approve(request.id, { type: 'admin' }),
    (error) => error.code === 'OWNER_APPROVAL_REQUIRED'
  );
  assert.equal(plane.approve(request.id, { type: 'owner' }).state, ACTION_STATES.APPROVED);
});

test('idempotent retries return the original request', () => {
  const plane = makePlane();
  const first = plane.submit(baseInput());
  const second = plane.submit(baseInput());
  assert.equal(second.id, first.id);
  assert.equal(second.state, first.state);
});

test('reusing an idempotency key with different content is treated as tampering', () => {
  const plane = makePlane();
  plane.submit(baseInput());
  assert.throws(
    () => plane.submit(baseInput({ payload: { summary: 'Different action' } })),
    (error) => error.code === 'IDEMPOTENCY_TAMPER_DETECTED'
  );
});

test('audit trail is ordered and excludes action payloads', () => {
  const plane = makePlane();
  plane.submit(baseInput({ payload: { summary: 'No payload in audit', nested: { value: 7 } } }));
  const audit = plane.getAuditLog();
  assert.deepEqual(audit.map((event) => event.sequence), [1, 2, 3]);
  assert.deepEqual(audit.map((event) => event.state), [
    ACTION_STATES.PROPOSED,
    ACTION_STATES.POLICY_EVALUATED,
    ACTION_STATES.APPROVED
  ]);
  assert.equal(JSON.stringify(audit).includes('No payload in audit'), false);
  assert.equal(Object.hasOwn(audit[0], 'payload'), false);
});

test('secret-like material is rejected before it can enter request or audit storage', () => {
  const plane = makePlane();
  const leaked = 'sbp_1234567890SECRET';
  assert.throws(
    () => plane.submit(baseInput({ payload: { access_token: leaked } })),
    (error) => error.code === 'SENSITIVE_MATERIAL_REJECTED'
  );
  assert.equal(JSON.stringify(plane.getAuditLog()).includes(leaked), false);
});

test('kill switch blocks execution while read/propose actions remain usable', () => {
  const plane = makePlane({ executionEnabled: true });
  const proposal = plane.submit(baseInput());
  assert.equal(proposal.state, ACTION_STATES.APPROVED);

  const executable = plane.submit(baseInput({
    capability: 'reversible.operation.request',
    idempotencyKey: 'ai01-kill-switch-1'
  }));
  assert.equal(executable.state, ACTION_STATES.APPROVED);
  assert.throws(
    () => plane.startExecution(executable.id, { type: 'gateway' }),
    (error) => error.code === 'KILL_SWITCH_ACTIVE'
  );
});

test('failed reversible execution can be recorded and rolled back through trusted gateway only', () => {
  const plane = makePlane({ executionEnabled: true });
  plane.setKillSwitch(false, { type: 'owner' });
  const request = plane.submit(baseInput({
    capability: 'reversible.operation.request',
    idempotencyKey: 'ai01-rollback-1'
  }));
  assert.throws(
    () => plane.startExecution(request.id, { type: 'browser' }),
    (error) => error.code === 'TRUSTED_GATEWAY_REQUIRED'
  );
  assert.equal(plane.startExecution(request.id, { type: 'gateway' }).state, ACTION_STATES.EXECUTING);
  assert.equal(plane.markFailed(request.id, { type: 'gateway' }, 'SIMULATED_FAILURE').state, ACTION_STATES.FAILED);
  assert.equal(plane.markRolledBack(request.id, { type: 'gateway' }).state, ACTION_STATES.ROLLED_BACK);
});

test('non-reversible privileged capability cannot be rolled back by declaration', () => {
  assert.equal(CAPABILITIES['production.change.request'].reversible, false);
  assert.equal(CAPABILITIES['finance.disbursement.request'].reversible, false);
});

test('AI-01 design documents the complete persistence and deny-by-default contract', () => {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs/ai/VVIP_AI_CONTROL_PLANE.md'), 'utf8');
  for (const table of [
    'ai_agents',
    'ai_capabilities',
    'ai_agent_capabilities',
    'ai_action_requests',
    'ai_approvals',
    'ai_audit_log',
    'ai_policy_versions',
    'ai_runtime_controls'
  ]) {
    assert.ok(doc.includes(`\`${table}\``), `design must document ${table}`);
  }
  assert.match(doc, /deny-by-default/i);
  assert.match(doc, /SUPABASE_IMPACT=NONE_REMOTE/);
  assert.match(doc, /AI01_DRY_RUN/);
});
