'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const controller = require('../scripts/media/pr36-controller.js');
const pr36Policy = require('../scripts/media/pr36-policy.js');
const canvasApi = require('../scripts/media/pr36-canvas-adapter.js');
const workerApi = require('../scripts/media/pr36-worker-adapter.js');
const sessionApi = require('../scripts/media/pr36-session.js');
const schedulerApi = require('../scripts/media/pr36-scheduler.js');
const heifPreflight = require('../scripts/media/f05-heif-preflight.js');
const bridgeApi = require('../scripts/media/f05-pr36-media-bridge.js');
const heifAdapter = require('../scripts/media/f05-heif-adapter.js');
const heifWorkerClient = require('../scripts/media/f05-heif-worker-client.js');

function ascii(value) { return [...Buffer.from(value, 'ascii')]; }
function u32(value) { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }
function heicBytes() {
  return Uint8Array.from([...u32(20), ...ascii('ftyp'), ...ascii('heic'), 0, 0, 0, 0, ...ascii('mif1')]);
}
function makeHeicFile() {
  const bytes = heicBytes();
  return {
    type: 'image/heic', size: bytes.byteLength, name: 'private-location-photo.heic',
    slice(start, end) { const view = bytes.slice(start || 0, end == null ? bytes.length : end); return { arrayBuffer: async () => view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) }; },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
}
function makeWindow(mode, trace) {
  let id = 0;
  class Worker {
    constructor(url, options) {
      trace.urls.push({ url, options: options || null });
      this.listeners = { message: new Set(), error: new Set() };
      this.url = url;
      if (url.includes('pr36-media-worker.js')) trace.standardWorkers += 1;
      if (url.includes('f05-heif-worker.js')) trace.heifWorkers += 1;
    }
    addEventListener(type, fn) { this.listeners[type].add(fn); }
    removeEventListener(type, fn) { this.listeners[type].delete(fn); }
    terminate() { trace.terminated += 1; }
    postMessage(message, transfer) {
      trace.posts.push({ url: this.url, message, transfer });
      if (this.url.includes('pr36-media-worker.js')) throw new Error('standard PR36 worker must never receive original HEIC');
      assert.equal(message.type, 'process');
      assert.equal(message.job.mimeType, 'image/heic');
      assert.equal(message.job.bytes instanceof ArrayBuffer, true);
      assert.deepEqual(message.job.transform, { zoom: 1, panX: 0, panY: 0 });
      assert.equal(message.job.policy.maxPixels, 40000000);
      assert.deepEqual(transfer, [message.job.bytes]);
      for (const forbidden of ['filename', 'name', 'url', 'token']) assert.equal(forbidden in message.job, false);
      const emit = (type, data) => { for (const fn of this.listeners[type]) fn(type === 'message' ? { data } : data); };
      queueMicrotask(() => {
        if (mode === 'deny') emit('message', { type: 'error', jobId: message.job.jobId, code: 'heif_sequence_denied' });
        else emit('message', { type: 'result', jobId: message.job.jobId, result: { blob: { type: 'image/webp', size: 1024 }, width: 800, height: 600, decodeRoute: 'wasm', sourceKind: 'heic' } });
      });
    }
  }
  return {
    VVIP_PR36_POLICY: pr36Policy,
    VVIP_PR36_CANVAS: canvasApi,
    VVIP_PR36_WORKER: workerApi,
    VVIP_PR36_SESSION: sessionApi,
    VVIP_PR36_SCHEDULER: schedulerApi,
    VVIP_F05_HEIF_PREFLIGHT: heifPreflight,
    VVIP_F05_PR36_MEDIA_BRIDGE: bridgeApi,
    VVIP_F05_HEIF_ADAPTER: heifAdapter,
    VVIP_F05_HEIF_WORKER_CLIENT: heifWorkerClient,
    Worker,
    OffscreenCanvas: function OffscreenCanvas() {},
    createImageBitmap() { trace.mainThreadDecodes += 1; throw new Error('main-thread HEIC decode forbidden'); },
    URL: { createObjectURL: () => `blob:${++id}`, revokeObjectURL() {} },
    crypto: { randomUUID: () => `id-${++id}` }
  };
}
function makeTrace() { return { urls: [], posts: [], standardWorkers: 0, heifWorkers: 0, mainThreadDecodes: 0, terminated: 0 }; }

test('F05 bridge returns a session-cleanable HEIC source without weakening bounded preflight', async () => {
  const bridge = bridgeApi.createF05MediaPolicyBridge({ pr36Policy, heifPreflight });
  const source = await bridge.validateSource(makeHeicFile());
  assert.equal(source.requiresHeifDecode, true);
  assert.equal(source.mimeType, 'image/heic');
  assert.equal(Object.isFrozen(source), false);
  assert.doesNotThrow(() => { source.file = null; source.header = null; });
});

test('browser session routes original HEIC only to the dedicated module worker and commits sanitized derivative metadata', async () => {
  const trace = makeTrace();
  const win = makeWindow('success', trace);
  const doc = { createElement() { throw new Error('main-thread canvas must not be allocated for HEIC'); } };
  const session = controller.createBrowserSession(win, doc);
  assert.ok(session);
  await session.select([makeHeicFile()]);
  await session.confirmOperation();
  const snapshot = session.displaySnapshot();
  assert.equal(snapshot.images.length, 1);
  assert.equal(snapshot.images[0].mimeType, 'image/webp');
  assert.equal(snapshot.images[0].width, 800);
  assert.equal(snapshot.images[0].height, 600);
  assert.equal(trace.standardWorkers, 0);
  assert.equal(trace.mainThreadDecodes, 0);
  assert.ok(trace.heifWorkers >= 2);
  assert.ok(trace.urls.every(entry => entry.url === 'workers/media/f05-heif-worker.js'));
  assert.ok(trace.urls.every(entry => entry.options && entry.options.type === 'module'));
  assert.ok(trace.posts.every(entry => entry.url === 'workers/media/f05-heif-worker.js'));
  session.dispose();
});

test('HEIC worker denial is fail-closed and never retries PR36 main-thread or standard worker', async () => {
  const trace = makeTrace();
  const win = makeWindow('deny', trace);
  const doc = { createElement() { throw new Error('main-thread canvas must not be allocated for denied HEIC'); } };
  const session = controller.createBrowserSession(win, doc);
  assert.ok(session);
  await assert.rejects(() => session.select([makeHeicFile()]), error => error && error.code === 'heif_sequence_denied');
  assert.equal(trace.standardWorkers, 0);
  assert.equal(trace.mainThreadDecodes, 0);
  assert.equal(trace.heifWorkers, 1);
  session.dispose();
});

test('canonical browser pages load F05 HEIC modules before the PR36 controller exactly once', () => {
  const order = [
    'f05-heif-preflight.js',
    'f05-pr36-media-bridge.js',
    'f05-heif-adapter.js',
    'f05-heif-worker-client.js',
    'pr36-controller.js'
  ];
  for (const page of ['index.html', 'private-profile-p03.html']) {
    const html = fs.readFileSync(page, 'utf8');
    let at = -1;
    for (const name of order) {
      assert.equal(html.split(name).length - 1, 1, `${page} ${name}`);
      const next = html.indexOf(name);
      assert.ok(next > at, `${page} order ${name}`);
      at = next;
    }
  }
});
