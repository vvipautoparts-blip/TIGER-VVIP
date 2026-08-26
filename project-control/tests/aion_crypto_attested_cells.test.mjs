import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizeAction, createActionPassport, createCapabilityCell } from '../aion/agentic-control.mjs';
import {
  createCryptoInventoryEntry,
  createPqcMigrationCandidate,
  createAttestedHighSecurityCell,
  verifyCryptoInventoryEntry,
  verifyAttestedHighSecurityCell,
} from '../aion/crypto-attested-cells.mjs';

const sourceSha = '02631fc995ad1570190506787a024802a42979e8';

function a5() {
  const cell = createCapabilityCell({
    cell_id: 'cell-a9',
    agent_id: 'agent:a9-security',
    issued_at: '2026-08-25T15:35:00.000Z',
    expires_at: '2026-08-25T17:35:00.000Z',
    autonomy_ceiling: 'L3_CREATE_PR_OR_RUNBOOK',
    capabilities: ['CRYPTO_INVENTORY_READ', 'SECURITY_PROPOSAL_WRITE'],
    target_scopes: ['repository:branch', 'evidence:crypto'],
    budgets: { max_actions: 20, max_tool_calls: 60, max_loops: 6, max_cost_units: 300 },
    sandbox: { profile: 'WASI_COMPONENT', network: 'DENY_BY_DEFAULT', filesystem: 'DENY_BY_DEFAULT', environment: 'DENY_BY_DEFAULT', allowed_interfaces: ['proof.read', 'proposal.write'] },
    denied_boundaries: ['main', 'production', 'production-db', 'secrets', 'branch-protection', 'payments'],
  });
  const passport = createActionPassport({
    passport_id: 'passport-a9',
    action_type: 'security:crypto-readiness-proposal',
    requested_autonomy_level: 'L3_CREATE_PR_OR_RUNBOOK',
    requested_capabilities: ['CRYPTO_INVENTORY_READ', 'SECURITY_PROPOSAL_WRITE'],
    exact_source_sha: sourceSha,
    evidence_refs: ['proof:a9-inventory', 'proof:a9-provider'],
    confidence: 0.98,
    freshness_deadline: '2026-08-25T16:50:00.000Z',
    simulation_refs: ['twin:a9-security'],
    policy_decisions: { constitution: true, policy: true, identity: true, provenance: true, evidence: true, recovery_path: true, risk_budget: true },
    blast_radius: 'REPOSITORY_BRANCH_ONLY',
    provenance_refs: [`github:commit:${sourceSha}`],
    rollback_ref: 'rollback:a9-proposal',
    recovery_checkpoint_ref: 'recovery:a9-proof',
    required_approvals: ['SECURITY_POLICY'],
    satisfied_approvals: ['SECURITY_POLICY'],
    verification_conditions: ['inventory-bound', 'provider-proof-valid'],
    abort_conditions: ['evidence-stale', 'attestation-invalid'],
    reversible: true,
    preapproved: false,
  });
  return { cell, passport, authorization: authorizeAction({ cell, passport, now_ms: Date.parse('2026-08-25T15:40:00.000Z'), behavior_state: 'ACTIVE' }) };
}

function inventory(overrides = {}) {
  return createCryptoInventoryEntry({
    inventory_id: 'crypto:a9:tls-edge',
    recorded_at: '2026-08-25T15:41:00.000Z',
    exact_source_sha: sourceSha,
    algorithm: 'ML-KEM-768',
    protocol: 'TLS',
    standards_refs: ['NIST:FIPS-203'],
    key_or_certificate_owner_ref: 'owner:edge-termination',
    protected_data_classes: ['DATA_IN_TRANSIT'],
    expires_at: '2027-08-25T00:00:00.000Z',
    rotation_due_at: '2027-02-25T00:00:00.000Z',
    migration_compatibility: 'COMPATIBLE',
    provider_support: 'PRODUCTION_GRADE_SUPPORTED',
    provider_evidence_refs: ['provider:tls:pqc:2026-08'],
    ...overrides,
  });
}

