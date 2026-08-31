'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeActor,
  financialEligibilityForActor,
  assertEligibleHumanSalesWinner,
} = require('../../domain/actors/financial-eligibility.cjs');

test('digital actor is permanently non-beneficiary with zero commission and no payout destination', () => {
  const actor = normalizeActor({
    actorId: 'dig_growth_001',
    actorClass: 'DIGITAL',
    role: 'DIGITAL_GROWTH_GOVERNOR',
    active: true,
    verified: true,
  });

  assert.deepEqual(financialEligibilityForActor(actor), {
    isFinancialBeneficiary: false,
    commissionEligible: false,
    partnerSharePercent: 0,
    salesCommissionPercent: 0,
    financialEntitlementMicroJod: 0,
    payoutDestination: null,
  });
});

test('digital actor can never be selected as a sales winner even when active and verified', () => {
  const actor = normalizeActor({
    actorId: 'dig_sales_001',
    actorClass: 'DIGITAL',
    role: 'MARKETER',
    active: true,
    verified: true,
  });
  assert.throws(() => assertEligibleHumanSalesWinner(actor), /DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN/);
});

test('only an active verified human in an approved sales role can be a sales winner', () => {
  const valid = normalizeActor({
    actorId: 'human_mkt_001', actorClass: 'HUMAN', role: 'MARKETER', active: true, verified: true,
  });
  assert.equal(assertEligibleHumanSalesWinner(valid).actorId, 'human_mkt_001');
  for (const invalid of [
    { actorId: 'h1', actorClass: 'HUMAN', role: 'CFO', active: true, verified: true },
    { actorId: 'h2', actorClass: 'HUMAN', role: 'MARKETER', active: false, verified: true },
    { actorId: 'h3', actorClass: 'HUMAN', role: 'MARKETER', active: true, verified: false },
  ]) {
    assert.throws(() => assertEligibleHumanSalesWinner(normalizeActor(invalid)), /HUMAN_SALES_WINNER_NOT_ELIGIBLE/);
  }
});

test('actor normalization rejects unknown actor classes and empty stable ids', () => {
  assert.throws(() => normalizeActor({ actorId: '', actorClass: 'HUMAN', role: 'MARKETER' }), /ACTOR_INVALID/);
  assert.throws(() => normalizeActor({ actorId: 'x', actorClass: 'ROBOT', role: 'MARKETER' }), /ACTOR_CLASS_INVALID/);
});
