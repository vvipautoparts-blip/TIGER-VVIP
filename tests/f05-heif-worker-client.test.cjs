'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWorkerTransfer } = require('../scripts/media/f05-heif-adapter.js');
const { createHeifWorkerClient } = require('../scripts/media/f05-heif-worker-client.js');

const POLICY = Object.freeze({
  maxPixels: 40000000,
  minWidth: 320,
  minHeight: 240,
  maxWidth: 1600,
  maxHeight: 1200,
  webpQuality: 0.82,
  jpegQuality: 0.86
});

function makeJob(overrides) {
  return Object.assign({
    jobId: 'heif-client-1',
    bytes: new ArrayBuffer(64),
    mimeType: 'image/heic',
    transform: Object.freeze({ zoom: 1, panX: 0, panY: 0 }),
    policy: POLICY,
    signal: null
  }, overrides || {});
}

function makeWorker(onPost) {
  const listeners = { message: new Set(), error: new Set() };
  let terminated = false;
  return {
    addEventListener(type, fn) { listeners[type].add(fn); },
    removeEventListener(type, fn) { listeners[type].delete(fn); },
    postMessage(message, transfer) { onPost({ message, transfer, emit(type, data) { for (const fn of listeners[type]) fn(type === 'message' ? { data } : data); } }); },
    terminate() { terminated = true; },
    get terminated() { return terminated; }
  };
}

function mediaError(code) { const error = new Error(code); error.code = code; return error; }

test('F05 HEIF worker client transfers only the source buffer and resolves canonical WASM output', async () => {
  let posted;
  const worker = makeWorker(({ message, transfer, emit }) => {
    posted = { message, transfer };
    queueMicrotask(() => emit('message', {
      type: 'result',
      jobId: 'heif-client-1',
      result: { blob: { type: 'image/webp', size: 1024 }, width: 1600, height: 1200, decodeRoute: 'wasm', sourceKind: 'heic' }
    }));
  });
  const client = createHeifWorkerClient({ workerFactory: () => worker, buildWorkerTransfer, createMediaError: mediaError });
  const job = makeJob();
  const result = await client.process(job);
  assert.equal(posted.message.type, 'process');
  assert.equal(posted.message.job.bytes, job.bytes);
  assert.deepEqual(posted.transfer, [job.bytes]);
  assert.equal('filename' in posted.message.job, false);
  assert.equal('url' in posted.message.job, false);
  assert.equal(result.decodeRoute, 'wasm');
  assert.equal(result.sourceKind, 'heic');
  assert.equal(worker.terminated, true);
});

test('F05 HEIF worker client is fail-closed on worker execution error', async () => {
  const worker = makeWorker(({ emit }) => queueMicrotask(() => emit('error', new Error('worker crashed'))));
  const client = createHeifWorkerClient({ workerFactory: () => worker, buildWorkerTransfer, createMediaError: mediaError });
  await assert.rejects(() => client.process(makeJob()), error => error && error.code === 'capability_unavailable');
  assert.equal(worker.terminated, true);
});

test('F05 HEIF worker client preserves bounded worker denial codes and rejects unknown codes', async () => {
  const denied = makeWorker(({ emit }) => queueMicrotask(() => emit('message', { type: 'error', jobId: 'heif-client-1', code: 'heif_sequence_denied' })));
  const deniedClient = createHeifWorkerClient({ workerFactory: () => denied, buildWorkerTransfer, createMediaError: mediaError });
  await assert.rejects(() => deniedClient.process(makeJob()), error => error && error.code === 'heif_sequence_denied');

  const unknown = makeWorker(({ emit }) => queueMicrotask(() => emit('message', { type: 'error', jobId: 'heif-client-1', code: 'invented_error' })));
  const unknownClient = createHeifWorkerClient({ workerFactory: () => unknown, buildWorkerTransfer, createMediaError: mediaError });
  await assert.rejects(() => unknownClient.process(makeJob()), error => error && error.code === 'capability_unavailable');
});

test('F05 HEIF worker client rejects malformed output instead of falling back', async () => {
  const worker = makeWorker(({ emit }) => queueMicrotask(() => emit('message', { type: 'result', jobId: 'heif-client-1', result: { blob: { type: 'image/heic', size: 10 }, width: 1600, height: 1200 } })));
  const client = createHeifWorkerClient({ workerFactory: () => worker, buildWorkerTransfer, createMediaError: mediaError });
  await assert.rejects(() => client.process(makeJob()), error => error && error.code === 'encode_failed');
});
