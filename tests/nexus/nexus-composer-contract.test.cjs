'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('primary social composer uses the NEXUS sector-intent prompt', () => {
  assert.match(indexHtml, /ماذا تعرض أو تحتاج؟/);
  assert.doesNotMatch(indexHtml, />بماذا تفكر؟</);
});

test('composer exposes sector and intent hooks without a second paid-post creation path', () => {
  assert.match(indexHtml, /data-nexus-sector/);
  assert.match(indexHtml, /data-nexus-intent/);
  assert.match(indexHtml, /data-social-post-trigger/);
  assert.doesNotMatch(indexHtml, /data-nexus-paid-post-create/);
});
