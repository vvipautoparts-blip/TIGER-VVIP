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
  for (const token of ['--brand-primary:', '--brand-primary-hover:', '--login-surface:', '--login-accent:']) {
    assert.ok(tokens.includes(token), `missing token ${token}`);
  }
  const market = read('styles/vvip-pr29-home-marketplace.css');
  assert.equal(market.includes('--fb-blue'), false);
});

test('F02 Home feed is one bounded central column', () => {
  const css = read('styles/vvip-pr29-home-marketplace.css');
  assert.match(css, /\.marketplace\s*\{[^}]*min\(720px,\s*100%\)/s);
  assert.equal(/\.listing-grid\s*\{[^}]*repeat\((?:2|3),/s.test(css), false);
  assert.equal(/\.listing-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s.test(css), true);
});

test('F02 source shell loads tokens and keeps privileged gateway dormant', () => {
  const html = read('index.html');
  const tokenIndex = html.indexOf('styles/vvip-fusion-tokens.css');
  const marketIndex = html.indexOf('styles/vvip-pr29-home-marketplace.css');
  assert.ok(tokenIndex >= 0 && marketIndex > tokenIndex);
  assert.match(html, /data-vvip-capability-trigger[^>]*hidden|hidden[^>]*data-vvip-capability-trigger/);
});

test('F02 PWA description is global and sector-neutral', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(typeof manifest.description, 'string');
  assert.doesNotMatch(manifest.description, /المركبات|المواد|العقارات/);
  assert.match(manifest.description, /عالم|global|دولي/i);
});

test('F02 Production card uses three canonical primary actions', () => {
  const source = read('scripts/vvip-production-marketplace.js');
  for (const label of ['حفظ', 'تواصل', 'مشاركة']) assert.ok(source.includes(label));
  assert.equal(source.includes('whatsapp.textContent = "واتساب"'), false);
});

test('F02 Production composer starts simple and progressively reveals optional fields', () => {
  const source = read('scripts/vvip-production-marketplace.js');
  assert.ok(source.includes('ماذا تريد أن تعرض؟'));
  assert.ok(source.includes('<details'));
  assert.ok(source.includes('data-vvip-optional-fields'));
});
