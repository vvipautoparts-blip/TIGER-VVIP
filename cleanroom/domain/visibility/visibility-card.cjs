'use strict';

const { isApprovedPriceJod } = require('../policy/current-owner-policy.cjs');

function requireNonEmptyString(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}
function requireIsoTimestamp(value, code) {
  requireNonEmptyString(value, code);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return new Date(ms).toISOString();
}
function freezeCard(card) {
  return Object.freeze({ ...card, consumedReceiptIds: Object.freeze([...card.consumedReceiptIds]) });
}
function createPaidVisibilityCard(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('CARD_INPUT_INVALID');
  const cardId = requireNonEmptyString(input.cardId, 'CARD_INPUT_INVALID');
  const offerId = requireNonEmptyString(input.offerId, 'CARD_INPUT_INVALID');
  const postId = requireNonEmptyString(input.postId, 'CARD_INPUT_INVALID');
  if (!isApprovedPriceJod(input.priceJod)) throw new Error('PRICE_NOT_APPROVED');
  if (!Number.isSafeInteger(input.purchasedQuota) || input.purchasedQuota <= 0) throw new Error('PURCHASED_QUOTA_INVALID');
  const paidAt = requireIsoTimestamp(input.paidAt, 'PAID_AT_INVALID');
  return freezeCard({ cardId, postId, offerId, priceJod: input.priceJod, purchasedQuota: input.purchasedQuota, consumedQuota: 0, state: 'ACTIVE', paidAt, endedAt: null, consumedReceiptIds: [] });
}
function consumeQualifiedImpression(card, receipt, nowIso) {
  if (!card || typeof card !== 'object') throw new Error('CARD_INVALID');
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('IMPRESSION_RECEIPT_INVALID');
  if (receipt.qualified !== true) return card;
  if (card.state === 'ENDED') throw new Error('CARD_ALREADY_ENDED');
  if (card.state !== 'ACTIVE') throw new Error('CARD_STATE_INVALID');
  const receiptId = requireNonEmptyString(receipt.receiptId, 'IMPRESSION_RECEIPT_INVALID');
  if (card.consumedReceiptIds.includes(receiptId)) return card;
  if (!Number.isSafeInteger(card.consumedQuota) || !Number.isSafeInteger(card.purchasedQuota)) throw new Error('CARD_QUOTA_STATE_INVALID');
  const nextConsumed = card.consumedQuota + 1;
  if (nextConsumed > card.purchasedQuota) throw new Error('CARD_QUOTA_OVERFLOW');
  const nextReceiptIds = [...card.consumedReceiptIds, receiptId];
  if (nextConsumed === card.purchasedQuota) {
    const endedAt = requireIsoTimestamp(nowIso, 'IMPRESSION_TIME_INVALID');
    return freezeCard({ ...card, consumedQuota: nextConsumed, state: 'ENDED', endedAt, consumedReceiptIds: nextReceiptIds });
  }
  return freezeCard({ ...card, consumedQuota: nextConsumed, consumedReceiptIds: nextReceiptIds });
}

module.exports = Object.freeze({ createPaidVisibilityCard, consumeQualifiedImpression });
