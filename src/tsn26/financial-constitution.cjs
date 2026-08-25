'use strict';

// TSN-26 sovereign financial constitution.
// All monetary values are integer micro-units: 1 JOD = 1,000,000 internal units.
// Never use binary floating point for allocation or settlement.

const PPM = 1_000_000;

const CONSTITUTION = Object.freeze({
  ownerPct: 5,
  partner1Pct: 5,
  partner2Pct: 5,
  partner3Pct: 5,
  operationsPct: 43,
  taxRegulatoryReservePct: 16,
  salesPoolPct: 21,
  activeSellerPct: 7,
  selfServiceDiscountPct: 7,
});

const CLAIM_TO_KEY = Object.freeze({
  GENERAL_MANAGER: 'generalManager',
  SECTOR_MANAGER: 'sectorManager',
  MARKETER: 'marketer',
});

const VALID_CLAIMS = new Set(['NONE', ...Object.keys(CLAIM_TO_KEY)]);

function requireSafeIntegerMicros(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative safe integer in micro-units`);
  }
}

function pctOfMicros(amountMicros, pct) {
  requireSafeIntegerMicros(amountMicros, 'amountMicros');
  return Number((BigInt(amountMicros) * BigInt(pct)) / 100n);
}

function sumNumbers(values) {
  return values.reduce((total, value) => total + value, 0);
}

function allocatePurchase({ listAmountMicros, saleClaim }) {
  requireSafeIntegerMicros(listAmountMicros, 'listAmountMicros');
  if (!VALID_CLAIMS.has(saleClaim)) {
    throw new Error(`TSN26_INVALID_SALE_CLAIM:${String(saleClaim)}`);
  }

  const selfService = saleClaim === 'NONE';
  const discountMicros = selfService
    ? pctOfMicros(listAmountMicros, CONSTITUTION.selfServiceDiscountPct)
    : 0;
  const paidAmountMicros = listAmountMicros - discountMicros;

  const allocations = {
    owner: pctOfMicros(paidAmountMicros, CONSTITUTION.ownerPct),
    partners: {
      partner1: pctOfMicros(paidAmountMicros, CONSTITUTION.partner1Pct),
      partner2: pctOfMicros(paidAmountMicros, CONSTITUTION.partner2Pct),
      partner3: pctOfMicros(paidAmountMicros, CONSTITUTION.partner3Pct),
    },
    operations: pctOfMicros(paidAmountMicros, CONSTITUTION.operationsPct),
    taxRegulatoryReserve: pctOfMicros(paidAmountMicros, CONSTITUTION.taxRegulatoryReservePct),
    sales: {
      generalManager: 0,
      sectorManager: 0,
      marketer: 0,
      missingSales: 0,
    },
    roundingReserve: 0,
  };

  if (selfService) {
    allocations.sales.missingSales = pctOfMicros(paidAmountMicros, CONSTITUTION.salesPoolPct);
  } else {
    const beneficiaryKey = CLAIM_TO_KEY[saleClaim];
    allocations.sales[beneficiaryKey] = pctOfMicros(paidAmountMicros, CONSTITUTION.activeSellerPct);
    allocations.sales.missingSales = pctOfMicros(
      paidAmountMicros,
      CONSTITUTION.salesPoolPct - CONSTITUTION.activeSellerPct,
    );
  }

  const allocatedBeforeReserve = sumNumbers([
    allocations.owner,
    allocations.partners.partner1,
    allocations.partners.partner2,
    allocations.partners.partner3,
    allocations.operations,
    allocations.taxRegulatoryReserve,
    allocations.sales.generalManager,
    allocations.sales.sectorManager,
    allocations.sales.marketer,
    allocations.sales.missingSales,
  ]);

  allocations.roundingReserve = paidAmountMicros - allocatedBeforeReserve;

  const result = {
    constitutionVersion: 'TSN-26.1',
    listAmountMicros,
    discountMicros,
    paidAmountMicros,
    saleClaim,
    allocations,
    totalAllocatedMicros: paidAmountMicros,
  };

  assertConservation(result);
  return result;
}

function assertConservation(result) {
  const { allocations, paidAmountMicros } = result;
  const total = sumNumbers([
    allocations.owner,
    allocations.partners.partner1,
    allocations.partners.partner2,
    allocations.partners.partner3,
    allocations.operations,
    allocations.taxRegulatoryReserve,
    allocations.sales.generalManager,
    allocations.sales.sectorManager,
    allocations.sales.marketer,
    allocations.sales.missingSales,
    allocations.roundingReserve,
  ]);

  if (total !== paidAmountMicros) {
    throw new Error(`TSN26_CONSERVATION_BREACH:${total}:${paidAmountMicros}`);
  }

  const activeSellerCount = [
    allocations.sales.generalManager,
    allocations.sales.sectorManager,
    allocations.sales.marketer,
  ].filter((value) => value > 0).length;

  if (result.saleClaim === 'NONE' && activeSellerCount !== 0) {
    throw new Error('TSN26_SELF_SERVICE_SELLER_BREACH');
  }
  if (result.saleClaim !== 'NONE' && activeSellerCount !== 1) {
    throw new Error('TSN26_SINGLE_SELLER_BREACH');
  }

  return true;
}

module.exports = {
  PPM,
  CONSTITUTION,
  allocatePurchase,
  assertConservation,
};
