'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');

test('NEXUS exposes exactly one central creation trigger', () => {
  const triggers = index.match(/data-social-post-trigger/g) || [];
  assert.equal(triggers.length, 1);
  assert.match(index, /data-tiger-social-feed[\s\S]*data-social-post-trigger/);
});

test('sector discovery reuses Living Objects without a second creation surface', () => {
  assert.match(index, /data-social-marketplace-surface/);
  const discovery = index.match(/<section data-social-marketplace-surface[\s\S]*?<\/section>\s*<\/main>/);
  assert.ok(discovery, 'sector discovery surface must exist');
  assert.doesNotMatch(discovery[0], /data-social-post-trigger/);
  assert.doesNotMatch(index, /data-nexus-create-context=["']marketplace["']/i);
  assert.doesNotMatch(index, /nexus-marketplace-create/i);
  assert.doesNotMatch(index, /VVIP\s+TIGER\s+MARKETPLACE/i);
});

test('parallel creation and publication source files are physically absent', () => {
  for (const relative of [
    'scripts/fusion/progressive-composer.js',
    'styles/fusion/progressive-composer.css',
    'tests/fusion-progressive-composer.test.cjs',
    'tests/fusion-composer-integration.test.cjs',
    'scripts/vvip-pr31-create-listing-shell.js',
    'styles/vvip-pr31-create-listing-shell.css',
    'scripts/vvip-pr32-draft-preview.js',
    'styles/vvip-pr32-draft-preview.css',
    'scripts/vvip-pr33-publish-readiness.js',
    'styles/vvip-pr33-publish-readiness.css',
    'scripts/runtime/vvip-my-listings.js'
  ]) {
    assert.equal(fs.existsSync(relative), false, `${relative} must stay deleted`);
  }
});
