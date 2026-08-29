'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shellJs = fs.readFileSync(path.join(root, 'scripts/social/core-shell.js'), 'utf8');

test('home feed is the default social destination', () => {
  assert.match(shellJs, /destinationFromHash\(\) \|\| 'home'/);
  assert.match(indexHtml, /data-tiger-social-feed/);
});

test('persistent TIGER Command trigger exists in the primary header', () => {
  assert.match(indexHtml, /data-fusion-capability-menu/);
  assert.match(indexHtml, /aria-label="(?:القائمة|TIGER Command|أوامر TIGER)"/);
});

test('primary navigation has no inactive/dead video placeholder', () => {
  assert.doesNotMatch(indexHtml, /social-nav-item--inactive/);
});
