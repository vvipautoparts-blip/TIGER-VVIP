'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/decision-policy.v1.json');
const { evaluatePolicy } = require('../scripts/tsn26/policy/policy-engine.cjs');

const NOW = new Date('2026-08-26T05:20:00.000Z');

function decide(overrides = {}) {
  return evaluatePolicy({
    subject: { id: 'subject-1', type: 'HUMAN', capabilities: [] },
    action: 'ROOT_ACTION',
    resource: { type: 'TSN26_SYSTEM', id: 'root' },
    context: {},
    evidenceRefs: [],
    now: NOW,
    ...overrides,
  }, policy);
}

test('unknown action and missing evidence fail closed', () => {
  assert.equal(decide({ action: 'UNKNOWN_ACTION' }).decision, 'DENY');
  const noEvidence = decide({
    subject: { id: 'owner', type: 'HUMAN', capabilities: ['ROOT_EXECUTE'] },
    context: { quorum_verified: true },
  });
  assert.equal(noEvidence.decision, 'DENY');
  assert.ok(noEvidence.reasons.includes('EVIDENCE_REQUIRED'));
});

test('AI agent cannot receive financial or root authority even when capabilities are claimed', () => {
  for (const action of ['FINANCIAL_ACTION', 'ROOT_ACTION', 'PAYOUT', 'CONSTITUTION_ACTIVATE', 'KEY_ROTATE']) {
    const result = decide({
      action,
      subject: { id: 'agent-7', type: 'AI_AGENT', capabilities: ['FINANCIAL_EXECUTE', 'ROOT_EXECUTE', 'PAYOUT_EXECUTE', 'CONSTITUTION_ACTIVATE', 'KEY_ROTATE'] },
      context: {
        financial_invariants_green: true,
        quorum_verified: true,
        payout_authorization_verified: true,
        treasury_reconciliation_green: true,
        constitution_signature_verified: true,
        quality_gate_green: true,
        financial_db_rehearsal_green: true,
        rotation_plan_verified: true,
      },
      evidenceRefs: ['proof://test/1'],
    });
    assert.equal(result.decision, 'DENY');
    assert.ok(result.reasons.includes('SUBJECT_TYPE_FORBIDDEN'));
  }
});

test('payout is allowed only with capability, authorization proof and green treasury reconciliation', () => {
  const denied = decide({
    action: 'PAYOUT',
    subject: { id: 'settlement-service', type: 'DETERMINISTIC_SERVICE', capabilities: ['PAYOUT_EXECUTE'] },
    context: { payout_authorization_verified: true, treasury_reconciliation_green: false },
    evidenceRefs: ['proof://payout/auth-1'],
  });
  assert.equal(denied.decision, 'DENY');
  assert.ok(denied.reasons.includes('CONTEXT_REQUIRED:treasury_reconciliation_green'));

  const allowed = decide({
    action: 'PAYOUT',
    subject: { id: 'settlement-service', type: 'DETERMINISTIC_SERVICE', capabilities: ['PAYOUT_EXECUTE'] },
    context: { payout_authorization_verified: true, treasury_reconciliation_green: true },
    evidenceRefs: ['proof://payout/auth-1', 'proof://treasury/recon-1'],
  });
  assert.equal(allowed.decision, 'ALLOW');
  assert.deepEqual(allowed.obligations, ['APPEND_AUDIT_EVENT', 'PRESERVE_EVIDENCE', 'EMIT_BUSINESS_TRACE']);
  assert.match(allowed.context_digest, /^sha256:[0-9a-f]{64}$/);
});

test('constitution activation requires verified signatures plus exact-head quality and financial DB proof', () => {
  const allowed = decide({
    action: 'CONSTITUTION_ACTIVATE',
    subject: { id: 'owner', type: 'HUMAN', capabilities: ['CONSTITUTION_ACTIVATE'] },
    context: {
      constitution_signature_verified: true,
      quality_gate_green: true,
      financial_db_rehearsal_green: true,
    },
    evidenceRefs: ['proof://constitution/quorum', 'proof://ci/quality', 'proof://db/financial'],
  });
  assert.equal(allowed.decision, 'ALLOW');

  const missingDbProof = decide({
    action: 'CONSTITUTION_ACTIVATE',
    subject: { id: 'owner', type: 'HUMAN', capabilities: ['CONSTITUTION_ACTIVATE'] },
    context: { constitution_signature_verified: true, quality_gate_green: true, financial_db_rehearsal_green: false },
    evidenceRefs: ['proof://constitution/quorum', 'proof://ci/quality'],
  });
  assert.equal(missingDbProof.decision, 'DENY');
});

test('country go-live requires all five sovereign gates', () => {
  const base = {
    action: 'COUNTRY_GO_LIVE',
    subject: { id: 'country-controller', type: 'HUMAN', capabilities: ['COUNTRY_ACTIVATE'] },
    context: { legal_gate: true, financial_gate: true, security_gate: true, payment_gate: true, privacy_gate: true },
    evidenceRefs: ['proof://country/JO/2026-08'],
  };
  assert.equal(decide(base).decision, 'ALLOW');
  assert.equal(decide({ ...base, context: { ...base.context, privacy_gate: false } }).decision, 'DENY');
});
