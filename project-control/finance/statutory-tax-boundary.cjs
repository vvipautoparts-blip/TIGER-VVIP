'use strict';

class StatutoryTaxBoundaryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StatutoryTaxBoundaryError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new StatutoryTaxBoundaryError(code, message);
}

function isNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertVerifiedTaxQuote(taxQuote) {
  if (!taxQuote || typeof taxQuote !== 'object' || Array.isArray(taxQuote)) {
    fail('INVALID_STATUTORY_TAX_QUOTE', 'A statutory tax quote object is required.');
  }

  if (taxQuote.status !== 'VERIFIED') {
    fail(
      'UNVERIFIED_STATUTORY_TAX_QUOTE',
      'TIGER must not invent or apply an unverified statutory tax amount.'
    );
  }

  if (
    !isNonNegativeSafeInteger(taxQuote.taxAmountMinor) ||
    !Number.isFinite(taxQuote.effectiveRateBps) ||
    taxQuote.effectiveRateBps < 0 ||
    !isNonEmptyString(taxQuote.jurisdiction) ||
    !isNonEmptyString(taxQuote.sourceEvidenceId)
  ) {
    fail(
      'INVALID_STATUTORY_TAX_QUOTE',
      'Verified tax quote requires non-negative tax amount/rate plus jurisdiction and source evidence.'
    );
  }
}

function buildStatutoryTaxBoundary({ platformPriceMinor, taxQuote }) {
  if (!isNonNegativeSafeInteger(platformPriceMinor)) {
    fail('INVALID_PLATFORM_PRICE', 'Platform price must be a non-negative safe integer in minor units.');
  }

  assertVerifiedTaxQuote(taxQuote);

  const userTotalMinor = platformPriceMinor + taxQuote.taxAmountMinor;
  if (!Number.isSafeInteger(userTotalMinor)) {
    fail('CHECKOUT_TOTAL_OVERFLOW', 'Checkout total exceeds safe integer bounds.');
  }

  return Object.freeze({
    platformRevenueMinor: platformPriceMinor,
    statutoryTaxMinor: taxQuote.taxAmountMinor,
    effectiveTaxRateBps: taxQuote.effectiveRateBps,
    jurisdiction: taxQuote.jurisdiction,
    taxSourceEvidenceId: taxQuote.sourceEvidenceId,
    userTotalMinor,
    distributionBasisMinor: platformPriceMinor,
    taxExcludedFromDistribution: true,
    taxExcludedFromCommission: true
  });
}

module.exports = Object.freeze({
  StatutoryTaxBoundaryError,
  buildStatutoryTaxBoundary
});
