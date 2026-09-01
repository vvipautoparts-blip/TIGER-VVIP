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

test('machine authority keeps platform base price independent and adds verified statutory tax on top', () => {
  const boundary = distribution.statutoryTaxBoundary;

  assert.equal(distribution.allocationBasis, 'PLATFORM_SERVICE_REVENUE_EXCLUDING_STATUTORY_TAX');
  assert.ok(boundary, 'statutoryTaxBoundary must be explicit current machine authority');
  assert.equal(boundary.pricePresentation, 'BASE_PLUS_STATUTORY_TAX');
  assert.equal(boundary.platformBasePriceIndependentFromStatutoryTax, true);
  assert.equal(boundary.countryTaxAddedToPlatformBasePrice, true);
  assert.equal(boundary.noTaxRateCeiling, true);
  assert.equal(boundary.taxIsPlatformAllocation, false);
  assert.equal(boundary.taxIsCommissionable, false);
  assert.equal(boundary.taxIsPartnerShareable, false);
  assert.equal(boundary.taxIsOperationsRevenue, false);
  assert.equal(boundary.ownerDefinesLegalTaxRate, false);
  assert.equal(boundary.countryActivationIndependentFromTaxRate, true);
  assert.equal(boundary.canonicalEnforcementModule, 'project-control/finance/statutory-tax-boundary.cjs');
  assert.equal(boundary.unverifiedTaxQuoteBehavior, 'FAIL_CLOSED');
  assert.equal(Object.prototype.hasOwnProperty.call(boundary, 'referencePriceIncludesBaselineTaxBps'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(boundary, 'removeBaselineTaxByDivision'), false);
});

test('12 percent country tax is added above the platform base price', () => {
  const result = tax.buildStatutoryTaxBoundary({
    basePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 1200, id: 'tax-quote-12' })
  });

  assert.equal(result.basePriceMinor, 1000);
  assert.equal(result.platformRevenueMinor, 1000);
  assert.equal(result.statutoryTaxMinor, 120);
  assert.equal(result.taxLiabilityMinor, 120);
  assert.equal(result.userTotalMinor, 1120);
  assert.equal(result.displayedPriceMinor, 1120);
  assert.equal(result.distributionBasisMinor, 1000);
  assert.equal(result.pricePresentation, 'BASE_PLUS_STATUTORY_TAX');
});

test('zero-tax country leaves the platform base price unchanged', () => {
  const result = tax.buildStatutoryTaxBoundary({
    basePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 0, id: 'tax-quote-0' })
  });

  assert.equal(result.statutoryTaxMinor, 0);
  assert.equal(result.userTotalMinor, 1000);
  assert.equal(result.distributionBasisMinor, 1000);
});

test('16 percent country tax is simply 16 percent above the base price, not a pricing baseline', () => {
  const result = tax.buildStatutoryTaxBoundary({
    basePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 1600, id: 'tax-quote-16' })
  });

  assert.equal(result.statutoryTaxMinor, 160);
  assert.equal(result.userTotalMinor, 1160);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'baselineIncludedTaxBps'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'untaxedBaseMinor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'referencePriceMinor'), false);
});

test('25 percent country tax has no artificial 16 percent ceiling', () => {
  const result = tax.buildStatutoryTaxBoundary({
    basePriceMinor: 1000,
    taxQuote: verifiedQuote({ effectiveRateBps: 2500, id: 'tax-quote-25' })
  });

  assert.equal(result.statutoryTaxMinor, 250);
  assert.equal(result.userTotalMinor, 1250);
});

test('TIGER does not invent the legal tax rate and unverified quotes fail closed', () => {
  assert.throws(
    () => tax.buildStatutoryTaxBoundary({
      basePriceMinor: 1000,
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

test('former cancelled internal 16 percent remains separate from statutory tax', () => {
  assert.equal(distribution.cancelledAllocation.name, 'TAX_RESERVE');
  assert.equal(distribution.cancelledAllocation.status, 'CANCELLED_BY_LATEST_OWNER_DECISION');
  assert.equal(distribution.cancelledAllocation.notStatutoryTax, true);
  assert.equal(distribution.pendingOwnerDecisionPercent, 16);
  assert.equal(distribution.distributionExecutionAuthorized, false);
});
