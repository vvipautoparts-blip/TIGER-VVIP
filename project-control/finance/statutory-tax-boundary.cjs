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

function buildStatutoryTaxBoundary({ displayedPriceMinor, taxQuote }) {
  if (!isNonNegativeSafeInteger(displayedPriceMinor)) {
    fail(
      'INVALID_DISPLAYED_PRICE',
      'Displayed price must be a non-negative safe integer in minor units.'
    );
  }

  assertVerifiedTaxQuote(taxQuote);

  if (taxQuote.taxAmountMinor > displayedPriceMinor) {
    fail(
      'STATUTORY_TAX_EXCEEDS_DISPLAYED_PRICE',
      'Included statutory tax cannot exceed the final displayed tax-inclusive price.'
    );
  }

  const platformRevenueMinor = displayedPriceMinor - taxQuote.taxAmountMinor;

  return Object.freeze({
    displayedPriceMinor,
    userTotalMinor: displayedPriceMinor,
    additionalTaxAtCaptureMinor: 0,
    pricePresentation: 'TAX_INCLUSIVE_FINAL',
    taxIncludedInDisplayedPrice: true,
    platformRevenueMinor,
    statutoryTaxMinor: taxQuote.taxAmountMinor,
    effectiveTaxRateBps: taxQuote.effectiveRateBps,
    jurisdiction: taxQuote.jurisdiction,
    taxSourceEvidenceId: taxQuote.sourceEvidenceId,
    distributionBasisMinor: platformRevenueMinor,
    taxExcludedFromDistribution: true,
    taxExcludedFromCommission: true
  });
}

module.exports = Object.freeze({
  StatutoryTaxBoundaryError,
  buildStatutoryTaxBoundary
});
