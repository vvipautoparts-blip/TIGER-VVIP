'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workerPath = 'workers/media/f05-heif-worker.js';

test('F05 HEIF worker is a module wrapper around the pinned local decoder and shared PR36 geometry', () => {
  assert.equal(fs.existsSync(workerPath), true, 'worker runtime must exist');
  const source = fs.readFileSync(workerPath, 'utf8');
  for (const required of [
    "./f05-heif-decoder.v1.js",
    "../../scripts/media/pr36-geometry.js",
    "../../scripts/media/f05-heif-policy.js",
    "../../scripts/media/f05-heif-worker-core.js",
    'HeifDecoder',
    "fourcc('hvc1')",
    'heif_context_has_sequence',
    'image.display',
    'OffscreenCanvas',
    'convertToBlob',
    "image/webp",
    "image/jpeg"
  ]) assert.ok(source.includes(required), required);
  assert.equal(source.includes('fetch("http'), false, 'decoder assets must remain same-origin/local');
  assert.equal(source.includes('localStorage'), false);
  assert.equal(source.includes('indexedDB'), false);
  assert.equal(source.includes('CacheStorage'), false);
});

test('F05 HEIF worker pins the wasm filename and never accepts AVIF/video output paths', () => {
  const source = fs.readFileSync(workerPath, 'utf8');
  assert.ok(source.includes('f05-heif-decoder.v1.wasm'));
  assert.equal(source.includes('image/avif'), false);
  assert.equal(source.includes('video/'), false);
  assert.ok(source.includes("type: 'result'") || source.includes('type:"result"'));
  assert.ok(source.includes("type: 'error'") || source.includes('type:"error"'));
});
