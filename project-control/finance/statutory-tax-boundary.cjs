'use strict';

const BPS_DENOMINATOR = 10000;

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
      'TIGER must not invent or apply an unverified statutory tax rate.'
    );
  }

  if (
    !Number.isFinite(taxQuote.effectiveRateBps) ||
    taxQuote.effectiveRateBps < 0 ||
    !isNonEmptyString(taxQuote.jurisdiction) ||
    !isNonEmptyString(taxQuote.sourceEvidenceId)
  ) {
    fail(
      'INVALID_STATUTORY_TAX_QUOTE',
      'Verified tax quote requires a non-negative effective tax rate plus jurisdiction and source evidence.'
    );
  }
}

function roundMinor(value) {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    fail('CHECKOUT_TOTAL_OVERFLOW', 'Calculated monetary value exceeds safe integer bounds.');
  }
  return rounded;
}

function buildStatutoryTaxBoundary({ basePriceMinor, taxQuote }) {
  if (!isNonNegativeSafeInteger(basePriceMinor)) {
    fail(
      'INVALID_BASE_PRICE',
      'Platform base price must be a non-negative safe integer in minor units.'
    );
  }

  assertVerifiedTaxQuote(taxQuote);

  const statutoryTaxMinor = roundMinor(
    basePriceMinor * taxQuote.effectiveRateBps / BPS_DENOMINATOR
  );
  const userTotalMinor = basePriceMinor + statutoryTaxMinor;

  if (!Number.isSafeInteger(userTotalMinor)) {
    fail('CHECKOUT_TOTAL_OVERFLOW', 'Checkout total exceeds safe integer bounds.');
  }

  return Object.freeze({
    basePriceMinor,
    statutoryTaxMinor,
    effectiveTaxRateBps: taxQuote.effectiveRateBps,
    jurisdiction: taxQuote.jurisdiction,
    taxSourceEvidenceId: taxQuote.sourceEvidenceId,
    userTotalMinor,
    displayedPriceMinor: userTotalMinor,
    pricePresentation: 'BASE_PLUS_STATUTORY_TAX',
    taxAddedToBasePrice: true,
    platformRevenueMinor: basePriceMinor,
    distributionBasisMinor: basePriceMinor,
    taxLiabilityMinor: statutoryTaxMinor,
    taxExcludedFromDistribution: true,
    taxExcludedFromCommission: true
  });
}

module.exports = Object.freeze({
  StatutoryTaxBoundaryError,
  buildStatutoryTaxBoundary
});
