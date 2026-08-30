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

test('current finance authority totals exactly 100 percent', () => {
  const config = loadConfig();
  assert.equal(fs.existsSync(authorityPath), true);
  assert.deepEqual(config.mainDistributionPercent, {
    OWNER: 5,
    PARTNER_1: 5,
    PARTNER_2: 5,
    PARTNER_3: 5,
    ACTUAL_OPERATIONS: 43,
    TAX_RESERVE: 16,
    SALES_ADMINISTRATION: 21
  });
  assert.equal(Object.values(config.mainDistributionPercent).reduce((a, b) => a + b, 0), 100);
  const result = verify(config);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('operations and sales envelopes are exact', () => {
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

test('validator fails closed if distribution drifts', () => {
  const wrongMain = loadConfig();
  wrongMain.mainDistributionPercent.OWNER = 6;
  let result = verify(wrongMain);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('main distribution must total exactly 100 percent'));

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
