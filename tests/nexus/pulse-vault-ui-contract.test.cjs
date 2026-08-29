'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('Pulse Vault UI exposes non-expiring balance and NEXUS delivery modes', () => {
  assert.match(html, /data-nexus-pulse-vault/);
  assert.match(html, /لا تنتهي/);
  assert.match(html, /data-nexus-pulse-mode="NOW"/);
  assert.match(html, /data-nexus-pulse-mode="SMART"/);
  assert.match(html, /data-nexus-pulse-mode="PRECISE"/);
});
