'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/pulse-vault.js')).href;

async function loadSubject() {
  return import(moduleUrl);
}

test('accepts only current Pulse reference levels and no product-time expiry', async () => {
  const { derivePulseVault } = await loadSubject();
  const result = derivePulseVault({ level: 'PULSE_25', total: 1000, consumed: 250, allocated: 500, mode: 'SMART' });
  assert.deepEqual(result, {
    ok: true,
    code: 'OK',
    level: 'PULSE_25',
    total: 1000,
    consumed: 250,
    allocated: 500,
    available: 500,
    remaining: 750,
    mode: 'SMART',
    expiresAt: null
  });
});

test('rejects superseded levels and invalid delivery modes', async () => {
  const { derivePulseVault } = await loadSubject();
  assert.equal(derivePulseVault({ level: 'PULSE_20', total: 100, consumed: 0, allocated: 0, mode: 'SMART' }).code, 'PULSE_LEVEL_INVALID');
  assert.equal(derivePulseVault({ level: 'PULSE_10', total: 100, consumed: 0, allocated: 0, mode: 'FAST' }).code, 'PULSE_MODE_INVALID');
});

test('rejects negative or over-consumed balances', async () => {
  const { derivePulseVault } = await loadSubject();
  assert.equal(derivePulseVault({ level: 'PULSE_2', total: 100, consumed: 101, allocated: 0, mode: 'NOW' }).code, 'PULSE_BALANCE_INVALID');
  assert.equal(derivePulseVault({ level: 'PULSE_2', total: -1, consumed: 0, allocated: 0, mode: 'NOW' }).code, 'PULSE_BALANCE_INVALID');
});
