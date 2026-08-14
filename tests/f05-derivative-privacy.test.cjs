'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inspectCanonicalDerivative, assertSanitizedBlob } = require('../scripts/media/f05-derivative-privacy.js');
const { createHeifWorkerClient } = require('../scripts/media/f05-heif-worker-client.js');

function jpegWith(marker, payload = []) {
  const body = Uint8Array.from(payload);
  const length = body.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, marker, (length >> 8) & 0xff, length & 0xff, ...body, 0xff, 0xd9]);
}

function jpegScanWithTrailingMarker(marker, payload = []) {
  const body = Uint8Array.from(payload);
  const length = body.length + 2;
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xda, 0x00, 0x02,
    0x11, 0x22, 0xff, 0x00, 0x33,
    0xff, marker, (length >> 8) & 0xff, length & 0xff, ...body,
    0xff, 0xd9
  ]);
}

function jpegScanOnly() {
  return Uint8Array.from([0xff,0xd8,0xff,0xda,0x00,0x02,0x11,0xff,0x00,0x22,0xff,0xd0,0x33,0xff,0xd9]);
}

function webp(chunks) {
  const encoded = [];
  for (const { type, data = [] } of chunks) {
    const payload = Uint8Array.from(data);
    encoded.push(...Buffer.from(type, 'ascii'));
    encoded.push(payload.length & 0xff, (payload.length >>> 8) & 0xff, (payload.length >>> 16) & 0xff, (payload.length >>> 24) & 0xff);
    encoded.push(...payload);
    if (payload.length & 1) encoded.push(0);
  }
  const riffSize = 4 + encoded.length;
  return Uint8Array.from([
    ...Buffer.from('RIFF', 'ascii'),
    riffSize & 0xff, (riffSize >>> 8) & 0xff, (riffSize >>> 16) & 0xff, (riffSize >>> 24) & 0xff,
    ...Buffer.from('WEBP', 'ascii'),
    ...encoded
  ]);
}

function makeWorkerError(code) {
  const listeners = { message: new Set(), error: new Set() };
  return {
    addEventListener(type, fn) { listeners[type].add(fn); },
    removeEventListener(type, fn) { listeners[type].delete(fn); },
    terminate() {},
    postMessage(message) {
      queueMicrotask(() => {
        for (const fn of listeners.message) fn({ data: { type: 'error', jobId: message.job.jobId, code } });
      });
    }
  };
}

function mediaError(code) { const error = new Error(code); error.code = code; return error; }

test('sanitized JPEG denies EXIF/XMP/IPTC/comment and unknown APP metadata', () => {
  assert.equal(inspectCanonicalDerivative(jpegWith(0xe1, Buffer.from('Exif\0\0')), 'image/jpeg').code, 'metadata_not_stripped');
  assert.equal(inspectCanonicalDerivative(jpegWith(0xed, Buffer.from('Photoshop 3.0')), 'image/jpeg').code, 'metadata_not_stripped');
  assert.equal(inspectCanonicalDerivative(jpegWith(0xfe, Buffer.from('private comment')), 'image/jpeg').code, 'metadata_not_stripped');
  assert.equal(inspectCanonicalDerivative(jpegWith(0xe3, [1, 2]), 'image/jpeg').code, 'metadata_not_stripped');
});

test('sanitized JPEG scans through entropy data and rejects metadata injected after SOS', () => {
  assert.equal(inspectCanonicalDerivative(jpegScanWithTrailingMarker(0xe1, Buffer.from('Exif\0\0')), 'image/jpeg').code, 'metadata_not_stripped');
  assert.deepEqual(inspectCanonicalDerivative(jpegScanOnly(), 'image/jpeg'), { ok: true });
});

test('sanitized JPEG permits only bounded technical APP0/APP2/APP14 segments', () => {
  for (const marker of [0xe0, 0xe2, 0xee]) {
    assert.deepEqual(inspectCanonicalDerivative(jpegWith(marker, [1, 2]), 'image/jpeg'), { ok: true });
  }
});

test('sanitized WebP denies EXIF/XMP/animation chunks and VP8X privacy flags', () => {
  for (const type of ['EXIF', 'XMP ', 'ANIM', 'ANMF']) {
    assert.equal(inspectCanonicalDerivative(webp([{ type, data: [1, 2] }]), 'image/webp').code, 'metadata_not_stripped');
  }
  const vp8xWithExifFlag = webp([{ type: 'VP8X', data: [0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]);
  assert.equal(inspectCanonicalDerivative(vp8xWithExifFlag, 'image/webp').code, 'metadata_not_stripped');
});

test('sanitized WebP fails closed on unknown chunks but permits image/alpha/color chunks', () => {
  assert.equal(inspectCanonicalDerivative(webp([{ type: 'JUNK', data: [1, 2] }]), 'image/webp').code, 'metadata_not_stripped');
  const safe = webp([
    { type: 'VP8X', data: [0x30, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'ICCP', data: [1, 2] },
    { type: 'ALPH', data: [3, 4] },
    { type: 'VP8 ', data: [5] }
  ]);
  assert.deepEqual(inspectCanonicalDerivative(safe, 'image/webp'), { ok: true });
});

test('privacy inspector rejects malformed/truncated derivatives instead of scanning past bounds', () => {
  assert.equal(inspectCanonicalDerivative(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]), 'image/jpeg').code, 'media_derivative_invalid');
  assert.equal(inspectCanonicalDerivative(Uint8Array.from([0xff,0xd8,0xff,0xda,0x00,0x02,0x11,0xff]), 'image/jpeg').code, 'media_derivative_invalid');
  const malformedWebp = webp([{ type: 'VP8 ', data: [1, 2] }]);
  malformedWebp[4] = 0xff;
  assert.equal(inspectCanonicalDerivative(malformedWebp, 'image/webp').code, 'media_derivative_invalid');
});

test('blob privacy assertion passes sanitized output and rejects metadata-bearing output', async () => {
  const safe = new Blob([jpegWith(0xe0, [1, 2])], { type: 'image/jpeg' });
  assert.equal(await assertSanitizedBlob(safe), safe);
  const unsafe = new Blob([jpegWith(0xe1, Buffer.from('Exif\0\0'))], { type: 'image/jpeg' });
  await assert.rejects(() => assertSanitizedBlob(unsafe), error => error && error.code === 'metadata_not_stripped');
});

test('HEIF worker binds derivative privacy verification before returning JPEG/WebP', () => {
  const source = fs.readFileSync('workers/media/f05-heif-worker.js', 'utf8');
  assert.ok(source.includes("../../scripts/media/f05-derivative-privacy.js"));
  assert.ok(source.includes('VVIP_F05_DERIVATIVE_PRIVACY'));
  assert.ok(source.includes('await derivativePrivacy.assertSanitizedBlob(blob)'));
});

test('HEIF worker client preserves metadata_not_stripped as a bounded privacy denial', async () => {
  const buildWorkerTransfer = job => ({ message: { type: 'process', job: { jobId: job.jobId } }, transfer: [] });
  const client = createHeifWorkerClient({ workerFactory: () => makeWorkerError('metadata_not_stripped'), buildWorkerTransfer, createMediaError: mediaError });
  await assert.rejects(() => client.process({ jobId: 'privacy-1', signal: null }), error => error && error.code === 'metadata_not_stripped');
});
