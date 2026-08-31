'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const kernel = require('../../domain/index.cjs');

test('approved foundation flow reaches expiry only after server-issued paid card quota exhaustion plus 24 hours', async () => {
  const registry = kernel.createSectorRegistry(kernel.CURRENT_OWNER_POLICY.sectors);
  const store = new Map();
  const deps = {
    sectorRegistry: registry,
    cardCatalog: { resolve({ priceJod }) { return { offerId: `offer_${priceJod}`, priceJod, purchasedQuota: 1 }; } },
    payment: { async capture() { return { ok: true, paymentId: 'pay_e2e' }; } },
    idempotency: { get(k) { return store.get(k) || null; }, put(k, v) { store.set(k, v); } },
    audit: { append() {} },
  };
  const purchase = await kernel.purchaseVisibilityCard({
    idempotencyKey: 'e2e_1',
    session: { userId: 'u', externalProvider: 'x', externalSubject: 's', sessionId: 'sess' },
    post: { postId: 'p', state: 'READY_FOR_CARD' },
    sectorId: 'SEC-001', priceJod: 2, claimant: 'NO_CLAIMANT', paidAt: '2026-08-31T00:00:00.000Z',
  }, deps);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.quote.discountLedgerEntry.kind, 'SELF_SERVICE_DISCOUNT');
  assert.equal(purchase.quote.ledgerEntries.some((e) => e.account === 'TAX_RESERVE'), false);
  assert.equal(purchase.quote.ledgerEntries.some((e) => e.account === 'PENDING_OWNER_REALLOCATION'), true);
  const endedCard = kernel.consumeQualifiedImpression(purchase.card, { receiptId: 'verified_1', qualified: true }, '2026-08-31T01:00:00.000Z');
  const lifecycle = kernel.derivePostLifecycle(purchase.post, endedCard, '2026-09-01T01:00:00.000Z');
  assert.equal(lifecycle.state, 'EXPIRED');
  assert.equal(lifecycle.expiresAt, '2026-09-01T01:00:00.000Z');
});

test('digital actors are excluded from financial winner path through the public kernel', () => {
  const digital = kernel.normalizeActor({ actorId: 'digital_1', actorClass: 'DIGITAL', role: 'MARKETER', active: true, verified: true });
  assert.throws(() => kernel.quoteVisibilityPurchase({ priceJod: 10, claimant: digital }), /DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN/);
});
