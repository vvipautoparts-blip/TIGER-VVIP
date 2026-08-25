'use strict';

const { assertExternalPayoutEligible } = require('./payout-state-machine.cjs');
const { assertPayoutSchedulable } = require('./settlement-lifecycle.cjs');
const { assertTreasuryPayoutReady } = require('./treasury-reconciliation.cjs');

function authorizeExternalPayout({ settlement, payoutProfile, reconciliation, liquidity, at } = {}) {
  if (!settlement || !payoutProfile) throw new Error('TSN26_PAYOUT_AUTHORIZATION_INPUT_REQUIRED');
  assertPayoutSchedulable(settlement);
  assertExternalPayoutEligible(payoutProfile, { at });
  assertTreasuryPayoutReady({ reconciliation, liquidity });

  if (settlement.beneficiaryUid !== payoutProfile.subjectUid) {
    throw new Error('TSN26_PAYOUT_BENEFICIARY_MISMATCH');
  }
  if (settlement.currency !== 'JOD') {
    throw new Error(`TSN26_UNSUPPORTED_PAYOUT_CURRENCY:${settlement.currency}`);
  }
  if (typeof settlement.amountMicro !== 'bigint' || settlement.amountMicro <= 0n) {
    throw new Error('TSN26_INVALID_PAYOUT_AMOUNT');
  }

  return Object.freeze({
    authorized: true,
    settlementId: settlement.settlementId,
    beneficiaryUid: settlement.beneficiaryUid,
    amountMicro: settlement.amountMicro,
    currency: settlement.currency,
    destinationRef: payoutProfile.payoutDestinationRef,
    authorizedAt: new Date(Date.parse(at)).toISOString(),
    proofs: Object.freeze({
      settlementPayable: true,
      payoutProfileEligible: true,
      reconciliationGreen: true,
      liquidityGreen: true,
    }),
  });
}

module.exports = { authorizeExternalPayout };
