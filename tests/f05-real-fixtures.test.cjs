'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const FIXTURE_B64 = 'tests/fixtures/media/f05/rainbow-451x461.heic.base64';
const DECODER_JS = 'workers/media/f05-heif-decoder.v1.js';
const DECODER_WASM = 'workers/media/f05-heif-decoder.v1.wasm';
const EXPECTED_SIZE = 7080;
const EXPECTED_GIT_BLOB_SHA1 = '6691f50f39bd69871a2abe284de2ef9f5243bc66';

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
  assert.equal(typeof Module.fourcc, 'function');

  const decoder = new Module.HeifDecoder();
  let images = [];
  try {
    images = decoder.decode(new Uint8Array(fixture));
    assert.ok(Array.isArray(images) && images.length > 0, 'real HEIC must expose at least one top-level image');
    const image = images.find(candidate => candidate && candidate.is_primary && candidate.is_primary()) || images[0];
    assert.ok(image && image.handle, 'real HEIC primary image handle must exist');
    assert.equal(image.get_width(), 451, 'display width must honor HEIF clap transform');
    assert.equal(image.get_height(), 461, 'display height must honor HEIF clap transform');
    assert.equal(Module.heif_context_has_sequence(decoder.decoder), 0, 'fixture must be a still image, not a sequence');

    const itemId = Module.heif_image_handle_get_item_id(image.handle);
    const itemType = Module.heif_item_get_item_type(decoder.decoder, itemId);
    assert.equal(itemType, Module.fourcc('hvc1'), 'primary item must be HEVC/hvc1');

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
