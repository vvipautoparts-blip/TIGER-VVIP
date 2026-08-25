'use strict';

const path = require('node:path');

const MANIFEST_PATH = path.resolve(__dirname, '../../config/tsn26/financial-constitution.v1.json');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertIntegerBps(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`TSN26_INVALID_BPS:${field}`);
  }
}

function sumBps(record, prefix) {
  if (!isPlainObject(record)) throw new Error(`TSN26_INVALID_CONSTITUTION_SECTION:${prefix}`);
  return Object.entries(record).reduce((sum, [key, value]) => {
    assertIntegerBps(value, `${prefix}.${key}`);
    return sum + value;
  }, 0);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function validateFinancialConstitution(input) {
  if (!isPlainObject(input)) throw new Error('TSN26_CONSTITUTION_REQUIRED');
  if (typeof input.id !== 'string' || !/^TFC-\d{4}\.\d{2}\.\d{3}$/.test(input.id)) {
    throw new Error('TSN26_INVALID_CONSTITUTION_ID');
  }
  if (input.schemaVersion !== 1) throw new Error('TSN26_UNSUPPORTED_CONSTITUTION_SCHEMA');
  if (input.status !== 'ACTIVE') throw new Error('TSN26_CONSTITUTION_NOT_ACTIVE');
  if (!Number.isFinite(Date.parse(input.effectiveFrom))) throw new Error('TSN26_INVALID_CONSTITUTION_EFFECTIVE_FROM');
  if (input.currencyBase !== 'JOD') throw new Error('TSN26_INVALID_CONSTITUTION_BASE_CURRENCY');
  if (input.microUnitsPerJod !== 1_000_000) throw new Error('TSN26_INVALID_MICRO_UNIT_SCALE');
  assertIntegerBps(input.directPurchaseDiscountBps, 'directPurchaseDiscountBps');
  if (input.directPurchaseDiscountBps !== 700 || input.directPurchaseDiscountTiming !== 'BEFORE_ALLOCATION') {
    throw new Error('TSN26_INVALID_DIRECT_PURCHASE_POLICY');
  }

  const allocationTotal = sumBps(input.allocationsBps, 'allocationsBps');
  if (allocationTotal !== 10_000) throw new Error(`TSN26_CONSTITUTION_NOT_100_PERCENT:${allocationTotal}`);

  const requiredAllocations = {
    owner: 500,
    partner1: 500,
    partner2: 500,
    partner3: 500,
    operations: 4300,
    fiscalRegulatoryReserve: 1600,
    salesPool: 2100,
  };
  for (const [key, expected] of Object.entries(requiredAllocations)) {
    if (input.allocationsBps?.[key] !== expected) {
      throw new Error(`TSN26_UNAPPROVED_CONSTITUTION_ALLOCATION:${key}`);
    }
  }

  const operationsTotal = sumBps(input.operationsBps, 'operationsBps');
  if (operationsTotal !== input.allocationsBps.operations) {
    throw new Error(`TSN26_OPERATIONS_BREAKDOWN_MISMATCH:${operationsTotal}`);
  }
  const requiredOperations = {
    risk: 800,
    maintenance: 800,
    development: 800,
    technicalSupport: 800,
    advertising: 800,
    csr: 300,
  };
  for (const [key, expected] of Object.entries(requiredOperations)) {
    if (input.operationsBps?.[key] !== expected) {
      throw new Error(`TSN26_UNAPPROVED_OPERATIONS_ALLOCATION:${key}`);
    }
  }

  const salesTotal = sumBps(input.salesSlotsBps, 'salesSlotsBps');
  if (salesTotal !== input.allocationsBps.salesPool) {
    throw new Error(`TSN26_SALES_POOL_BREAKDOWN_MISMATCH:${salesTotal}`);
  }
  for (const role of ['GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER']) {
    if (input.salesSlotsBps?.[role] !== 700) {
      throw new Error(`TSN26_UNAPPROVED_SALES_SLOT:${role}`);
    }
  }

  return true;
}

function loadActiveFinancialConstitution() {
  // require() gives us a deterministic repository-local JSON artifact. A future
  // constitution activation workflow may select another signed/versioned manifest,
  // but application code must never embed alternative commercial percentages.
  delete require.cache[require.resolve(MANIFEST_PATH)];
  const raw = require(MANIFEST_PATH);
  validateFinancialConstitution(raw);
  return deepFreeze(structuredClone(raw));
}

module.exports = {
  MANIFEST_PATH,
  loadActiveFinancialConstitution,
  validateFinancialConstitution,
};
