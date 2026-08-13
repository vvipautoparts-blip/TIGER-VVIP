'use strict';

const SUPPORTED_LOCALES = Object.freeze(['ar', 'en']);

function fail(code) { const error = new Error(code); error.code = code; throw error; }

function resolveLocale(input, fallback = 'ar') {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (value === 'ar' || value.startsWith('ar-')) return 'ar';
  if (value === 'en' || value.startsWith('en-')) return 'en';
  return SUPPORTED_LOCALES.includes(fallback) ? fallback : 'ar';
}

function localeMetadata(locale) {
  const resolved = resolveLocale(locale);
  return Object.freeze({ locale: resolved, lang: resolved, dir: resolved === 'ar' ? 'rtl' : 'ltr' });
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) fail('F10_CATALOG_INVALID');
  if (!Array.isArray(catalog.supportedLocales) || catalog.supportedLocales.length !== 2) fail('F10_CATALOG_INVALID');
  if (catalog.supportedLocales[0] !== 'ar' || catalog.supportedLocales[1] !== 'en') fail('F10_CATALOG_INVALID');
  if (!catalog.messages || typeof catalog.messages !== 'object') fail('F10_CATALOG_INVALID');
  const ar = catalog.messages.ar;
  const en = catalog.messages.en;
  if (!ar || !en || typeof ar !== 'object' || typeof en !== 'object' || Array.isArray(ar) || Array.isArray(en)) fail('F10_CATALOG_INVALID');
  const arKeys = Object.keys(ar).sort();
  const enKeys = Object.keys(en).sort();
  if (arKeys.length === 0 || arKeys.length !== enKeys.length) fail('F10_CATALOG_INVALID');
  for (let i = 0; i < arKeys.length; i += 1) {
    if (arKeys[i] !== enKeys[i]) fail('F10_CATALOG_INVALID');
    if (typeof ar[arKeys[i]] !== 'string' || ar[arKeys[i]].trim().length === 0) fail('F10_CATALOG_INVALID');
    if (typeof en[enKeys[i]] !== 'string' || en[enKeys[i]].trim().length === 0) fail('F10_CATALOG_INVALID');
  }
  return true;
}

function translate(catalog, locale, key) {
  validateCatalog(catalog);
  const resolved = resolveLocale(locale);
  if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(catalog.messages[resolved], key)) fail(`F10_TRANSLATION_MISSING:${String(key)}`);
  return catalog.messages[resolved][key];
}

function localeTag(locale) { return resolveLocale(locale) === 'ar' ? 'ar-JO' : 'en-US'; }
function formatNumber(value, locale) {
  if (!Number.isFinite(value)) fail('F10_NUMBER_INVALID');
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: 20 }).format(value);
}
function formatUtcDate(value, locale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail('F10_DATE_INVALID');
  return new Intl.DateTimeFormat(localeTag(locale), { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' }).format(date);
}

module.exports = Object.freeze({ SUPPORTED_LOCALES, resolveLocale, localeMetadata, validateCatalog, translate, formatNumber, formatUtcDate });