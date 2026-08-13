const test = require('node:test');
const assert = require('node:assert/strict');
const inventory = require('../scripts/fusion/runtime-inventory.cjs');

test('F01 inventory module exposes six frozen states', () => {
  assert.equal(Array.isArray(inventory.CLASSES), true);
  assert.equal(Object.isFrozen(inventory.CLASSES), true);
  assert.equal(inventory.CLASSES.length, 6);
});
