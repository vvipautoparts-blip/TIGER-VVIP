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

test('machine authority keeps statutory tax outside platform distribution', () => {
  const boundary = distribution.statutoryTaxBoundary;

  assert.equal(distribution.allocationBasis, 'PLATFORM_SERVICE_REVENUE_EXCLUDING_STATUTORY_TAX');
  assert.ok(boundary, 'statutoryTaxBoundary must be explicit current machine authority');
  assert.equal(boundary.taxIsPlatformAllocation, false);
  assert.equal(boundary.taxIsCommissionable, false);
  assert.equal(boundary.taxIsPartnerShareable, false);
  assert.equal(boundary.taxIsOperationsRevenue, false);
  assert.equal(boundary.ownerDefinesLegalTaxRate, false);
  assert.equal(boundary.countryActivationIndependentFromTaxRate, true);
  assert.equal(boundary.userPaysVerifiedStatutoryTaxInAdditionToPlatformPrice, true);
  assert.equal(boundary.zeroTaxAddsNothing, true);
  assert.equal(
    boundary.canonicalEnforcementModule,
    'project-control/finance/statutory-tax-boundary.cjs'
  );
  assert.equal(boundary.unverifiedTaxQuoteBehavior, 'FAIL_CLOSED');
});

test('zero statutory tax adds nothing to the user price', () => {
  const result = tax.buildStatutoryTaxBoundary({
    platformPriceMinor: 10000,
    taxQuote: {
      status: 'VERIFIED',
      taxAmountMinor: 0,
      effectiveRateBps: 0,
      jurisdiction: 'TEST-0',
      sourceEvidenceId: 'tax-quote-0'
    }
  });

  assert.equal(result.platformRevenueMinor, 10000);
  assert.equal(result.statutoryTaxMinor, 0);
  assert.equal(result.userTotalMinor, 10000);
  assert.equal(result.distributionBasisMinor, 10000);
  assert.equal(result.taxExcludedFromDistribution, true);
  assert.equal(result.taxExcludedFromCommission, true);
});

test('12 percent statutory tax is added to the user and excluded from distribution', () => {
  const result = tax.buildStatutoryTaxBoundary({
    platformPriceMinor: 10000,
    taxQuote: {
      status: 'VERIFIED',
      taxAmountMinor: 1200,
      effectiveRateBps: 1200,
      jurisdiction: 'TEST-12',
      sourceEvidenceId: 'tax-quote-12'
    }
  });

  assert.equal(result.platformRevenueMinor, 10000);
  assert.equal(result.statutoryTaxMinor, 1200);
  assert.equal(result.userTotalMinor, 11200);
  assert.equal(result.distributionBasisMinor, 10000);
  assert.equal(result.taxExcludedFromDistribution, true);
  assert.equal(result.taxExcludedFromCommission, true);
});

test('TIGER does not invent the legal tax rate and unverified quotes fail closed', () => {
  assert.throws(
    () => tax.buildStatutoryTaxBoundary({
      platformPriceMinor: 10000,
      taxQuote: {
        status: 'UNVERIFIED',
        taxAmountMinor: 1200,
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
