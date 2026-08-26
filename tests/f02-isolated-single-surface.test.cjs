const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'fusion-home-f02.html');
const cssPath = path.join(root, 'styles/fusion/f02-single-surface.css');
const feedPath = path.join(root, 'scripts/fusion/f02-feed.js');

test('F02 isolated Single Surface is complete and contains no auth or legacy marketplace runtime', () => {
  assert.equal(fs.existsSync(pagePath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(feedPath), true);

  const html = fs.readFileSync(pagePath, 'utf8');
  assert.match(html, /VVIP TIGER FUSION/);
  assert.match(html, /styles\/fusion\/f02-single-surface\.css/);
  assert.match(html, /scripts\/fusion\/f02-feed\.js/);
  assert.match(html, /data-fusion-composer/);
  assert.match(html, /ماذا تريد أن تعرض؟/);
  assert.match(html, /data-fusion-capability-menu/);
  assert.match(html, /data-fusion-capability-sheet/);
  assert.match(html, /data-vvip-sector-filters/);
  assert.match(html, /data-vvip-marketplace-feed/);
  assert.doesNotMatch(html, /vvip-pr29-home-marketplace\.js/);
  assert.doesNotMatch(html, /clerk/i);
  assert.doesNotMatch(html, /data-sector-filter="automotive"/);
  assert.doesNotMatch(html, /data-sector-filter="materials"/);
  assert.doesNotMatch(html, /data-sector-filter="real-estate"/);
});

test('F02 design layer uses TIGER semantic tokens and 720px central feed budget', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /--brand-primary:/);
  assert.match(css, /--surface-primary:/);
  assert.match(css, /--text-primary:/);
  assert.match(css, /max-width:\s*720px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /is-data-saver/);
  assert.doesNotMatch(css, /--fb-blue/);
});

test('F02 feed uses synthetic local preview and only Save Contact Share primary actions', () => {
  const js = fs.readFileSync(feedPath, 'utf8');
  assert.match(js, /F02_PREVIEW_LISTINGS/);
  assert.match(js, /syntheticDemo:\s*true/);
  assert.match(js, /previewAllowed/);
  assert.match(js, /VVIP_FUSION_PUBLIC_LISTINGS/);
  assert.match(js, /data-listing-save/);
  assert.match(js, /data-listing-contact/);
  assert.match(js, /data-listing-share/);
  assert.doesNotMatch(js, /data-listing-interest/);
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /__VVIP_PR35_IDENTITY__/);
});
