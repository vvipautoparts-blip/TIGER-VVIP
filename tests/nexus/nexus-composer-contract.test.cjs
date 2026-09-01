'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/nexus/bootstrap.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('primary social composer is the only NEXUS creation entry', () => {
  assert.match(index, /ماذا تعرض أو تحتاج؟/);
  assert.equal((index.match(/data-social-post-trigger/g) || []).length, 1);
});

test('sector and intent hooks are canonical static DOM, not injected compatibility UI', () => {
  assert.match(index, /data-nexus-sector/);
  assert.match(index, /data-nexus-intent/);
  assert.match(bootstrap, /function bindCanonicalComposer\s*\(/);
  assert.match(bootstrap, /NEXUS_CANONICAL_DOM_REQUIRED/);
  assert.doesNotMatch(bootstrap, /createElement\(['"]select['"]\)/);
  assert.doesNotMatch(bootstrap, /insertBefore\(/);
  assert.doesNotMatch(index, /data-nexus-paid-post-create/);
});
