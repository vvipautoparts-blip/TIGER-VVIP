'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { activatePostWithCard, derivePostLifecycle } = require('../../domain/social/post-lifecycle.cjs');

test('draft cannot become active without a paid active card', () => {
  assert.throws(() => activatePostWithCard({ postId: 'p', state: 'READY_FOR_CARD' }, null), /PAID_CARD_REQUIRED/);
});

test('card must belong to the same post and be active before activation', () => {
  assert.throws(() => activatePostWithCard({ postId: 'p1', state: 'READY_FOR_CARD' }, { cardId: 'c', postId: 'p2', state: 'ACTIVE' }), /PAID_CARD_REQUIRED/);
});

test('post remains active for exactly 24 hours after card end then expires', () => {
  const post = Object.freeze({ postId: 'p', state: 'ACTIVE', cardId: 'c' });
  const card = Object.freeze({ cardId: 'c', postId: 'p', state: 'ENDED', endedAt: '2026-08-31T12:00:00.000Z' });
  const before = derivePostLifecycle(post, card, '2026-09-01T11:59:59.999Z');
  assert.equal(before.state, 'ACTIVE_POST_CARD_GRACE');
  assert.equal(before.expiresAt, '2026-09-01T12:00:00.000Z');
  const at = derivePostLifecycle(post, card, '2026-09-01T12:00:00.000Z');
  assert.equal(at.state, 'EXPIRED');
});

test('active card never derives expiry from wall clock', () => {
  const post = Object.freeze({ postId: 'p', state: 'ACTIVE', cardId: 'c' });
  const card = Object.freeze({ cardId: 'c', postId: 'p', state: 'ACTIVE', endedAt: null });
  assert.deepEqual(derivePostLifecycle(post, card, '2040-01-01T00:00:00.000Z'), { state: 'ACTIVE', expiresAt: null });
});
