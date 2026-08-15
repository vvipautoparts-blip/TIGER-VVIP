'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWorkerTransfer } = require('../scripts/media/f05-heif-adapter.js');

const POLICY = Object.freeze({
  maxPixels: 40000000,
  minWidth: 320,
  minHeight: 240,
  maxWidth: 1600,
  maxHeight: 1200,
  webpQuality: 0.82,
  jpegQuality: 0.86
});

test('F05 HEIF adapter emits the exact process contract consumed by the real browser worker', () => {
  const bytes = new ArrayBuffer(32);
  const transform = Object.freeze({ zoom: 1, panX: 0, panY: 0 });
  const transfer = buildWorkerTransfer({
    jobId: 'job-protocol-1',
    bytes,
    mimeType: 'image/heic',
    transform,
    policy: POLICY
  });

  assert.equal(transfer.message.type, 'process');
  assert.ok(transfer.message.job);
  assert.equal(transfer.message.job.jobId, 'job-protocol-1');
  assert.equal(transfer.message.job.bytes, bytes);
  assert.equal(transfer.message.job.mimeType, 'image/heic');
  assert.deepEqual(transfer.message.job.transform, transform);
  assert.deepEqual(transfer.message.job.policy, POLICY);
  assert.deepEqual(transfer.transfer, [bytes]);
  assert.equal('filename' in transfer.message.job, false);
  assert.equal('token' in transfer.message.job, false);
  assert.equal('url' in transfer.message.job, false);
  assert.equal(Object.isFrozen(transfer.message), true);
  assert.equal(Object.isFrozen(transfer.message.job), true);
});
