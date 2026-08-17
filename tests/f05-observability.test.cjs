'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMediaTelemetryEvent, bucketDurationMs, bucketBytes, bucketPixels } = require('../scripts/media/f05-observability.js');

const BASE = Object.freeze({
  stage: 'decode',
  sourceClass: 'heic',
  decodeRoute: 'wasm',
  outcome: 'success',
  errorFamily: 'none',
  durationMs: 842,
  sourceBytes: 2 * 1024 * 1024,
  decodedPixels: 12_000_000,
  decoderPolicyVersion: 'F05_DECODER_POLICY_V1',
  mediaPolicyVersion: 'F05_BPLUS_V1'
});

test('F05 telemetry exposes only privacy-safe bounded fields', () => {
  const event = buildMediaTelemetryEvent(BASE);
  assert.deepEqual(Object.keys(event).sort(), [
    'schemaVersion','stage','sourceClass','decodeRoute','outcome','errorFamily',
    'durationBucket','sourceBytesBucket','decodedPixelsBucket','decoderPolicyVersion','mediaPolicyVersion'
  ].sort());
  assert.equal(event.schemaVersion, 'F05_MEDIA_TELEMETRY_V1');
  assert.equal(event.durationBucket, '250_999ms');
  assert.equal(event.sourceBytesBucket, '1_4mib');
  assert.equal(event.decodedPixelsBucket, '8_16mp');
  assert.equal(Object.isFrozen(event), true);
});

test('F05 telemetry rejects identifiers metadata raw bytes paths hashes and free-form errors', () => {
  for (const forbidden of [
    { filename: 'IMG_1234.HEIC' }, { path: '/private/DCIM/a.heic' }, { gps: '31.9,35.9' },
    { exif: { Make: 'phone' } }, { rawBytes: new Uint8Array([1]) }, { deviceId: 'abc' },
    { userId: 'principal_1' }, { listingId: 'listing_1' }, { sha256: 'a'.repeat(64) },
    { errorMessage: 'decoder stack trace' }
  ]) assert.throws(() => buildMediaTelemetryEvent({ ...BASE, ...forbidden }), /media_telemetry_invalid/);
});

test('F05 telemetry accepts only stable enum outcomes and error families', () => {
  assert.throws(() => buildMediaTelemetryEvent({ ...BASE, outcome: 'whatever' }), /media_telemetry_invalid/);
  assert.throws(() => buildMediaTelemetryEvent({ ...BASE, errorFamily: 'raw stack: 0x123' }), /media_telemetry_invalid/);
  const timeout = buildMediaTelemetryEvent({ ...BASE, outcome: 'timeout', errorFamily: 'timeout' });
  assert.equal(timeout.outcome, 'timeout');
  assert.equal(timeout.errorFamily, 'timeout');
});

test('F05 telemetry bucketing is coarse and deterministic', () => {
  assert.equal(bucketDurationMs(0), 'lt250ms');
  assert.equal(bucketDurationMs(250), '250_999ms');
  assert.equal(bucketDurationMs(1000), '1_4s');
  assert.equal(bucketDurationMs(5000), '5_19s');
  assert.equal(bucketDurationMs(20000), '20s_plus');
  assert.equal(bucketBytes(100), 'lt1mib');
  assert.equal(bucketBytes(5 * 1024 * 1024), '4_15mib');
  assert.equal(bucketPixels(1_000_000), 'lt2mp');
  assert.equal(bucketPixels(40_000_000), '16_40mp');
});
