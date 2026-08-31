'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaidVisibilityCard, consumeQualifiedImpression } = require('../../domain/visibility/visibility-card.cjs');

test('card never ends by calendar time while verified quota remains', () => {
  const card = createPaidVisibilityCard({ cardId: 'card_1', offerId: 'offer_2', postId: 'post_1', priceJod: 2, purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z' });
  const unchanged = consumeQualifiedImpression(card, { receiptId: 'bad_1', qualified: false }, '2030-01-01T00:00:00.000Z');
  assert.equal(unchanged.state, 'ACTIVE');
  assert.equal(unchanged.consumedQuota, 0);
  assert.equal(unchanged.endedAt, null);
});

test('duplicate or unqualified delivery burns zero quota', () => {
  let card = createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 10, purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z' });
  card = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:01:00.000Z');
  const replay = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:02:00.000Z');
  assert.equal(replay.consumedQuota, 1);
});

test('card ends exactly on final verified impression and only once', () => {
  let card = createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 20, purchasedQuota: 2, paidAt: '2026-08-31T10:00:00.000Z' });
  card = consumeQualifiedImpression(card, { receiptId: 'r1', qualified: true }, '2026-08-31T10:01:00.000Z');
  card = consumeQualifiedImpression(card, { receiptId: 'r2', qualified: true }, '2026-08-31T10:02:00.000Z');
  assert.equal(card.state, 'ENDED');
  assert.equal(card.consumedQuota, 2);
  assert.equal(card.endedAt, '2026-08-31T10:02:00.000Z');
  assert.throws(() => consumeQualifiedImpression(card, { receiptId: 'r3', qualified: true }, '2026-08-31T10:03:00.000Z'), /CARD_ALREADY_ENDED/);
});

test('card creation rejects old price, invalid quota and incomplete server-issued identity', () => {
  assert.throws(() => createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 25, purchasedQuota: 1, paidAt: '2026-08-31T10:00:00.000Z' }), /PRICE_NOT_APPROVED/);
  assert.throws(() => createPaidVisibilityCard({ cardId: 'c', offerId: 'o', postId: 'p', priceJod: 2, purchasedQuota: 0, paidAt: '2026-08-31T10:00:00.000Z' }), /PURCHASED_QUOTA_INVALID/);
  assert.throws(() => createPaidVisibilityCard({ cardId: '', offerId: 'o', postId: 'p', priceJod: 2, purchasedQuota: 1, paidAt: '2026-08-31T10:00:00.000Z' }), /CARD_INPUT_INVALID/);
});
