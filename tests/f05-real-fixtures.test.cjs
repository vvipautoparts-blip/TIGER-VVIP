'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const FIXTURE_B64 = 'tests/fixtures/media/f05/rainbow-451x461.heic.base64';
const AVIF_FIXTURE_B64 = 'tests/fixtures/media/f05/simple_osm_tile_alpha.avif.base64';
const PREFLIGHT_JS = 'scripts/media/f05-heif-preflight.js';
const DECODER_JS = 'workers/media/f05-heif-decoder.v1.js';
const DECODER_WASM = 'workers/media/f05-heif-decoder.v1.wasm';
const WORKER_JS = 'workers/media/f05-heif-worker.js';
const EXPECTED_SIZE = 7080;
const EXPECTED_GIT_BLOB_SHA1 = '6691f50f39bd69871a2abe284de2ef9f5243bc66';
const EXPECTED_AVIF_GIT_BLOB_SHA1 = 'e3135d33ac351fbcd0f4a1316ad5db80d2a26929';

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

function display(image, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  return new Promise((resolve, reject) => {
    image.display({ data, width, height }, rendered => {
      if (!rendered) return reject(new Error('real_heic_rgba_decode_failed'));
      resolve(rendered);
    });
  });
}

test('pinned F05 WASM really decodes the upstream HEVC HEIC fixture to RGBA', async t => {
  assert.equal(fs.existsSync(FIXTURE_B64), true, 'real HEIC fixture must be vendored before this proof can pass');
  assert.equal(fs.existsSync(DECODER_JS), true, 'pinned decoder glue must exist');
  assert.equal(fs.existsSync(DECODER_WASM), true, 'pinned decoder wasm must exist');

  const fixture = Buffer.from(fs.readFileSync(FIXTURE_B64, 'utf8').replace(/\s+/g, ''), 'base64');
  assert.equal(fixture.length, EXPECTED_SIZE);
  assert.equal(gitBlobSha1(fixture), EXPECTED_GIT_BLOB_SHA1, 'fixture bytes must match libheif v1.23.1 upstream blob exactly');
  assert.equal(fixture.subarray(4, 12).toString('ascii'), 'ftypheic');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-f05-real-heic-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const decoderMjs = path.join(tempDir, 'f05-heif-decoder.v1.mjs');
  fs.copyFileSync(DECODER_JS, decoderMjs);

  const { default: createLibheif } = await import(`${pathToFileURL(decoderMjs).href}?t=${Date.now()}`);
  const wasmBinary = fs.readFileSync(DECODER_WASM);
  const Module = await createLibheif({ wasmBinary });
  assert.equal(typeof Module.HeifDecoder, 'function');
  assert.equal(typeof Module.heif_js_context_get_list_of_top_level_image_IDs, 'function');

  const decoder = new Module.HeifDecoder();
  let images = [];
  try {
    images = decoder.decode(new Uint8Array(fixture));
    assert.ok(Array.isArray(images) && images.length > 0, 'real HEIC must expose at least one top-level image');
    const primaryIndex = images.findIndex(candidate => candidate && candidate.is_primary && candidate.is_primary());
    const selectedIndex = primaryIndex >= 0 ? primaryIndex : 0;
    const image = images[selectedIndex];
    assert.ok(image && image.handle, 'real HEIC primary image handle must exist');
    assert.equal(image.get_width(), 451, 'display width must honor HEIF clap transform');
    assert.equal(image.get_height(), 461, 'display height must honor HEIF clap transform');
    assert.equal(Module.heif_context_has_sequence(decoder.decoder), 0, 'fixture must be a still image, not a sequence');

    const topLevelIds = Module.heif_js_context_get_list_of_top_level_image_IDs(decoder.decoder);
    assert.equal(topLevelIds.length, images.length, 'decoder image order must correlate with top-level IDs');
    const itemType = Module.heif_item_get_item_type(decoder.decoder, topLevelIds[selectedIndex]);
    assert.equal(itemType, 'hvc1', 'primary top-level item must be HEVC/hvc1');

    const rendered = await display(image, 451, 461);
    assert.equal(rendered.width, 451);
    assert.equal(rendered.height, 461);
    assert.ok(rendered.data instanceof Uint8ClampedArray);
    assert.equal(rendered.data.length, 451 * 461 * 4);
    assert.equal(rendered.data.length, 831644, 'RGBA surface byte length must be exact');
  } finally {
    for (const image of images) {
      try { if (image && typeof image.free === 'function') image.free(); } catch (_) { /* best effort */ }
    }
    if (decoder.decoder) {
      Module.heif_context_free(decoder.decoder);
      decoder.decoder = null;
    }
  }
});

