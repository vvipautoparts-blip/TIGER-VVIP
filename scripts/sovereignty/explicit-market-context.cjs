'use strict';

function sgfError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function normalizeCountry(value, required) {
  const code = String(value == null ? '' : value).trim().toUpperCase();
  if (!code) {
    if (required) throw sgfError('SGF_MARKET_COUNTRY_REQUIRED');
    return null;
  }
  if (!/^[A-Z]{2}$/.test(code)) throw sgfError('SGF_MARKET_COUNTRY_INVALID');
  return code;
}

function normalizeCurrency(value) {
  const code = String(value == null ? '' : value).trim().toUpperCase();
  if (!code) throw sgfError('SGF_CURRENCY_REQUIRED');
  if (!/^[A-Z]{3}$/.test(code)) throw sgfError('SGF_CURRENCY_INVALID');
  return code;
}

function resolveListingMarketContext(input) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.freeze({
    marketCountry: normalizeCountry(source.activeMarketCountry || source.active_market_country, true),
    currencyCode: normalizeCurrency(source.currencyCode || source.currency_code)
  });
}

function resolveOptionalMarketCountry(input) {
  const source = input && typeof input === 'object' ? input : {};
  return normalizeCountry(source.countryCode || source.activeMarketCountry || source.active_market_country, false);
}

module.exports = Object.freeze({
  resolveListingMarketContext,
  resolveOptionalMarketCountry
});
