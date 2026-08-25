'use strict';

const { allocatePurchase } = require('./financial-constitution.cjs');
const { verifyLockedClaim } = require('./sovereign-sale-claim.cjs');

function orchestratePurchaseSettlement(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_SETTLEMENT_INPUT_REQUIRED');
  if (Object.prototype.hasOwnProperty.call(input, 'sellerRole')) {
    throw new Error('TSN26_RAW_SELLER_ROLE_FORBIDDEN');
  }

  const { grossMicro, saleClaim } = input;

  if (saleClaim == null) {
    return Object.freeze({
      attribution: Object.freeze({ mode: 'DIRECT_PURCHASE', sellerUid: null, sellerRole: null, claimId: null }),
      allocation: allocatePurchase({ grossMicro, saleClaim: null }),
    });
  }

  if (!input.claimVerification || !input.claimVerification.publicKey || !input.claimVerification.now) {
    throw new Error('TSN26_CLAIM_VERIFICATION_CONTEXT_REQUIRED');
  }

  verifyLockedClaim(saleClaim, input.claimVerification);

  const allocation = allocatePurchase({
    grossMicro,
    saleClaim: saleClaim.sellerRole,
  });

  return Object.freeze({
    attribution: Object.freeze({
      mode: 'SALE_CLAIM',
      claimId: saleClaim.claimId,
      sellerUid: saleClaim.sellerUid,
      sellerRole: saleClaim.sellerRole,
    }),
    allocation,
  });
}

module.exports = { orchestratePurchaseSettlement };
