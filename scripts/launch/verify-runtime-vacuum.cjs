'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_RUNTIME_PATHS = Object.freeze([
  'scripts/vvip-production-marketplace.js',
  'scripts/runtime/vvip-marketplace-repository.js',
  'scripts/fusion/marketplace-context.js'
]);
const FORBIDDEN_REFERENCES = Object.freeze(FORBIDDEN_RUNTIME_PATHS.map(item => item.replace(/^scripts\//, '')));
const SUPERSEDED_TOKENS = Object.freeze([
  { name: 'PULSE_25', pattern: /\bPULSE_25\b/i },
  { name: 'requestPublication', pattern: /requestPublication\s*\(/i },
  { name: '120-day-product-lifetime', pattern: /\b120\s*(?:days?|day)\b/i },
  { name: '4-posts-week', pattern: /\b4\s*(?:posts?|post)\s*\/\s*week\b/i },
  { name: '16-percent-tax-baseline', pattern: /(?:\/\s*1\.16\b|referencePriceIncludesBaselineTaxBps|baselineIncludedTaxBps|countryTaxAppliedToUntaxedBase|REMOVE_REFERENCE_16_THEN_APPLY_VERIFIED_COUNTRY_TAX)/i }
]);
const ACTIVE_DIRS = Object.freeze(['scripts/nexus','scripts/social','scripts/fusion','scripts/runtime']);
const ACTIVE_FILES = Object.freeze(['index.html','fusion-home-f02.html','private-profile-p03.html','manifest.webmanifest','sw-vvip-static.js']);
const TEXT_EXT = new Set(['.js','.mjs','.cjs','.html','.json','.webmanifest','.css']);

function normalizeRel(value) { return value.split(path.sep).join('/'); }

function walk(dir, root, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, root, files);
    else if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name))) files.push({ full, rel: normalizeRel(path.relative(root, full)) });
  }
}

function activeFiles(root) {
  const files = [];
  for (const rel of ACTIVE_DIRS) walk(path.join(root, rel), root, files);
  for (const rel of ACTIVE_FILES) {
    const full = path.join(root, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) files.push({ full, rel });
  }
  return files;
}

function verifyRuntimeVacuum(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const errors = [];

  for (const rel of FORBIDDEN_RUNTIME_PATHS) {
    if (fs.existsSync(path.join(root, rel))) errors.push(`F15_FORBIDDEN_RUNTIME_PATH:${rel}`);
  }

  for (const file of activeFiles(root)) {
    let text;
    try { text = fs.readFileSync(file.full, 'utf8'); }
    catch (_) { errors.push(`F15_ACTIVE_RUNTIME_UNREADABLE:${file.rel}`); continue; }

    for (const forbidden of FORBIDDEN_REFERENCES) {
      const basename = path.posix.basename(forbidden);
      if (text.includes(forbidden) || text.includes(basename)) {
        errors.push(`F15_FORBIDDEN_RUNTIME_REFERENCE:${file.rel}:${basename}`);
      }
    }
    for (const token of SUPERSEDED_TOKENS) {
      if (token.pattern.test(text)) errors.push(`F15_SUPERSEDED_RUNTIME_TOKEN:${file.rel}:${token.name}`);
    }
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze([...new Set(errors)]) });
}

module.exports = Object.freeze({
  FORBIDDEN_RUNTIME_PATHS,
  ACTIVE_DIRS,
  ACTIVE_FILES,
  verifyRuntimeVacuum
});
