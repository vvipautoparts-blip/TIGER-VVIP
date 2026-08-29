'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const verifier = require('../scripts/security/verify-crypto-inventory.cjs');
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/security/crypto-inventory.v1.json'), 'utf8'));

test('crypto inventory is structurally valid but honestly incomplete until evidenced', () => {
  const result = verifier.verifyCryptoInventory(inventory);
  assert.equal(result.ok, true);
  assert.equal(result.inventoryComplete, false);
  assert.ok(result.pendingSurfaces.includes('TLS_TRANSPORT'));
  assert.equal(inventory.globalLaunchCryptoGate, 'BLOCK_UNTIL_INVENTORY_EVIDENCED');
});

test('crypto inventory covers every mandatory cryptographic surface exactly once', () => {
  assert.deepEqual(inventory.items.map((x) => x.surface), verifier.REQUIRED_SURFACES);
  assert.equal(new Set(inventory.items.map((x) => x.surface)).size, verifier.REQUIRED_SURFACES.length);
});

test('crypto inventory forbids custom crypto policy and false PQC readiness', () => {
  const custom = structuredClone(inventory);
  custom.policy.noCustomCryptography = false;
  assert.equal(verifier.verifyCryptoInventory(custom).ok, false);

  const fakeReady = structuredClone(inventory);
  fakeReady.items[0].migrationStatus = 'PQC_READY';
  assert.equal(verifier.verifyCryptoInventory(fakeReady).ok, false);
});

test('crypto inventory cannot silently drop a required surface', () => {
  const missing = structuredClone(inventory);
  missing.items.pop();
  assert.equal(verifier.verifyCryptoInventory(missing).ok, false);
});
