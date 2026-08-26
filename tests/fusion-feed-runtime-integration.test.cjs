'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const feed = fs.readFileSync(path.resolve(__dirname, '../scripts/fusion/f02-feed.js'), 'utf8');
const index = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

test('authoritative feed keeps F04 as the only search authority', () => {
  assert.match(feed, /import\(["']\.\/f04-search-fabric\.js["']\)/);
  assert.match(feed, /searchFabric\.searchListings\s*\(/);
  assert.doesNotMatch(feed, /\.includes\(query\)/);
  assert.match(index, /data-search-rescue/);
});

test('sector controls are registry-driven and disabled sectors cannot be rendered active', () => {
  assert.match(feed, /VVIP_FUSION_SECTOR_REGISTRY/);
  assert.match(feed, /enabled\s*===\s*true/);
  assert.match(feed, /readSectorRegistry/);
  assert.doesNotMatch(feed, /const\s+SECTORS\s*=\s*Object\.freeze/);
  assert.doesNotMatch(index, /data-sector-filter="automotive"/);
  assert.doesNotMatch(index, /data-sector-filter="materials"/);
  assert.doesNotMatch(index, /data-sector-filter="real-estate"/);
});

test('normal hosted runtime never substitutes synthetic preview listings for missing live data', () => {
  assert.match(feed, /previewAllowed\(\)/);
  assert.match(feed, /VVIP_FUSION_PUBLIC_LISTINGS/);
  assert.doesNotMatch(feed, /if\s*\(!source\).*F02_PREVIEW_LISTINGS/);
});
