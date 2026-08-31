'use strict';

const POST_CARD_GRACE_MS = 24 * 60 * 60 * 1000;

function requirePostCardMatch(post, card) {
  if (
    !post || typeof post !== 'object' ||
    typeof post.postId !== 'string' || !post.postId.trim() ||
    !card || typeof card !== 'object' ||
    typeof card.cardId !== 'string' || !card.cardId.trim() ||
    card.postId !== post.postId
  ) throw new Error('PAID_CARD_REQUIRED');
}

function activatePostWithCard(post, card) {
  requirePostCardMatch(post, card);
  if (post.state !== 'READY_FOR_CARD' || card.state !== 'ACTIVE') throw new Error('PAID_CARD_REQUIRED');
  return Object.freeze({ ...post, state: 'ACTIVE', cardId: card.cardId });
}

function derivePostLifecycle(post, card, nowIso) {
  requirePostCardMatch(post, card);
  if (post.cardId !== card.cardId || post.state !== 'ACTIVE') throw new Error('POST_CARD_LINK_INVALID');
  if (card.state === 'ACTIVE') return Object.freeze({ state: 'ACTIVE', expiresAt: null });
  if (card.state !== 'ENDED' || typeof card.endedAt !== 'string') throw new Error('CARD_STATE_INVALID');
  const endedAtMs = Date.parse(card.endedAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(endedAtMs) || !Number.isFinite(nowMs)) throw new Error('POST_LIFECYCLE_TIME_INVALID');
  const expiresAtMs = endedAtMs + POST_CARD_GRACE_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  return nowMs >= expiresAtMs
    ? Object.freeze({ state: 'EXPIRED', expiresAt })
    : Object.freeze({ state: 'ACTIVE_POST_CARD_GRACE', expiresAt });
}

module.exports = Object.freeze({ POST_CARD_GRACE_MS, activatePostWithCard, derivePostLifecycle });
