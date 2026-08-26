import test from 'node:test';
import assert from 'node:assert/strict';

import {
  authorizeAction,
  createActionPassport,
  createCapabilityCell,
} from '../aion/agentic-control.mjs';

import {
  antibodyEvidenceRef,
  authorizeAntibodyReuse,
  createCyberRangeExercise,
  createDigitalAntibody,
  isAntibodyFresh,
  recordCyberRangeResult,
  verifyCyberRangeExercise,
  verifyDigitalAntibody,
} from '../aion/immune-memory.mjs';

const sourceSha = '161808c569012fe6e84282043eb361f07e6e0ae4';

const baseIncidentProof = (overrides = {}) => ({
  incident_id: 'incident-prod-001',
  status: 'CONFIRMED',
  fact_class: 'PRODUCTION_FACT',
  authoritative_source: true,
  causal_graph_ref: 'proof-graph:incident-prod-001',
  exact_source_sha: sourceSha,
  observed_at: '2026-08-25T15:05:00.000Z',
  evidence_refs: ['proof:incident-001', 'proof:causal-001'],
  ...overrides,
});

const baseAntibody = (overrides = {}) => ({
  antibody_id: 'antibody-db-pressure-001',
  version: 1,
  incident_proof: baseIncidentProof(),
  created_at: '2026-08-25T15:10:00.000Z',
  valid_until: '2026-08-25T16:10:00.000Z',
  indicators: ['signal:db-pressure', 'signal:latency-rise'],
  successful_defenses: ['defense:bounded-load-shed'],
  failed_defenses: ['defense:cache-only'],
  remediation_refs: ['remediation:reduce-db-load'],
  rollback_ref: 'rollback:remediation-db-load-001',
  confidence: 0.96,
  ...overrides,
});

const baseCell = (overrides = {}) => ({
  cell_id: 'cell-immune-001',
  agent_id: 'agent:immune-001',
  issued_at: '2026-08-25T15:00:00.000Z',
  expires_at: '2026-08-25T16:00:00.000Z',
  autonomy_ceiling: 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
  capabilities: ['PREAPPROVED_REMEDIATE'],
  target_scopes: ['shadow:tiger', 'canary:tiger'],
  budgets: {
    max_actions: 10,
    max_tool_calls: 40,
    max_loops: 4,
    max_cost_units: 200,
  },
  sandbox: {
    profile: 'WASI_COMPONENT',
    network: 'DENY_BY_DEFAULT',
    filesystem: 'DENY_BY_DEFAULT',
    environment: 'DENY_BY_DEFAULT',
    allowed_interfaces: ['proof.read', 'canary.request'],
  },
  denied_boundaries: ['main', 'production', 'production-db', 'secrets', 'branch-protection', 'payments'],
  ...overrides,
});

const basePassport = (antibody, overrides = {}) => ({
  passport_id: 'passport-antibody-remediation-001',
  action_type: 'remediation:reduce-db-load',
  requested_autonomy_level: 'L5_PREAPPROVED_REVERSIBLE_REMEDIATION',
  requested_capabilities: ['PREAPPROVED_REMEDIATE'],
  exact_source_sha: sourceSha,
  evidence_refs: [antibodyEvidenceRef(antibody), 'proof:gate-001'],
  confidence: 0.95,
  freshness_deadline: '2026-08-25T15:45:00.000Z',
  simulation_refs: ['range:exercise-001'],
  policy_decisions: {
    constitution: true,
    policy: true,
    identity: true,
    provenance: true,
    evidence: true,
    recovery_path: true,
    risk_budget: true,
  },
  blast_radius: 'SINGLE_CANARY',
  provenance_refs: [`github:commit:${sourceSha}`],
  rollback_ref: 'rollback:remediation-db-load-001',
  recovery_checkpoint_ref: 'recovery:checkpoint-immune-001',
  required_approvals: ['OWNER_POLICY', 'SECURITY_POLICY'],
  satisfied_approvals: ['OWNER_POLICY', 'SECURITY_POLICY'],
  verification_conditions: ['canary-health-green', 'security-signal-green'],
  abort_conditions: ['error-budget-breach', 'security-regression'],
  reversible: true,
  preapproved: true,
  ...overrides,
});

