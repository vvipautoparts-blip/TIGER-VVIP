'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync(path.resolve(__dirname, '../../scripts/nexus/pulse-surface.js'), 'utf8');

test('Pulse Vault UI exposes non-expiring server balance and NEXUS delivery modes', () => {
  assert.match(source, /data-nexus-pulse-vault/);
  assert.match(source, /لا تنتهي/);
  assert.match(source, /data-nexus-pulse-mode/);
  assert.match(source, /NOW/);
  assert.match(source, /SMART/);
  assert.match(source, /PRECISE/);
  assert.match(source, /createPulseRuntime/);
});
