'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  scanLegacyFinancialResidue,
  assertNoLegacyFinancialResidue,
} = require('../scripts/tsn26/system/legacy-financial-guard.cjs');

const ROOT = path.resolve(__dirname, '..');

test('purged parallel financial constitution paths stay absent', () => {
  const result = scanLegacyFinancialResidue(ROOT);
  assert.deepEqual(result.forbiddenPaths, []);
});

test('known superseded financial role identifiers stay purged from runtime surfaces', () => {
  const result = scanLegacyFinancialResidue(ROOT);
  assert.deepEqual(result.legacyIdentifierHits, []);
});

test('legacy 49% operations rule cannot re-enter runtime surfaces', () => {
  const result = scanLegacyFinancialResidue(ROOT);
  assert.deepEqual(result.legacyOperations49Hits, []);
});

test('legacy financial residue guard is fail-closed', () => {
  assert.equal(assertNoLegacyFinancialResidue(ROOT), true);
});
