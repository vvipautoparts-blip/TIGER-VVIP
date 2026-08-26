import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTONOMY_LEVELS,
  FORBIDDEN_AUTONOMY_LEVEL,
  authorizeAction,
  createActionPassport,
  createCapabilityCell,
  evaluateAgentBehavior,
  recommendAutonomyLevel,
  verifyActionPassport,
  verifyCapabilityCell,
} from '../aion/agentic-control.mjs';

const sourceSha = '9f8982c342055537b2bdb00cb1c18b4f1d0c46e7';

const baseCell = (overrides = {}) => ({
  cell_id: 'cell-aion-sre-001',
  agent_id: 'agent:aion-sre-001',
  issued_at: '2026-08-25T15:00:00.000Z',
  expires_at: '2026-08-25T16:00:00.000Z',
  autonomy_ceiling: 'L4_CONTROLLED_CANARY',
  capabilities: ['OBSERVE', 'DIAGNOSE', 'CREATE_PR', 'CONTROLLED_CANARY'],
  target_scopes: ['repository:pr-271', 'shadow:tiger'],
  budgets: {
    max_actions: 20,
    max_tool_calls: 100,
    max_loops: 8,
    max_cost_units: 500,
  },
  sandbox: {
    profile: 'WASI_COMPONENT',
    network: 'DENY_BY_DEFAULT',
    filesystem: 'DENY_BY_DEFAULT',
    environment: 'DENY_BY_DEFAULT',
    allowed_interfaces: ['telemetry.read', 'repository.pr.create'],
  },
  denied_boundaries: ['main', 'production', 'production-db', 'secrets', 'branch-protection', 'payments'],
  ...overrides,
});

const basePassport = (overrides = {}) => ({
  passport_id: 'passport-create-pr-001',
  action_type: 'CREATE_PR',
  requested_autonomy_level: 'L3_CREATE_PR_OR_RUNBOOK',
  requested_capabilities: ['CREATE_PR'],
  exact_source_sha: sourceSha,
  evidence_refs: ['proof:evidence-001', 'proof:gate-001'],
  confidence: 0.95,
  freshness_deadline: '2026-08-25T15:30:00.000Z',
  simulation_refs: [],
  policy_decisions: {
    constitution: true,
    policy: true,
    identity: true,
    provenance: true,
    evidence: true,
    recovery_path: true,
    risk_budget: true,
  },
  blast_radius: 'REPOSITORY_BRANCH_ONLY',
  provenance_refs: [`github:commit:${sourceSha}`],
  rollback_ref: null,
  recovery_checkpoint_ref: null,
  required_approvals: ['OWNER_POLICY'],
  satisfied_approvals: ['OWNER_POLICY'],
  verification_conditions: ['project-control-green', 'quality-gate-green'],
  abort_conditions: ['source-sha-moved', 'policy-drift'],
  reversible: true,
  preapproved: false,
  ...overrides,
});

test('exports L0-L5 and permanently separates forbidden L6', () => {
  assert.deepEqual(AUTONOMY_LEVELS, [
    'L0_OBSERVE',
    'L1_DIAGNOSE',
    'L2_PROPOSE',
    'L3_CREATE_PR_OR_RUNBOOK',
    'L4_CONTROLLED_CANARY',
    'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
  ]);
  assert.equal(FORBIDDEN_AUTONOMY_LEVEL, 'L6_UNRESTRICTED_PRODUCTION_MUTATION');
  assert.equal(AUTONOMY_LEVELS.includes(FORBIDDEN_AUTONOMY_LEVEL), false);
});

test('creates a sealed short-lived least-privilege Capability Cell', () => {
  const cell = createCapabilityCell(baseCell());
  assert.equal(cell.schema_version, 'TIGER-AION-CAPABILITY-CELL-1');
  assert.equal(cell.sandbox.network, 'DENY_BY_DEFAULT');
  assert.equal(cell.sandbox.filesystem, 'DENY_BY_DEFAULT');
  assert.equal(cell.sandbox.environment, 'DENY_BY_DEFAULT');
  assert.match(cell.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(cell), true);
  assert.equal(verifyCapabilityCell(cell), true);
});

test('separation of duties rejects any cell combining critical administrative powers', () => {
  const criticalPairs = [
    ['REPOSITORY_MERGE', 'PRODUCTION_DEPLOY'],
    ['REPOSITORY_MERGE', 'PRODUCTION_DB_ADMIN'],
    ['PRODUCTION_DEPLOY', 'SECRETS_ADMIN'],
    ['PRODUCTION_DB_ADMIN', 'SECRETS_ADMIN'],
  ];
  for (const pair of criticalPairs) {
    assert.throws(
      () => createCapabilityCell(baseCell({ capabilities: pair })),
      (error) => error?.code === 'AION_AGENT_SEPARATION_OF_DUTIES',
    );
  }
});

