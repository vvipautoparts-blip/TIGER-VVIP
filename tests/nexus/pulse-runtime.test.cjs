'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/pulse-runtime.js')).href;

async function loadSubject() {
  return import(moduleUrl + `?t=${Date.now()}-${Math.random()}`);
}

function clientWith(handler) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      return handler(name, args);
    }
  };
}

const GROUP_ID = '123e4567-e89b-42d3-a456-426614174000';
const POST_ID = '223e4567-e89b-42d3-a456-426614174000';

test('readVault accepts only a server-conserved non-expiring aggregate snapshot', async () => {
  const { createPulseRuntime } = await loadSubject();
  const client = clientWith(async () => ({
    data: {
      ok: true,
      granted: 1000,
      available: 250,
      allocated: 500,
      consumed: 250,
      expiresAt: null,
      groups: [{
        allocationGroupId: GROUP_ID,
        postId: POST_ID,
        mode: 'SMART',
        state: 'ACTIVE',
        opportunityState: 'STRONG',
        allocated: 500,
        consumed: 250,
        released: 0,
        remaining: 250
      }]
    },
    error: null
  }));
  const runtime = createPulseRuntime(client);
  const snapshot = await runtime.readVault();
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.granted, 1000);
  assert.equal(snapshot.available + snapshot.allocated + snapshot.consumed, snapshot.granted);
  assert.equal(snapshot.expiresAt, null);
  assert.equal(snapshot.groups[0].mode, 'SMART');
  assert.deepEqual(client.calls, [{ name: 'vvip_pulse_vault_read', args: undefined }]);
});

test('readVault fails closed on malformed or non-conserved server state', async () => {
  const { createPulseRuntime } = await loadSubject();
  for (const data of [
    null,
    { ok: true, granted: 100, available: 90, allocated: 20, consumed: 0, expiresAt: null, groups: [] },
    { ok: true, granted: 100, available: 100, allocated: 0, consumed: 0, expiresAt: '2026-09-01', groups: [] }
  ]) {
    const runtime = createPulseRuntime(clientWith(async () => ({ data, error: null })));
    await assert.rejects(runtime.readVault(), { code: 'PULSE_VAULT_SNAPSHOT_INVALID' });
  }
});

test('browser runtime exposes only owner-safe vault commands with exact RPC arguments', async () => {
  const { createPulseRuntime } = await loadSubject();
  const client = clientWith(async (name, args) => ({ data: { ok: true, name, args }, error: null }));
  const runtime = createPulseRuntime(client);

  await runtime.allocate({ postId: POST_ID, units: 300, mode: 'PRECISE', idempotencyKey: 'allocate-12345678' });
  await runtime.pause({ allocationGroupId: GROUP_ID, idempotencyKey: 'pause-12345678' });
  await runtime.setMode({ allocationGroupId: GROUP_ID, mode: 'NOW', idempotencyKey: 'mode-12345678' });

  assert.deepEqual(client.calls, [
    { name: 'vvip_pulse_allocate', args: { p_post_id: POST_ID, p_requested_units: 300, p_mode: 'PRECISE', p_idempotency_key: 'allocate-12345678' } },
    { name: 'vvip_pulse_pause_allocation', args: { p_allocation_group_id: GROUP_ID, p_idempotency_key: 'pause-12345678' } },
    { name: 'vvip_pulse_mode_set', args: { p_allocation_group_id: GROUP_ID, p_mode: 'NOW', p_idempotency_key: 'mode-12345678' } }
  ]);

  for (const forbidden of ['reserve', 'serve', 'verify', 'consume', 'grant']) {
    assert.equal(runtime[forbidden], undefined, `${forbidden} must not exist in browser runtime`);
  }
});

test('owner command validation rejects invalid UUIDs, modes, units, and short idempotency keys before RPC', async () => {
  const { createPulseRuntime } = await loadSubject();
  const client = clientWith(async () => ({ data: { ok: true }, error: null }));
  const runtime = createPulseRuntime(client);
  await assert.rejects(runtime.allocate({ postId: 'bad', units: 1, mode: 'SMART', idempotencyKey: 'allocate-12345678' }), { code: 'PULSE_OBJECT_ID_INVALID' });
  await assert.rejects(runtime.allocate({ postId: POST_ID, units: 0, mode: 'SMART', idempotencyKey: 'allocate-12345678' }), { code: 'PULSE_ALLOCATION_UNITS_INVALID' });
  await assert.rejects(runtime.setMode({ allocationGroupId: GROUP_ID, mode: 'FAST', idempotencyKey: 'mode-12345678' }), { code: 'PULSE_MODE_INVALID' });
  await assert.rejects(runtime.pause({ allocationGroupId: GROUP_ID, idempotencyKey: 'short' }), { code: 'PULSE_IDEMPOTENCY_KEY_INVALID' });
  assert.equal(client.calls.length, 0);
});

test('ownedObjects returns only server-confirmed Pulse-eligible object ids for UI decoration', async () => {
  const { createPulseRuntime } = await loadSubject();
  const client = clientWith(async (name) => ({
    data: name === 'vvip_nexus_owned_pulse_objects'
      ? { ok: true, items: [{ postId: POST_ID }] }
      : null,
    error: null
  }));
  const runtime = createPulseRuntime(client);
  const items = await runtime.ownedObjects();
  assert.deepEqual(items, [POST_ID]);
  assert.deepEqual(client.calls, [{ name: 'vvip_nexus_owned_pulse_objects', args: { p_limit: 200 } }]);
});

test('ownedObjects fails closed on malformed ownership projection', async () => {
  const { createPulseRuntime } = await loadSubject();
  const runtime = createPulseRuntime(clientWith(async () => ({ data: { ok: true, items: [{ postId: 'bad' }] }, error: null })));
  await assert.rejects(runtime.ownedObjects(), { code: 'PULSE_OWNED_OBJECTS_INVALID' });
});
