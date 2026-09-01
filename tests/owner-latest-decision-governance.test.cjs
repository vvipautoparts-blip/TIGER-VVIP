'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const owner = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');

const activeRuntimeFiles = [
  'index.html',
  'scripts/fusion/single-surface-controller.js',
  'scripts/social/runtime-adapters.js',
  'scripts/social/post-composer.js',
  'scripts/social/core-shell.js',
  'scripts/nexus/living-sector-object.js',
  'scripts/nexus/bootstrap.js'
];

const supersededRuntimeFiles = [
  'scripts/fusion/runtime-adapters.js',
  'scripts/nexus/pulse-vault.js',
  'scripts/runtime/vvip-marketplace-repository.js',
  'scripts/fusion/progressive-composer.js',
  'styles/fusion/progressive-composer.css'
];

const retiredProductPatterns = [
  /4\s*(?:posts?|منشورات?)\s*(?:per|\/)?\s*(?:week|أسبوع)/i,
  /120[- ]day listing lifetime/i,
  /120\s*يوم(?:ًا|ا)?/i,
  /40\s*يوم(?:ًا|ا)?/i,
  /publishing[_ -]?card/i,
  /publishing[_ -]?subscription/i,
  /paid[_ -]?publishing[_ -]?slot/i,
  /requestPublication\s*\(/,
  /vvip_marketplace_request_publication/,
  /entitlementReceipt/,
  /entitlement_receipt/,
  /\bEXPIRED\s*:/,
  /data-marketplace-listing-trigger/,
  /data-fusion-composer-trigger/,
  /progressive-composer/
];

test('current owner decision is the only active supersession contract', () => {
  assert.match(owner, /CURRENT_ONLY \/ OWNER_BINDING \/ FIRST_REFERENCE \/ NO_FALLBACK \/ NO_IN_TREE_ARCHIVE/);
  assert.match(owner, /newest explicit owner-approved decision/i);
  assert.match(owner, /TIGER NEXUS 2026/);
  assert.match(owner, /Living Sector Object/);
  assert.match(owner, /OFFER \/ NEED \/ SERVICE \/ OPPORTUNITY/);
  assert.match(owner, /PULSE_2/);
  assert.match(owner, /PULSE_10/);
  assert.match(owner, /PULSE_20/);
  assert.match(owner, /PULSE_45/);
  assert.doesNotMatch(owner, /PULSE_25/);
  assert.match(owner, /TAX_RESERVE_STATUS:\s*CANCELLED/);
  assert.match(owner, /not a party/i);
});

test('active runtime must not restore superseded product rules or a second creation path', () => {
  for (const relativePath of activeRuntimeFiles) {
    const source = read(relativePath);
    for (const pattern of retiredProductPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} restores superseded owner information: ${pattern}`);
    }
  }
  for (const relativePath of supersededRuntimeFiles) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `${relativePath} must remain physically deleted`);
  }
});

test('current authority manifest contains no in-tree legacy decision registry', () => {
  const source = read('config/fusion/current-authority.json');
  const manifest = JSON.parse(source);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'supersededDecisions'), false);
  assert.doesNotMatch(source, /"LEGACY_/);
});

test('technical security TTLs are not treated as product lifetime', () => {
  const manifest = JSON.parse(read('config/fusion/current-authority.json'));
  assert.ok(manifest.technicalExpiryException.includes('otp'));
  assert.ok(manifest.technicalExpiryException.includes('authentication_session'));
  assert.ok(manifest.technicalExpiryException.includes('signed_url'));
  assert.equal(manifest.ordinaryPublication.productLifetime, null);
  assert.equal(manifest.pulseRing.productTimeExpiry, null);
});
