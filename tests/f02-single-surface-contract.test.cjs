const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'styles/fusion/f02-single-surface.css');
const feedPath = path.join(root, 'scripts/fusion/f02-feed.js');
const bridgePath = path.join(root, 'scripts/fusion/f02-view-bridge.js');

test('F02 Single Surface assets replace legacy marketplace presentation path', () => {
  assert.equal(fs.existsSync(cssPath), true, 'F02 Single Surface CSS must exist');
  assert.equal(fs.existsSync(feedPath), true, 'F02 feed controller must exist');
  assert.equal(fs.existsSync(bridgePath), true, 'F02 view bridge must exist');

  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /styles\/fusion\/f02-single-surface\.css/);
  assert.match(html, /scripts\/fusion\/f02-view-bridge\.js/);
  assert.match(html, /scripts\/fusion\/f02-feed\.js/);
  assert.doesNotMatch(html, /scripts\/vvip-pr29-home-marketplace\.js/);
  assert.match(html, /data-fusion-composer/);
  assert.match(html, /ماذا تريد أن تعرض؟/);
  assert.match(html, /data-fusion-capability-menu/);
  assert.match(html, /data-fusion-capability-sheet/);
  assert.match(html, /data-vvip-sector-filters/);
  assert.doesNotMatch(html, /data-sector-filter="automotive"/);
  assert.doesNotMatch(html, /data-sector-filter="materials"/);
  assert.doesNotMatch(html, /data-sector-filter="real-estate"/);
});

test('F02 CSS owns TIGER tokens and central feed geometry without Facebook token names', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /--brand-primary:/);
  assert.match(css, /--surface-primary:/);
  assert.match(css, /--text-primary:/);
  assert.match(css, /max-width:\s*720px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /--fb-blue/);
});

test('F02 feed is synthetic-preview-only by default and exposes exactly three primary card actions', () => {
  const js = fs.readFileSync(feedPath, 'utf8');
  assert.match(js, /F02_PREVIEW_LISTINGS/);
  assert.match(js, /syntheticDemo:\s*true/);
  assert.match(js, /previewAllowed/);
  assert.match(js, /data-listing-save/);
  assert.match(js, /data-listing-contact/);
  assert.match(js, /data-listing-share/);
  assert.doesNotMatch(js, /data-listing-interest/);
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /__VVIP_PR35_IDENTITY__/);
});

test('F02 view bridge only controls signed-in surface visibility and exposes PR29 compatibility', () => {
  const js = fs.readFileSync(bridgePath, 'utf8');
  assert.match(js, /VVIP_PR29/);
  assert.match(js, /showHome/);
  assert.match(js, /showGate/);
  assert.doesNotMatch(js, /Clerk/);
  assert.doesNotMatch(js, /role/i);
  assert.doesNotMatch(js, /owner/i);
  assert.doesNotMatch(js, /permission/i);
});
