'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const auth = require('../../auth-clerk-index.js');

const source = fs.readFileSync('auth-clerk-index.js', 'utf8');
const listingId = '11111111-1111-4111-8111-111111111111';

test('NEXUS auth contains no retired Marketplace listing intent allowlist', () => {
  assert.doesNotMatch(source, /LISTING_INTENTS/);
  assert.doesNotMatch(source, /TOGGLE_FAVORITE/);
  assert.doesNotMatch(source, /CONTACT_SELLER_INTERNAL/);
});

test('retired listing intents are rejected even when supplied with a valid UUID', () => {
  for (const name of ['TOGGLE_FAVORITE', 'CONTACT_SELLER_INTERNAL']) {
    assert.throws(
      () => auth.normalizeIntentDescriptor({ name, listingId }),
      { code: 'AUTH_INTENT_INVALID' },
      `${name} must never be resumable in current NEXUS auth`,
    );
  }
});
