'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TMU_PER_JOD,
  TSN26_CONSTITUTION,
  settleExposurePurchase,
} = require('../scripts/tsn26/financial/constitution.cjs');

function sumTopLevel(settlement) {
  return Object.values(settlement.allocations).reduce((sum, value) => sum + value, 0n);
}

test('TSN-26 financial constitution totals exactly 100%', () => {
  const totalBps = Object.values(TSN26_CONSTITUTION.top_level_bps)
    .reduce((sum, value) => sum + value, 0);
  assert.equal(totalBps, 10_000);
});

test('seller claim pays exactly one 7% role and routes remaining slots as absence', () => {
  const result = settleExposurePurchase({
    package_jod: 45,
    sale_claims: [{ actor_type: 'MARKETER', actor_uid: 'seller-001' }],
  });
  assert.equal(result.collected_tmu, 45_000_000n);
  assert.equal(result.sales_slots.MARKETER.amount_tmu, 3_150_000n);
  assert.equal(result.sales_slots.MARKETER.status, 'PAID_TO_ACTOR');
  assert.equal(result.sales_slots.SECTOR_MANAGER.status, 'ABSENT');
  assert.equal(result.sales_slots.GENERAL_MANAGER.status, 'ABSENT');
  assert.equal(sumTopLevel(result), result.collected_tmu);
  assert.equal(result.unexplained_variance_tmu, 0n);
});

test('self-service applies 7% discount before allocation and marks all sales slots direct', () => {
  const result = settleExposurePurchase({ package_jod: 45, sale_claims: [] });
  assert.equal(result.discount_tmu, 3_150_000n);
  assert.equal(result.collected_tmu, 41_850_000n);
  assert.ok(Object.values(result.sales_slots).every((slot) => slot.status === 'DIRECT_PURCHASE'));
  assert.equal(result.allocations.SALES_POOL, 8_788_500n);
  assert.equal(sumTopLevel(result), result.collected_tmu);
  assert.equal(result.unexplained_variance_tmu, 0n);
});

test('invalid or multiple-beneficiary claims fail closed', () => {
  assert.throws(() => settleExposurePurchase({
    package_jod: 10,
    sale_claims: [{ actor_type: 'UNKNOWN', actor_uid: 'x' }],
  }));
  assert.throws(() => settleExposurePurchase({
    package_jod: 10,
    sale_claims: [
      { actor_type: 'GENERAL_MANAGER', actor_uid: 'gm-1' },
      { actor_type: 'MARKETER', actor_uid: 'm-1' },
    ],
  }));
});

test('allocation uses bigint TMU and never binary floating point', () => {
  const result = settleExposurePurchase({
    package_jod: 2,
    sale_claims: [{ actor_type: 'GENERAL_MANAGER', actor_uid: 'gm-1' }],
  });
  assert.equal(TMU_PER_JOD, 1_000_000n);
  assert.equal(typeof result.collected_tmu, 'bigint');
  assert.equal(result.unexplained_variance_tmu, 0n);
});
