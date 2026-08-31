'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config/finance/current-distribution.json');
const validatorPath = path.join(root, 'scripts/finance/verify-current-distribution.cjs');
const authorityPath = path.join(root, 'docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md');

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function verify(config) {
  return require(validatorPath).verifyCurrentDistribution(config);
}

test('latest owner finance decision cancels TAX_RESERVE without inventing a replacement allocation', () => {
  const config = loadConfig();
  assert.equal(fs.existsSync(authorityPath), true);
  assert.deepEqual(config.mainDistributionPercent, {
    OWNER: 5,
    PARTNER_1: 5,
    PARTNER_2: 5,
    PARTNER_3: 5,
    ACTUAL_OPERATIONS: 43,
    SALES_ADMINISTRATION: 21
  });
  assert.equal(Object.prototype.hasOwnProperty.call(config.mainDistributionPercent, 'TAX_RESERVE'), false);
  assert.equal(Object.values(config.mainDistributionPercent).reduce((a, b) => a + b, 0), 84);
  assert.deepEqual(config.cancelledAllocation, {
    name: 'TAX_RESERVE',
    formerPercent: 16,
    status: 'CANCELLED_BY_LATEST_OWNER_DECISION'
  });
  assert.equal(config.pendingOwnerDecisionPercent, 16);
  assert.equal(config.distributionState, 'INCOMPLETE_PENDING_OWNER_REALLOCATION');
  assert.equal(config.distributionExecutionAuthorized, false);
  assert.equal(config.ledgerDimensions.includes('TAX_RESERVE'), false);
  assert.equal(config.ledgerDimensions.includes('PENDING_OWNER_DECISION'), true);
  const result = verify(config);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('operations and sales envelopes remain exactly as approved', () => {
  const config = loadConfig();
  assert.deepEqual(config.actualOperationsPercent, {
    RISK_RESERVE: 8,
    MAINTENANCE: 8,
    DEVELOPMENT: 8,
    TECHNICAL_SUPPORT: 8,
    ADVERTISING: 8,
    CSR: 3
  });
  assert.equal(Object.values(config.actualOperationsPercent).reduce((a, b) => a + b, 0), 43);
  assert.deepEqual(config.salesAdministrationPercent, {
    GENERAL_MANAGER: 7,
    SECTOR_MANAGER: 7,
    MARKETER: 7
  });
  assert.equal(Object.values(config.salesAdministrationPercent).reduce((a, b) => a + b, 0), 21);
});

test('one sale has one winner and self-service gets 7 percent discount', () => {
  const config = loadConfig();
  assert.equal(config.oneSaleOneWinner, true);
  assert.equal(config.nonWinningSalesSharesRouteTo, 'OWNER');
  assert.equal(config.unassignedPartnerShareRoutesTo, 'OWNER');
  assert.equal(config.selfService.discountPercent, 7);
  assert.equal(config.selfService.appliesOnlyWhenNoSalesClaimant, true);
  assert.equal(config.selfService.salesCommissionPaid, false);
  assert.equal(config.selfService.salesAdministrationEnvelopeRoutesTo, 'OWNER');
});

test('payout rules are 14 days, 12 hour destination grace, immutable ledger', () => {
  const config = loadConfig();
  assert.equal(config.payout.settlementEveryDays, 14);
  assert.equal(config.payout.payoutDestinationRequired, true);
  assert.equal(config.payout.roleGrantGraceHours, 12);
  assert.equal(config.payout.ownerMayExtendGrace, true);
  assert.equal(config.payout.successfulSettlementZeroesPayableBalanceButPreservesLedger, true);
  assert.equal(config.historyPolicy, 'IMMUTABLE_LEDGER_NO_ERASURE');
});

test('validator fails closed on invented reallocation or restored TAX_RESERVE', () => {
  const restoredTax = loadConfig();
  restoredTax.mainDistributionPercent.TAX_RESERVE = 16;
  let result = verify(restoredTax);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('TAX_RESERVE must remain cancelled from the current distribution'));

  const inventedReallocation = loadConfig();
  inventedReallocation.mainDistributionPercent.OWNER = 21;
  result = verify(inventedReallocation);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('known current distribution must equal OWNER 5 + PARTNERS 15 + OPERATIONS 43 + SALES 21'));

  const executionEnabled = loadConfig();
  executionEnabled.distributionExecutionAuthorized = true;
  result = verify(executionEnabled);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('distribution execution must remain blocked until the owner reallocates the cancelled 16 percent'));

  const multiWinner = loadConfig();
  multiWinner.oneSaleOneWinner = false;
  result = verify(multiWinner);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('one sale must have one sales commission winner'));

  const wrongDiscount = loadConfig();
  wrongDiscount.selfService.discountPercent = 5;
  result = verify(wrongDiscount);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('self-service discount must be 7 percent'));
});
