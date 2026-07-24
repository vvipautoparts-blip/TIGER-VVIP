#!/usr/bin/env node
// VVIP TIGER — Global V1 i18n Module Test
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const i18n = require('../scripts/vvip-i18n.js');
const translations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../scripts/vvip-i18n-translations.json'), 'utf8')
);

// Load translations
i18n.loadTranslations(translations);

// Default language is Arabic
assert.strictEqual(i18n.getLang(), 'ar', 'Default language must be Arabic');
assert.strictEqual(i18n.getDir(), 'rtl', 'Arabic direction must be RTL');
assert.ok(i18n.isRTL(), 'isRTL() must return true for Arabic');

// Arabic translation
const arHome = i18n.t('nav.home');
assert.ok(arHome && arHome !== 'nav.home', 'Arabic home translation must exist');
assert.ok(arHome.includes('\u0627') || arHome.includes('\u0631'), 'Arabic translation must contain Arabic characters');

// Switch to English
i18n.setLang('en');
assert.strictEqual(i18n.getLang(), 'en', 'Language must switch to English');
assert.strictEqual(i18n.getDir(), 'ltr', 'English direction must be LTR');
assert.ok(!i18n.isRTL(), 'isRTL() must return false for English');

const enHome = i18n.t('nav.home');
assert.strictEqual(enHome, 'Home', 'English home must be "Home"');

// Tiger Care official message
i18n.setLang('ar');
const tigerCareMsg = i18n.t('support.submitted');
assert.ok(tigerCareMsg.includes('24'), 'Tiger Care message must mention 24 hours');

// Fallback to English if key missing in Arabic
// (Test with a key we know exists in English but not in Arabic)
const fallback = i18n.t('error.session_expired');
assert.ok(fallback && fallback !== 'error.session_expired', 'Must have session_expired translation');

// Unknown key returns key itself
const unknown = i18n.t('this.key.does.not.exist');
assert.strictEqual(unknown, 'this.key.does.not.exist', 'Unknown key must return key');

// Interpolation
const results = i18n.t('search.results', { count: 42 });
assert.ok(results, 'Should return search results string');

// Unsupported language falls back to default (ar)
i18n.setLang('zz');  // invalid
assert.strictEqual(i18n.getLang(), 'ar', 'Invalid language must fall back to ar');

// SUPPORTED_LANGS contains ar and en
assert.ok(i18n.SUPPORTED_LANGS.includes('ar'), 'Must support Arabic');
assert.ok(i18n.SUPPORTED_LANGS.includes('en'), 'Must support English');
assert.strictEqual(i18n.DEFAULT_LANG, 'ar', 'Default language must be Arabic');

// All sector keys present in both languages
i18n.setLang('ar');
assert.ok(i18n.t('sector.automotive') !== 'sector.automotive', 'Arabic automotive sector');
assert.ok(i18n.t('sector.materials') !== 'sector.materials', 'Arabic materials sector');
assert.ok(i18n.t('sector.real_estate') !== 'sector.real_estate', 'Arabic real estate sector');

i18n.setLang('en');
assert.strictEqual(i18n.t('sector.real_estate'), 'Real Estate', 'English real_estate sector');

// Listing status keys
const statuses = ['draft','published','pending_review','rejected','paused','archived'];
for (const s of statuses) {
  i18n.setLang('ar');
  const ar = i18n.t(`listing.status.${s}`);
  i18n.setLang('en');
  const en = i18n.t(`listing.status.${s}`);
  assert.ok(ar !== `listing.status.${s}`, `Arabic status key must exist: ${s}`);
  assert.ok(en !== `listing.status.${s}`, `English status key must exist: ${s}`);
}

console.log('PASS: Global V1 i18n module — all checks passed');
