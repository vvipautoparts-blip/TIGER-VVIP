'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

function sha256(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('recovery policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('recovery policy must be TSN-26 fail-closed');
  if (policy.production_mutation_allowed !== false) throw new Error('recovery rehearsal must not permit production mutation');
  return policy;
}

function verifyRecoveryProof(proof, { policy: rawPolicy, now = new Date() } = {}) {
  const policy = validatePolicy(rawPolicy);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('trusted current time is required');
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) throw new Error('recovery proof is required');

  const failures = [];
  if (typeof proof.proof_id !== 'string' || !proof.proof_id.trim()) failures.push('PROOF_ID_REQUIRED');
  if (proof.environment !== policy.required_environment) failures.push('ISOLATED_REHEARSAL_REQUIRED');
  if (proof.restore_performed !== true) failures.push('RESTORE_REQUIRED');
  if (typeof proof.source_snapshot_ref !== 'string' || !proof.source_snapshot_ref.trim()) failures.push('SOURCE_SNAPSHOT_REF_REQUIRED');
  if (proof.production_access_used !== false) failures.push('PRODUCTION_MUTATION_FORBIDDEN');
  if (!Array.isArray(proof.evidence_refs) || proof.evidence_refs.length === 0) failures.push('RECOVERY_EVIDENCE_REQUIRED');

  const restoredAt = new Date(proof.restored_at);
  const completedAt = new Date(proof.completed_at);
  if (!Number.isFinite(restoredAt.getTime()) || !Number.isFinite(completedAt.getTime()) || completedAt < restoredAt) {
    failures.push('RECOVERY_TIME_INVALID');
  } else {
    const ageSeconds = Math.floor((now.getTime() - completedAt.getTime()) / 1000);
    if (ageSeconds < 0) failures.push('RECOVERY_PROOF_FROM_FUTURE');
    else if (ageSeconds > policy.proof_max_age_seconds) failures.push('RECOVERY_PROOF_STALE');
  }

  if (!Number.isInteger(proof.observed_rpo_seconds) || proof.observed_rpo_seconds < 0) failures.push('RPO_OBSERVATION_INVALID');
  else if (proof.observed_rpo_seconds > policy.financial_core_targets.max_rpo_seconds) failures.push('RPO_TARGET_MISSED');
  if (!Number.isInteger(proof.observed_rto_seconds) || proof.observed_rto_seconds < 0) failures.push('RTO_OBSERVATION_INVALID');
  else if (proof.observed_rto_seconds > policy.financial_core_targets.max_rto_seconds) failures.push('RTO_TARGET_MISSED');

  const checks = proof.checks && typeof proof.checks === 'object' && !Array.isArray(proof.checks) ? proof.checks : {};
  for (const check of policy.required_checks) {
    if (checks[check] !== true) failures.push(`CHECK_FAILED:${check}`);
  }

  const normalized = {
    proof_version: 'TIGER_RECOVERY_PROOF_V1',
    policy_id: policy.policy_id,
    reference: 'TSN-26',
    proof_id: typeof proof.proof_id === 'string' ? proof.proof_id.trim() : null,
    environment: proof.environment || null,
    restore_performed: proof.restore_performed === true,
    source_snapshot_ref: typeof proof.source_snapshot_ref === 'string' ? proof.source_snapshot_ref.trim() : null,
    restored_at: Number.isFinite(restoredAt.getTime()) ? restoredAt.toISOString() : null,
    completed_at: Number.isFinite(completedAt.getTime()) ? completedAt.toISOString() : null,
    observed_rpo_seconds: Number.isInteger(proof.observed_rpo_seconds) ? proof.observed_rpo_seconds : null,
    observed_rto_seconds: Number.isInteger(proof.observed_rto_seconds) ? proof.observed_rto_seconds : null,
    production_mutation: proof.production_access_used === true,
    checks: Object.fromEntries(policy.required_checks.map((check) => [check, checks[check] === true])),
    evidence_refs: Array.isArray(proof.evidence_refs)
      ? [...new Set(proof.evidence_refs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))].sort()
      : [],
    failures: [...new Set(failures)].sort(),
  };
  const digest = sha256(normalized);
  const pass = normalized.failures.length === 0;
  return freezeDeep({
    ...normalized,
    status: pass ? 'PASS' : 'FAIL',
    trusted_backup: pass,
    proof_ref: normalized.proof_id ? `proof://recovery/${normalized.proof_id}` : null,
    proof_digest: digest,
  });
}

module.exports = Object.freeze({ verifyRecoveryProof, validatePolicy });
