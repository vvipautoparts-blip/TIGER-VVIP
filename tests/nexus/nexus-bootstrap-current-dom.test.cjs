'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync('scripts/nexus/bootstrap.js', 'utf8');

test('bootstrap hydrates server-enabled sectors into the canonical static NEXUS select', () => {
  assert.match(source, /function hydrateSectorOptions\s*\(/);
  assert.match(source, /querySelector\("\[data-nexus-sector\]"\)/);
  assert.match(source, /enabledSectors\(root\)/);
});

test('bootstrap reuses the canonical static Pulse Vault instead of creating a duplicate layer', () => {
  assert.match(source, /querySelector\("\[data-nexus-pulse-vault\]"\)/);
  assert.match(source, /vaultLayer\s*=\s*existing/);
  assert.match(source, /data-nexus-vault-bound/);
});
