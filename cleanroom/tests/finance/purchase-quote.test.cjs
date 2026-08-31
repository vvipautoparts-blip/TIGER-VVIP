'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeActor } = require('../../domain/actors/financial-eligibility.cjs');
const { quoteVisibilityPurchase } = require('../../domain/finance/purchase-quote.cjs');

function sum(entries) { return entries.reduce((total, entry) => total + entry.amountMicroJod, 0); }
function humanMarketer() {
  return normalizeActor({ actorId: 'mkt_001', actorClass: 'HUMAN', role: 'MARKETER', active: true, verified: true });
}

test('no claimant gives 7 percent discount and routes sales envelope away from commissions', () => {
  const quote = quoteVisibilityPurchase({ priceJod: 10, claimant: 'NO_CLAIMANT' });
  assert.equal(quote.grossMicroJod, 10_000_000);
  assert.equal(quote.discountMicroJod, 700_000);
  assert.equal(quote.capturedMicroJod, 9_300_000);
  assert.deepEqual(quote.discountLedgerEntry, { kind: 'SELF_SERVICE_DISCOUNT', percent: 7, amountMicroJod: 700_000, reasonCode: 'NO_SALES_CLAIMANT' });
  assert.equal(sum(quote.ledgerEntries), quote.capturedMicroJod);
  assert.equal(quote.ledgerEntries.some((e) => e.account === 'PENDING_OWNER_REALLOCATION' && e.percent === 16), true);
  assert.equal(quote.ledgerEntries.some((e) => e.account === 'TAX_RESERVE'), false);
  assert.equal(quote.ledgerEntries.filter((e) => e.kind === 'SALES_COMMISSION').length, 0);
});

test('one eligible human claimant suppresses discount and receives exactly one 7 percent commission', () => {
  const quote = quoteVisibilityPurchase({ priceJod: 20, claimant: humanMarketer() });
  assert.equal(quote.discountMicroJod, 0);
  assert.equal(quote.discountLedgerEntry, null);
  assert.equal(quote.capturedMicroJod, 20_000_000);
  const winners = quote.ledgerEntries.filter((e) => e.kind === 'SALES_COMMISSION');
  assert.deepEqual(winners.map((e) => [e.account, e.actorId, e.percent]), [['MARKETER', 'mkt_001', 7]]);
  assert.equal(sum(quote.ledgerEntries), quote.capturedMicroJod);
});

test('digital claimant is rejected before any financial benefit is constructed', () => {
  const digital = normalizeActor({ actorId: 'sales_gov_001', actorClass: 'DIGITAL', role: 'MARKETER', active: true, verified: true });
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 20, claimant: digital }), /DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN/);
});

test('rejects old price and ambiguous or role-only claimant', () => {
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 25, claimant: 'NO_CLAIMANT' }), /PRICE_NOT_APPROVED/);
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 10, claimant: ['MARKETER', 'GENERAL_MANAGER'] }), /CLAIMANT_INVALID/);
  assert.throws(() => quoteVisibilityPurchase({ priceJod: 10, claimant: 'MARKETER' }), /CLAIMANT_INVALID/);
});
