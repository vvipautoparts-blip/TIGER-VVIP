'use strict';

const { normalizeVerifiedSession } = require('../identity/verified-session.cjs');
const { quoteVisibilityPurchase } = require('../finance/purchase-quote.cjs');
const { createPaidVisibilityCard } = require('../visibility/visibility-card.cjs');
const { activatePostWithCard } = require('../social/post-lifecycle.cjs');

function failure(code) { return Object.freeze({ ok: false, code }); }
function knownFailure(error, fallback = 'PURCHASE_VALIDATION_FAILED') {
  const code = error && typeof error.message === 'string' ? error.message : fallback;
  const allowed = new Set(['SECTOR_NOT_ACTIVE','PRICE_NOT_APPROVED','CLAIMANT_INVALID','DIGITAL_FINANCIAL_BENEFIT_FORBIDDEN','HUMAN_SALES_WINNER_NOT_ELIGIBLE','LEDGER_PRECISION_INVALID','LEDGER_NOT_BALANCED','PAID_CARD_REQUIRED','CARD_INPUT_INVALID','PURCHASED_QUOTA_INVALID','PAID_AT_INVALID']);
  return failure(allowed.has(code) ? code : fallback);
}
function claimantFingerprintPart(claimant) {
  if (claimant === 'NO_CLAIMANT') return 'NO_CLAIMANT';
  if (!claimant || typeof claimant !== 'object' || Array.isArray(claimant)) return 'INVALID';
  return { actorId: claimant.actorId || null, actorClass: claimant.actorClass || null, role: claimant.role || null };
}
function purchaseFingerprint({ userId, postId, sectorId, priceJod, claimant }) {
  return JSON.stringify({ userId, postId, sectorId, priceJod, claimant: claimantFingerprintPart(claimant) });
}
function validateDeps(deps) {
  if (!deps || typeof deps !== 'object') throw new Error('PURCHASE_DEPENDENCIES_INVALID');
  const required = [['sectorRegistry','requireActive'],['cardCatalog','resolve'],['payment','capture'],['idempotency','get'],['idempotency','put'],['audit','append']];
  for (const [port, method] of required) if (!deps[port] || typeof deps[port][method] !== 'function') throw new Error('PURCHASE_DEPENDENCIES_INVALID');
}

async function purchaseVisibilityCard(command, deps) {
  try { validateDeps(deps); } catch { return failure('PURCHASE_DEPENDENCIES_INVALID'); }
  if (!command || typeof command !== 'object' || Array.isArray(command)) return failure('PURCHASE_COMMAND_INVALID');
  if (Object.hasOwn(command, 'purchasedQuota') || Object.hasOwn(command, 'quota')) return failure('CLIENT_QUOTA_FORBIDDEN');
  const sessionResult = normalizeVerifiedSession(command.session);
  if (!sessionResult.ok) return sessionResult;
  if (typeof command.idempotencyKey !== 'string' || command.idempotencyKey.trim() === '') return failure('IDEMPOTENCY_KEY_REQUIRED');
  if (!command.post || typeof command.post !== 'object' || typeof command.post.postId !== 'string' || !command.post.postId.trim()) return failure('POST_INVALID');
  if (command.post.state !== 'READY_FOR_CARD') return failure('POST_NOT_READY_FOR_CARD');
  if (typeof command.paidAt !== 'string' || !Number.isFinite(Date.parse(command.paidAt))) return failure('PAID_AT_INVALID');
  if (typeof command.sectorId !== 'string' || !command.sectorId.trim()) return failure('SECTOR_NOT_ACTIVE');

  const idempotencyKey = command.idempotencyKey.trim();
  const fingerprint = purchaseFingerprint({ userId: sessionResult.value.userId, postId: command.post.postId.trim(), sectorId: command.sectorId.trim(), priceJod: command.priceJod, claimant: command.claimant });
  const prior = deps.idempotency.get(idempotencyKey);
  if (prior) {
    if (prior.fingerprint !== fingerprint) return failure('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND');
    return prior.result;
  }

  try { deps.sectorRegistry.requireActive(command.sectorId.trim()); } catch (error) { return knownFailure(error, 'SECTOR_NOT_ACTIVE'); }

  let offer;
  try { offer = deps.cardCatalog.resolve({ priceJod: command.priceJod }); } catch { return failure('CARD_CATALOG_INVALID'); }
  if (!offer || typeof offer !== 'object' || typeof offer.offerId !== 'string' || offer.offerId.trim() === '' || offer.priceJod !== command.priceJod) return failure('CARD_CATALOG_MISMATCH');
  if (!Number.isSafeInteger(offer.purchasedQuota) || offer.purchasedQuota <= 0) return failure('CARD_CATALOG_INVALID');

  let quote;
  try { quote = quoteVisibilityPurchase({ priceJod: command.priceJod, claimant: command.claimant }); } catch (error) { return knownFailure(error); }

  let paymentResult;
  try { paymentResult = await deps.payment.capture({ idempotencyKey, amountMicroJod: quote.capturedMicroJod }); } catch { return failure('PAYMENT_NOT_CAPTURED'); }
  if (!paymentResult || paymentResult.ok !== true || typeof paymentResult.paymentId !== 'string' || !paymentResult.paymentId.trim()) return failure(paymentResult && paymentResult.code ? paymentResult.code : 'PAYMENT_NOT_CAPTURED');

  let card;
  let post;
  try {
    card = createPaidVisibilityCard({ cardId: `card_${paymentResult.paymentId.trim()}`, offerId: offer.offerId.trim(), postId: command.post.postId.trim(), priceJod: command.priceJod, purchasedQuota: offer.purchasedQuota, paidAt: command.paidAt });
    post = activatePostWithCard(command.post, card);
  } catch (error) { return knownFailure(error); }

  const result = Object.freeze({ ok: true, paymentId: paymentResult.paymentId.trim(), quote, card, post });
  deps.audit.append(Object.freeze({ type: 'VISIBILITY_CARD_PURCHASED', userId: sessionResult.value.userId, postId: post.postId, cardId: card.cardId, paymentId: result.paymentId, idempotencyKey }));
  if (quote.discountLedgerEntry) deps.audit.append(Object.freeze({ type: 'SELF_SERVICE_DISCOUNT_RECORDED', userId: sessionResult.value.userId, postId: post.postId, amountMicroJod: quote.discountLedgerEntry.amountMicroJod, reasonCode: quote.discountLedgerEntry.reasonCode }));
  deps.idempotency.put(idempotencyKey, Object.freeze({ fingerprint, result }));
  return result;
}

module.exports = Object.freeze({ purchaseFingerprint, purchaseVisibilityCard });
