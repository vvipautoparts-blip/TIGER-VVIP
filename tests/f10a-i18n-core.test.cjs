const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const corePath = path.join(__dirname, '..', 'scripts', 'i18n', 'f10-i18n-core.js');
const catalogPath = path.join(__dirname, '..', 'config', 'fusion', 'f10-i18n-catalog.json');
function loadCore() { return require(corePath); }

test('F10A catalog has exact Arabic/English key parity and substantive translations', () => {
  assert.equal(fs.existsSync(catalogPath), true, 'F10 catalog must exist');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert.equal(catalog.schemaVersion, 'VVIP_TIGER_FUSION_F10_I18N_V1');
  assert.deepEqual(catalog.supportedLocales, ['ar', 'en']);
  const arKeys = Object.keys(catalog.messages.ar).sort();
  const enKeys = Object.keys(catalog.messages.en).sort();
  assert.deepEqual(arKeys, enKeys);
  assert.ok(arKeys.length >= 20);
  for (const locale of ['ar', 'en']) for (const value of Object.values(catalog.messages[locale])) { assert.equal(typeof value, 'string'); assert.ok(value.trim().length > 0); }
});

test('F10A resolves supported locale variants and exact RTL/LTR metadata', () => {
  const api = loadCore();
  assert.equal(api.resolveLocale('ar-JO'), 'ar');
  assert.equal(api.resolveLocale('en-GB'), 'en');
  assert.equal(api.resolveLocale('fr-FR'), 'ar');
  assert.deepEqual(api.localeMetadata('ar'), { locale: 'ar', lang: 'ar', dir: 'rtl' });
  assert.deepEqual(api.localeMetadata('en'), { locale: 'en', lang: 'en', dir: 'ltr' });
});

test('F10A strict translation never silently invents or falls back for a missing key', () => {
  const api = loadCore();
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert.equal(api.translate(catalog, 'ar', 'nav.home'), 'الرئيسية');
  assert.equal(api.translate(catalog, 'en', 'nav.home'), 'Home');
  assert.throws(() => api.translate(catalog, 'ar', 'missing.key'), /F10_TRANSLATION_MISSING:missing\.key/);
  assert.throws(() => api.translate({ supportedLocales:['ar','en'], messages:{ ar:{a:'x'}, en:{} } }, 'ar', 'a'), /F10_CATALOG_INVALID/);
});

test('F10A number and UTC date helpers are locale-aware display functions only', () => {
  const api = loadCore();
  assert.equal(api.formatNumber(1234567.5, 'en'), '1,234,567.5');
  assert.equal(typeof api.formatNumber(1234567.5, 'ar'), 'string');
  assert.equal(api.formatUtcDate('2026-08-13T20:00:00Z', 'en'), 'Aug 13, 2026');
  assert.equal(typeof api.formatUtcDate('2026-08-13T20:00:00Z', 'ar'), 'string');
});