const baseRange = (overrides = {}) => ({
  range_id: 'range-red-blue-001',
  created_at: '2026-08-25T15:00:00.000Z',
  expires_at: '2026-08-25T16:00:00.000Z',
  execution_target: 'ISOLATED_CYBER_RANGE',
  data_mode: 'SYNTHETIC',
  production_credentials: false,
  production_write_capability: false,
  external_targets: false,
  scenario_refs: ['twin:security-001', 'twin:fraud-001'],
  targets: ['twin://security/api-gateway', 'range://lab/database'],
  red_capabilities: ['ATTACK_SIMULATION', 'FAULT_INJECTION_SIMULATION'],
  blue_capabilities: ['DETECT', 'CONTAIN', 'RECOVER', 'PROPOSE'],
  max_steps: 100,
  ...overrides,
});

test('creates a sealed expiring Digital Antibody only from a confirmed authoritative Production incident', () => {
  const antibody = createDigitalAntibody(baseAntibody());
  assert.equal(antibody.schema_version, 'TIGER-AION-DIGITAL-ANTIBODY-1');
  assert.equal(antibody.advisory_only, true);
  assert.equal(antibody.fact_class, 'DERIVED_DEFENSIVE_MEMORY');
  assert.equal(antibody.incident_ref, 'incident-prod-001');
  assert.equal(antibody.exact_source_sha, sourceSha);
  assert.match(antibody.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(antibody), true);
  assert.equal(verifyDigitalAntibody(antibody), true);
  assert.equal(isAntibodyFresh(antibody, Date.parse('2026-08-25T15:30:00.000Z')), true);
});

test('rejects simulation, unconfirmed, or non-authoritative incident material', () => {
  for (const incidentProof of [
    baseIncidentProof({ fact_class: 'SIMULATION' }),
    baseIncidentProof({ status: 'UNCONFIRMED' }),
    baseIncidentProof({ authoritative_source: false }),
  ]) {
    assert.throws(
      () => createDigitalAntibody(baseAntibody({ incident_proof: incidentProof })),
      (error) => error?.code === 'AION_IMMUNE_INCIDENT_UNCONFIRMED',
    );
  }
});

test('expired or tampered antibodies fail closed', () => {
  const antibody = createDigitalAntibody(baseAntibody());
  assert.equal(isAntibodyFresh(antibody, Date.parse('2026-08-25T16:10:01.000Z')), false);
  const tampered = { ...antibody, confidence: 1 };
  assert.throws(
    () => verifyDigitalAntibody(tampered),
    (error) => error?.code === 'AION_IMMUNE_INTEGRITY_INVALID',
  );
});

test('antibody reuse requires the exact A5 Action Passport and deterministic authorization binding', () => {
  const antibody = createDigitalAntibody(baseAntibody());
  const cell = createCapabilityCell(baseCell());
  const passport = createActionPassport(basePassport(antibody));
  const authorization = authorizeAction({
    cell,
    passport,
    now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
    behavior_state: 'ACTIVE',
  });

  const candidate = authorizeAntibodyReuse({
    antibody,
    remediation_ref: 'remediation:reduce-db-load',
    passport,
    authorization,
    now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
  });

  assert.equal(candidate.schema_version, 'TIGER-AION-ANTIBODY-REUSE-CANDIDATE-1');
  assert.equal(candidate.decision, 'ELIGIBLE_FOR_A5_BOUNDED_PATH');
  assert.equal(candidate.execution_performed, false);
  assert.equal(candidate.production_mutation_authorized, false);
  assert.equal(candidate.antibody_id, antibody.antibody_id);
  assert.match(candidate.content_digest, /^[a-f0-9]{64}$/);
});

