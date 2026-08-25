'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reconcileCashTruth,
  evaluateTreasuryLiquidity,
  assertTreasuryPayoutReady,
} = require('../src/tsn26/treasury-reconciliation.cjs');

test('reconciliation is GREEN only when ledger, provider and bank cash truths match exactly', () => {
  const result = reconcileCashTruth({
    ledgerCapturedTmu: 100_000_000n,
    providerCapturedTmu: 100_000_000n,
    ledgerRefundedTmu: 5_000_000n,
    providerRefundedTmu: 5_000_000n,
    ledgerPaidTmu: 20_000_000n,
    bankPaidTmu: 20_000_000n,
  });
  assert.equal(result.status, 'GREEN');
  assert.equal(result.unexplainedVarianceTmu, 0n);
});

test('any reconciliation mismatch is RED and preserves the exact signed variances', () => {
  const result = reconcileCashTruth({
    ledgerCapturedTmu: 100_000_000n,
    providerCapturedTmu: 99_500_000n,
    ledgerRefundedTmu: 5_000_000n,
    providerRefundedTmu: 5_100_000n,
    ledgerPaidTmu: 20_000_000n,
    bankPaidTmu: 19_900_000n,
  });
  assert.equal(result.status, 'RED');
  assert.equal(result.variances.captureTmu, 500_000n);
  assert.equal(result.variances.refundTmu, -100_000n);
  assert.equal(result.variances.payoutTmu, 100_000n);
  assert.equal(result.unexplainedVarianceTmu, 500_000n);
});

test('treasury liquidity subtracts restricted cash and reserves before payout readiness', () => {
  const liquidity = evaluateTreasuryLiquidity({
    clearedCashTmu: 50_000_000n,
    restrictedCashTmu: 2_000_000n,
    refundReserveTmu: 3_000_000n,
    chargebackReserveTmu: 4_000_000n,
    unreconciledOutflowTmu: 1_000_000n,
    payoutDueTmu: 35_000_000n,
  });
  assert.equal(liquidity.usableLiquidityTmu, 40_000_000n);
  assert.equal(liquidity.coverageSurplusTmu, 5_000_000n);
  assert.equal(liquidity.status, 'GREEN');
});

test('payout readiness fails closed on either liquidity deficit or reconciliation mismatch', () => {
  const greenRecon = reconcileCashTruth({
    ledgerCapturedTmu: 50n,
    providerCapturedTmu: 50n,
    ledgerRefundedTmu: 0n,
    providerRefundedTmu: 0n,
    ledgerPaidTmu: 0n,
    bankPaidTmu: 0n,
  });
  const redLiquidity = evaluateTreasuryLiquidity({
    clearedCashTmu: 10n,
    restrictedCashTmu: 1n,
    refundReserveTmu: 1n,
    chargebackReserveTmu: 1n,
    unreconciledOutflowTmu: 0n,
    payoutDueTmu: 8n,
  });
  assert.throws(() => assertTreasuryPayoutReady({ reconciliation: greenRecon, liquidity: redLiquidity }), /TSN26_LIQUIDITY_PROOF_FAILED/);

  const redRecon = reconcileCashTruth({
    ledgerCapturedTmu: 50n,
    providerCapturedTmu: 49n,
    ledgerRefundedTmu: 0n,
    providerRefundedTmu: 0n,
    ledgerPaidTmu: 0n,
    bankPaidTmu: 0n,
  });
  const greenLiquidity = evaluateTreasuryLiquidity({
    clearedCashTmu: 10n,
    restrictedCashTmu: 0n,
    refundReserveTmu: 0n,
    chargebackReserveTmu: 0n,
    unreconciledOutflowTmu: 0n,
    payoutDueTmu: 8n,
  });
  assert.throws(() => assertTreasuryPayoutReady({ reconciliation: redRecon, liquidity: greenLiquidity }), /TSN26_RECONCILIATION_PROOF_FAILED/);
});
