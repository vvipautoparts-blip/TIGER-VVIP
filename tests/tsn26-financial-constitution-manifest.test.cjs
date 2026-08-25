'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MANIFEST,
  validateManifest,
} = require('../scripts/tsn26/financial/constitution.cjs');

test('TSN-26 active financial constitution is the single versioned source of truth', () => {
  assert.equal(MANIFEST.id, 'TFC-2026.08.001');
  assert.equal(MANIFEST.schemaVersion, 1);
  assert.equal(MANIFEST.status, 'ACTIVE');
  assert.equal(MANIFEST.effectiveFrom, '2026-08-26T00:00:00.000Z');
  assert.deepEqual(validateManifest(MANIFEST), { valid: true, errors: [] });
});

test('top-level allocations total exactly 10000 basis points', () => {
  const total = Object.values(MANIFEST.allocationsBps).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 10_000);
});

test('operations detail totals exactly the 43% operations allocation', () => {
  const total = Object.values(MANIFEST.operationsBps).reduce((sum, value) => sum + value, 0);
  assert.equal(total, MANIFEST.allocationsBps.operations);
  assert.equal(total, 4_300);
});

test('sales slots total exactly the 21% sales pool and each slot is 7%', () => {
  const slots = Object.values(MANIFEST.salesSlotsBps);
  assert.deepEqual(slots, [700, 700, 700]);
  assert.equal(slots.reduce((sum, value) => sum + value, 0), MANIFEST.allocationsBps.salesPool);
});

test('packages, direct incentive, payout epoch and payout deadline are canonical policy', () => {
  assert.deepEqual(MANIFEST.canonicalPackagesJod, [2, 10, 25, 45]);
  assert.equal(MANIFEST.directPurchaseDiscountBps, 700);
  assert.equal(MANIFEST.directPurchaseDiscountTiming, 'BEFORE_ALLOCATION');
  assert.equal(MANIFEST.externalPayoutEpochDays, 14);
  assert.equal(MANIFEST.payoutProfileDeadlineHours, 12);
});

test('malformed or economically unbalanced manifests fail closed', () => {
  const malformed = {
    ...MANIFEST,
    allocationsBps: { ...MANIFEST.allocationsBps, owner: 499 },
  };
  const result = validateManifest(malformed);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /allocationsBps must total 10000 bps/);
});
