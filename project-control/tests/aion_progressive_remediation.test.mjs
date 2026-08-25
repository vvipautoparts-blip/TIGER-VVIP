import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizeAction, createActionPassport, createCapabilityCell } from '../aion/agentic-control.mjs';
import {
  DELIVERY_STAGES,
  createProgressiveRemediationRollout,
  createStageObservation,
  evaluateRemediationStage,
  nextDeliveryStage,
  verifyProgressiveRemediationRollout,
} from '../aion/progressive-remediation.mjs';

const sourceSha = '3fa7f70c620aa88ff4a8dbca7d6f133db7f95606';
const baseline = { error_rate: 0.01, p95_ms: 250, p99_ms: 600, db_saturation: 0.50, security_findings: 0, business_kpi: 100, user_harm_rate: 0.005, cost_rate: 100 };
const guardrails = { max_error_rate: 0.02, max_p95_ms: 500, max_p99_ms: 1000, max_db_saturation: 0.80, max_security_findings: 0, min_business_kpi: 95, max_user_harm_rate: 0.01, max_cost_rate: 110 };
const safeMetrics = () => ({ error_rate: 0.012, p95_ms: 270, p99_ms: 650, db_saturation: 0.55, security_findings: 0, business_kpi: 99, user_harm_rate: 0.006, cost_rate: 102 });

function a5(level = 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION') {
  const capability = level === 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION' ? 'PREAPPROVED_REMEDIATE' : 'CONTROLLED_CANARY';
  const cell = createCapabilityCell({
    cell_id: `cell-a8-${level}`,
    agent_id: 'agent:a8-controller',
    issued_at: '2026-08-25T15:20:00.000Z',
    expires_at: '2026-08-25T17:20:00.000Z',
    autonomy_ceiling: level,
    capabilities: [capability],
    target_scopes: ['shadow:tiger', 'canary:tiger', 'cohort:tiger'],
    budgets: { max_actions: 20, max_tool_calls: 80, max_loops: 8, max_cost_units: 400 },
    sandbox: { profile: 'WASI_COMPONENT', network: 'DENY_BY_DEFAULT', filesystem: 'DENY_BY_DEFAULT', environment: 'DENY_BY_DEFAULT', allowed_interfaces: ['proof.read', 'rollout.propose'] },
    denied_boundaries: ['main', 'production', 'production-db', 'secrets', 'branch-protection', 'payments'],
  });
  const passport = createActionPassport({
    passport_id: `passport-a8-${level}`,
    action_type: 'remediation:rate-limit-hardening',
    requested_autonomy_level: level,
    requested_capabilities: [capability],
    exact_source_sha: sourceSha,
    evidence_refs: ['proof:a8-baseline', 'proof:a8-recovery'],
    confidence: 0.97,
    freshness_deadline: '2026-08-25T16:30:00.000Z',
    simulation_refs: ['twin:a8-release', 'twin:a8-security'],
    policy_decisions: { constitution: true, policy: true, identity: true, provenance: true, evidence: true, recovery_path: true, risk_budget: true },
    blast_radius: 'BOUNDED_COHORT',
    provenance_refs: [`github:commit:${sourceSha}`],
    rollback_ref: 'rollback:a8-rate-limit',
    recovery_checkpoint_ref: 'recovery:a8-checkpoint',
    required_approvals: ['OWNER_POLICY', 'SECURITY_POLICY'],
    satisfied_approvals: ['OWNER_POLICY', 'SECURITY_POLICY'],
    verification_conditions: ['error-budget-green', 'security-green'],
    abort_conditions: ['error-budget-breach', 'security-regression'],
    reversible: true,
    preapproved: level === 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
  });
  return { passport, authorization: authorizeAction({ cell, passport, now_ms: Date.parse('2026-08-25T15:30:00.000Z'), behavior_state: 'ACTIVE' }) };
}

function rollout(level = 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION') {
  const { passport, authorization } = a5(level);
  return createProgressiveRemediationRollout({
    rollout_id: `rollout-a8-${level}`,
    created_at: '2026-08-25T15:31:00.000Z',
    passport,
    authorization,
    baseline,
    guardrails,
    rollback_verified: true,
    recovery_verified: true,
    preapproved: level === 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
    reversible: true,
    blast_radius: 'BOUNDED_COHORT',
  });
}

