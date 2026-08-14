'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const heifPolicy = require('../scripts/media/f05-heif-policy.js');

const FIXTURE_B64 = 'tests/fixtures/media/f05/rainbow-451x461.heic.base64';
const DECODER_JS = 'workers/media/f05-heif-decoder.v1.js';
const DECODER_WASM = 'workers/media/f05-heif-decoder.v1.wasm';
const EXPECTED_GIT_BLOB_SHA1 = '6691f50f39bd69871a2abe284de2ef9f5243bc66';

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

test('pixel-flood ispe mutation of the real HEIC is rejected before any RGBA display', async t => {
  const fixture = Buffer.from(fs.readFileSync(FIXTURE_B64, 'utf8').replace(/\s+/g, ''), 'base64');
  assert.equal(gitBlobSha1(fixture), EXPECTED_GIT_BLOB_SHA1, 'hostile mutation must start from the exact upstream HEIC');

  const hostile = Buffer.from(fixture);
  const ispeAt = hostile.indexOf(Buffer.from('ispe', 'ascii'));
  assert.ok(ispeAt >= 4, 'real fixture must contain an ispe image-spatial-extents box');
  assert.equal(hostile.readUInt32BE(ispeAt - 4), 20, 'ispe box must have the expected fixed size');
  assert.equal(hostile.readUInt32BE(ispeAt + 8), 452, 'fixture coded width provenance must be stable');
  assert.equal(hostile.readUInt32BE(ispeAt + 12), 462, 'fixture coded height provenance must be stable');

  hostile.writeUInt32BE(100000, ispeAt + 8);
  hostile.writeUInt32BE(100000, ispeAt + 12);
  assert.equal(hostile.readUInt32BE(ispeAt + 8), 100000);
  assert.equal(hostile.readUInt32BE(ispeAt + 12), 100000);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-f05-pixel-flood-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const decoderMjs = path.join(tempDir, 'f05-heif-decoder.v1.mjs');
  fs.copyFileSync(DECODER_JS, decoderMjs);
  const { default: createLibheif } = await import(`${pathToFileURL(decoderMjs).href}?pixel-flood=${Date.now()}`);
  const Module = await createLibheif({ wasmBinary: fs.readFileSync(DECODER_WASM) });
  assert.equal(typeof Module.HeifDecoder, 'function', 'WASM must initialize before the hostile parse');

  const decoder = new Module.HeifDecoder();
  let images = [];
  try {
    try {
      images = decoder.decode(new Uint8Array(hostile));
    } catch (_) {
      return;
    }

    assert.ok(Array.isArray(images) && images.length > 0, 'if libheif accepts the container, it must expose bounded metadata for policy review');
    const primaryIndex = images.findIndex(candidate => candidate && candidate.is_primary && candidate.is_primary());
    const selectedIndex = primaryIndex >= 0 ? primaryIndex : 0;
    const image = images[selectedIndex];
    assert.ok(image && image.handle, 'accepted hostile container must still expose an image handle');

    const ids = Module.heif_js_context_get_list_of_top_level_image_IDs(decoder.decoder);
    assert.equal(ids.length, images.length);
    const itemType = Module.heif_item_get_item_type(decoder.decoder, ids[selectedIndex]);
    const admission = heifPolicy.admitHeifDecode({
      codec: itemType === 'hvc1' ? 'hevc' : 'unsupported',
      isStill: Module.heif_context_has_sequence(decoder.decoder) === 0,
      width: image.get_width(),
      height: image.get_height()
    }, {
      activeHeifWorkers: 0,
      memoryBudgetBytes: 384 * 1024 * 1024
    });

    assert.notEqual(admission.ok, true, 'pixel-flood metadata must be denied before image.display/RGBA allocation');
    assert.ok(['heif_dimensions_invalid', 'heif_memory_limit'].includes(admission.code), `unexpected denial: ${admission.code}`);
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