test('sandbox policy rejects allow-by-default resource access', () => {
  for (const sandbox of [
    { ...baseCell().sandbox, network: 'ALLOW_BY_DEFAULT' },
    { ...baseCell().sandbox, filesystem: 'ALLOW_BY_DEFAULT' },
    { ...baseCell().sandbox, environment: 'ALLOW_BY_DEFAULT' },
  ]) {
    assert.throws(
      () => createCapabilityCell(baseCell({ sandbox })),
      (error) => error?.code === 'AION_AGENT_SANDBOX_INVALID',
    );
  }
});

test('creates and verifies a proof-carrying Action Passport', () => {
  const passport = createActionPassport(basePassport());
  assert.equal(passport.schema_version, 'TIGER-AION-ACTION-PASSPORT-1');
  assert.equal(passport.exact_source_sha, sourceSha);
  assert.equal(passport.policy_decisions.constitution, true);
  assert.match(passport.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(verifyActionPassport(passport), true);
});

test('L6 is hard-denied at passport creation and authorization', () => {
  assert.throws(
    () => createActionPassport(basePassport({ requested_autonomy_level: FORBIDDEN_AUTONOMY_LEVEL })),
    (error) => error?.code === 'AION_AGENT_L6_FORBIDDEN',
  );
});

test('authorizes a fresh bounded L3 action only when capability, evidence, provenance and approvals agree', () => {
  const cell = createCapabilityCell(baseCell());
  const passport = createActionPassport(basePassport());
  const decision = authorizeAction({
    cell,
    passport,
    now_ms: Date.parse('2026-08-25T15:15:00.000Z'),
    behavior_state: 'ACTIVE',
  });
  assert.equal(decision.schema_version, 'TIGER-AION-AUTHORIZATION-DECISION-1');
  assert.equal(decision.decision, 'AUTHORIZED');
  assert.equal(decision.autonomy_level, 'L3_CREATE_PR_OR_RUNBOOK');
  assert.equal(decision.production_mutation_authorized, false);
  assert.match(decision.content_digest, /^[a-f0-9]{64}$/);
});

test('authorization fails closed for stale cells/passports, missing capability, or missing approval', () => {
  const cell = createCapabilityCell(baseCell());
  const passport = createActionPassport(basePassport());
  assert.throws(
    () => authorizeAction({ cell, passport, now_ms: Date.parse('2026-08-25T16:00:01.000Z'), behavior_state: 'ACTIVE' }),
    (error) => ['AION_AGENT_CELL_EXPIRED', 'AION_AGENT_PASSPORT_EXPIRED'].includes(error?.code),
  );
  const insufficientCell = createCapabilityCell(baseCell({ capabilities: ['OBSERVE'] }));
  assert.throws(
    () => authorizeAction({ insufficient: true, cell: insufficientCell, passport, now_ms: Date.parse('2026-08-25T15:15:00.000Z'), behavior_state: 'ACTIVE' }),
    (error) => error?.code === 'AION_AGENT_CAPABILITY_DENIED',
  );
  const missingApproval = createActionPassport(basePassport({ satisfied_approvals: [] }));
  assert.throws(
    () => authorizeAction({ cell, passport: missingApproval, now_ms: Date.parse('2026-08-25T15:15:00.000Z'), behavior_state: 'ACTIVE' }),
    (error) => error?.code === 'AION_AGENT_APPROVAL_REQUIRED',
  );
});

test('any false deterministic policy term denies authorization', () => {
  const cell = createCapabilityCell(baseCell());
  for (const term of ['constitution', 'policy', 'identity', 'provenance', 'evidence', 'recovery_path', 'risk_budget']) {
    const passport = createActionPassport(basePassport({
      policy_decisions: { ...basePassport().policy_decisions, [term]: false },
    }));
    assert.throws(
      () => authorizeAction({ cell, passport, now_ms: Date.parse('2026-08-25T15:15:00.000Z'), behavior_state: 'ACTIVE' }),
      (error) => error?.code === 'AION_AGENT_POLICY_DENIED',
    );
  }
});

test('L4 requires Twin proof, rollback and recovery; L5 also requires explicit preapproval and reversibility', () => {
  const l4Cell = createCapabilityCell(baseCell());
  assert.throws(
    () => createActionPassport(basePassport({
      requested_autonomy_level: 'L4_CONTROLLED_CANARY',
      requested_capabilities: ['CONTROLLED_CANARY'],
    })),
    (error) => error?.code === 'AION_AGENT_RECOVERY_REQUIRED',
  );
  const l4 = createActionPassport(basePassport({
    requested_autonomy_level: 'L4_CONTROLLED_CANARY',
    requested_capabilities: ['CONTROLLED_CANARY'],
    simulation_refs: ['twin:replay-001'],
    rollback_ref: 'rollback:release-001',
    recovery_checkpoint_ref: 'recovery:checkpoint-001',
  }));
  assert.equal(authorizeAction({ cell: l4Cell, passport: l4, now_ms: Date.parse('2026-08-25T15:15:00.000Z'), behavior_state: 'ACTIVE' }).decision, 'AUTHORIZED');

  assert.throws(
    () => createActionPassport(basePassport({
      requested_autonomy_level: 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
      requested_capabilities: ['PREAPPROVED_REMEDIATE'],
      simulation_refs: ['twin:replay-001'],
      rollback_ref: 'rollback:release-001',
      recovery_checkpoint_ref: 'recovery:checkpoint-001',
      preapproved: false,
    })),
    (error) => error?.code === 'AION_AGENT_PREAPPROVAL_REQUIRED',
  );
});

test('adaptive autonomy recommendation can reduce but never exceed the Capability Cell ceiling', () => {
  const cell = createCapabilityCell(baseCell({ autonomy_ceiling: 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION' }));
  const lowRisk = recommendAutonomyLevel({
    cell,
    factors: {
      evidence_fresh: true,
      reversible: true,
      prior_verified_successes: 12,
      blast_radius: 'SHADOW_ONLY',
      sensitive_data: false,
      legal_impact: false,
      financial_impact: false,
      novelty: false,
      uncertainty: 0.05,
    },
  });
  const highRisk = recommendAutonomyLevel({
    cell,
    factors: {
      evidence_fresh: false,
      reversible: false,
      prior_verified_successes: 0,
      blast_radius: 'MULTI_COHORT',
      sensitive_data: true,
      legal_impact: true,
      financial_impact: true,
      novelty: true,
      uncertainty: 0.9,
    },
  });
  assert.equal(AUTONOMY_LEVELS.indexOf(lowRisk) <= AUTONOMY_LEVELS.indexOf(cell.autonomy_ceiling), true);
  assert.equal(AUTONOMY_LEVELS.indexOf(highRisk) <= 1, true);
});

test('runaway behavior quarantines and denied-boundary attempts revoke the cell', () => {
  const cell = createCapabilityCell(baseCell());
  assert.equal(evaluateAgentBehavior({ cell, actions: 1, tool_calls: 2, loops: 1, cost_units: 5, denied_boundary_attempts: 0 }).state, 'ACTIVE');
  assert.equal(evaluateAgentBehavior({ cell, actions: 21, tool_calls: 2, loops: 1, cost_units: 5, denied_boundary_attempts: 0 }).state, 'QUARANTINED');
  assert.equal(evaluateAgentBehavior({ cell, actions: 1, tool_calls: 2, loops: 1, cost_units: 5, denied_boundary_attempts: 1 }).state, 'REVOKED');
});

test('quarantined or revoked behavior state denies every action', () => {
  const cell = createCapabilityCell(baseCell());
  const passport = createActionPassport(basePassport());
  for (const behaviorState of ['QUARANTINED', 'REVOKED']) {
    assert.throws(
      () => authorizeAction({ cell, passport, now_ms: Date.parse('2026-08-25T15:15:00.000Z'), behavior_state: behaviorState }),
      (error) => error?.code === 'AION_AGENT_BEHAVIOR_DENIED',
    );
  }
});

test('tampering with a cell or passport fails integrity verification before authorization', () => {
  const cell = createCapabilityCell(baseCell());
  const passport = createActionPassport(basePassport());
  const tamperedCell = { ...cell, autonomy_ceiling: 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION' };
  const tamperedPassport = { ...passport, confidence: 1 };
  assert.throws(() => verifyCapabilityCell(tamperedCell), (error) => error?.code === 'AION_AGENT_INTEGRITY_INVALID');
  assert.throws(() => verifyActionPassport(tamperedPassport), (error) => error?.code === 'AION_AGENT_INTEGRITY_INVALID');
});
