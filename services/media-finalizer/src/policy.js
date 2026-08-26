'use strict';

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 4096;
const MAX_HEIGHT = 4096;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const MAX_PIXELS = MAX_WIDTH * MAX_HEIGHT;
const ALLOWED_MIME_TYPES = Object.freeze(new Set(['image/jpeg', 'image/webp']));

function mediaError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function assertSourceBounds(input) {
  if (!Buffer.isBuffer(input) || input.length < 4 || input.length > MAX_SOURCE_BYTES) {
    throw mediaError('MEDIA_SOURCE_SIZE_INVALID');
  }
}

function detectStrictMime(input) {
  assertSourceBounds(input);
  if (input[0] === 0xff && input[1] === 0xd8) {
    if (input[input.length - 2] !== 0xff || input[input.length - 1] !== 0xd9) {
      throw mediaError('JPEG_EOI_MISSING_OR_TRAILING_BYTES');
    }
    return 'image/jpeg';
  }
  if (input.length >= 12 && input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP') {
    if (input.readUInt32LE(4) + 8 !== input.length) throw mediaError('WEBP_RIFF_LENGTH_MISMATCH');
    return 'image/webp';
  }
  throw mediaError('MEDIA_FORMAT_NOT_ALLOWED');
}

function assertStrictContainer(input, declaredMime) {
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) throw mediaError('MEDIA_FORMAT_NOT_ALLOWED');
  const detectedMime = detectStrictMime(input);
  if (detectedMime !== declaredMime) throw mediaError('MEDIA_DECLARED_TYPE_MISMATCH');
  return declaredMime === 'image/jpeg' ? 'jpeg' : 'webp';
}

function assertDecodedMetadata(metadata, declaredMime) {
  const expected = declaredMime === 'image/jpeg' ? 'jpeg' : declaredMime === 'image/webp' ? 'webp' : null;
  if (!expected) throw mediaError('MEDIA_FORMAT_NOT_ALLOWED');
  if (!metadata || metadata.format !== expected) throw mediaError('MEDIA_DECODER_FORMAT_MISMATCH');
  if (Number(metadata.pages || 1) !== 1) throw mediaError('MEDIA_ANIMATION_NOT_ALLOWED');
  const width = Number(metadata.width);
  const height = Number(metadata.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_WIDTH || width > MAX_WIDTH || height < MIN_HEIGHT || height > MAX_HEIGHT || width * height > MAX_PIXELS) {
    throw mediaError('MEDIA_DIMENSIONS_INVALID');
  }
  return Object.freeze({ width, height, format: expected });
}

function canonicalExtension(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  throw mediaError('MEDIA_FORMAT_NOT_ALLOWED');
}

function canonicalPath(listingId, mediaId, sha256, mime) {
  if (!/^[0-9a-f]{64}$/.test(String(sha256 || ''))) throw mediaError('MEDIA_DIGEST_INVALID');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(String(listingId || '')) || !uuid.test(String(mediaId || ''))) throw mediaError('MEDIA_ID_INVALID');
  return `${listingId}/${mediaId}/${sha256}.${canonicalExtension(mime)}`;
}

function safeFailureCode(error) {
  const raw = String(error && (error.code || error.message) || 'MEDIA_FINALIZATION_FAILED').toUpperCase();
  return raw.replace(/[^A-Z0-9_]/g, '_').slice(0, 120) || 'MEDIA_FINALIZATION_FAILED';
}

module.exports = Object.freeze({
  MAX_SOURCE_BYTES,
  MAX_PIXELS,
  ALLOWED_MIME_TYPES,
  detectStrictMime,
  assertStrictContainer,
  assertDecodedMetadata,
  canonicalExtension,
  canonicalPath,
  safeFailureCode,
  mediaError
});
