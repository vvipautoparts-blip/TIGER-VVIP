'use strict';

const { createHash } = require('node:crypto');
const { MANIFEST } = require('../financial/constitution.cjs');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const REPORT_VERSION = 'TIGER_CERTIFIED_TRUTH_REPORT_V1';
const MONEY_FIELDS = Object.freeze([
  'collected_tmu',
  'allocated_tmu',
  'held_tmu',
  'reserved_tmu',
  'refundable_tmu',
  'unreconciled_tmu',
  'unexplained_variance_tmu',
  'payout_due_tmu',
  'chargebacks_tmu',
  'fraud_prevented_tmu',
]);

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('truth report policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('truth report policy must be TSN-26 fail-closed');
  if (!policy.required_proofs || !policy.signals) throw new Error('truth report proof and signal policy are required');
  return policy;
}

function normalizeInstant(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} must be an ISO instant`);
  return date;
}

function normalizeFinancial(financial) {
  if (!financial || typeof financial !== 'object' || Array.isArray(financial)) throw new Error('financial truth snapshot is required');
  const normalized = {};
  for (const field of MONEY_FIELDS) {
    if (typeof financial[field] !== 'bigint' || financial[field] < 0n) throw new Error(`${field} must be a non-negative bigint TMU value`);
    normalized[field] = financial[field].toString();
  }
  if (!Number.isInteger(financial.liquidity_coverage_bps) || financial.liquidity_coverage_bps < 0) throw new Error('liquidity_coverage_bps must be a non-negative integer');
  if (typeof financial.next_settlement_epoch !== 'string' || financial.next_settlement_epoch.trim() === '') throw new Error('next_settlement_epoch is required');
  normalized.liquidity_coverage_bps = financial.liquidity_coverage_bps;
  normalized.next_settlement_epoch = financial.next_settlement_epoch.trim();
  return normalized;
}

function assessProofs(rawProofs, policy, asOfDate) {
  const proofs = rawProofs && typeof rawProofs === 'object' && !Array.isArray(rawProofs) ? rawProofs : {};
  const normalized = {};
  const failures = [];
  const status = {};

  for (const [name, rule] of Object.entries(policy.required_proofs)) {
    const proof = proofs[name];
    const localFailures = [];
    if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
      localFailures.push(`MISSING:${name}`);
    } else {
      if (proof.status !== 'PASS') localFailures.push(`STATUS:${name}:${proof.status || 'UNKNOWN'}`);
      if (typeof proof.ref !== 'string' || proof.ref.trim() === '') localFailures.push(`REF_MISSING:${name}`);
      const proofDate = new Date(proof.as_of);
      if (!Number.isFinite(proofDate.getTime())) {
        localFailures.push(`TIME_INVALID:${name}`);
      } else {
        const ageMs = asOfDate.getTime() - proofDate.getTime();
        if (ageMs < 0) localFailures.push(`FUTURE:${name}`);
        else if (ageMs > Number(rule.max_age_seconds) * 1000) localFailures.push(`STALE:${name}`);
      }
      normalized[name] = {
        status: proof.status || 'UNKNOWN',
        ref: typeof proof.ref === 'string' ? proof.ref.trim() : null,
        as_of: Number.isFinite(proofDate.getTime()) ? proofDate.toISOString() : null,
      };
    }
    if (!normalized[name]) normalized[name] = { status: 'MISSING', ref: null, as_of: null };
    failures.push(...localFailures);
    status[name] = localFailures.length === 0 ? 'GREEN' : 'RED';
  }
  return { proofs: normalized, failures, status };
}

function generateTruthReport(input, rawPolicy) {
  const policy = validatePolicy(rawPolicy);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('truth report input is required');
  const asOf = normalizeInstant(input.as_of, 'truth report as_of');
  const versions = input.versions && typeof input.versions === 'object' && !Array.isArray(input.versions) ? input.versions : {};
  if (versions.constitution_id !== MANIFEST.id) throw new Error('truth report constitution id mismatch');
  if (typeof versions.rule_version !== 'string' || !versions.rule_version.trim()) throw new Error('truth report rule version is required');
  if (typeof versions.country_policy_version !== 'string' || !versions.country_policy_version.trim()) throw new Error('truth report country policy version is required');

  const financial = normalizeFinancial(input.financial);
  const proofAssessment = assessProofs(input.proofs, policy, asOf);

  const collected = BigInt(financial.collected_tmu);
  const accounted = BigInt(financial.allocated_tmu) + BigInt(financial.held_tmu) + BigInt(financial.reserved_tmu) + BigInt(financial.refundable_tmu);
  const valueConservation = collected === accounted;
  const unreconciledGreen = financial.unreconciled_tmu === String(policy.unreconciled_green_tmu);
  const varianceGreen = financial.unexplained_variance_tmu === String(policy.unexplained_variance_green_tmu);
  const liquidityGreen = financial.payout_due_tmu === '0' || financial.liquidity_coverage_bps >= policy.liquidity_coverage_green_bps;

  const ownerSignals = {};
  for (const [signal, requiredProofs] of Object.entries(policy.signals)) {
    ownerSignals[signal] = requiredProofs.every((name) => proofAssessment.status[name] === 'GREEN') ? 'GREEN' : 'RED';
  }
  if (!(valueConservation && unreconciledGreen && varianceGreen && liquidityGreen)) ownerSignals['Money Integrity'] = 'RED';

  const overallStatus = Object.values(ownerSignals).every((value) => value === 'GREEN') ? 'GREEN' : 'RED';
  const moneyIntegrity = {
    status: ownerSignals['Money Integrity'],
    headline: ownerSignals['Money Integrity'] === 'GREEN' ? '100.000000% BALANCED' : 'FINANCIAL INTEGRITY RED',
    value_conservation: valueConservation,
    unreconciled_zero: unreconciledGreen,
    unexplained_variance_zero: varianceGreen,
    liquidity_coverage_green: liquidityGreen,
  };

  const payload = {
    report_version: REPORT_VERSION,
    policy_id: policy.policy_id,
    reference: 'TSN-26',
    as_of: asOf.toISOString(),
    financial_authority: false,
    versions: {
      constitution_id: versions.constitution_id,
      rule_version: versions.rule_version.trim(),
      country_policy_version: versions.country_policy_version.trim(),
    },
    financial,
    money_integrity: moneyIntegrity,
    proofs: proofAssessment.proofs,
    proof_failures: [...proofAssessment.failures].sort(),
    owner_signals: ownerSignals,
    overall_status: overallStatus,
  };
  const reportDigest = sha256(payload);
  return freezeDeep({
    ...payload,
    report_id: `TTR-${reportDigest.slice('sha256:'.length, 'sha256:'.length + 16)}`,
    report_digest: reportDigest,
  });
}

module.exports = Object.freeze({
  REPORT_VERSION,
  MONEY_FIELDS,
  generateTruthReport,
  validatePolicy,
});
