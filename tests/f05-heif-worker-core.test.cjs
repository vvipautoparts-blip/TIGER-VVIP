'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const geometry = require('../scripts/media/pr36-geometry.js');
const heifPolicy = require('../scripts/media/f05-heif-policy.js');
const { createHeifWorkerCore } = require('../scripts/media/f05-heif-worker-core.js');

function job(overrides = {}) {
  return {
    jobId: 'job-1',
    bytes: new ArrayBuffer(1024),
    mimeType: 'image/heic',
    transform: { zoom: 1, panX: 0, panY: 0 },
    policy: {
      maxPixels: 40000000,
      minWidth: 320,
      minHeight: 240,
      maxWidth: 1600,
      maxHeight: 1200,
      webpQuality: 0.82,
      jpegQuality: 0.86
    },
    ...overrides
  };
}

function harness(overrides = {}) {
  const calls = [];
  const rgba = new Uint8ClampedArray(800 * 600 * 4);
  rgba.fill(7);
  const deps = {
    geometry,
    heifPolicy,
    inspect: async () => {
      calls.push('inspect');
      return { token: { id: 'primary' }, codec: 'hevc', isStill: true, width: 800, height: 600, sourceKind: 'heic' };
    },
    decode: async () => {
      calls.push('decode');
      return { width: 800, height: 600, data: rgba, orientationApplied: true, colorSpace: 'srgb' };
    },
    encode: async ({ output, quality }) => {
      calls.push(['encode', output.width, output.height, quality.webp, quality.jpeg]);
      return { blob: { type: 'image/webp', size: 1234 }, width: output.width, height: output.height };
    },
    release: () => { calls.push('release'); },
    ...overrides
  };
  return { core: createHeifWorkerCore(deps), calls, rgba };
}

test('F05 worker core admits HEVC still then reuses exact PR36 geometry and derivative contract', async () => {
  const { core, calls, rgba } = harness();
  const result = await core.process(job(), { activeHeifWorkers: 0, memoryBudgetBytes: 384 * 1024 * 1024 });
  assert.deepEqual(result, { blob: { type: 'image/webp', size: 1234 }, width: 800, height: 600, decodeRoute: 'wasm', sourceKind: 'heic' });
  assert.deepEqual(calls[0], 'inspect');
  assert.deepEqual(calls[1], 'decode');
  assert.deepEqual(calls[2], ['encode', 800, 600, 0.82, 0.86]);
  assert.equal(calls.at(-1), 'release');
  assert.equal(rgba.every((value) => value === 0), true, 'decoded RGBA must be wiped after encode');
  assert.equal('bytes' in result, false);
  assert.equal('data' in result, false);
});

test('F05 worker core denies memory/pixel admission before expensive pixel decode', async () => {
  let decoded = false;
  const { core, calls } = harness({
    inspect: async () => ({ token: {}, codec: 'hevc', isStill: true, width: 8000, height: 5000, sourceKind: 'heic' }),
    decode: async () => { decoded = true; throw new Error('must not decode'); }
  });
  await assert.rejects(() => core.process(job(), { activeHeifWorkers: 0, memoryBudgetBytes: 384 * 1024 * 1024 }), /heif_memory_limit/);
  assert.equal(decoded, false);
  assert.equal(calls.at(-1), 'release');
});

test('F05 worker core fails closed on MIME/container family disagreement', async () => {
  const { core } = harness();
  await assert.rejects(() => core.process(job({ mimeType: 'image/heif' }), { activeHeifWorkers: 0 }), /signature_mismatch/);
});

test('F05 worker core accepts only canonical JPEG/WebP output and exact PR36 dimensions', async () => {
  const badMime = harness({ encode: async () => ({ blob: { type: 'image/png', size: 10 }, width: 800, height: 600 }) }).core;
  await assert.rejects(() => badMime.process(job(), { activeHeifWorkers: 0 }), /encode_failed/);

  const badDimensions = harness({ encode: async () => ({ blob: { type: 'image/webp', size: 10 }, width: 801, height: 600 }) }).core;
  await assert.rejects(() => badDimensions.process(job(), { activeHeifWorkers: 0 }), /encode_failed/);
});

test('F05 worker core rejects malformed jobs before decoder work', async () => {
  let inspected = false;
  const { core } = harness({ inspect: async () => { inspected = true; return {}; } });
  for (const candidate of [
    job({ jobId: '' }),
    job({ bytes: new ArrayBuffer(0) }),
    job({ mimeType: 'image/avif' }),
    job({ transform: { zoom: NaN, panX: 0, panY: 0 } })
  ]) {
    await assert.rejects(() => core.process(candidate, { activeHeifWorkers: 0 }));
  }
  assert.equal(inspected, false);
});