function observation(metrics = safeMetrics()) {
  return createStageObservation({ observation_id: 'obs-a8', stage: 'SHADOW', exact_source_sha: sourceSha, observed_at: '2026-08-25T15:40:00.000Z', evidence_refs: ['proof:a8-stage'], metrics });
}

test('locks the exact progressive sequence with no stage after FULL', () => {
  assert.deepEqual(DELIVERY_STAGES, ['SHADOW', 'CANARY', 'COHORT_1', 'COHORT_N', 'FULL']);
  assert.equal(nextDeliveryStage('SHADOW'), 'CANARY');
  assert.equal(nextDeliveryStage('CANARY'), 'COHORT_1');
  assert.equal(nextDeliveryStage('COHORT_1'), 'COHORT_N');
  assert.equal(nextDeliveryStage('COHORT_N'), 'FULL');
  assert.equal(nextDeliveryStage('FULL'), null);
});

test('seals an A5-bound rollout with all eight health dimensions and no execution authority', () => {
  const value = rollout();
  assert.equal(value.schema_version, 'TIGER-AION-PROGRESSIVE-ROLLOUT-1');
  assert.equal(value.current_stage, 'SHADOW');
  assert.equal(value.execution_performed, false);
  assert.equal(value.production_mutation_authorized, false);
  assert.equal(value.unrestricted_production_mutation, false);
  assert.match(value.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(verifyProgressiveRemediationRollout(value), true);
});

test('all guardrails passing yields only the legal next-stage promotion candidate', () => {
  const decision = evaluateRemediationStage({ rollout: rollout(), observation: observation(), requested_next_stage: 'CANARY', now_ms: Date.parse('2026-08-25T15:45:00.000Z') });
  assert.equal(decision.decision, 'PROMOTION_CANDIDATE');
  assert.equal(decision.next_stage, 'CANARY');
  assert.equal(decision.all_guardrails_pass, true);
  assert.equal(decision.execution_performed, false);
  assert.equal(decision.production_mutation_authorized, false);
  assert.equal(decision.baseline_comparison.business_kpi.delta, -1);
});

test('stage skipping and stale evidence fail closed', () => {
  const value = rollout();
  const obs = observation();
  assert.throws(() => evaluateRemediationStage({ rollout: value, observation: obs, requested_next_stage: 'COHORT_1', now_ms: Date.parse('2026-08-25T15:45:00.000Z') }), (error) => error?.code === 'AION_REMEDIATION_STAGE_INVALID');
  assert.throws(() => evaluateRemediationStage({ rollout: value, observation: obs, requested_next_stage: 'CANARY', now_ms: Date.parse('2026-08-25T16:30:01.000Z') }), (error) => error?.code === 'AION_REMEDIATION_EVIDENCE_STALE');
});

test('a failed guardrail yields rollback candidacy only for verified L5 preapproved reversible recovery', () => {
  const metrics = safeMetrics();
  metrics.security_findings = 1;
  const l5 = evaluateRemediationStage({ rollout: rollout(), observation: observation(metrics), requested_next_stage: 'CANARY', now_ms: Date.parse('2026-08-25T15:45:00.000Z') });
  assert.equal(l5.decision, 'ROLLBACK_CANDIDATE');
  assert.equal(l5.automatic_rollback_eligible, true);
  assert.equal(l5.execution_performed, false);

  const l4 = evaluateRemediationStage({ rollout: rollout('L4_CONTROLLED_CANARY'), observation: observation(metrics), requested_next_stage: 'CANARY', now_ms: Date.parse('2026-08-25T15:45:00.000Z') });
  assert.equal(l4.decision, 'HOLD_FOR_HUMAN');
  assert.equal(l4.automatic_rollback_eligible, false);
  assert.equal(l4.execution_performed, false);
});

test('missing metrics and tampering fail closed', () => {
  const { passport, authorization } = a5();
  const { cost_rate: ignored, ...missing } = baseline;
  assert.throws(() => createProgressiveRemediationRollout({ rollout_id: 'bad', created_at: '2026-08-25T15:31:00.000Z', passport, authorization, baseline: missing, guardrails, rollback_verified: true, recovery_verified: true, preapproved: true, reversible: true, blast_radius: 'BOUNDED_COHORT' }), (error) => error?.code === 'AION_REMEDIATION_METRICS_INVALID');
  const value = rollout();
  assert.throws(() => verifyProgressiveRemediationRollout({ ...value, blast_radius: 'CHANGED' }), (error) => error?.code === 'AION_REMEDIATION_INTEGRITY_INVALID');
});
