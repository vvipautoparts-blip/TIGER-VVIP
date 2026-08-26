'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/truth-report-policy.v1.json');
const { generateTruthReport } = require('../scripts/tsn26/reporting/truth-report.cjs');

const AS_OF = '2026-08-26T05:50:00.000Z';

function proofs() {
  return Object.fromEntries(Object.keys(policy.required_proofs).map((name) => [name, {
    status: 'PASS',
    ref: `proof://${name}/1`,
    as_of: '2026-08-26T05:49:00.000Z',
  }]));
}

function balancedInput() {
  return {
    as_of: AS_OF,
    versions: {
      constitution_id: 'TFC-2026.08.001',
      rule_version: 'TIGER_FINANCIAL_CONSTITUTION_V1',
      country_policy_version: 'XY-TEST-2026.08.001',
    },
    financial: {
      collected_tmu: 100000000n,
      allocated_tmu: 70000000n,
      held_tmu: 10000000n,
      reserved_tmu: 15000000n,
      refundable_tmu: 5000000n,
      unreconciled_tmu: 0n,
      unexplained_variance_tmu: 0n,
      payout_due_tmu: 10000000n,
      liquidity_coverage_bps: 12500,
      chargebacks_tmu: 1000000n,
      fraud_prevented_tmu: 2000000n,
      next_settlement_epoch: 'TIGER-EPOCH-2026-017',
    },
    proofs: proofs(),
  };
}

test('balanced certified truth report is content-addressed and owner-readable', () => {
  const report = generateTruthReport(balancedInput(), policy);
  assert.equal(report.overall_status, 'GREEN');
  assert.equal(report.money_integrity.headline, '100.000000% BALANCED');
  assert.equal(report.money_integrity.value_conservation, true);
  assert.equal(report.financial_authority, false);
  assert.match(report.report_id, /^TTR-[0-9a-f]{16}$/);
  assert.match(report.report_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(report.financial.collected_tmu, '100000000');
  assert.deepEqual(Object.keys(report.owner_signals), ['Money Integrity', 'Security Posture', 'Global Operations', 'Exposure Health', 'Compliance Health']);
  assert.ok(Object.values(report.owner_signals).every((value) => value === 'GREEN'));
});

test('financial imbalance is visible as RED and can never be presented as balanced', () => {
  const input = balancedInput();
  input.financial.refundable_tmu = 4000000n;
  const report = generateTruthReport(input, policy);
  assert.equal(report.overall_status, 'RED');
  assert.equal(report.money_integrity.value_conservation, false);
  assert.equal(report.money_integrity.headline, 'FINANCIAL INTEGRITY RED');
  assert.equal(report.owner_signals['Money Integrity'], 'RED');
});

test('missing, failed or stale proof makes affected sovereign signal RED', () => {
  const missing = balancedInput();
  delete missing.proofs.reconciliation;
  assert.equal(generateTruthReport(missing, policy).owner_signals['Money Integrity'], 'RED');

  const failed = balancedInput();
  failed.proofs.security_key_health.status = 'FAIL';
  assert.equal(generateTruthReport(failed, policy).owner_signals['Security Posture'], 'RED');

  const stale = balancedInput();
  stale.proofs.exposure_health.as_of = '2026-08-26T04:00:00.000Z';
  const staleReport = generateTruthReport(stale, policy);
  assert.equal(staleReport.owner_signals['Exposure Health'], 'RED');
  assert.ok(staleReport.proof_failures.some((item) => item.includes('STALE:exposure_health')));
});

test('report digest is deterministic for the same truth snapshot regardless of proof key ordering', () => {
  const first = balancedInput();
  const second = balancedInput();
  second.proofs = Object.fromEntries(Object.entries(second.proofs).reverse());
  const a = generateTruthReport(first, policy);
  const b = generateTruthReport(second, policy);
  assert.equal(a.report_digest, b.report_digest);
  assert.equal(a.report_id, b.report_id);
});
