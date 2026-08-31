'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('current project status cannot advertise superseded PR #345 as the active lane', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.doesNotMatch(status, /Active lane:\s*PR #345\b/);
  assert.match(status, /PR #349\b/);
  assert.match(status, /TIGER NEXUS 2026/);
});

test('status surface remains subordinate to the mandatory owner binding', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.match(status, /NON_AUTHORITATIVE_STATUS/);
  assert.match(status, /TIGER_OWNER_BINDING_CURRENT\.md/);
});