test('pinned F05 WASM fails closed on a real truncated HEIC payload before any usable RGBA surface', async t => {
  assert.equal(fs.existsSync(FIXTURE_B64), true, 'real HEIC fixture must exist');
  assert.equal(fs.existsSync(DECODER_JS), true, 'pinned decoder glue must exist');
  assert.equal(fs.existsSync(DECODER_WASM), true, 'pinned decoder wasm must exist');

  const fixture = Buffer.from(fs.readFileSync(FIXTURE_B64, 'utf8').replace(/\s+/g, ''), 'base64');
  assert.equal(fixture.length, EXPECTED_SIZE);
  assert.equal(gitBlobSha1(fixture), EXPECTED_GIT_BLOB_SHA1, 'truncation source must be the exact upstream HEIC bytes');
  const truncated = fixture.subarray(0, 4096);
  assert.equal(truncated.subarray(4, 12).toString('ascii'), 'ftypheic', 'hostile sample must preserve a valid HEIC ftyp');
  assert.ok(truncated.length < fixture.length, 'hostile sample must remove real payload bytes');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-f05-truncated-heic-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const decoderMjs = path.join(tempDir, 'f05-heif-decoder.v1.mjs');
  fs.copyFileSync(DECODER_JS, decoderMjs);

  const { default: createLibheif } = await import(`${pathToFileURL(decoderMjs).href}?truncated=${Date.now()}`);
  const Module = await createLibheif({ wasmBinary: fs.readFileSync(DECODER_WASM) });
  assert.equal(typeof Module.HeifDecoder, 'function', 'WASM harness must initialize before hostile decode');

  const decoder = new Module.HeifDecoder();
  let images = [];
  let producedUsableRgba = false;
  try {
    try {
      images = decoder.decode(new Uint8Array(truncated));
    } catch (_) {
      return;
    }

    if (Array.isArray(images) && images.length > 0) {
      const primaryIndex = images.findIndex(candidate => candidate && candidate.is_primary && candidate.is_primary());
      const image = images[primaryIndex >= 0 ? primaryIndex : 0];
      if (image && image.handle) {
        const width = image.get_width();
        const height = image.get_height();
        if (Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 && width * height <= 40000000) {
          try {
            const rendered = await display(image, width, height);
            producedUsableRgba = Boolean(
              rendered &&
              rendered.data instanceof Uint8ClampedArray &&
              rendered.data.length === width * height * 4
            );
          } catch (_) {
            producedUsableRgba = false;
          }
        }
      }
    }

    assert.equal(producedUsableRgba, false, 'truncated real HEIC must never yield a usable RGBA surface');
  } finally {
    for (const image of images) {
      try { if (image && typeof image.free === 'function') image.free(); } catch (_) { /* best effort */ }
    }
    if (decoder.decoder) {
      Module.heif_context_free(decoder.decoder);
      decoder.decoder = null;
    }
  }
});

test('F05 preflight rejects the exact upstream real AVIF hostile fixture before HEIF decode', async () => {
  assert.equal(fs.existsSync(AVIF_FIXTURE_B64), true, 'real AVIF hostile fixture must be vendored');
  const fixture = Buffer.from(fs.readFileSync(AVIF_FIXTURE_B64, 'utf8').replace(/\s+/g, ''), 'base64');
  assert.equal(gitBlobSha1(fixture), EXPECTED_AVIF_GIT_BLOB_SHA1, 'AVIF fixture bytes must match libheif v1.23.1 upstream blob exactly');
  assert.equal(fixture.subarray(4, 8).toString('ascii'), 'ftyp');
  assert.equal(fixture.subarray(8, 12).toString('ascii'), 'mif3');
  assert.equal(fixture.subarray(12, 16).toString('ascii'), 'avif');

  const { probeHeifHeader } = await import(`${pathToFileURL(path.resolve(PREFLIGHT_JS)).href}?real-avif=${Date.now()}`);
  assert.deepEqual(probeHeifHeader(new Uint8Array(fixture)), { ok: false, code: 'heif_codec_unsupported' });
});

test('F05 worker classifies codec from correlated top-level item IDs, never a raw image-handle item-id call', () => {
  const source = fs.readFileSync(WORKER_JS, 'utf8');
  assert.match(source, /heif_js_context_get_list_of_top_level_image_IDs/);
  assert.doesNotMatch(source, /heif_image_handle_get_item_id/);
  assert.match(source, /itemType\s*===\s*['"]hvc1['"]/);
});
