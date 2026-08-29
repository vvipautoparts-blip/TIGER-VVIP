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

test('Pulse Vault UI exposes non-expiring balance and NEXUS delivery modes', () => {
  const source = readBootstrap();
  assert.match(source, /data-nexus-pulse-vault/);
  assert.match(source, /لا تنتهي/);
  assert.match(source, /data-nexus-pulse-mode/);
  assert.match(source, /NOW/);
  assert.match(source, /SMART/);
  assert.match(source, /PRECISE/);
});
