'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TMU_PER_JOD,
  TSN26_CONSTITUTION,
  validateConstitution,
  settleExposurePurchase,
} = require('../scripts/tsn26/financial/constitution.cjs');

function sumValues(object) {
  return Object.values(object).reduce((sum, value) => sum + value, 0);
}

test('TSN-26 constitution is the exclusive exact 100% commercial allocation', () => {
  const result = validateConstitution(TSN26_CONSTITUTION);
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(sumValues(TSN26_CONSTITUTION.top_level_bps), 10_000);
  assert.deepEqual(TSN26_CONSTITUTION.top_level_bps, {
    OWNER: 500,
    PARTNER_1: 500,
    PARTNER_2: 500,
    PARTNER_3: 500,
    ACTUAL_OPERATIONS: 4300,
    FISCAL_REGULATORY_RESERVE: 1600,
    SALES_POOL: 2100,
  });
});

test('TSN-26 operations allocation is exactly 43% and never accepts legacy 49%', () => {
  assert.equal(sumValues(TSN26_CONSTITUTION.operations_bps), 4300);
  assert.deepEqual(TSN26_CONSTITUTION.operations_bps, {
    RISK: 800,
    MAINTENANCE: 800,
    DEVELOPMENT: 800,
    TECHNICAL_SUPPORT: 800,
    ADVERTISING: 800,
    CSR: 300,
  });
  assert.equal(Object.values(TSN26_CONSTITUTION).flatMap((value) =>
    value && typeof value === 'object' ? Object.values(value) : [value]
  ).includes(4900), false);
});

test('TSN-26 sales pool has three independent 7% slots and at most one paid actor', () => {
  assert.deepEqual(TSN26_CONSTITUTION.sales_slots_bps, {
    GENERAL_MANAGER: 700,
    SECTOR_MANAGER: 700,
    MARKETER: 700,
  });
  assert.equal(sumValues(TSN26_CONSTITUTION.sales_slots_bps), 2100);

  assert.throws(() => settleExposurePurchase({
    package_jod: 45,
    sale_claims: [
      { actor_type: 'MARKETER', actor_uid: 'm-1' },
      { actor_type: 'SECTOR_MANAGER', actor_uid: 's-1' },
    ],
  }), /one economic actor/i);
});

test('45 JOD marketer sale balances exactly to 45,000,000 TMU', () => {
  const settlement = settleExposurePurchase({
    package_jod: 45,
    sale_claims: [{ actor_type: 'MARKETER', actor_uid: 'marketer-001' }],
  });

  assert.equal(TMU_PER_JOD, 1_000_000n);
  assert.equal(settlement.list_price_tmu, 45_000_000n);
  assert.equal(settlement.discount_tmu, 0n);
  assert.equal(settlement.collected_tmu, 45_000_000n);
  assert.equal(settlement.allocations.OWNER, 2_250_000n);
  assert.equal(settlement.allocations.PARTNER_1, 2_250_000n);
  assert.equal(settlement.allocations.PARTNER_2, 2_250_000n);
  assert.equal(settlement.allocations.PARTNER_3, 2_250_000n);
  assert.equal(settlement.allocations.ACTUAL_OPERATIONS, 19_350_000n);
  assert.equal(settlement.allocations.FISCAL_REGULATORY_RESERVE, 7_200_000n);
  assert.equal(settlement.sales_slots.MARKETER.amount_tmu, 3_150_000n);
  assert.equal(settlement.sales_slots.MARKETER.status, 'PAID_TO_ACTOR');
  assert.equal(settlement.sales_slots.GENERAL_MANAGER.amount_tmu, 3_150_000n);
  assert.equal(settlement.sales_slots.GENERAL_MANAGER.status, 'ABSENT');
  assert.equal(settlement.sales_slots.SECTOR_MANAGER.amount_tmu, 3_150_000n);
  assert.equal(settlement.sales_slots.SECTOR_MANAGER.status, 'ABSENT');
  assert.equal(settlement.unexplained_variance_tmu, 0n);
  assert.equal(settlement.balanced, true);
});

test('45 JOD direct purchase applies 7% incentive before the 100% settlement', () => {
  const settlement = settleExposurePurchase({ package_jod: 45, sale_claims: [] });

  assert.equal(settlement.list_price_tmu, 45_000_000n);
  assert.equal(settlement.discount_tmu, 3_150_000n);
  assert.equal(settlement.collected_tmu, 41_850_000n);
  assert.equal(settlement.allocations.OWNER, 2_092_500n);
  assert.equal(settlement.allocations.PARTNER_1, 2_092_500n);
  assert.equal(settlement.allocations.PARTNER_2, 2_092_500n);
  assert.equal(settlement.allocations.PARTNER_3, 2_092_500n);
  assert.equal(settlement.allocations.ACTUAL_OPERATIONS, 17_995_500n);
  assert.equal(settlement.allocations.FISCAL_REGULATORY_RESERVE, 6_696_000n);
  assert.equal(settlement.sales_slots.GENERAL_MANAGER.amount_tmu, 2_929_500n);
  assert.equal(settlement.sales_slots.SECTOR_MANAGER.amount_tmu, 2_929_500n);
  assert.equal(settlement.sales_slots.MARKETER.amount_tmu, 2_929_500n);
  assert.ok(Object.values(settlement.sales_slots).every((slot) => slot.status === 'DIRECT_PURCHASE'));
  assert.equal(settlement.unexplained_variance_tmu, 0n);
  assert.equal(settlement.balanced, true);
});

test('only canonical T2/T10/T25/T45 packages are accepted', () => {
  for (const packageJod of [2, 10, 25, 45]) {
    assert.doesNotThrow(() => settleExposurePurchase({ package_jod: packageJod, sale_claims: [] }));
  }
  assert.throws(() => settleExposurePurchase({ package_jod: 20, sale_claims: [] }), /canonical package/i);
});
