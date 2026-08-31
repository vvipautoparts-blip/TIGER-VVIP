'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const distribution = JSON.parse(
  fs.readFileSync(path.join(root, 'config/finance/current-distribution.json'), 'utf8')
);
const tax = require('../project-control/finance/statutory-tax-boundary.cjs');

function verifiedQuote({ taxAmountMinor, effectiveRateBps, id = 'tax-quote' }) {
  return {
    status: 'VERIFIED',
    taxAmountMinor,
    effectiveRateBps,
    jurisdiction: 'TEST-JURISDICTION',
    sourceEvidenceId: id
  };
}

test('machine authority defines one final tax-inclusive user price and keeps tax outside distribution', () => {
  const boundary = distribution.statutoryTaxBoundary;

  assert.equal(distribution.allocationBasis, 'PLATFORM_SERVICE_REVENUE_EXCLUDING_STATUTORY_TAX');
  assert.ok(boundary, 'statutoryTaxBoundary must be explicit current machine authority');
  assert.equal(boundary.pricePresentation, 'TAX_INCLUSIVE_FINAL');
  assert.equal(boundary.displayedPriceIsFinalCharge, true);
  assert.equal(boundary.taxIncludedInDisplayedPrice, true);
  assert.equal(boundary.additionalTaxAtCapture, false);
  assert.equal(boundary.taxQuoteAppliesToFinalDisplayedPrice, true);
  assert.equal(boundary.taxIsPlatformAllocation, false);
  assert.equal(boundary.taxIsCommissionable, false);
  assert.equal(boundary.taxIsPartnerShareable, false);
  assert.equal(boundary.taxIsOperationsRevenue, false);
  assert.equal(boundary.ownerDefinesLegalTaxRate, false);
  assert.equal(boundary.countryActivationIndependentFromTaxRate, true);
  assert.equal(boundary.zeroTaxAddsNothing, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      boundary,
      'userPaysVerifiedStatutoryTaxInAdditionToPlatformPrice'
    ),
    false,
    'superseded add-on-tax presentation must not remain in current authority'
  );
  assert.equal(
    boundary.canonicalEnforcementModule,
    'project-control/finance/statutory-tax-boundary.cjs'
  );
  assert.equal(boundary.unverifiedTaxQuoteBehavior, 'FAIL_CLOSED');
});

test('zero statutory tax leaves the final displayed price unchanged', () => {
  const result = tax.buildStatutoryTaxBoundary({
    displayedPriceMinor: 10000,
    taxQuote: verifiedQuote({ taxAmountMinor: 0, effectiveRateBps: 0, id: 'tax-quote-0' })
  });

  assert.equal(result.displayedPriceMinor, 10000);
  assert.equal(result.userTotalMinor, 10000);
  assert.equal(result.additionalTaxAtCaptureMinor, 0);
  assert.equal(result.platformRevenueMinor, 10000);
  assert.equal(result.statutoryTaxMinor, 0);
  assert.equal(result.distributionBasisMinor, 10000);
  assert.equal(result.taxIncludedInDisplayedPrice, true);
  assert.equal(result.pricePresentation, 'TAX_INCLUSIVE_FINAL');
});

test('verified statutory tax is separated from the final displayed price and never added again at capture', () => {
  const result = tax.buildStatutoryTaxBoundary({
    displayedPriceMinor: 10000,
    taxQuote: verifiedQuote({ taxAmountMinor: 1071, effectiveRateBps: 1200, id: 'tax-quote-12' })
  });

  assert.equal(result.displayedPriceMinor, 10000);
  assert.equal(result.userTotalMinor, 10000);
  assert.equal(result.additionalTaxAtCaptureMinor, 0);
  assert.equal(result.platformRevenueMinor, 8929);
  assert.equal(result.statutoryTaxMinor, 1071);
  assert.equal(result.distributionBasisMinor, 8929);
  assert.equal(result.taxExcludedFromDistribution, true);
  assert.equal(result.taxExcludedFromCommission, true);
});

test('included statutory tax cannot exceed the final displayed price', () => {
  assert.throws(
    () => tax.buildStatutoryTaxBoundary({
      displayedPriceMinor: 1000,
      taxQuote: verifiedQuote({ taxAmountMinor: 1001, effectiveRateBps: 1200 })
    }),
    (error) => error && error.code === 'STATUTORY_TAX_EXCEEDS_DISPLAYED_PRICE'
  );
});

test('TIGER does not invent the legal tax rate and unverified quotes fail closed', () => {
  assert.throws(
    () => tax.buildStatutoryTaxBoundary({
      displayedPriceMinor: 10000,
      taxQuote: {
        status: 'UNVERIFIED',
        taxAmountMinor: 1071,
        effectiveRateBps: 1200,
        jurisdiction: 'TEST',
        sourceEvidenceId: 'unverified-tax-quote'
      }
    }),
    (error) => error && error.code === 'UNVERIFIED_STATUTORY_TAX_QUOTE'
  );
});

test('former cancelled 16 percent is not reclassified as statutory tax', () => {
  assert.equal(distribution.cancelledAllocation.name, 'TAX_RESERVE');
  assert.equal(distribution.cancelledAllocation.status, 'CANCELLED_BY_LATEST_OWNER_DECISION');
  assert.equal(distribution.pendingOwnerDecisionPercent, 16);
  assert.equal(distribution.distributionExecutionAuthorized, false);
});
