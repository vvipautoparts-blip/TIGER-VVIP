'use strict';

function requireNonNegativeBigInt(value, field) {
  if (typeof value !== 'bigint' || value < 0n) {
    throw new TypeError(`TSN26_INVALID_TREASURY_AMOUNT:${field}`);
  }
  return value;
}

function abs(value) {
  return value < 0n ? -value : value;
}

function reconcileCashTruth(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_RECONCILIATION_INPUT_REQUIRED');
  const ledgerCapturedTmu = requireNonNegativeBigInt(input.ledgerCapturedTmu, 'ledgerCapturedTmu');
  const providerCapturedTmu = requireNonNegativeBigInt(input.providerCapturedTmu, 'providerCapturedTmu');
  const ledgerRefundedTmu = requireNonNegativeBigInt(input.ledgerRefundedTmu, 'ledgerRefundedTmu');
  const providerRefundedTmu = requireNonNegativeBigInt(input.providerRefundedTmu, 'providerRefundedTmu');
  const ledgerPaidTmu = requireNonNegativeBigInt(input.ledgerPaidTmu, 'ledgerPaidTmu');
  const bankPaidTmu = requireNonNegativeBigInt(input.bankPaidTmu, 'bankPaidTmu');

  const variances = Object.freeze({
    captureTmu: ledgerCapturedTmu - providerCapturedTmu,
    refundTmu: ledgerRefundedTmu - providerRefundedTmu,
    payoutTmu: ledgerPaidTmu - bankPaidTmu,
  });
  const unexplainedVarianceTmu = variances.captureTmu + variances.refundTmu + variances.payoutTmu;
  const grossVarianceTmu = abs(variances.captureTmu) + abs(variances.refundTmu) + abs(variances.payoutTmu);

  return Object.freeze({
    status: grossVarianceTmu === 0n ? 'GREEN' : 'RED',
    variances,
    unexplainedVarianceTmu,
    grossVarianceTmu,
  });
}

function evaluateTreasuryLiquidity(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_TREASURY_INPUT_REQUIRED');
  const clearedCashTmu = requireNonNegativeBigInt(input.clearedCashTmu, 'clearedCashTmu');
  const restrictedCashTmu = requireNonNegativeBigInt(input.restrictedCashTmu, 'restrictedCashTmu');
  const refundReserveTmu = requireNonNegativeBigInt(input.refundReserveTmu, 'refundReserveTmu');
  const chargebackReserveTmu = requireNonNegativeBigInt(input.chargebackReserveTmu, 'chargebackReserveTmu');
  const unreconciledOutflowTmu = requireNonNegativeBigInt(input.unreconciledOutflowTmu, 'unreconciledOutflowTmu');
  const payoutDueTmu = requireNonNegativeBigInt(input.payoutDueTmu, 'payoutDueTmu');

  const deductionsTmu = restrictedCashTmu + refundReserveTmu + chargebackReserveTmu + unreconciledOutflowTmu;
  const usableLiquidityTmu = clearedCashTmu - deductionsTmu;
  const coverageSurplusTmu = usableLiquidityTmu - payoutDueTmu;

  return Object.freeze({
    status: usableLiquidityTmu >= payoutDueTmu && usableLiquidityTmu >= 0n ? 'GREEN' : 'RED',
    clearedCashTmu,
    deductionsTmu,
    usableLiquidityTmu,
    payoutDueTmu,
    coverageSurplusTmu,
  });
}

function assertTreasuryPayoutReady({ reconciliation, liquidity } = {}) {
  if (!reconciliation || reconciliation.status !== 'GREEN') {
    throw new Error('TSN26_RECONCILIATION_PROOF_FAILED');
  }
  if (!liquidity || liquidity.status !== 'GREEN') {
    throw new Error('TSN26_LIQUIDITY_PROOF_FAILED');
  }
  return true;
}

module.exports = {
  reconcileCashTruth,
  evaluateTreasuryLiquidity,
  assertTreasuryPayoutReady,
};
