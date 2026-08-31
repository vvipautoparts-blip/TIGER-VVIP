'use strict';

const { CURRENT_OWNER_POLICY, isApprovedPriceJod } = require('../policy/current-owner-policy.cjs');
const { assertEligibleHumanSalesWinner } = require('../actors/financial-eligibility.cjs');
const MICRO_JOD_PER_JOD = 1_000_000;

function percentOf(amount, percent) {
  const result = amount * percent;
  if (!Number.isSafeInteger(result) || result % 100 !== 0) throw new Error('LEDGER_PRECISION_INVALID');
  return result / 100;
}

function immutableEntry({ account, percent, kind, reasonCode, amountMicroJod, actorId }) {
  const entry = { account, percent, amountMicroJod, kind, reasonCode };
  if (actorId) entry.actorId = actorId;
  return Object.freeze(entry);
}

function fixedAllocationSpecs() {
  return [
    ['OWNER_BASE', 5, 'OWNERSHIP_ENTITLEMENT', 'OWNER_BASE_SHARE'],
    ['PARTNER_1', 5, 'OWNERSHIP_ENTITLEMENT', 'PARTNER_1_SHARE'],
    ['PARTNER_2', 5, 'OWNERSHIP_ENTITLEMENT', 'PARTNER_2_SHARE'],
    ['PARTNER_3', 5, 'OWNERSHIP_ENTITLEMENT', 'PARTNER_3_SHARE'],
    ['RISK', 8, 'OPERATIONS_ALLOCATION', 'OPERATIONS_RISK'],
    ['MAINTENANCE', 8, 'OPERATIONS_ALLOCATION', 'OPERATIONS_MAINTENANCE'],
    ['DEVELOPMENT', 8, 'OPERATIONS_ALLOCATION', 'OPERATIONS_DEVELOPMENT'],
    ['TECHNICAL_SUPPORT', 8, 'OPERATIONS_ALLOCATION', 'OPERATIONS_TECHNICAL_SUPPORT'],
    ['ADVERTISING', 8, 'OPERATIONS_ALLOCATION', 'OPERATIONS_ADVERTISING'],
    ['CSR', 3, 'OPERATIONS_ALLOCATION', 'OPERATIONS_CSR'],
  ];
}

function quoteVisibilityPurchase({ priceJod, claimant }) {
  if (!isApprovedPriceJod(priceJod)) throw new Error('PRICE_NOT_APPROVED');
  let normalizedClaimant = 'NO_CLAIMANT';
  if (claimant !== 'NO_CLAIMANT') {
    if (!claimant || typeof claimant !== 'object' || Array.isArray(claimant)) throw new Error('CLAIMANT_INVALID');
    normalizedClaimant = assertEligibleHumanSalesWinner(claimant);
  }
  const grossMicroJod = priceJod * MICRO_JOD_PER_JOD;
  if (!Number.isSafeInteger(grossMicroJod)) throw new Error('PRICE_PRECISION_INVALID');
  const noClaimant = normalizedClaimant === 'NO_CLAIMANT';
  const discountMicroJod = noClaimant ? percentOf(grossMicroJod, CURRENT_OWNER_POLICY.finance.selfServiceDiscountPercent) : 0;
  const capturedMicroJod = grossMicroJod - discountMicroJod;
  const ledgerEntries = fixedAllocationSpecs().map(([account, percent, kind, reasonCode]) => immutableEntry({ account, percent, kind, reasonCode, amountMicroJod: percentOf(capturedMicroJod, percent) }));
  if (noClaimant) {
    ledgerEntries.push(immutableEntry({ account: 'OWNER_SALES_REROUTE', percent: 21, kind: 'SALES_REROUTE', reasonCode: 'NO_SALES_CLAIMANT', amountMicroJod: percentOf(capturedMicroJod, 21) }));
  } else {
    ledgerEntries.push(immutableEntry({ account: normalizedClaimant.role, actorId: normalizedClaimant.actorId, percent: 7, kind: 'SALES_COMMISSION', reasonCode: 'ONE_HUMAN_WINNER', amountMicroJod: percentOf(capturedMicroJod, 7) }));
    ledgerEntries.push(immutableEntry({ account: 'OWNER_SALES_REROUTE', percent: 14, kind: 'SALES_REROUTE', reasonCode: 'NON_WINNING_SALES_ROLES', amountMicroJod: percentOf(capturedMicroJod, 14) }));
  }
  ledgerEntries.push(immutableEntry({ account: CURRENT_OWNER_POLICY.finance.pendingOwnerReallocationAccount, percent: 16, kind: 'SUSPENSE', reasonCode: 'PENDING_OWNER_REALLOCATION', amountMicroJod: percentOf(capturedMicroJod, 16) }));
  const percentageTotal = ledgerEntries.reduce((total, entry) => total + entry.percent, 0);
  const ledgerTotalMicroJod = ledgerEntries.reduce((total, entry) => total + entry.amountMicroJod, 0);
  if (percentageTotal !== 100 || ledgerTotalMicroJod !== capturedMicroJod) throw new Error('LEDGER_NOT_BALANCED');
  const discountLedgerEntry = noClaimant ? Object.freeze({ kind: 'SELF_SERVICE_DISCOUNT', percent: CURRENT_OWNER_POLICY.finance.selfServiceDiscountPercent, amountMicroJod: discountMicroJod, reasonCode: 'NO_SALES_CLAIMANT' }) : null;
  return Object.freeze({
    grossMicroJod,
    discountMicroJod,
    capturedMicroJod,
    claimant: noClaimant ? 'NO_CLAIMANT' : Object.freeze({ actorId: normalizedClaimant.actorId, role: normalizedClaimant.role }),
    discountLedgerEntry,
    ledgerEntries: Object.freeze([...ledgerEntries]),
    ledgerTotalMicroJod,
  });
}

module.exports = Object.freeze({ MICRO_JOD_PER_JOD, percentOf, quoteVisibilityPurchase });
