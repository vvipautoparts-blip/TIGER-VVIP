'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sgfPath = path.join(root, 'config/sovereignty/sgf-v1.json');
const ownerBindingPath = path.join(root, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
const sgfAuthorityPath = path.join(root, 'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('SGF owner root is global and every sovereign default is null', () => {
  assert.equal(fs.existsSync(sgfPath), true, 'SGF machine authority must exist');
  const sgf = loadJson(sgfPath);

  assert.equal(sgf.schemaVersion, 'TIGER_SGF_V1');
  assert.deepEqual(sgf.ownerRoot, {
    id: 'OWNER_ROOT',
    country: null,
    currency: null,
    market: null,
    standingRuntimePrivilege: false
  });
  assert.deepEqual(sgf.defaults, {
    country: null,
    currency: null,
    paymentProvider: null,
    legalEntity: null,
    taxProfile: null,
    market: null
  });
  assert.deepEqual(sgf.markets, []);
  assert.equal(sgf.activationAuthority, 'MARKET_CAPABILITY_PASSPORT');
  assert.equal(sgf.fallbackPolicy, 'DENY_NO_SOVEREIGN_FALLBACK');
});

test('SGF is wired into current owner authority', () => {
  assert.equal(fs.existsSync(sgfAuthorityPath), true);
  const binding = fs.readFileSync(ownerBindingPath, 'utf8');
  assert.match(binding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(binding, /ZERO DEFAULT COUNTRY/i);
  assert.match(binding, /ZERO DEFAULT CURRENCY/i);
  assert.match(binding, /NO SOVEREIGN FALLBACK/i);
});
