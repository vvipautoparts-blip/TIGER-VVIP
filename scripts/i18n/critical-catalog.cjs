'use strict';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function validateCriticalCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) fail('I18N_CATALOG_INVALID');
  if (catalog.schemaVersion !== 'TIGER_CRITICAL_I18N_V1') fail('I18N_CATALOG_INVALID');

  const locales = catalog.locales;
  if (!locales || typeof locales !== 'object' || Array.isArray(locales)) fail('I18N_CATALOG_INVALID');
  const localeKeys = Object.keys(locales).sort();
  if (JSON.stringify(localeKeys) !== JSON.stringify(['ar', 'en'])) fail('I18N_CATALOG_INVALID');
  if (locales.ar.dir !== 'rtl' || locales.en.dir !== 'ltr') fail('I18N_CATALOG_INVALID');

  const ar = locales.ar.messages;
  const en = locales.en.messages;
  if (!ar || !en || typeof ar !== 'object' || typeof en !== 'object' || Array.isArray(ar) || Array.isArray(en)) {
    fail('I18N_CATALOG_INVALID');
  }

  const arKeys = Object.keys(ar).sort();
  const enKeys = Object.keys(en).sort();
  if (arKeys.length < 20 || JSON.stringify(arKeys) !== JSON.stringify(enKeys)) fail('I18N_CATALOG_INVALID');

  for (const key of arKeys) {
    if (typeof ar[key] !== 'string' || !ar[key].trim()) fail('I18N_CATALOG_INVALID');
    if (typeof en[key] !== 'string' || !en[key].trim()) fail('I18N_CATALOG_INVALID');
  }

  return Object.freeze({ locales: Object.freeze(['ar', 'en']), keys: Object.freeze(arKeys) });
}

function createCriticalTranslator(catalog) {
  validateCriticalCatalog(catalog);
  return function translate(locale, key) {
    const selected = catalog.locales[locale];
    if (!selected) fail('I18N_LOCALE_UNSUPPORTED');
    if (!Object.prototype.hasOwnProperty.call(selected.messages, key)) fail('I18N_KEY_UNSUPPORTED');
    return selected.messages[key];
  };
}

module.exports = Object.freeze({
  validateCriticalCatalog,
  createCriticalTranslator
});
