'use strict';

const { settleExposurePurchase } = require('../../scripts/tsn26/financial/constitution.cjs');
const { verifyLockedClaim } = require('./sovereign-sale-claim.cjs');

function canonicalOfferId(packageJod) {
  if (!Number.isInteger(packageJod)) throw new Error('TSN26_CANONICAL_PACKAGE_REQUIRED');
  return `T${packageJod}`;
}

function orchestratePurchaseSettlement(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_SETTLEMENT_INPUT_REQUIRED');
  if (Object.prototype.hasOwnProperty.call(input, 'sellerRole')) {
    throw new Error('TSN26_RAW_SELLER_ROLE_FORBIDDEN');
  }

  const packageJod = input.packageJod;
  const saleClaim = input.saleClaim;

  if (saleClaim == null) {
    return Object.freeze({
      attribution: Object.freeze({ mode: 'DIRECT_PURCHASE', sellerUid: null, sellerRole: null, claimId: null }),
      allocation: settleExposurePurchase({ package_jod: packageJod, sale_claims: [] }),
    });
  }

  if (!input.claimVerification || !input.claimVerification.publicKey || !input.claimVerification.now) {
    throw new Error('TSN26_CLAIM_VERIFICATION_CONTEXT_REQUIRED');
  }

  verifyLockedClaim(saleClaim, input.claimVerification);
  if (saleClaim.offerId !== canonicalOfferId(packageJod)) {
    throw new Error(`TSN26_CLAIM_OFFER_MISMATCH:${saleClaim.offerId}:${canonicalOfferId(packageJod)}`);
  }

  const allocation = settleExposurePurchase({
    package_jod: packageJod,
    sale_claims: [{ actor_type: saleClaim.sellerRole, actor_uid: saleClaim.sellerUid }],
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
