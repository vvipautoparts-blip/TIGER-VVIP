import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMutationConflict } from '../scripts/network/vvip-conflict-engine.js';

test('read cursor conflicts merge monotonically and never move backwards', () => {
  assert.deepEqual(resolveMutationConflict({
    kind: 'social.read_cursor.advance',
    local: { sequence: 44 },
    server: { sequence: 51 }
  }), {
    action: 'RETRY_AS_NEW',
    policy: 'MONOTONIC_MAX',
    payload: { sequence: 51 }
  });
});

test('reaction conflict preserves latest user intent without treating local state as authority', () => {
  assert.deepEqual(resolveMutationConflict({
    kind: 'social.reaction.set',
    local: { postId: 'post-1', reaction: 'love' },
    server: { postId: 'post-1', reaction: 'like', version: 7 }
  }), {
    action: 'RETRY_AS_NEW',
    policy: 'LATEST_INTENT_ON_SERVER_VERSION',
    payload: { postId: 'post-1', reaction: 'love', baseVersion: 7 }
  });
});

test('profile edits merge only fields unchanged on the server since the local base', () => {
  assert.deepEqual(resolveMutationConflict({
    kind: 'profile.edit',
    base: { displayName: 'A', city: 'Amman' },
    local: { displayName: 'B', city: 'Amman' },
    server: { displayName: 'A', city: 'Irbid', version: 3 }
  }), {
    action: 'RETRY_AS_NEW',
    policy: 'FIELD_LEVEL_MERGE',
    payload: { displayName: 'B', city: 'Irbid', baseVersion: 3 }
  });

  assert.equal(resolveMutationConflict({
    kind: 'profile.edit',
    base: { displayName: 'A' },
    local: { displayName: 'B' },
    server: { displayName: 'C', version: 4 }
  }).action, 'MANUAL');
});

test('posts do not use blind last-write-wins and messages acknowledge only proven duplicates', () => {
  assert.deepEqual(resolveMutationConflict({
    kind: 'social.post.update',
    base: { body: 'one' },
    local: { body: 'two' },
    server: { body: 'three' }
  }), {
    action: 'MANUAL',
    policy: 'CONTENT_CONFLICT'
  });

  assert.equal(resolveMutationConflict({
    kind: 'social.message.send',
    local: { body: 'hello' },
    server: { idempotencyMatched: true, payloadMatched: true }
  }).action, 'ACK');
  assert.equal(resolveMutationConflict({
    kind: 'social.message.send',
    local: { body: 'hello' },
    server: { idempotencyMatched: true, payloadMatched: false }
  }).action, 'TERMINAL');
});

test('Marketplace transitions plus financial and security decisions remain server-authoritative', () => {
  for (const kind of ['marketplace.listing.transition', 'payment.capture', 'security.owner.step_up']) {
    const decision = resolveMutationConflict({ kind, local: { state: 'active' }, server: { state: 'blocked' } });
    assert.deepEqual(decision, {
      action: 'ACCEPT_SERVER',
      policy: 'SERVER_AUTHORITATIVE',
      server: { state: 'blocked' }
    });
  }
});