test('creates a sealed provider-neutral crypto inventory record without claiming quantum readiness', () => {
  const value = inventory();
  assert.equal(value.schema_version, 'TIGER-AION-CRYPTO-INVENTORY-1');
  assert.equal(value.quantum_ready_claimed, false);
  assert.equal(value.production_mutation_authorized, false);
  assert.match(value.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(verifyCryptoInventoryEntry(value), true);
});

test('rejects TIGER custom cryptographic algorithms and missing standards provenance', () => {
  assert.throws(() => inventory({ algorithm: 'TIGER-QUANTUM-1' }), (error) => error?.code === 'AION_CRYPTO_CUSTOM_ALGORITHM_FORBIDDEN');
  assert.throws(() => inventory({ standards_refs: [] }), (error) => error?.code === 'AION_CRYPTO_STANDARD_EVIDENCE_REQUIRED');
});

test('PQC migration stays a non-executing candidate and requires production-grade provider evidence plus interop and recovery proof', () => {
  const value = createPqcMigrationCandidate({
    candidate_id: 'pqc:a9:tls-edge',
    created_at: '2026-08-25T15:45:00.000Z',
    inventory: inventory(),
    approved_standard_evidence_refs: ['standard-approval:NIST:FIPS-203'],
    interoperability_test_refs: ['interop:a9:tls-edge'],
    rollback_ref: 'rollback:a9:pqc',
    recovery_checkpoint_ref: 'recovery:a9:pqc',
  });
  assert.equal(value.status, 'MIGRATION_CANDIDATE_ONLY');
  assert.equal(value.execution_performed, false);
  assert.equal(value.production_mutation_authorized, false);
  assert.equal(value.quantum_ready_claimed, false);
});

test('PQC migration fails closed without production-grade support or interoperability proof', () => {
  assert.throws(() => createPqcMigrationCandidate({ candidate_id: 'bad1', created_at: '2026-08-25T15:45:00.000Z', inventory: inventory({ provider_support: 'PILOT_ONLY' }), approved_standard_evidence_refs: ['standard:NIST'], interoperability_test_refs: ['interop:a9'], rollback_ref: 'rollback:a9', recovery_checkpoint_ref: 'recovery:a9' }), (error) => error?.code === 'AION_CRYPTO_PRODUCTION_SUPPORT_REQUIRED');
  assert.throws(() => createPqcMigrationCandidate({ candidate_id: 'bad2', created_at: '2026-08-25T15:45:00.000Z', inventory: inventory(), approved_standard_evidence_refs: ['standard:NIST'], interoperability_test_refs: [], rollback_ref: 'rollback:a9', recovery_checkpoint_ref: 'recovery:a9' }), (error) => error?.code === 'AION_CRYPTO_INTEROP_REQUIRED');
});

test('attested high-security cell binds exact A5 authority and verified fresh attestation without adding privilege', () => {
  const { passport, authorization } = a5();
  const value = createAttestedHighSecurityCell({
    attested_cell_id: 'attested:a9:crypto',
    created_at: '2026-08-25T15:46:00.000Z',
    exact_source_sha: sourceSha,
    passport,
    authorization,
    requested_capabilities: ['CRYPTO_INVENTORY_READ'],
    justification_ref: 'risk:a9:high-security-crypto-evidence',
    attestation: {
      verifier_ref: 'verifier:confidential-compute',
      quote_ref: 'attestation:quote:a9',
      measurement_digest: 'a'.repeat(64),
      workload_digest: 'b'.repeat(64),
      verified_at: '2026-08-25T15:44:00.000Z',
      expires_at: '2026-08-25T16:44:00.000Z',
      verification_result: 'VERIFIED',
    },
  });
  assert.equal(value.status, 'ATTESTED_EVIDENCE_BOUND');
  assert.deepEqual(value.granted_capabilities, ['CRYPTO_INVENTORY_READ']);
  assert.equal(value.privilege_escalation_granted, false);
  assert.equal(value.production_mutation_authorized, false);
  assert.equal(value.execution_performed, false);
  assert.equal(verifyAttestedHighSecurityCell(value, Date.parse('2026-08-25T16:00:00.000Z')), true);
});

test('attested cell rejects capability escalation, stale evidence, and tampering', () => {
  const { passport, authorization } = a5();
  const common = { attested_cell_id: 'attested:a9:bad', created_at: '2026-08-25T15:46:00.000Z', exact_source_sha: sourceSha, passport, authorization, justification_ref: 'risk:a9', attestation: { verifier_ref: 'verifier:a9', quote_ref: 'quote:a9', measurement_digest: 'c'.repeat(64), workload_digest: 'd'.repeat(64), verified_at: '2026-08-25T15:44:00.000Z', expires_at: '2026-08-25T16:44:00.000Z', verification_result: 'VERIFIED' } };
  assert.throws(() => createAttestedHighSecurityCell({ ...common, requested_capabilities: ['PRODUCTION_DEPLOY'] }), (error) => error?.code === 'AION_ATTESTATION_CAPABILITY_ESCALATION');
  const value = createAttestedHighSecurityCell({ ...common, requested_capabilities: ['CRYPTO_INVENTORY_READ'] });
  assert.throws(() => verifyAttestedHighSecurityCell(value, Date.parse('2026-08-25T16:44:01.000Z')), (error) => error?.code === 'AION_ATTESTATION_STALE');
  assert.throws(() => verifyAttestedHighSecurityCell({ ...value, justification_ref: 'changed' }, Date.parse('2026-08-25T16:00:00.000Z')), (error) => error?.code === 'AION_ATTESTATION_INTEGRITY_INVALID');
});