test('antibody memory cannot bypass A5 evidence binding or use forged authorization', () => {
  const antibody = createDigitalAntibody(baseAntibody());
  const cell = createCapabilityCell(baseCell());

  const missingBindingPassport = createActionPassport(basePassport(antibody, {
    evidence_refs: ['proof:gate-001'],
  }));
  const missingBindingAuthorization = authorizeAction({
    cell,
    passport: missingBindingPassport,
    now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
    behavior_state: 'ACTIVE',
  });
  assert.throws(
    () => authorizeAntibodyReuse({
      antibody,
      remediation_ref: 'remediation:reduce-db-load',
      passport: missingBindingPassport,
      authorization: missingBindingAuthorization,
      now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
    }),
    (error) => error?.code === 'AION_IMMUNE_A5_BINDING_REQUIRED',
  );

  const passport = createActionPassport(basePassport(antibody));
  const authorization = authorizeAction({
    cell,
    passport,
    now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
    behavior_state: 'ACTIVE',
  });
  const forged = { ...authorization, exact_source_sha: '0000000000000000000000000000000000000000' };
  assert.throws(
    () => authorizeAntibodyReuse({
      antibody,
      remediation_ref: 'remediation:reduce-db-load',
      passport,
      authorization: forged,
      now_ms: Date.parse('2026-08-25T15:30:00.000Z'),
    }),
    (error) => error?.code === 'AION_IMMUNE_A5_AUTHORIZATION_INVALID',
  );
});

test('expired antibody cannot produce a remediation candidate even with valid A5 authorization', () => {
  const antibody = createDigitalAntibody(baseAntibody());
  const cell = createCapabilityCell(baseCell({ expires_at: '2026-08-25T17:00:00.000Z' }));
  const passport = createActionPassport(basePassport(antibody, { freshness_deadline: '2026-08-25T16:30:00.000Z' }));
  const authorization = authorizeAction({
    cell,
    passport,
    now_ms: Date.parse('2026-08-25T16:10:01.000Z'),
    behavior_state: 'ACTIVE',
  });
  assert.throws(
    () => authorizeAntibodyReuse({
      antibody,
      remediation_ref: 'remediation:reduce-db-load',
      passport,
      authorization,
      now_ms: Date.parse('2026-08-25T16:10:01.000Z'),
    }),
    (error) => error?.code === 'AION_IMMUNE_EXPIRED',
  );
});

test('creates a sealed Red/Blue exercise only inside an isolated internal cyber-range', () => {
  const range = createCyberRangeExercise(baseRange());
  assert.equal(range.schema_version, 'TIGER-AION-CYBER-RANGE-1');
  assert.equal(range.execution_target, 'ISOLATED_CYBER_RANGE');
  assert.equal(range.production_credentials, false);
  assert.equal(range.production_write_capability, false);
  assert.equal(range.external_targets, false);
  assert.match(range.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(verifyCyberRangeExercise(range), true);
});

test('Red/Blue range rejects Production credentials, writes, external targets, and non-internal target URIs', () => {
  for (const input of [
    baseRange({ production_credentials: true }),
    baseRange({ production_write_capability: true }),
    baseRange({ external_targets: true }),
    baseRange({ targets: ['https://outside.example/test'] }),
    baseRange({ targets: ['production://service/api'] }),
  ]) {
    assert.throws(
      () => createCyberRangeExercise(input),
      (error) => error?.code === 'AION_IMMUNE_RANGE_ISOLATION_VIOLATION',
    );
  }
});

test('Red/Blue results remain SIMULATION and can only emit candidate defensive knowledge', () => {
  const range = createCyberRangeExercise(baseRange());
  const result = recordCyberRangeResult({
    exercise: range,
    observed_at: '2026-08-25T15:20:00.000Z',
    completed: true,
    red_findings: ['finding:rate-limit-gap'],
    blue_defenses: ['defense:adaptive-rate-limit'],
    candidate_remediations: ['runbook:rate-limit-canary'],
  });
  assert.equal(result.schema_version, 'TIGER-AION-CYBER-RANGE-RESULT-1');
  assert.equal(result.fact_class, 'SIMULATION');
  assert.equal(result.production_fact, false);
  assert.equal(result.execution_authority_granted, false);
  assert.equal(result.production_mutation_authorized, false);
  assert.match(result.content_digest, /^[a-f0-9]{64}$/);
});

test('tampering with cyber-range isolation metadata fails integrity verification', () => {
  const range = createCyberRangeExercise(baseRange());
  const tampered = { ...range, external_targets: true };
  assert.throws(
    () => verifyCyberRangeExercise(tampered),
    (error) => ['AION_IMMUNE_RANGE_ISOLATION_VIOLATION', 'AION_IMMUNE_INTEGRITY_INVALID'].includes(error?.code),
  );
});
