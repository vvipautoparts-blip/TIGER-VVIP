const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }

test('F02 owns semantic TIGER tokens and isolates login tokens', () => {
  assert.equal(exists('styles/vvip-fusion-tokens.css'), true);
  const tokens = read('styles/vvip-fusion-tokens.css');
  for (const token of ['--brand-primary:', '--brand-primary-hover:', '--login-surface:', '--login-accent:']) assert.ok(tokens.includes(token));
  assert.equal(tokens.includes('--fb-blue'), false);
  assert.equal(exists('styles/vvip-fusion-single-surface.css'), true);
  assert.equal(read('styles/vvip-fusion-single-surface.css').includes('--fb-blue'), false);
});

test('F02 Home feed is one bounded central column', () => {
  const css = read('styles/vvip-fusion-single-surface.css');
  assert.match(css, /\.marketplace\s*\{[^}]*min\(720px,\s*100%\)/s);
  assert.match(css, /\.listing-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.equal(/repeat\((?:2|3),\s*minmax\(0,\s*1fr\)\)/.test(css), false);
});

test('F02 source shell loads FUSION layers and keeps capability gateway dormant', () => {
  const html = read('index.html');
  const tokenIndex = html.indexOf('styles/vvip-fusion-tokens.css');
  const legacyIndex = html.indexOf('styles/vvip-pr29-home-marketplace.css');
  const surfaceIndex = html.indexOf('styles/vvip-fusion-single-surface.css');
  const adapterIndex = html.indexOf('scripts/runtime/vvip-fusion-single-surface.js');
  assert.ok(tokenIndex >= 0 && legacyIndex > tokenIndex && surfaceIndex > legacyIndex && adapterIndex > surfaceIndex);
  assert.match(html, /data-vvip-capability-trigger[^>]*hidden|hidden[^>]*data-vvip-capability-trigger/);
});

test('F02 PWA description is global and sector-neutral', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.doesNotMatch(manifest.description, /المركبات|المواد|العقارات/);
  assert.match(manifest.description, /عالم|global|دولي/i);
});

test('F02 adapter enforces three canonical primary actions', () => {
  const source = read('scripts/runtime/vvip-fusion-single-surface.js');
  for (const label of ['حفظ', 'تواصل', 'مشاركة']) assert.ok(source.includes(label));
  assert.ok(source.includes('vvipCardSave'));
  assert.ok(source.includes('vvipCardContact'));
  assert.ok(source.includes('vvipCardShare'));
});

test('F02 adapter progressively reveals optional composer fields', () => {
  const source = read('scripts/runtime/vvip-fusion-single-surface.js');
  assert.ok(source.includes('ماذا تريد أن تعرض؟'));
  assert.ok(source.includes('details'));
  assert.ok(source.includes('vvipOptionalFields'));
  assert.ok(source.includes('MutationObserver'));
});
