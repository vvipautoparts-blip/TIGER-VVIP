'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const release = fs.readFileSync('tools/vvip_public_release.py', 'utf8');
const smoke = fs.readFileSync('scripts/qa-smoke.sh', 'utf8');

test('NEXUS exposes one creation path across Home and Marketplace', () => {
  assert.match(index, /data-social-marketplace-surface[\s\S]*data-social-post-trigger/);
  assert.doesNotMatch(index, /data-marketplace-listing-trigger/);
  assert.doesNotMatch(index, /data-fusion-composer-trigger/);
  assert.doesNotMatch(index, /scripts\/fusion\/progressive-composer\.js/);
  assert.doesNotMatch(index, /styles\/fusion\/progressive-composer\.css/);
});

test('sealed public artifact and smoke gate do not preserve the retired Marketplace wizard', () => {
  assert.doesNotMatch(release, /scripts\/fusion\/progressive-composer\.js/);
  assert.doesNotMatch(release, /styles\/fusion\/progressive-composer\.css/);
  assert.doesNotMatch(smoke, /scripts\/fusion\/progressive-composer\.js/);
  assert.doesNotMatch(smoke, /styles\/fusion\/progressive-composer\.css/);
});

test('retired wizard source is physically absent from the current tree', () => {
  assert.equal(fs.existsSync('scripts/fusion/progressive-composer.js'), false);
  assert.equal(fs.existsSync('styles/fusion/progressive-composer.css'), false);
  assert.equal(fs.existsSync('tests/fusion-progressive-composer.test.cjs'), false);
  assert.equal(fs.existsSync('tests/fusion-composer-integration.test.cjs'), false);
});
