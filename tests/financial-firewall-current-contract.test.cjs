'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const distribution = JSON.parse(
  fs.readFileSync(path.join(root, 'config/finance/current-distribution.json'), 'utf8')
);

test('current finance config declares a fail-closed human/digital financial firewall', () => {
  const firewall = distribution.humanDigitalFinancialFirewall;

  assert.ok(firewall, 'humanDigitalFinancialFirewall must be explicit current machine authority');
  assert.equal(firewall.digitalActorType, 'DIGITAL');
  assert.equal(firewall.financialBeneficiary, false);
  assert.equal(firewall.commissionBps, 0);
  assert.equal(firewall.shareBps, 0);
  assert.equal(firewall.financialEntitlement, 0);
  assert.equal(firewall.payoutDestination, null);
  assert.equal(firewall.walletAllowed, false);
  assert.equal(firewall.digitalSaleOwnershipAllowed, false);
});

test('firewall addition cannot invent a beneficiary for the unresolved 16 percent', () => {
  assert.equal(distribution.pendingOwnerDecisionPercent, 16);
  assert.equal(distribution.distributionExecutionAuthorized, false);
  assert.equal(distribution.cancelledAllocation.name, 'TAX_RESERVE');
  assert.equal(distribution.cancelledAllocation.status, 'CANCELLED_BY_LATEST_OWNER_DECISION');
});
