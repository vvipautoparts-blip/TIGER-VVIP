/**
 * VVIP TIGER — Centralized i18n Module
 * Arabic First, English capable, RTL/LTR aware.
 * Translations loaded from vvip-i18n-translations.json at runtime.
 * Zero runtime dependencies — browser and Node compatible.
 */
(function(global, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else global.VVIPi18n = factory();
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';
  const SUPPORTED_LANGS = Object.freeze(['ar','en']);
  const SUPPORTED_DIRS = Object.freeze({ ar: 'rtl', en: 'ltr' });
  const DEFAULT_LANG = 'ar';
  let _lang = DEFAULT_LANG;
  let _translations = {};

  function loadTranslations(catalog) { _translations = catalog || {}; }

  function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
    _lang = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = SUPPORTED_DIRS[lang] || 'rtl';
    }
  }
  function getLang() { return _lang; }
  function getDir() { return SUPPORTED_DIRS[_lang] || 'rtl'; }
  function isRTL() { return getDir() === 'rtl'; }

  function t(key, vars) {
    const catalog = (_translations[_lang] || {});
    let str = catalog[key];
    if (str === undefined && _lang !== 'en') str = ((_translations['en'] || {})[key]);
    if (str === undefined) return key;
    if (vars && typeof vars === 'object') {
      str = str.replace(/\{(\w+)\}/g, (m, n) => vars[n] !== undefined ? String(vars[n]) : m);
    }
    return str;
  }

  function formatCurrency(amount, currency) {
    if (typeof Intl === 'undefined') return amount + ' ' + (currency || 'JOD');
    try {
      return new Intl.NumberFormat(_lang === 'ar' ? 'ar-JO' : 'en-US', {
        style: 'currency', currency: currency || 'JOD', minimumFractionDigits: 0, maximumFractionDigits: 3
      }).format(amount);
    } catch(e) { return amount + ' ' + (currency || 'JOD'); }
  }

  function detectLang() {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem('vvip_lang');
      if (s && SUPPORTED_LANGS.includes(s)) return s;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const bl = navigator.language.toLowerCase();
      if (bl.startsWith('ar')) return 'ar';
      if (bl.startsWith('en')) return 'en';
    }
    return DEFAULT_LANG;
  }

  function saveLangPreference(lang) {
    if (typeof localStorage !== 'undefined') localStorage.setItem('vvip_lang', lang);
    setLang(lang);
  }

  return { t, setLang, getLang, getDir, isRTL, loadTranslations, formatCurrency, detectLang, saveLangPreference, SUPPORTED_LANGS, DEFAULT_LANG };
}));
