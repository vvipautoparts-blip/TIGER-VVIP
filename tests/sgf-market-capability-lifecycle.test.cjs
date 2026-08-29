'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const lifecycle = require('../scripts/sovereignty/market-capability-lifecycle.cjs');

test('capability follows the only allowed activation path', () => {
  const path = ['ABSENT','DEFINED','EVIDENCED','OWNER_SEALED','DARK','CANARY','ACTIVE'];
  for (let i = 0; i < path.length - 1; i += 1) {
    assert.equal(lifecycle.canTransition(path[i], path[i + 1]), true, `${path[i]} -> ${path[i + 1]}`);
  }
  assert.equal(lifecycle.isFullyActive('ACTIVE'), true);
  assert.equal(lifecycle.isFullyActive('CANARY'), false);
});

test('activation cannot skip evidence owner seal dark or canary gates', () => {
  for (const [from, to] of [
    ['ABSENT','ACTIVE'],
    ['DEFINED','OWNER_SEALED'],
    ['EVIDENCED','ACTIVE'],
    ['OWNER_SEALED','ACTIVE'],
    ['DARK','ACTIVE']
  ]) {
    assert.equal(lifecycle.canTransition(from, to), false, `${from} -> ${to}`);
    assert.throws(() => lifecycle.assertTransition(from, to), { code: 'SGF_CAPABILITY_TRANSITION_DENIED' });
  }
});

test('suspension is fail-closed and requires fresh evidence before reactivation', () => {
  assert.equal(lifecycle.canTransition('ACTIVE', 'SUSPENDED'), true);
  assert.equal(lifecycle.isFullyActive('SUSPENDED'), false);
  assert.equal(lifecycle.canTransition('SUSPENDED', 'ACTIVE'), false);
  assert.equal(lifecycle.canTransition('SUSPENDED', 'EVIDENCED'), true);
  assert.equal(lifecycle.canTransition('SUSPENDED', 'REVOKED'), true);
});

test('revocation is terminal and unknown states are rejected', () => {
  assert.equal(lifecycle.canTransition('ACTIVE', 'REVOKED'), true);
  for (const state of lifecycle.STATES) {
    assert.equal(lifecycle.canTransition('REVOKED', state), false);
  }
  assert.throws(() => lifecycle.assertTransition('UNKNOWN', 'ACTIVE'), { code: 'SGF_CAPABILITY_STATE_INVALID' });
  assert.throws(() => lifecycle.assertTransition('ACTIVE', 'UNKNOWN'), { code: 'SGF_CAPABILITY_STATE_INVALID' });
});
