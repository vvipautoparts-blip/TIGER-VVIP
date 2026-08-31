'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FinancialFirewallError,
  enforceFinancialActorPolicy,
  validateSaleOwnershipClaims,
  buildSalesAdministrationPlan,
  assertFinalDistributionExecutable
} = require('../project-control/finance/human-digital-financial-firewall.cjs');

const distribution = require('../config/finance/current-distribution.json');

function claim(role, overrides = {}) {
  return {
    actorType: 'HUMAN',
    status: 'ACTIVE',
    eligibility: 'ELIGIBLE',
    role,
    userId: `user-${role.toLowerCase()}`,
    ...overrides
  };
}

function assertFirewallCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof FinancialFirewallError);
    assert.equal(error.code, code);
    return true;
  });
}

test('every DIGITAL actor is normalized to zero financial benefit, including future digital roles', () => {
  const normalized = enforceFinancialActorPolicy({
    actorType: 'DIGITAL',
    role: 'DIGITAL_FUTURE_ROLE'
  });

  assert.equal(normalized.financialBeneficiary, false);
  assert.equal(normalized.commissionBps, 0);
  assert.equal(normalized.shareBps, 0);
  assert.equal(normalized.financialEntitlement, 0);
  assert.equal(normalized.payoutDestination, null);
  assert.equal(normalized.walletAllowed, false);
});

test('DIGITAL actors fail closed when any financial benefit is attempted', () => {
  for (const attempted of [
    { financialBeneficiary: true },
    { commissionBps: 1 },
    { shareBps: 1 },
    { financialEntitlement: 0.01 },
    { payoutDestination: 'acct-1' },
    { walletAllowed: true },
    { walletId: 'wallet-1' }
  ]) {
    assertFirewallCode(
      () => enforceFinancialActorPolicy({ actorType: 'DIGITAL', role: 'DIGITAL_GROWTH_GOVERNOR', ...attempted }),
      'DIGITAL_ACTOR_FINANCIAL_BENEFIT_PROHIBITED'
    );
  }
});

test('a DIGITAL actor can never own a sale claim', () => {
  assertFirewallCode(
    () => validateSaleOwnershipClaims([
      claim('MARKETER', { actorType: 'DIGITAL', role: 'DIGITAL_SALES_GOVERNOR' })
    ]),
    'DIGITAL_ACTOR_CANNOT_OWN_SALE'
  );
});

test('multiple sale claims fail closed instead of selecting a winner heuristically', () => {
  assertFirewallCode(
    () => validateSaleOwnershipClaims([claim('MARKETER'), claim('SECTOR_MANAGER')]),
    'AMBIGUOUS_MULTI_WINNER_SALE_CLAIM'
  );
});

test('inactive, ineligible, unknown-role, or unknown actor claims fail closed', () => {
  for (const invalid of [
    claim('MARKETER', { status: 'SUSPENDED' }),
    claim('MARKETER', { eligibility: 'INELIGIBLE' }),
    claim('OWNER'),
    claim('MARKETER', { actorType: 'SERVICE' })
  ]) {
    assertFirewallCode(() => validateSaleOwnershipClaims([invalid]), 'INELIGIBLE_SALE_CLAIM');
  }
});

test('one eligible human sales role receives only its reserved 7 percent and the other two route to OWNER', () => {
  for (const winnerRole of ['GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER']) {
    const winner = claim(winnerRole);
    const plan = buildSalesAdministrationPlan({ claims: [winner], distribution });

    assert.equal(plan.winnerRole, winnerRole);
    assert.equal(plan.selfServiceDiscountPercent, 0);
    assert.equal(plan.allocations.length, 3);
    assert.equal(plan.allocations.reduce((sum, item) => sum + item.percent, 0), 21);

    const winningAllocation = plan.allocations.find((item) => item.sourceRole === winnerRole);
    assert.equal(winningAllocation.beneficiaryType, 'HUMAN_SALES_ROLE');
    assert.equal(winningAllocation.beneficiaryUserId, winner.userId);
    assert.equal(winningAllocation.percent, 7);

    const nonWinners = plan.allocations.filter((item) => item.sourceRole !== winnerRole);
    assert.equal(nonWinners.length, 2);
    for (const item of nonWinners) {
      assert.equal(item.beneficiaryType, 'OWNER');
      assert.equal(item.percent, 7);
      assert.equal(item.reasonCode, 'NON_WINNING_SALES_ROLE');
    }
  }
});

test('no claimant uses self-service policy and routes all 21 percent sales administration to OWNER', () => {
  const plan = buildSalesAdministrationPlan({ claims: [], distribution });

  assert.equal(plan.winnerRole, null);
  assert.equal(plan.selfServiceDiscountPercent, 7);
  assert.equal(plan.allocations.reduce((sum, item) => sum + item.percent, 0), 21);
  for (const item of plan.allocations) {
    assert.equal(item.beneficiaryType, 'OWNER');
    assert.equal(item.reasonCode, 'ABSENT_SALES_ROLE');
  }
});

test('final distribution remains blocked while the owner has not reallocated the cancelled 16 percent', () => {
  assertFirewallCode(
    () => assertFinalDistributionExecutable(distribution),
    'PENDING_OWNER_REALLOCATION'
  );
});
