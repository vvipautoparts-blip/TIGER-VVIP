'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fusionPreview = fs.readFileSync(path.join(root, 'fusion-home-f02.html'), 'utf8');

test('authoritative entrypoint preserves Clerk and exposes the FUSION Single Surface hosts', () => {
  assert.match(index, /data-vvip-fusion-authoritative/);
  assert.match(index, /data-vvip-auth-gate/);
  assert.match(index, /id="clerk-main-auth"/);
  assert.match(index, /data-fusion-composer/);
  assert.match(index, /data-vvip-sector-filters/);
  assert.match(index, /data-search-rescue/);
  assert.match(index, /data-fusion-capability-menu/);
  assert.match(index, /scripts\/fusion\/runtime-adapters\.js/);
  assert.match(index, /scripts\/fusion\/single-surface-controller\.js/);
});

test('authoritative entrypoint does not hard-code the retired fixed three-sector surface', () => {
  assert.doesNotMatch(index, /data-sector-filter="automotive"/);
  assert.doesNotMatch(index, /data-sector-filter="materials"/);
  assert.doesNotMatch(index, /data-sector-filter="real-estate"/);
});

test('isolated F02 page is explicitly a migration preview rather than route authority', () => {
  assert.match(fusionPreview, /data-vvip-fusion-migration-preview/);
  assert.doesNotMatch(fusionPreview, /data-vvip-fusion-authoritative/);
});
