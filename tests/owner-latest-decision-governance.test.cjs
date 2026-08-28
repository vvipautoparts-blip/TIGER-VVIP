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
  'scripts/vvip-production-marketplace.js',
  'scripts/fusion/progressive-composer.js',
  'scripts/fusion/single-surface-controller.js',
  'scripts/fusion/runtime-adapters.js',
  'scripts/runtime/vvip-marketplace-repository.js'
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
  /entitlement_receipt/
];

test('current owner decision is the only active supersession contract', () => {
  assert.match(owner, /CURRENT_ONLY \/ OWNER_BINDING \/ FIRST_REFERENCE \/ NO_FALLBACK \/ NO_IN_TREE_ARCHIVE/);
  assert.match(owner, /newest explicit owner-approved decision/i);
  assert.match(owner, /no owner-approved product-time lifetime/i);
  assert.match(owner, /no fixed commercial\/weekly posting quota/i);
  assert.match(owner, /maximum remains 7 images/i);
  assert.match(owner, /server-authoritative visibility allocation/i);
  assert.match(owner, /not a party/i);
});

test('active runtime must not restore superseded product rules', () => {
  for (const relativePath of activeRuntimeFiles) {
    const source = read(relativePath);
    for (const pattern of retiredProductPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} restores superseded owner information: ${pattern}`);
    }
  }
});

test('current authority manifest records the removed legacy decisions', () => {
  const manifest = JSON.parse(read('config/fusion/current-authority.json'));
  const retired = new Set(manifest.supersededDecisions.map((item) => item.id));
  for (const id of [
    'LEGACY_FOUR_POSTS_WEEK',
    'LEGACY_120_DAY_LIFETIME',
    'LEGACY_40_DAY_LISTING_DELETE',
    'LEGACY_PUBLISHING_CARDS',
    'LEGACY_PUBLISHING_SUBSCRIPTIONS',
    'LEGACY_PAID_PUBLISHING_SLOTS',
    'LEGACY_PUBLICATION_PLAN_ENTITLEMENT_GATE',
    'LEGACY_TIMED_ACTIVATION_CARD'
  ]) {
    assert.equal(retired.has(id), true, `${id} must remain explicitly superseded`);
  }
});

test('technical security TTLs are not treated as product lifetime', () => {
  const manifest = JSON.parse(read('config/fusion/current-authority.json'));
  assert.ok(manifest.technicalExpiryException.includes('otp'));
  assert.ok(manifest.technicalExpiryException.includes('authentication_session'));
  assert.ok(manifest.technicalExpiryException.includes('signed_url'));
  assert.equal(manifest.ordinaryPublication.productLifetime, null);
  assert.equal(manifest.pulseRing.productTimeExpiry, null);
});
