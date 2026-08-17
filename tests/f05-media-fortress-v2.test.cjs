'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const MODULE = '../scripts/media/server/aws/f05-media-fortress-v2.js';

function u16be(value) {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function makeStructuralJpeg(width = 1600, height = 1200) {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, ...u16be(height), ...u16be(width),
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
    0x11, 0x22, 0x33,
    0xff, 0xd9,
  ]);
}

function makeWorker(overrides = {}) {
  return Object.freeze({
    backend: 'isolated-test-codec',
    version: '1.0.0',
    async decode() { throw new Error('unexpected decode'); },
    async encode() { throw new Error('unexpected encode'); },
    ...overrides,
  });
}

test('creates a frozen Media Fortress V2 engine behind the existing F05 image-engine ports', () => {
  const { createMediaFortressV2 } = require(MODULE);
  const engine = createMediaFortressV2({ codecWorker: makeWorker() });

  assert.equal(Object.isFrozen(engine), true);
  assert.equal(engine.backend, 'isolated-test-codec');
  assert.equal(engine.version, '1.0.0');
  assert.equal(typeof engine.inspect, 'function');
  assert.equal(typeof engine.rewrite, 'function');
  assert.equal(typeof engine.decodeHeic, 'undefined');
  assert.equal(typeof engine.decodeHeif, 'undefined');
});

test('inspect derives JPEG family and geometry from bytes, then requires decoder agreement', async () => {
  const { createMediaFortressV2 } = require(MODULE);
  const calls = [];
  const jpeg = makeStructuralJpeg();
  const engine = createMediaFortressV2({
    codecWorker: makeWorker({
      async decode(bytes, request) {
        calls.push({ bytes, request });
        return Object.freeze({
          format: 'jpeg',
          width: 1600,
          height: 1200,
          animated: false,
          colorSpace: 'srgb',
          canNormalizeToSrgb: true,
        });
      },
    }),
  });

  const facts = await engine.inspect(jpeg, { policyVersion: 'F05_V1' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].bytes, jpeg);
  assert.deepEqual(calls[0].request, { format: 'jpeg', timeoutMs: 2500 });
  assert.deepEqual(facts, {
    format: 'jpeg',
    mime: 'image/jpeg',
    width: 1600,
    height: 1200,
    pixelCount: 1920000,
    hasMetadata: false,
    colorSpace: 'srgb',
    canNormalizeToSrgb: true,
  });
  assert.equal(Object.isFrozen(facts), true);
});

test('inspect rejects HEIC/unknown bytes before invoking the codec worker', async () => {
  const { createMediaFortressV2 } = require(MODULE);
  let decodeCalls = 0;
  const engine = createMediaFortressV2({
    codecWorker: makeWorker({
      async decode() {
        decodeCalls += 1;
        throw new Error('must not run');
      },
    }),
  });
  const heicLike = Uint8Array.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
  ]);

  await assert.rejects(
    () => engine.inspect(heicLike, { policyVersion: 'F05_V1' }),
    (error) => error && error.code === 'media_candidate_rejected',
  );
  assert.equal(decodeCalls, 0);
});
