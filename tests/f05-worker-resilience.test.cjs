'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { classifyWorkerFailure } = require('../scripts/media/f05-worker-resilience.js');

test('F05 worker resilience preserves explicit bounded codes', () => {
  const error = new Error('anything');
  error.code = 'metadata_not_stripped';
  assert.equal(classifyWorkerFailure(error), 'metadata_not_stripped');
});

test('F05 worker resilience classifies explicit allocation failures as memory limits', () => {
  for (const message of ['Out of memory', 'Cannot enlarge memory arrays', 'std::bad_alloc', 'failed to grow memory']) {
    assert.equal(classifyWorkerFailure(new Error(message)), 'heif_memory_limit');
  }
});

test('F05 worker resilience distinguishes runtime traps from ordinary decode rejection', () => {
  assert.equal(classifyWorkerFailure(new WebAssembly.RuntimeError('memory access out of bounds')), 'heif_worker_crash');
  assert.equal(classifyWorkerFailure(new WebAssembly.RuntimeError('unreachable')), 'heif_worker_crash');
  assert.equal(classifyWorkerFailure(new Error('invalid bitstream')), 'heif_decode_failed');
});

test('F05 HEIF worker uses resilience classification and client has timeout/crash termination recovery', () => {
  const worker = fs.readFileSync('workers/media/f05-heif-worker.js', 'utf8');
  const client = fs.readFileSync('scripts/media/f05-heif-worker-client.js', 'utf8');
  assert.ok(worker.includes('../../scripts/media/f05-worker-resilience.js'));
  assert.ok(worker.includes('classifyWorkerFailure(error)'));
  assert.ok(client.includes('heif_decode_timeout'));
  assert.ok(client.includes('heif_worker_crash'));
  assert.ok(client.includes('worker.terminate()'));
  assert.ok(client.includes('worker=deps.workerFactory()'));
});
