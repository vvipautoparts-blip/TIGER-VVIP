'use strict';

const EXPECTED_MAIN = Object.freeze({
  OWNER: 5,
  PARTNER_1: 5,
  PARTNER_2: 5,
  PARTNER_3: 5,
  ACTUAL_OPERATIONS: 43,
  SALES_ADMINISTRATION: 21
});

const EXPECTED_OPERATIONS = Object.freeze({
  RISK_RESERVE: 8,
  MAINTENANCE: 8,
  DEVELOPMENT: 8,
  TECHNICAL_SUPPORT: 8,
  ADVERTISING: 8,
  CSR: 3
});

const EXPECTED_SALES = Object.freeze({
  GENERAL_MANAGER: 7,
  SECTOR_MANAGER: 7,
  MARKETER: 7
});

function exactObject(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) &&
    expectedKeys.every((key) => actual[key] === expected[key]);
}

function sumValues(value) {
  return Object.values(value || {}).reduce((sum, number) => sum + Number(number || 0), 0);
}

function verifyCurrentDistribution(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ok: false, errors: ['finance config must be an object'] };
  }

  if (config.schemaVersion !== 'TIGER_FINANCIAL_DISTRIBUTION_V2') errors.push('finance schemaVersion invalid');
  if (config.status !== 'CURRENT_ONLY') errors.push('finance status must be CURRENT_ONLY');
  if (config.ownerAuthority !== 'docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md') errors.push('finance owner authority path invalid');
  if (config.allocationBasis !== 'ACTUAL_CAPTURED_AMOUNT_AFTER_VALID_SELF_SERVICE_DISCOUNT') errors.push('finance allocation basis invalid');

  if (Object.prototype.hasOwnProperty.call(config.mainDistributionPercent || {}, 'TAX_RESERVE')) {
    errors.push('TAX_RESERVE must remain cancelled from the current distribution');
  }
  if (!exactObject(config.mainDistributionPercent, EXPECTED_MAIN)) {
    errors.push('known current distribution must equal OWNER 5 + PARTNERS 15 + OPERATIONS 43 + SALES 21');
  }
  if (sumValues(config.mainDistributionPercent) !== 84) errors.push('known current allocation must total exactly 84 percent');

  const cancelled = config.cancelledAllocation || {};
  if (cancelled.name !== 'TAX_RESERVE' || cancelled.formerPercent !== 16 || cancelled.status !== 'CANCELLED_BY_LATEST_OWNER_DECISION') {
    errors.push('cancelled TAX_RESERVE record must preserve the latest owner decision');
  }
  if (config.pendingOwnerDecisionPercent !== 16) errors.push('cancelled 16 percent must remain pending explicit owner reallocation');
  if (config.distributionState !== 'INCOMPLETE_PENDING_OWNER_REALLOCATION') errors.push('distribution state must remain incomplete pending owner reallocation');
  if (config.distributionExecutionAuthorized !== false) errors.push('distribution execution must remain blocked until the owner reallocates the cancelled 16 percent');

  if (!exactObject(config.actualOperationsPercent, EXPECTED_OPERATIONS)) errors.push('operations distribution must equal 8+8+8+8+8+3');
  if (sumValues(config.actualOperationsPercent) !== 43) errors.push('operations distribution must total exactly 43 percent');

  if (!exactObject(config.salesAdministrationPercent, EXPECTED_SALES)) errors.push('sales administration must equal 7+7+7');
  if (sumValues(config.salesAdministrationPercent) !== 21) errors.push('sales administration must total exactly 21 percent');

  if (config.oneSaleOneWinner !== true) errors.push('one sale must have one sales commission winner');
  if (config.nonWinningSalesSharesRouteTo !== 'OWNER') errors.push('non-winning sales shares must route to OWNER');
  if (config.unassignedPartnerShareRoutesTo !== 'OWNER') errors.push('unassigned partner shares must route to OWNER');

  const self = config.selfService || {};
  if (self.discountPercent !== 7) errors.push('self-service discount must be 7 percent');
  if (self.appliesOnlyWhenNoSalesClaimant !== true) errors.push('self-service discount must require no sales claimant');
  if (self.salesCommissionPaid !== false) errors.push('self-service purchase must not pay a sales commission');
  if (self.salesAdministrationEnvelopeRoutesTo !== 'OWNER') errors.push('self-service sales envelope must route to OWNER');

  const payout = config.payout || {};
  if (payout.settlementEveryDays !== 14) errors.push('commission settlement cadence must be 14 days');
  if (payout.payoutDestinationRequired !== true) errors.push('payout destination must be required');
  if (payout.roleGrantGraceHours !== 12) errors.push('role payout grace must be 12 hours');
  if (payout.ownerMayExtendGrace !== true) errors.push('owner must be able to extend payout grace');
  if (payout.successfulSettlementZeroesPayableBalanceButPreservesLedger !== true) errors.push('settlement must preserve immutable ledger history');

  const dimensions = Array.isArray(config.ledgerDimensions) ? config.ledgerDimensions : [];
  if (dimensions.includes('TAX_RESERVE')) errors.push('TAX_RESERVE ledger dimension must be absent from current allocation');
  if (!dimensions.includes('PENDING_OWNER_DECISION')) errors.push('pending owner decision ledger dimension missing');

  if (config.financialInvariant !== 'NO_TAX_RESERVE_NO_INVENTED_REALLOCATION') errors.push('latest finance invariant missing');
  if (config.operationsInvariant !== 'ACTUAL_OPERATIONS_EQUALS_43_PERCENT') errors.push('43 percent operations invariant missing');
  if (config.salesInvariant !== 'SALES_ADMINISTRATION_EQUALS_21_PERCENT') errors.push('21 percent sales invariant missing');
  if (config.historyPolicy !== 'IMMUTABLE_LEDGER_NO_ERASURE') errors.push('immutable ledger history policy missing');

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({
  verifyCurrentDistribution,
  EXPECTED_MAIN,
  EXPECTED_OPERATIONS,
  EXPECTED_SALES
});
