'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const subject = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/pulse-surface.js')).href;

function runtimeFixture() {
  const calls = [];
  let vault = Object.freeze({
    ok: true,
    granted: 1000,
    available: 700,
    allocated: 200,
    consumed: 100,
    remaining: 900,
    expiresAt: null,
    groups: Object.freeze([
      Object.freeze({
        allocationGroupId: '123e4567-e89b-42d3-a456-426614174000',
        postId: '223e4567-e89b-42d3-a456-426614174000',
        mode: 'SMART',
        state: 'ACTIVE',
        opportunityState: 'STRONG',
        allocated: 200,
        consumed: 50,
        released: 0,
        remaining: 150,
      }),
    ]),
  });
  return {
    calls,
    runtime: {
      async ownedObjects() { calls.push(['ownedObjects']); return Object.freeze(['223e4567-e89b-42d3-a456-426614174000']); },
      async readVault() { calls.push(['readVault']); return vault; },
      async allocate(input) { calls.push(['allocate', input]); vault = Object.freeze({ ...vault, available: 600, allocated: 300 }); return { ok: true }; },
      async pause(input) { calls.push(['pause', input]); return { ok: true }; },
      async setMode(input) { calls.push(['setMode', input]); return { ok: true }; },
    },
  };
}

const cryptoFixture = Object.freeze({ randomUUID: () => '323e4567-e89b-42d3-a456-426614174000' });

test('surface hydrates only server-owned objects and the server vault snapshot', async () => {
  const { createPulseSurface } = await import(subject + '?a=1');
  const fixture = runtimeFixture();
  const surface = createPulseSurface({ runtime: fixture.runtime, crypto: cryptoFixture });
  const state = await surface.refresh();
  assert.equal(state.ok, true);
  assert.equal(state.vault.expiresAt, null);
  assert.deepEqual([...state.ownedPostIds], ['223e4567-e89b-42d3-a456-426614174000']);
  assert.deepEqual(fixture.calls, [['ownedObjects'], ['readVault']]);
});

test('allocation is limited to owned objects and refreshes authoritative vault after command', async () => {
  const { createPulseSurface } = await import(subject + '?a=2');
  const fixture = runtimeFixture();
  const surface = createPulseSurface({ runtime: fixture.runtime, crypto: cryptoFixture });
  await surface.refresh();
  await assert.rejects(
    surface.allocateFor('423e4567-e89b-42d3-a456-426614174000', 10, 'SMART'),
    { code: 'PULSE_OBJECT_NOT_OWNED' },
  );
  const state = await surface.allocateFor('223e4567-e89b-42d3-a456-426614174000', 100, 'PRECISE');
  assert.equal(state.vault.available, 600);
  assert.equal(fixture.calls.at(-2)[0], 'allocate');
  assert.deepEqual(fixture.calls.at(-2)[1], {
    postId: '223e4567-e89b-42d3-a456-426614174000',
    units: 100,
    mode: 'PRECISE',
    idempotencyKey: 'allocate:323e4567-e89b-42d3-a456-426614174000',
  });
  assert.deepEqual(fixture.calls.at(-1), ['readVault']);
});

test('pause and mode mutation use fresh idempotency keys and then refresh server state', async () => {
  const { createPulseSurface } = await import(subject + '?a=3');
  const fixture = runtimeFixture();
  const surface = createPulseSurface({ runtime: fixture.runtime, crypto: cryptoFixture });
  await surface.refresh();
  await surface.pauseGroup('123e4567-e89b-42d3-a456-426614174000');
  assert.deepEqual(fixture.calls.at(-2), ['pause', {
    allocationGroupId: '123e4567-e89b-42d3-a456-426614174000',
    idempotencyKey: 'pause:323e4567-e89b-42d3-a456-426614174000',
  }]);
  assert.deepEqual(fixture.calls.at(-1), ['readVault']);
  await surface.setGroupMode('123e4567-e89b-42d3-a456-426614174000', 'NOW');
  assert.deepEqual(fixture.calls.at(-2), ['setMode', {
    allocationGroupId: '123e4567-e89b-42d3-a456-426614174000',
    mode: 'NOW',
    idempotencyKey: 'mode:323e4567-e89b-42d3-a456-426614174000',
  }]);
  assert.deepEqual(fixture.calls.at(-1), ['readVault']);
});

test('browser surface exposes no reserve, serve, verify, consume, or grant command', async () => {
  const { createPulseSurface } = await import(subject + '?a=4');
  const fixture = runtimeFixture();
  const surface = createPulseSurface({ runtime: fixture.runtime, crypto: cryptoFixture });
  for (const name of ['reserve', 'serve', 'verify', 'consume', 'grant']) assert.equal(surface[name], undefined);
});
