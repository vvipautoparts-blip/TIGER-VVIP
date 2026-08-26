'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('F05 pinned decoder converts HEIF pixels through libheif RGB RGBA output rather than preserving encoded YCbCr planes', () => {
  const source = fs.readFileSync('workers/media/f05-heif-decoder.v1.js', 'utf8');
  assert.ok(source.includes('heif_js_decode_image2(this.handle,Module.heif_colorspace.heif_colorspace_RGB,Module.heif_chroma.heif_chroma_interleaved_RGBA)'));
  assert.ok(source.includes('heif_image_handle_get_color_profile_type'));
  assert.ok(source.includes('heif_image_handle_get_nclx_color_profile'));
});

test('F05 worker requests and verifies an sRGB canvas boundary before derivative encoding', () => {
  const source = fs.readFileSync('workers/media/f05-heif-worker.js', 'utf8');
  assert.ok(source.includes("getContext('2d', { alpha: true, colorSpace: 'srgb' })"));
  assert.ok(source.includes("getContext('2d', { alpha: false, colorSpace: 'srgb' })"));
  assert.ok(source.includes('assertSrgbContext(sourceContext)'));
  assert.ok(source.includes('assertSrgbContext(outputContext)'));
  assert.ok(source.includes("attributes.colorSpace !== 'srgb'"));
  assert.ok(source.includes("fail('heif_color_unsupported')"));
});

test('F05 color closure remains evidence-gated on a real wide-gamut fixture', () => {
  const evidence = fs.readFileSync('docs/fusion/F05_BROWSER_DEVICE_EVIDENCE.md', 'utf8');
  assert.match(evidence, /Display[- ]P3|wide[- ]gamut|ICC/i);
  assert.match(evidence, /reference|golden|delta|ΔE/i);
  assert.match(evidence, /NOT RUN|PENDING|OPEN/i);
});
