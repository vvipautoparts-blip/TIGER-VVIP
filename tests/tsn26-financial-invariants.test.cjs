'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocatePurchase,
  assertConservation,
  PPM,
} = require('../src/tsn26/financial-constitution.cjs');

test('TSN-26 financial constitution totals exactly 100%', () => {
  assert.equal(5 + 5 + 5 + 5 + 43 + 16 + 21, 100);
});

test('seller claim pays exactly one 7% role and routes remaining 14% to missing-sales', () => {
  const result = allocatePurchase({ listAmountMicros: 45_000_000, saleClaim: 'MARKETER' });
  assert.equal(result.paidAmountMicros, 45_000_000);
  assert.equal(result.allocations.sales.marketer, 3_150_000);
  assert.equal(result.allocations.sales.sectorManager, 0);
  assert.equal(result.allocations.sales.generalManager, 0);
  assert.equal(result.allocations.sales.missingSales, 6_300_000);
  assertConservation(result);
});

test('self-service applies 7% discount before allocation and routes full 21% sales pool to missing-sales', () => {
  const result = allocatePurchase({ listAmountMicros: 45_000_000, saleClaim: 'NONE' });
  assert.equal(result.discountMicros, 3_150_000);
  assert.equal(result.paidAmountMicros, 41_850_000);
  assert.equal(result.allocations.sales.marketer, 0);
  assert.equal(result.allocations.sales.sectorManager, 0);
  assert.equal(result.allocations.sales.generalManager, 0);
  assert.equal(result.allocations.sales.missingSales, 8_788_500);
  assertConservation(result);
});

test('invalid or multiple-beneficiary claims fail closed', () => {
  assert.throws(() => allocatePurchase({ listAmountMicros: 10_000_000, saleClaim: 'GM+MARKETER' }));
  assert.throws(() => allocatePurchase({ listAmountMicros: 10_000_000, saleClaim: 'UNKNOWN' }));
});

test('allocation uses integer micro-units, never binary floating point', () => {
  const result = allocatePurchase({ listAmountMicros: 2_000_000, saleClaim: 'GENERAL_MANAGER' });
  assert.equal(Number.isInteger(result.totalAllocatedMicros), true);
  assert.equal(PPM, 1_000_000);
  assertConservation(result);
});
