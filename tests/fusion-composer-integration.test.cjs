'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const composerPath = path.join(root, 'scripts', 'fusion', 'progressive-composer.js');

test('authoritative surface loads the progressive composer instead of the legacy fixed-sector wizard', () => {
  assert.match(index, /scripts\/fusion\/progressive-composer\.js/);
  assert.doesNotMatch(index, /scripts\/vvip-pr31-create-listing-shell\.js/);
  assert.match(index, /data-fusion-composer-trigger/);
  assert.doesNotMatch(index, /data-fusion-composer-trigger[^>]*disabled/);
});

test('composer requires auth and exposes the progressive first-view field contract', () => {
  const source = fs.readFileSync(composerPath, 'utf8');
  assert.match(source, /VVIP_AUTH/);
  assert.match(source, /requireAuth/);
  assert.match(source, /CREATE_LISTING/);
  for (const name of ['title', 'sector', 'category', 'priceType', 'price', 'location']) {
    assert.match(source, new RegExp(`name=["']${name}["']`));
  }
  assert.match(source, /data-fusion-composer-media/);
  assert.match(source, /VVIP_FUSION_SECTOR_REGISTRY/);
  assert.match(source, /enabled\s*===\s*true/);
});

test('composer delegates still-image processing to PR36/F05 and never adds server HEIC conversion fallback', () => {
  const source = fs.readFileSync(composerPath, 'utf8');
  assert.match(source, /VVIP_PR36_MEDIA/);
  assert.match(source, /createBrowserSession/);
  assert.match(source, /mountMediaController/);
  assert.doesNotMatch(source, /convertHeic|convertHeif|decodeHeicOnServer|decodeHeifOnServer|serverHeic/i);
  assert.doesNotMatch(source, /fetch\([^)]*heic/i);
});

test('composer routes publication through the one sovereign repository command', () => {
  const source = fs.readFileSync(composerPath, 'utf8');
  assert.match(source, /\.requestPublication\(/);
  assert.doesNotMatch(source, /\.prepareForPublication\(/);
});

test('composer never claims publication success from local draft state', () => {
  const source = fs.readFileSync(composerPath, 'utf8');
  assert.doesNotMatch(source, /LOCAL_DRAFT_ONLY/);
  assert.doesNotMatch(source, /publicationSuccess\s*=\s*true/);
  assert.match(source, /result\.status\s*!==\s*['"]PENDING_REVIEW['"]/);
});
