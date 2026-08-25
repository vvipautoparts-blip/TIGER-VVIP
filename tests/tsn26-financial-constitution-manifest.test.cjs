'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadActiveFinancialConstitution,
  validateFinancialConstitution,
} = require('../src/tsn26/financial-constitution-manifest.cjs');

test('TSN-26 active financial constitution is the single versioned source of truth', () => {
  const constitution = loadActiveFinancialConstitution();
  assert.equal(constitution.id, 'TFC-2026.08.001');
  assert.equal(constitution.schemaVersion, 1);
  assert.equal(constitution.status, 'ACTIVE');
  assert.equal(constitution.effectiveFrom, '2026-08-26T00:00:00.000Z');
  assert.equal(Object.isFrozen(constitution), true);
});

test('top-level allocations total exactly 10000 basis points', () => {
  const constitution = loadActiveFinancialConstitution();
  const total = Object.values(constitution.allocationsBps).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 10_000);
});

test('operations detail totals exactly the 43% operations allocation', () => {
  const constitution = loadActiveFinancialConstitution();
  const total = Object.values(constitution.operationsBps).reduce((sum, value) => sum + value, 0);
  assert.equal(total, constitution.allocationsBps.operations);
  assert.equal(total, 4_300);
});

test('sales slots total exactly the 21% sales pool and each slot is 7%', () => {
  const constitution = loadActiveFinancialConstitution();
  const slots = Object.values(constitution.salesSlotsBps);
  assert.deepEqual(slots, [700, 700, 700]);
  assert.equal(slots.reduce((sum, value) => sum + value, 0), constitution.allocationsBps.salesPool);
});

test('direct purchase incentive is exactly 7% and is explicit policy', () => {
  const constitution = loadActiveFinancialConstitution();
  assert.equal(constitution.directPurchaseDiscountBps, 700);
  assert.equal(constitution.directPurchaseDiscountTiming, 'BEFORE_ALLOCATION');
});

test('malformed or economically unbalanced constitutions fail closed', () => {
  const valid = loadActiveFinancialConstitution();
  const malformed = {
    ...valid,
    allocationsBps: { ...valid.allocationsBps, owner: 499 },
  };
  assert.throws(() => validateFinancialConstitution(malformed), /TSN26_CONSTITUTION_NOT_100_PERCENT/);
});
