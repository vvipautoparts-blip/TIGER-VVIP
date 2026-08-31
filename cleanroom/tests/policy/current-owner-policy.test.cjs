'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CURRENT_OWNER_POLICY,
  isApprovedPriceJod,
} = require('../../domain/policy/current-owner-policy.cjs');

test('current policy contains only owner-approved prices and ten stable sectors', () => {
  assert.deepEqual(CURRENT_OWNER_POLICY.visibility.pricesJod, [2, 10, 20, 45]);
  assert.equal(isApprovedPriceJod(25), false);
  assert.equal(CURRENT_OWNER_POLICY.sectors.length, 10);
  assert.deepEqual(
    CURRENT_OWNER_POLICY.sectors.map((sector) => sector.id),
    Array.from({ length: 10 }, (_, i) => `SEC-${String(i + 1).padStart(3, '0')}`)
  );
});

test('finance policy is 84 percent assigned plus 16 percent pending, with no active TAX_RESERVE', () => {
  assert.equal(CURRENT_OWNER_POLICY.finance.knownAssignedPercent, 84);
  assert.equal(CURRENT_OWNER_POLICY.finance.pendingOwnerReallocationPercent, 16);
  assert.equal(CURRENT_OWNER_POLICY.finance.operationsPercent, 43);
  assert.equal(CURRENT_OWNER_POLICY.finance.salesAdministrationPercent, 21);
  assert.equal(Object.hasOwn(CURRENT_OWNER_POLICY.finance, 'TAX_RESERVE'), false);
});

test('user-facing pace labels are exactly the approved Arabic labels', () => {
  assert.deepEqual(CURRENT_OWNER_POLICY.visibility.paceLabelsAr, ['بطيء', 'جيد', 'سريع']);
});
