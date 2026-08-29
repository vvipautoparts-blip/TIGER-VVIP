'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sgf = JSON.parse(fs.readFileSync(path.join(root, 'config/sovereignty/sgf-v1.json'), 'utf8'));
const { verifySgfAuthority } = require('../scripts/sovereignty/verify-sgf-authority.cjs');

test('SGF machine authority binds crypto inventory and verifier', () => {
  assert.equal(sgf.cryptoInventory, 'config/security/crypto-inventory.v1.json');
  assert.equal(sgf.components.cryptoInventoryVerifier, 'scripts/security/verify-crypto-inventory.cjs');
  assert.equal(fs.existsSync(path.join(root, sgf.cryptoInventory)), true);
  assert.equal(fs.existsSync(path.join(root, sgf.components.cryptoInventoryVerifier)), true);
  assert.equal(verifySgfAuthority(sgf).ok, true);
});

test('SGF validator rejects crypto inventory bypass paths', () => {
  const badInventory = structuredClone(sgf);
  badInventory.cryptoInventory = 'config/security/optional-crypto.json';
  assert.equal(verifySgfAuthority(badInventory).ok, false);

  const badVerifier = structuredClone(sgf);
  badVerifier.components.cryptoInventoryVerifier = 'scripts/security/skip-crypto-inventory.cjs';
  assert.equal(verifySgfAuthority(badVerifier).ok, false);
});
