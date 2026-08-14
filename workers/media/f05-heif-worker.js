import libheif from './f05-heif-decoder.v1.js';
import '../../scripts/media/pr36-geometry.js';
import '../../scripts/media/f05-heif-policy.js';
import '../../scripts/media/f05-heif-worker-core.js';
import '../../scripts/media/f05-derivative-privacy.js';

'use strict';

const WASM_NAME = 'f05-heif-decoder.v1.wasm';
const WASM_SHA256 = '37371c91a21267de724838fe62476c6e57b422b3a9ebf954bbcca0b99aa99d78';
const MAX_WASM_MEMORY_BYTES = 384 * 1024 * 1024;
const geometry = globalThis.VVIP_PR36_GEOMETRY;
const heifPolicy = globalThis.VVIP_F05_HEIF_POLICY;
const workerCoreApi = globalThis.VVIP_F05_HEIF_WORKER_CORE;
const derivativePrivacy = globalThis.VVIP_F05_DERIVATIVE_PRIVACY;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function loadVerifiedDecoder() {
  if (!globalThis.crypto || !crypto.subtle || typeof fetch !== 'function') fail('capability_unavailable');
  const wasmUrl = new URL(`./${WASM_NAME}`, import.meta.url);
  const response = await fetch(wasmUrl, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) fail('capability_unavailable');
  const wasmBinary = await response.arrayBuffer();
  const digest = hex(await crypto.subtle.digest('SHA-256', wasmBinary));
  if (digest !== WASM_SHA256) fail('decoder_integrity_mismatch');
  return libheif({
    wasmBinary,
    locateFile(path) {
      return path === 'libheif.wasm' ? new URL(`./${WASM_NAME}`, import.meta.url).href : new URL(path, import.meta.url).href;
    }
  });
}

const modulePromise = loadVerifiedDecoder();

async function inspect(bytes, mimeType) {
  const Module = await modulePromise;
  if (
    typeof Module.HeifDecoder !== 'function' ||
    typeof Module.heif_js_context_get_list_of_top_level_image_IDs !== 'function' ||
    typeof Module.heif_item_get_item_type !== 'function'
  ) fail('capability_unavailable');

  const decoder = new Module.HeifDecoder();
  const images = decoder.decode(new Uint8Array(bytes));
  if (!Array.isArray(images) || images.length < 1 || !decoder.decoder) fail('heif_container_invalid');

  const sequence = Module.heif_context_has_sequence(decoder.decoder);
  const primaryIndex = images.findIndex(candidate => candidate && candidate.is_primary && candidate.is_primary());
  const selectedIndex = primaryIndex >= 0 ? primaryIndex : 0;
  const image = images[selectedIndex];
  if (!image || !image.handle) fail('heif_decode_failed');

  const topLevelIds = Module.heif_js_context_get_list_of_top_level_image_IDs(decoder.decoder);
  if (!topLevelIds || topLevelIds.length !== images.length) fail('heif_container_invalid');
  const itemType = Module.heif_item_get_item_type(decoder.decoder, topLevelIds[selectedIndex]);
  const width = image.get_width();
  const height = image.get_height();

  return {
    width,
    height,
    codec: itemType === 'hvc1' ? 'hevc' : 'unsupported',
    isStill: sequence === 0,
    sourceKind: mimeType === 'image/heic' ? 'heic' : 'heif',
    _decoder: decoder,
    _images: images,
    _image: image
  };
}

async function decode(inspected) {
  const image = inspected && inspected._image;
  if (!image) fail('heif_decode_failed');
  const data = new Uint8ClampedArray(inspected.width * inspected.height * 4);
  const target = { data, width: inspected.width, height: inspected.height };
  const rendered = await new Promise((resolve, reject) => {
    try {
      image.display(target, value => value ? resolve(value) : reject(Object.assign(new Error('heif_decode_failed'), { code: 'heif_decode_failed' })));
    } catch (error) {
      reject(error);
    }
  });
  if (!rendered || rendered.data !== data) fail('heif_decode_failed');
  return { width: inspected.width, height: inspected.height, data, orientationApplied: true, colorSpace: 'srgb' };
}

async function encode({ surface, crop, output, quality }) {
  if (typeof OffscreenCanvas !== 'function') fail('capability_unavailable');
  const sourceCanvas = new OffscreenCanvas(surface.width, surface.height);
  const sourceContext = sourceCanvas.getContext('2d', { alpha: true, colorSpace: 'srgb' });
  if (!sourceContext) fail('capability_unavailable');
  const sourceImage = sourceContext.createImageData(surface.width, surface.height);
  sourceImage.data.set(surface.data);
  sourceContext.putImageData(sourceImage, 0, 0);

  const outputCanvas = new OffscreenCanvas(output.width, output.height);
  const outputContext = outputCanvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
  if (!outputContext) fail('capability_unavailable');
  outputContext.drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);

  let blob = await outputCanvas.convertToBlob({ type: 'image/webp', quality: quality.webp });
  if (!blob || blob.type !== 'image/webp') {
    blob = await outputCanvas.convertToBlob({ type: 'image/jpeg', quality: quality.jpeg });
  }
  if (!blob || !['image/webp', 'image/jpeg'].includes(blob.type)) fail('encode_failed');
  if (!derivativePrivacy || typeof derivativePrivacy.assertSanitizedBlob !== 'function') fail('capability_unavailable');
  await derivativePrivacy.assertSanitizedBlob(blob);
  return { blob, width: output.width, height: output.height };
}

function release(inspected) {
  if (!inspected) return;
  if (Array.isArray(inspected._images)) {
    for (const image of inspected._images) {
      try { if (image && typeof image.free === 'function') image.free(); } catch (_) { /* best effort */ }
    }
  }
  const decoder = inspected._decoder;
  if (decoder && decoder.decoder) {
    modulePromise.then(Module => {
      try { Module.heif_context_free(decoder.decoder); } finally { decoder.decoder = null; }
    }).catch(() => {});
  }
}

if (!geometry || !heifPolicy || !workerCoreApi || typeof workerCoreApi.createHeifWorkerCore !== 'function') fail('capability_unavailable');
const core = workerCoreApi.createHeifWorkerCore({ geometry, heifPolicy, inspect, decode, encode, release });
let busy = false;

self.addEventListener('message', async event => {
  const message = event && event.data;
  if (!message || message.type !== 'process' || !message.job) return;
  const jobId = message.job.jobId;
  if (busy) {
    self.postMessage({ type: 'error', jobId, code: 'heif_memory_limit' });
    return;
  }
  busy = true;
  try {
    const requestedBudget = Number.isSafeInteger(message.memoryBudgetBytes) && message.memoryBudgetBytes > 0
      ? Math.min(message.memoryBudgetBytes, MAX_WASM_MEMORY_BYTES)
      : MAX_WASM_MEMORY_BYTES;
    const result = await core.process(message.job, { activeHeifWorkers: 0, memoryBudgetBytes: requestedBudget });
    self.postMessage({ type: 'result', jobId, result });
  } catch (error) {
    const code = error && typeof error.code === 'string' ? error.code : 'heif_decode_failed';
    self.postMessage({ type: 'error', jobId, code });
  } finally {
    busy = false;
  }
});
