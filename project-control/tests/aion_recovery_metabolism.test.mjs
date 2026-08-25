import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRecoveryCheckpoint,
  createRestoreProof,
  certifyRecoverability,
} from '../aion/recovery-proof.mjs';
import {
  DELETION_CHAIN,
  createLifecycleLedger,
  recordLifecycleStage,
  issueDisposalCertificate,
} from '../aion/metabolism.mjs';
import { scoreEntropy } from '../aion/entropy.mjs';

const baseCheckpoint = (overrides = {}) => ({
  checkpoint_id: 'cp-primary-001',
  asset_id: 'database:primary',
  created_at: '2026-08-25T14:00:00.000Z',
  expires_at: '2026-08-25T15:00:00.000Z',
  rto_seconds: 900,
  rpo_seconds: 300,
  lineage: ['backup:base-20260825', 'wal:segment-4242'],
  image_digest: 'a'.repeat(64),
  ...overrides,
});

const baseRestoreProof = (overrides = {}) => ({
  proof_id: 'restore-proof-001',
  checkpoint_id: 'cp-primary-001',
  observed_at: '2026-08-25T14:10:00.000Z',
  authoritative_source: true,
  source: { system: 'isolated-recovery-rehearsal', component: 'restore-twin' },
  isolated_twin: true,
  integrity_verified: true,
  critical_journeys_verified: true,
  expected_state_match: true,
  twin_destroyed: true,
  measured_rto_seconds: 480,
  measured_rpo_seconds: 120,
  ...overrides,
});

