'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const worker = require('../sw-vvip-static.js');

test('ONE FIELD browser semantic rollout advances the static cache namespace', () => {
  assert.equal(
    worker.CACHE_NAME,
    'vvip-static-v3',
    'same-URL semantic modules changed browser execution contract and must not reuse the v2 cache namespace'
  );
});
