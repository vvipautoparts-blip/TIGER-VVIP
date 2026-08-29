'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const repo = require('../scripts/runtime/vvip-marketplace-repository.js');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function listing(overrides = {}) {
  return {
    sector: 'automotive',
    title: 'Global listing',
    location: 'Explicit location',
    priceMinor: 1250,
    currencyCode: 'USD',
    ...overrides
  };
}

test('Marketplace draft requires an explicit market country and ignores config defaults', () => {
  assert.throws(
    () => repo.normalizeDraft(listing(), { defaultCountryCode: 'JO' }),
    { code: 'LISTING_COUNTRY_INVALID' }
  );

  const value = repo.normalizeDraft(
    listing({ activeMarketCountry: 'US' }),
    { defaultCountryCode: 'JO' }
  );
  assert.equal(value.active_market_country, 'US');
});

test('Marketplace repository runtime has no defaultCountryCode fallback', () => {
  const source = read('scripts/runtime/vvip-marketplace-repository.js');
  assert.doesNotMatch(source, /config\.defaultCountryCode/);
});

test('Progressive composer does not infer market from runtime defaultCountryCode or suggest JOD as default', () => {
  const source = read('scripts/fusion/progressive-composer.js');
  assert.doesNotMatch(source, /defaultCountryCode/);
  assert.doesNotMatch(source, /placeholder=["']JOD["']/i);
  assert.doesNotMatch(source, /value=["']JOD["']/i);
});

test('Production Marketplace does not use defaultCountryCode or prefill JOD', () => {
  const source = read('scripts/vvip-production-marketplace.js');
  assert.doesNotMatch(source, /defaultCountryCode/);
  assert.doesNotMatch(source, /value=["']JOD["']/i);
  assert.doesNotMatch(source, /placeholder=["']JOD["']/i);
});