test('recovery checkpoint captures bounded RTO/RPO, lineage, expiry, and deterministic digest', () => {
  const checkpoint = createRecoveryCheckpoint(baseCheckpoint());
  assert.equal(checkpoint.schema_version, 'TIGER-AION-RECOVERY-CHECKPOINT-1');
  assert.equal(checkpoint.rto_seconds, 900);
  assert.equal(checkpoint.rpo_seconds, 300);
  assert.deepEqual(checkpoint.lineage, ['backup:base-20260825', 'wal:segment-4242']);
  assert.match(checkpoint.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(
    createRecoveryCheckpoint(baseCheckpoint()).content_digest,
    checkpoint.content_digest,
  );
});

test('restore proof must be authoritative and represent an isolated destroyed twin', () => {
  for (const overrides of [
    { authoritative_source: false },
    { isolated_twin: false },
    { integrity_verified: false },
    { critical_journeys_verified: false },
    { expected_state_match: false },
    { twin_destroyed: false },
  ]) {
    assert.throws(
      () => createRestoreProof(baseRestoreProof(overrides)),
      (error) => error?.code === 'AION_RESTORE_PROOF_INVALID',
    );
  }
});

test('expired checkpoint cannot certify recoverability', () => {
  const checkpoint = createRecoveryCheckpoint(baseCheckpoint());
  const proof = createRestoreProof(baseRestoreProof());
  assert.throws(
    () => certifyRecoverability({
      checkpoint,
      restore_proof: proof,
      now_ms: Date.parse('2026-08-25T15:00:01.000Z'),
    }),
    (error) => error?.code === 'AION_RECOVERY_CHECKPOINT_EXPIRED',
  );
});

test('recoverability certification enforces checkpoint lineage and RTO/RPO targets', () => {
  const checkpoint = createRecoveryCheckpoint(baseCheckpoint());
  const proof = createRestoreProof(baseRestoreProof());
  const certificate = certifyRecoverability({
    checkpoint,
    restore_proof: proof,
    now_ms: Date.parse('2026-08-25T14:15:00.000Z'),
  });
  assert.equal(certificate.schema_version, 'TIGER-AION-RECOVERABILITY-CERTIFICATE-1');
  assert.equal(certificate.recoverable, true);
  assert.equal(certificate.rto_met, true);
  assert.equal(certificate.rpo_met, true);
  assert.equal(certificate.checkpoint_id, checkpoint.checkpoint_id);
  assert.equal(certificate.restore_proof_id, proof.proof_id);
  assert.match(certificate.content_digest, /^[a-f0-9]{64}$/);

  const slowProof = createRestoreProof(baseRestoreProof({ measured_rto_seconds: 901 }));
  assert.throws(
    () => certifyRecoverability({ checkpoint, restore_proof: slowProof, now_ms: Date.parse('2026-08-25T14:15:00.000Z') }),
    (error) => error?.code === 'AION_RECOVERY_OBJECTIVE_NOT_MET',
  );
});

test('destruction without the exact approval and rehearsal chain is rejected', () => {
  let ledger = createLifecycleLedger({
    asset_id: 'module:legacy-widget',
    owner: 'TIGER_PLATFORM',
    created_at: '2026-08-25T14:00:00.000Z',
  });
  for (const stage of ['DETECT', 'CLASSIFY', 'EXPLAIN', 'QUARANTINE', 'REHEARSE', 'VERIFY', 'DELETE', 'SEAL']) {
    ledger = recordLifecycleStage(ledger, {
      stage,
      occurred_at: '2026-08-25T14:20:00.000Z',
      evidence_ref: `evidence:${stage.toLowerCase()}`,
    });
  }
  assert.throws(
    () => issueDisposalCertificate(ledger),
    (error) => error?.code === 'AION_DESTRUCTIVE_ACTION_UNAUTHORIZED',
  );
});

test('authorized disposal requires Detect→Classify→Explain→Approve→Quarantine→Rehearse→Verify→Delete→Seal in order', () => {
  assert.deepEqual(DELETION_CHAIN, [
    'DETECT', 'CLASSIFY', 'EXPLAIN', 'APPROVE', 'QUARANTINE', 'REHEARSE', 'VERIFY', 'DELETE', 'SEAL',
  ]);

  let ledger = createLifecycleLedger({
    asset_id: 'module:dormant-widget',
    owner: 'TIGER_PLATFORM',
    created_at: '2026-08-25T14:00:00.000Z',
  });
  for (const [index, stage] of DELETION_CHAIN.entries()) {
    ledger = recordLifecycleStage(ledger, {
      stage,
      occurred_at: `2026-08-25T14:${String(10 + index).padStart(2, '0')}:00.000Z`,
      evidence_ref: `evidence:${stage.toLowerCase()}`,
      ...(stage === 'APPROVE' ? { authorization: { authority: 'OWNER_GOVERNED_POLICY', decision: 'APPROVED' } } : {}),
      ...(stage === 'REHEARSE' ? { rollback_plan_ref: 'rollback:widget-v1' } : {}),
    });
  }

  const certificate = issueDisposalCertificate(ledger);
  assert.equal(certificate.schema_version, 'TIGER-AION-DISPOSAL-CERTIFICATE-1');
  assert.equal(certificate.asset_id, 'module:dormant-widget');
  assert.equal(certificate.lifecycle_state, 'disposed');
  assert.match(certificate.content_digest, /^[a-f0-9]{64}$/);
});

test('entropy scoring is diagnostic only and keeps structural entropy separate from business value', () => {
  const result = scoreEntropy({
    asset_id: 'service:high-value-complex',
    dimensions: {
      dead_code: 70,
      duplication: 80,
      dependency_sprawl: 60,
      schema_drift: 50,
      artifact_staleness: 40,
      operational_burden: 90,
      cleanup_backlog: 60,
      orphaned_asset_count: 0,
      historical_residue_pressure: 70,
      reversibility_loss: 30,
    },
    business_value: 95,
  });
  assert.equal(result.schema_version, 'TIGER-AION-ENTROPY-SCORE-1');
  assert.equal(result.business_value, 95);
  assert.ok(result.structural_entropy >= 0 && result.structural_entropy <= 100);
  assert.equal(result.recommendation, 'REVIEW_HIGH_VALUE');
  assert.equal(Object.hasOwn(result, 'delete'), false);
  assert.equal(Object.hasOwn(result, 'execute'), false);
  assert.equal(Object.hasOwn(result, 'action'), false);
});

test('entropy dimensions are bounded and fail closed outside 0..100', () => {
  assert.throws(
    () => scoreEntropy({
      asset_id: 'module:bad-score',
      dimensions: { dead_code: 101 },
      business_value: 10,
    }),
    (error) => error?.code === 'AION_ENTROPY_INVALID',
  );
});
