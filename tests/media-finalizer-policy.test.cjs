'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../services/media-finalizer/src/policy.js');

function jpeg(bytes = []) {
  return Buffer.from([0xff, 0xd8, ...bytes, 0xff, 0xd9]);
}

function webp(payload = Buffer.from([0x56, 0x50, 0x38, 0x20])) {
  const body = Buffer.concat([Buffer.from('WEBP'), payload]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

test('strict container accepts exact JPEG and WebP only', () => {
  assert.equal(policy.assertStrictContainer(jpeg([1, 2, 3]), 'image/jpeg'), 'jpeg');
  assert.equal(policy.assertStrictContainer(webp(), 'image/webp'), 'webp');
  assert.equal(policy.detectStrictMime(jpeg([1, 2, 3])), 'image/jpeg');
  assert.equal(policy.detectStrictMime(webp()), 'image/webp');
  assert.throws(() => policy.assertStrictContainer(Buffer.from('not-image'), 'image/jpeg'), { code: 'MEDIA_FORMAT_NOT_ALLOWED' });
  assert.throws(() => policy.assertStrictContainer(jpeg([1, 2, 3]), 'image/webp'), { code: 'MEDIA_DECLARED_TYPE_MISMATCH' });
  const tailedJpeg = Buffer.concat([jpeg([1, 2, 3]), Buffer.from([0x41])]);
  assert.throws(() => policy.assertStrictContainer(tailedJpeg, 'image/jpeg'), { code: 'JPEG_EOI_MISSING_OR_TRAILING_BYTES' });
});

test('strict WebP parser rejects RIFF length mismatch and wrong declared MIME', () => {
  const value = webp();
  value.writeUInt32LE(value.length + 99, 4);
  assert.throws(() => policy.assertStrictContainer(value, 'image/webp'), { code: 'WEBP_RIFF_LENGTH_MISMATCH' });
  assert.throws(() => policy.assertStrictContainer(webp(), 'application/octet-stream'), { code: 'MEDIA_FORMAT_NOT_ALLOWED' });
});

test('decoded metadata is bounded and single-frame', () => {
  assert.doesNotThrow(() => policy.assertDecodedMetadata({ format: 'jpeg', width: 1920, height: 1080, pages: 1 }, 'image/jpeg'));
  assert.throws(() => policy.assertDecodedMetadata({ format: 'jpeg', width: 5000, height: 1080, pages: 1 }, 'image/jpeg'), { code: 'MEDIA_DIMENSIONS_INVALID' });
  assert.throws(() => policy.assertDecodedMetadata({ format: 'webp', width: 800, height: 600, pages: 4 }, 'image/webp'), { code: 'MEDIA_ANIMATION_NOT_ALLOWED' });
  assert.throws(() => policy.assertDecodedMetadata({ format: 'png', width: 800, height: 600, pages: 1 }, 'image/jpeg'), { code: 'MEDIA_DECODER_FORMAT_MISMATCH' });
});

test('canonical paths are deterministic and digest-bound', () => {
  const sha = 'a'.repeat(64);
  assert.equal(
    policy.canonicalPath('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', sha, 'image/webp'),
    `11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${sha}.webp`
  );
});
