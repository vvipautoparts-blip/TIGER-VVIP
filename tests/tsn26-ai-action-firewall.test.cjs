'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/ai-action-policy.v1.json');
const { authorizeAgentAction } = require('../scripts/tsn26/ai/agent-action-firewall.cjs');

const NOW = new Date('2026-08-26T05:40:00.000Z');
const agent = { id: 'agent-reporting-1', capabilities: ['AI_READ', 'AI_RECOMMEND', 'AI_LOW_RISK_ACTION'] };

function verifier(capsule) {
  return capsule.intent_id === 'intent-1' && capsule.verification_ref === 'proof://intent/1';
}

test('AI can read and recommend but never owns financial or root authority', () => {
  const read = authorizeAgentAction({ agent, action_class: 'READ', action: 'READ_REPORT', resource_ref: 'report://owner/health', evidence_refs: ['proof://policy/read'], now: NOW }, { policy });
  assert.equal(read.decision, 'ALLOW');
  assert.equal(read.money_authority, false);
  assert.equal(read.root_authority, false);

  const recommend = authorizeAgentAction({ agent, action_class: 'RECOMMEND', action: 'RECOMMEND_RISK_REVIEW', resource_ref: 'risk://country/XY', evidence_refs: ['proof://risk/1'], now: NOW }, { policy });
  assert.equal(recommend.decision, 'ALLOW');
  assert.equal(recommend.execution_authority, 'ADVISORY_ONLY');

  for (const actionClass of ['FINANCIAL_ACTION', 'ROOT_ACTION']) {
    const denied = authorizeAgentAction({ agent: { ...agent, capabilities: [...agent.capabilities, 'FINANCIAL_EXECUTE', 'ROOT_EXECUTE'] }, action_class: actionClass, action: 'ATTEMPT_PRIVILEGED_ACTION', resource_ref: 'tiger://protected', evidence_refs: ['proof://attempt/1'], now: NOW }, { policy });
    assert.equal(denied.decision, 'DENY');
    assert.equal(denied.money_authority, false);
    assert.equal(denied.root_authority, false);
  }
});

test('low-risk action requires bounded verified intent and cannot escape action/resource scope', () => {
  const capsule = {
    intent_id: 'intent-1',
    subject_ref: 'user://123',
    issued_at: '2026-08-26T05:35:00.000Z',
    expires_at: '2026-08-26T05:45:00.000Z',
    allowed_actions: ['QUEUE_NON_FINANCIAL_NOTIFICATION'],
    allowed_resources: ['notification://user/123'],
    verification_ref: 'proof://intent/1',
  };
  const allowed = authorizeAgentAction({
    agent,
    action_class: 'LOW_RISK_ACTION',
    action: 'QUEUE_NON_FINANCIAL_NOTIFICATION',
    resource_ref: 'notification://user/123',
    intent_capsule: capsule,
    evidence_refs: ['proof://intent/1'],
    now: NOW,
  }, { policy, verifyIntent: verifier });
  assert.equal(allowed.decision, 'ALLOW');
  assert.equal(allowed.execution_authority, 'BOUNDED_LOW_RISK');
  assert.match(allowed.intent_digest, /^sha256:[0-9a-f]{64}$/);

  const escaped = authorizeAgentAction({
    agent,
    action_class: 'LOW_RISK_ACTION',
    action: 'QUEUE_NON_FINANCIAL_NOTIFICATION',
    resource_ref: 'notification://user/999',
    intent_capsule: capsule,
    evidence_refs: ['proof://intent/1'],
    now: NOW,
  }, { policy, verifyIntent: verifier });
  assert.equal(escaped.decision, 'DENY');
  assert.ok(escaped.reasons.includes('INTENT_RESOURCE_SCOPE_DENIED'));
});

test('expired, unverifiable, or credential-bearing intent is denied fail closed', () => {
  const base = {
    intent_id: 'intent-1', subject_ref: 'user://123', issued_at: '2026-08-26T05:35:00.000Z', expires_at: '2026-08-26T05:45:00.000Z',
    allowed_actions: ['QUEUE_NON_FINANCIAL_NOTIFICATION'], allowed_resources: ['notification://user/123'], verification_ref: 'proof://intent/1',
  };
  const input = { agent, action_class: 'LOW_RISK_ACTION', action: 'QUEUE_NON_FINANCIAL_NOTIFICATION', resource_ref: 'notification://user/123', evidence_refs: ['proof://intent/1'], now: NOW };

  assert.equal(authorizeAgentAction({ ...input, intent_capsule: { ...base, expires_at: '2026-08-26T05:39:00.000Z' } }, { policy, verifyIntent: verifier }).decision, 'DENY');
  assert.equal(authorizeAgentAction({ ...input, intent_capsule: base }, { policy, verifyIntent: () => false }).decision, 'DENY');
  const secretIntent = { ...base, metadata: { access_token: 'secret-value' } };
  const denied = authorizeAgentAction({ ...input, intent_capsule: secretIntent }, { policy, verifyIntent: verifier });
  assert.equal(denied.decision, 'DENY');
  assert.ok(denied.reasons.includes('CREDENTIAL_MATERIAL_FORBIDDEN'));
});
