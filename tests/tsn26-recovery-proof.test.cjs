'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/recovery-policy.v1.json');
const { verifyRecoveryProof } = require('../scripts/tsn26/recovery/recovery-proof.cjs');

const NOW = new Date('2026-08-26T06:00:00.000Z');

function validProof() {
  return {
    proof_id: 'restore-2026-08-26-001',
    environment: 'ISOLATED_REHEARSAL',
    restore_performed: true,
    source_snapshot_ref: 'backup://financial-core/snapshot-001',
    restored_at: '2026-08-26T05:45:00.000Z',
    completed_at: '2026-08-26T05:55:00.000Z',
    observed_rpo_seconds: 30,
    observed_rto_seconds: 600,
    production_access_used: false,
    checks: {
      ledger_balance: true,
      sale_claim_integrity: true,
      policy_digest: true,
      key_reference_recovery: true,
      audit_chain: true,
      report_reproducibility: true,
    },
    evidence_refs: ['proof://restore/log-1', 'proof://restore/ledger-check-1'],
  };
}

test('backup becomes trusted only after isolated restore and all validation checks pass', () => {
  const result = verifyRecoveryProof(validProof(), { policy, now: NOW });
  assert.equal(result.status, 'PASS');
  assert.equal(result.trusted_backup, true);
  assert.equal(result.production_mutation, false);
  assert.match(result.proof_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.proof_ref, 'proof://recovery/restore-2026-08-26-001');
});

test('backup existence without restore is never a recovery proof', () => {
  const proof = validProof();
  proof.restore_performed = false;
  const result = verifyRecoveryProof(proof, { policy, now: NOW });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.trusted_backup, false);
  assert.ok(result.failures.includes('RESTORE_REQUIRED'));
});

test('restore proof fails on stale evidence, failed invariant, RPO/RTO breach, or production mutation', () => {
  const stale = validProof();
  stale.restored_at = '2026-08-10T05:45:00.000Z';
  stale.completed_at = '2026-08-10T05:55:00.000Z';
  assert.ok(verifyRecoveryProof(stale, { policy, now: NOW }).failures.includes('RECOVERY_PROOF_STALE'));

  const broken = validProof();
  broken.checks.ledger_balance = false;
  assert.ok(verifyRecoveryProof(broken, { policy, now: NOW }).failures.includes('CHECK_FAILED:ledger_balance'));

  const slow = validProof();
  slow.observed_rpo_seconds = 120;
  slow.observed_rto_seconds = 1200;
  const slowResult = verifyRecoveryProof(slow, { policy, now: NOW });
  assert.ok(slowResult.failures.includes('RPO_TARGET_MISSED'));
  assert.ok(slowResult.failures.includes('RTO_TARGET_MISSED'));

  const dangerous = validProof();
  dangerous.production_access_used = true;
  assert.ok(verifyRecoveryProof(dangerous, { policy, now: NOW }).failures.includes('PRODUCTION_MUTATION_FORBIDDEN'));
});
