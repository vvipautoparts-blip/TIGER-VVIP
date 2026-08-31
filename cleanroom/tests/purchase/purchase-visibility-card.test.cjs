'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeActor } = require('../../domain/actors/financial-eligibility.cjs');
const { purchaseVisibilityCard } = require('../../domain/purchase/purchase-visibility-card.cjs');

function fakeDeps() {
  const saved = new Map();
  const captures = [];
  const events = [];
  return {
    captures, events,
    sectorRegistry: { requireActive(id) { if (id !== 'SEC-001') throw new Error('SECTOR_NOT_ACTIVE'); return { id }; } },
    cardCatalog: { resolve({ priceJod }) { return { offerId: `offer_${priceJod}`, priceJod, purchasedQuota: 100 }; } },
    payment: { async capture(input) { captures.push(input); return { ok: true, paymentId: 'pay_1' }; } },
    idempotency: { get(key) { return saved.get(key) || null; }, put(key, value) { saved.set(key, value); } },
    audit: { append(event) { events.push(event); } },
  };
}

const baseCommand = Object.freeze({
  idempotencyKey: 'buy_001',
  session: { userId: 'u1', externalProvider: 'x', externalSubject: 's1', sessionId: 'sess1' },
  post: { postId: 'p1', state: 'READY_FOR_CARD' },
  sectorId: 'SEC-001', priceJod: 10, claimant: 'NO_CLAIMANT', paidAt: '2026-08-31T15:00:00.000Z',
});

test('successful purchase captures once, uses server catalog quota, creates paid card, balanced ledger and active post', async () => {
  const deps = fakeDeps();
  const result = await purchaseVisibilityCard(baseCommand, deps);
  assert.equal(result.ok, true);
  assert.equal(result.card.offerId, 'offer_10');
  assert.equal(result.card.purchasedQuota, 100);
  assert.equal(result.card.state, 'ACTIVE');
  assert.equal(result.post.state, 'ACTIVE');
  assert.equal(result.quote.ledgerTotalMicroJod, result.quote.capturedMicroJod);
  assert.equal(deps.captures.length, 1);
  assert.equal(deps.events.some((e) => e.type === 'SELF_SERVICE_DISCOUNT_RECORDED'), true);
});

test('public command cannot invent purchased quota or quota', async () => {
  for (const injected of [{ purchasedQuota: 999999 }, { quota: 999999 }]) {
    const deps = fakeDeps();
    assert.deepEqual(await purchaseVisibilityCard({ ...baseCommand, ...injected }, deps), { ok: false, code: 'CLIENT_QUOTA_FORBIDDEN' });
    assert.equal(deps.captures.length, 0);
  }
});

test('same idempotency key and same command returns prior result without second capture', async () => {
  const deps = fakeDeps();
  const first = await purchaseVisibilityCard(baseCommand, deps);
  const second = await purchaseVisibilityCard(baseCommand, deps);
  assert.deepEqual(second, first);
  assert.equal(deps.captures.length, 1);
});

test('same idempotency key with different material command fails closed', async () => {
  const deps = fakeDeps();
  await purchaseVisibilityCard(baseCommand, deps);
  assert.deepEqual(await purchaseVisibilityCard({ ...baseCommand, priceJod: 20 }, deps), { ok: false, code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND' });
  assert.equal(deps.captures.length, 1);
});

test('failed payment cannot activate post or create card result', async () => {
  const deps = fakeDeps();
  deps.payment.capture = async () => ({ ok: false, code: 'PAYMENT_NOT_CAPTURED' });
  assert.deepEqual(await purchaseVisibilityCard(baseCommand, deps), { ok: false, code: 'PAYMENT_NOT_CAPTURED' });
});

test('digital claimant is rejected before payment capture', async () => {
  const deps = fakeDeps();
  const digital = normalizeActor({ actorId: 'dig_1', actorClass: 'DIGITAL', role: 'MARKETER', active: true, verified: true });
  assert.deepEqual(await purchaseVisibilityCard({ ...baseCommand, claimant: digital }, deps), { ok: false, code: 'DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN' });
  assert.equal(deps.captures.length, 0);
});

test('catalog mismatch or invalid trusted quota fails before payment', async () => {
  const deps1 = fakeDeps();
  deps1.cardCatalog.resolve = () => ({ offerId: 'bad', priceJod: 45, purchasedQuota: 100 });
  assert.deepEqual(await purchaseVisibilityCard(baseCommand, deps1), { ok: false, code: 'CARD_CATALOG_MISMATCH' });
  assert.equal(deps1.captures.length, 0);
  const deps2 = fakeDeps();
  deps2.cardCatalog.resolve = () => ({ offerId: 'bad', priceJod: 10, purchasedQuota: 0 });
  assert.deepEqual(await purchaseVisibilityCard(baseCommand, deps2), { ok: false, code: 'CARD_CATALOG_INVALID' });
  assert.equal(deps2.captures.length, 0);
});

test('invalid post state fails before payment capture', async () => {
  const deps = fakeDeps();
  assert.deepEqual(await purchaseVisibilityCard({ ...baseCommand, post: { postId: 'p1', state: 'ACTIVE' } }, deps), { ok: false, code: 'POST_NOT_READY_FOR_CARD' });
  assert.equal(deps.captures.length, 0);
});

test('invalid paidAt fails before payment capture', async () => {
  const deps = fakeDeps();
  assert.deepEqual(await purchaseVisibilityCard({ ...baseCommand, paidAt: 'not-a-date' }, deps), { ok: false, code: 'PAID_AT_INVALID' });
  assert.equal(deps.captures.length, 0);
});
