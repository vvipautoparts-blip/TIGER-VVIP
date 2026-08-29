'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/pulse-vault.js')).href;

async function loadSubject() {
  return import(moduleUrl);
}

test('accepts only current Pulse reference levels and conserves visibility balance with no product-time expiry', async () => {
  const { derivePulseVault } = await loadSubject();
  const result = derivePulseVault({ level: 'PULSE_25', total: 1000, consumed: 250, allocated: 500, mode: 'SMART' });
  assert.deepEqual(result, {
    ok: true,
    code: 'OK',
    level: 'PULSE_25',
    total: 1000,
    consumed: 250,
    allocated: 500,
    available: 250,
    remaining: 750,
    mode: 'SMART',
    expiresAt: null
  });
  assert.equal(result.consumed + result.allocated + result.available, result.total);
});

test('rejects superseded levels and invalid delivery modes', async () => {
  const { derivePulseVault } = await loadSubject();
  assert.equal(derivePulseVault({ level: 'PULSE_20', total: 100, consumed: 0, allocated: 0, mode: 'SMART' }).code, 'PULSE_LEVEL_INVALID');
  assert.equal(derivePulseVault({ level: 'PULSE_10', total: 100, consumed: 0, allocated: 0, mode: 'FAST' }).code, 'PULSE_MODE_INVALID');
});

test('rejects negative, over-consumed, or over-allocated balances', async () => {
  const { derivePulseVault } = await loadSubject();
  assert.equal(derivePulseVault({ level: 'PULSE_2', total: 100, consumed: 101, allocated: 0, mode: 'NOW' }).code, 'PULSE_BALANCE_INVALID');
  assert.equal(derivePulseVault({ level: 'PULSE_2', total: -1, consumed: 0, allocated: 0, mode: 'NOW' }).code, 'PULSE_BALANCE_INVALID');
  assert.equal(derivePulseVault({ level: 'PULSE_2', total: 100, consumed: 60, allocated: 41, mode: 'NOW' }).code, 'PULSE_BALANCE_INVALID');
});
