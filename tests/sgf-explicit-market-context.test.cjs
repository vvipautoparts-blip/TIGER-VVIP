'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const context = require('../scripts/sovereignty/explicit-market-context.cjs');

test('listing context requires explicit country and currency and ignores fallback-shaped fields', () => {
  assert.throws(() => context.resolveListingMarketContext({ defaultCountryCode: 'JO', currencyCode: 'USD' }), { code: 'SGF_MARKET_COUNTRY_REQUIRED' });
  assert.throws(() => context.resolveListingMarketContext({ activeMarketCountry: 'US', defaultCurrency: 'JOD' }), { code: 'SGF_CURRENCY_REQUIRED' });
});

test('listing context normalizes explicit ISO values only', () => {
  const value = context.resolveListingMarketContext({ activeMarketCountry: 'us', currencyCode: 'usd' });
  assert.deepEqual(value, { marketCountry: 'US', currencyCode: 'USD' });
  assert.equal(Object.isFrozen(value), true);
});

test('public market filter is global when no explicit country is supplied', () => {
  assert.equal(context.resolveOptionalMarketCountry({}), null);
  assert.equal(context.resolveOptionalMarketCountry({ countryCode: 'de', defaultCountryCode: 'JO' }), 'DE');
});

test('invalid explicit ISO values fail closed', () => {
  assert.throws(() => context.resolveListingMarketContext({ activeMarketCountry: 'USA', currencyCode: 'USD' }), { code: 'SGF_MARKET_COUNTRY_INVALID' });
  assert.throws(() => context.resolveListingMarketContext({ activeMarketCountry: 'US', currencyCode: 'US' }), { code: 'SGF_CURRENCY_INVALID' });
  assert.throws(() => context.resolveOptionalMarketCountry({ countryCode: 'GLOBAL' }), { code: 'SGF_MARKET_COUNTRY_INVALID' });
});
