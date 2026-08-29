'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const bootstrapPath = path.join(root, 'scripts/nexus/bootstrap.js');

function readBootstrap() {
  assert.equal(fs.existsSync(bootstrapPath), true, 'NEXUS bootstrap must exist');
  return fs.readFileSync(bootstrapPath, 'utf8');
}

test('primary social composer converges to the NEXUS sector-intent prompt', () => {
  const source = readBootstrap();
  assert.match(source, /ماذا تعرض أو تحتاج؟/);
  assert.match(source, /data-social-post-trigger/);
});

test('composer injects sector and intent hooks without a second paid-post creation path', () => {
  const source = readBootstrap();
  assert.match(source, /data-nexus-sector/);
  assert.match(source, /data-nexus-intent/);
  assert.doesNotMatch(source, /data-nexus-paid-post-create/);
});
