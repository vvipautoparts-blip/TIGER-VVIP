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

function verifiedQuote({ effectiveRateBps, id = 'tax-quote' }) {
  return {
    status: 'VERIFIED',
    effectiveRateBps,
    jurisdiction: 'TEST-JURISDICTION',
    sourceEvidenceId: id
  };
}

test('machine authority rebases reference prices that include 16 percent to the verified country tax', () => {
  const boundary = distribution.statutoryTaxBoundary;

  assert.equal(distribution.allocationBasis, 'PLATFORM_SERVICE_REVENUE_EXCLUDING_STATUTORY_TAX');
  assert.ok(boundary, 'statutoryTaxBoundary must be explicit current machine authority');
  assert.equal(boundary.pricePresentation, 'COUNTRY_TAX_REBASED_FINAL');
  assert.equal(boundary.referencePriceIncludesBaselineTaxBps, 1600);
  assert.equal(boundary.removeBaselineTaxByDivision, true);
  assert.equal(boundary.countryTaxAppliedToUntaxedBase, true);
  assert.equal(boundary.displayedCountryPriceIsFinalCharge, true);
  assert.equal(boundary.taxIncludedInDisplayedCountryPrice, true);
  assert.equal(boundary.additionalTaxAtCapture, false);
  assert.equal(boundary.taxIsPlatformAllocation, false);
  assert.equal(boundary.taxIsCommissionable, false);
  assert.equal(boundary.taxIsPartnerShareable, false);
  assert.equal(boundary.taxIsOperationsRevenue, false);
  assert.equal(boundary.ownerDefinesLegalTaxRate, false);
  assert.equal(boundary.countryActivationIndependentFromTaxRate, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(boundary, 'taxQuoteAppliesToFinalDisplayedPrice'),
    false,
    'superseded fixed final-price extraction rule must not remain in current authority'
  );
  assert.equal(
    boundary.canonicalEnforcementModule,
    'project-control/finance/statutory-tax-boundary.cjs'
  );
  assert.equal(boundary.unverifiedTaxQuoteBehavior, 'FAIL_CLOSED');
});

test('12 percent country tax replaces the included 16 percent baseline', () => {
  const result = tax.buildStatutoryTaxBoundary({
    referencePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 1200, id: 'tax-quote-12' })
  });

  assert.equal(result.referencePriceMinor, 1000);
  assert.equal(result.baselineIncludedTaxBps, 1600);
  assert.equal(result.untaxedBaseMinor, 862);
  assert.equal(result.platformRevenueMinor, 862);
  assert.equal(result.statutoryTaxMinor, 103);
  assert.equal(result.userTotalMinor, 965);
  assert.equal(result.displayedPriceMinor, 965);
  assert.equal(result.distributionBasisMinor, 862);
  assert.equal(result.additionalTaxAtCaptureMinor, 0);
  assert.equal(result.pricePresentation, 'COUNTRY_TAX_REBASED_FINAL');
});

test('16 percent country tax returns the original reference price', () => {
  const result = tax.buildStatutoryTaxBoundary({
    referencePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 1600, id: 'tax-quote-16' })
  });

  assert.equal(result.untaxedBaseMinor, 862);
  assert.equal(result.statutoryTaxMinor, 138);
  assert.equal(result.userTotalMinor, 1000);
});

test('zero-tax country removes the included 16 percent and adds nothing back', () => {
  const result = tax.buildStatutoryTaxBoundary({
    referencePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 0, id: 'tax-quote-0' })
  });

  assert.equal(result.untaxedBaseMinor, 862);
  assert.equal(result.statutoryTaxMinor, 0);
  assert.equal(result.userTotalMinor, 862);
  assert.equal(result.distributionBasisMinor, 862);
});

test('20 percent country tax increases the user price above the 16 percent reference', () => {
  const result = tax.buildStatutoryTaxBoundary({
    referencePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 2000, id: 'tax-quote-20' })
  });

  assert.equal(result.untaxedBaseMinor, 862);
  assert.equal(result.statutoryTaxMinor, 172);
  assert.equal(result.userTotalMinor, 1034);
});

test('TIGER does not invent the legal tax rate and unverified quotes fail closed', () => {
  assert.throws(
    () => tax.buildStatutoryTaxBoundary({
      referencePriceMinor: 1000,
      taxQuote: {
        status: 'UNVERIFIED',
        effectiveRateBps: 1200,
        jurisdiction: 'TEST',
        sourceEvidenceId: 'unverified-tax-quote'
      }
    }),
    (error) => error && error.code === 'UNVERIFIED_STATUTORY_TAX_QUOTE'
  );
});

test('former cancelled internal 16 percent remains separate from the 16 percent price baseline', () => {
  assert.equal(distribution.cancelledAllocation.name, 'TAX_RESERVE');
  assert.equal(distribution.cancelledAllocation.status, 'CANCELLED_BY_LATEST_OWNER_DECISION');
  assert.equal(distribution.cancelledAllocation.notStatutoryTax, true);
  assert.equal(distribution.pendingOwnerDecisionPercent, 16);
  assert.equal(distribution.distributionExecutionAuthorized, false);
});
