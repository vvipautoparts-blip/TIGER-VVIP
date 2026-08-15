'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pr36Policy = require('../scripts/media/pr36-policy.js');
const { probeHeifHeader, MAX_HEIF_HEADER_BYTES } = require('../scripts/media/f05-heif-preflight.js');
const { createF05MediaPolicyBridge } = require('../scripts/media/f05-pr36-media-bridge.js');

function box(type, payload) {
  const body = Buffer.from(payload || []);
  const out = Buffer.alloc(8 + body.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, 'ascii');
  body.copy(out, 8);
  return out;
}

function stillHeicHeader() {
  const payload = Buffer.alloc(12);
  payload.write('heic', 0, 4, 'ascii');
  payload.writeUInt32BE(0, 4);
  payload.write('heic', 8, 4, 'ascii');
  return new Uint8Array(box('ftyp', payload));
}

function stillHeifHeader() {
  const payload = Buffer.alloc(16);
  payload.write('mif1', 0, 4, 'ascii');
  payload.writeUInt32BE(0, 4);
  payload.write('mif1', 8, 4, 'ascii');
  payload.write('heic', 12, 4, 'ascii');
  return new Uint8Array(box('ftyp', payload));
}

function fakeFile(type, bytes, size) {
  const source = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  return {
    type,
    size: size == null ? source.byteLength : size,
    slice(start, end) {
      const view = source.slice(start || 0, Math.min(end == null ? source.length : end, source.length));
      return { arrayBuffer: async () => view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) };
    }
  };
}

function bridge() {
  return createF05MediaPolicyBridge({ pr36Policy, heifPreflight: { probeHeifHeader, MAX_HEIF_HEADER_BYTES } });
}

test('F05 PR36 bridge preserves PR36 limits while admitting only HEIC/HEIF as additive source MIME types', () => {
  const policy = bridge();
  assert.equal(policy.CONSTANTS, pr36Policy.CONSTANTS);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(policy.validateSelection([
    fakeFile('image/jpeg', new Uint8Array([1]), 1024),
    fakeFile('image/heic', stillHeicHeader(), 2048),
    fakeFile('image/heif', stillHeifHeader(), 4096)
  ], 0).length, 3);
  assert.throws(() => policy.validateSelection([fakeFile('image/avif', new Uint8Array([1]), 1024)], 0), /mime_not_allowed/);
  assert.throws(() => policy.validateSelection([fakeFile('image/heic', stillHeicHeader(), pr36Policy.CONSTANTS.maxFileBytes + 1)], 0), /source_too_large/);
});

test('F05 PR36 bridge validates HEIC/HEIF using bounded local preflight without inventing dimensions', async () => {
  const policy = bridge();
  let requestedLimit = 0;
  const file = fakeFile('image/heic', stillHeicHeader(), stillHeicHeader().byteLength);
  const source = await policy.validateSource(file, {
    readHeader: async (candidate, limit) => {
      requestedLimit = limit;
      return new Uint8Array(await candidate.slice(0, limit).arrayBuffer());
    }
  });
  assert.ok(requestedLimit > 0 && requestedLimit <= MAX_HEIF_HEADER_BYTES);
  assert.equal(source.file, file);
  assert.equal(source.mimeType, 'image/heic');
  assert.equal(source.sourceKind, 'heic');
  assert.equal(source.requiresHeifDecode, true);
  assert.equal('width' in source, false);
  assert.equal('height' in source, false);
});

test('F05 PR36 bridge fails closed when HEIF container family disagrees with declared MIME', async () => {
  const policy = bridge();
  await assert.rejects(
    () => policy.validateSource(fakeFile('image/heic', stillHeifHeader())),
    /signature_mismatch/
  );
  await assert.rejects(
    () => policy.validateSource(fakeFile('image/heif', stillHeicHeader())),
    /signature_mismatch/
  );
});

test('F05 PR36 bridge delegates existing formats and output metadata projection unchanged to PR36', async () => {
  const calls = [];
  const delegate = Object.freeze({
    CONSTANTS: pr36Policy.CONSTANTS,
    createMediaError: pr36Policy.createMediaError,
    validateSelection: pr36Policy.validateSelection,
    validateSource: async (file, options) => { calls.push(['source', file.type, options.marker]); return { file, mimeType: file.type, width: 800, height: 600 }; },
    projectMetadata: (items, coverId) => { calls.push(['project', coverId]); return Object.freeze({ delegated: true }); }
  });
  const policy = createF05MediaPolicyBridge({ pr36Policy: delegate, heifPreflight: { probeHeifHeader, MAX_HEIF_HEADER_BYTES } });
  const jpeg = fakeFile('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff]), 3);
  const source = await policy.validateSource(jpeg, { marker: 'exact-options' });
  assert.equal(source.mimeType, 'image/jpeg');
  assert.deepEqual(calls[0], ['source', 'image/jpeg', 'exact-options']);
  assert.deepEqual(policy.projectMetadata([], 'cover'), { delegated: true });
  assert.deepEqual(calls[1], ['project', 'cover']);
});
