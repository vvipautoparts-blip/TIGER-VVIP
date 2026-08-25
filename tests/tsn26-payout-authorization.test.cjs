'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPayoutProfile,
  transitionPayoutProfile,
} = require('../src/tsn26/payout-state-machine.cjs');
const {
  createSettlement,
  transitionSettlement,
} = require('../src/tsn26/settlement-lifecycle.cjs');
const {
  reconcileCashTruth,
  evaluateTreasuryLiquidity,
} = require('../src/tsn26/treasury-reconciliation.cjs');
const { authorizeExternalPayout } = require('../src/tsn26/payout-authorization.cjs');

function activeProfile() {
  let profile = createPayoutProfile({ subjectUid: 'seller-001', role: 'MARKETER', grantedAt: '2026-08-26T00:00:00.000Z' });
  profile = transitionPayoutProfile(profile, { event: 'IDENTITY_VALIDATED', at: '2026-08-26T00:05:00.000Z', actorUid: 'identity-service' });
  return transitionPayoutProfile(profile, {
    event: 'PAYOUT_DESTINATION_VERIFIED',
    at: '2026-08-26T00:06:00.000Z',
    actorUid: 'payout-verifier',
    destinationRef: 'dest-token-001',
  });
}

function payableSettlement() {
  let item = createSettlement({
    settlementId: 'settlement-001', transactionId: 'tx-001', beneficiaryUid: 'seller-001',
    amountMicro: 3_150_000n, currency: 'JOD', allocatedAt: '2026-08-26T00:00:00.000Z',
  });
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'VEST', at: '2026-08-26T00:02:00.000Z', actorUid: 'settlement-engine' });
  return transitionSettlement(item, { event: 'MAKE_PAYABLE', at: '2026-09-09T00:00:00.000Z', actorUid: 'settlement-engine' });
}

function greenReconciliation() {
  return reconcileCashTruth({
    ledgerCapturedTmu: 50_000_000n, providerCapturedTmu: 50_000_000n,
    ledgerRefundedTmu: 0n, providerRefundedTmu: 0n,
    ledgerPaidTmu: 0n, bankPaidTmu: 0n,
  });
}

function greenLiquidity() {
  return evaluateTreasuryLiquidity({
    clearedCashTmu: 20_000_000n, restrictedCashTmu: 1_000_000n,
    refundReserveTmu: 1_000_000n, chargebackReserveTmu: 1_000_000n,
    unreconciledOutflowTmu: 0n, payoutDueTmu: 3_150_000n,
  });
}

test('external payout is authorized only when all sovereign proofs are green', () => {
  const result = authorizeExternalPayout({
    settlement: payableSettlement(), payoutProfile: activeProfile(),
    reconciliation: greenReconciliation(), liquidity: greenLiquidity(),
    at: '2026-09-09T00:00:01.000Z',
  });
  assert.equal(result.authorized, true);
  assert.equal(result.settlementId, 'settlement-001');
  assert.equal(result.beneficiaryUid, 'seller-001');
  assert.equal(result.amountMicro, 3_150_000n);
  assert.equal(result.destinationRef, 'dest-token-001');
});

test('beneficiary mismatch between settlement and payout profile fails closed', () => {
  const profile = { ...activeProfile(), subjectUid: 'attacker-001' };
  assert.throws(() => authorizeExternalPayout({
    settlement: payableSettlement(), payoutProfile: profile,
    reconciliation: greenReconciliation(), liquidity: greenLiquidity(), at: '2026-09-09T00:00:01.000Z',
  }), /TSN26_PAYOUT_BENEFICIARY_MISMATCH/);
});

test('held/non-payable settlement, invalid profile, or treasury RED blocks payout', () => {
  const pending = createSettlement({
    settlementId: 'settlement-pending', transactionId: 'tx-pending', beneficiaryUid: 'seller-001',
    amountMicro: 3_150_000n, currency: 'JOD', allocatedAt: '2026-08-26T00:00:00.000Z',
  });
  assert.throws(() => authorizeExternalPayout({
    settlement: pending, payoutProfile: activeProfile(), reconciliation: greenReconciliation(), liquidity: greenLiquidity(), at: '2026-09-09T00:00:01.000Z',
  }), /TSN26_SETTLEMENT_NOT_PAYABLE/);

  const redRecon = reconcileCashTruth({
    ledgerCapturedTmu: 10n, providerCapturedTmu: 9n,
    ledgerRefundedTmu: 0n, providerRefundedTmu: 0n, ledgerPaidTmu: 0n, bankPaidTmu: 0n,
  });
  assert.throws(() => authorizeExternalPayout({
    settlement: payableSettlement(), payoutProfile: activeProfile(), reconciliation: redRecon, liquidity: greenLiquidity(), at: '2026-09-09T00:00:01.000Z',
  }), /TSN26_RECONCILIATION_PROOF_FAILED/);
});
