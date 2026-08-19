'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTION = path.join(ROOT, 'supabase/functions/social-media-finalizer/index.ts');

function source() {
  assert.equal(
    fs.existsSync(FUNCTION),
    true,
    'Gate 2 trusted-finalizer Edge Function must exist before this contract can turn GREEN'
  );
  return fs.readFileSync(FUNCTION, 'utf8');
}

test('finalizer is service-only and uses constant-time worker-secret verification', () => {
  const text = source();
  assert.match(text, /x-tiger-worker-secret/i);
  assert.match(text, /timingSafe|constantTime|crypto\.subtle/i);
  assert.doesNotMatch(text, /auth\.getUser\s*\(/i);
  assert.match(text, /SUPABASE_SERVICE_ROLE_KEY/i);
});

test('finalizer downloads actual quarantine bytes and enforces the real 15 MiB source envelope', () => {
  const text = source();
  assert.match(text, /storage[\s\S]{0,400}download\s*\(/i);
  assert.match(text, /Uint8Array/i);
  assert.match(text, /byteLength/i);
  assert.match(text, /15\s*\*\s*1024\s*\*\s*1024|15728640/i);
  assert.match(text, /SOCIAL_MEDIA_SIZE_INVALID|MEDIA_SIZE_INVALID/i);
  assert.match(text, /quarantine/i);
});

test('finalizer detects JPEG/WebP from magic bytes before decode and ignores headers/extensions', () => {
  const text = source();
  assert.match(text, /detectMagic|detectMedia/i);
  assert.match(text, /0xff[\s\S]{0,80}0xd8[\s\S]{0,80}0xff/i);
  assert.match(text, /RIFF/i);
  assert.match(text, /WEBP/i);
  assert.doesNotMatch(text, /headers\.get\s*\(\s*["']content-type["']\s*\)[\s\S]{0,200}(canonical|mime)/i);
  assert.doesNotMatch(text, /endsWith\s*\(\s*["']\.(?:jpg|jpeg|webp)["']\s*\)/i);
});

test('finalizer uses ImageMagick WASM with resource bounds, auto-orientation and metadata stripping', () => {
  const text = source();
  assert.match(text, /@imagemagick\/magick-wasm/i);
  assert.match(text, /initializeImageMagick/i);
  assert.match(text, /ImageMagick\.read/i);
  assert.match(text, /MAX_SOURCE_PIXELS/i);
  assert.match(text, /width\s*\*\s*height|height\s*\*\s*width/i);
  assert.match(text, /autoOrient\s*\(/i);
  assert.match(text, /profileNames/i);
  assert.match(text, /removeProfile\s*\(/i);
});

test('canonical output is newly encoded JPEG exactly 1600x1200 with independent SHA-256 proof', () => {
  const text = source();
  assert.match(text, /1600/i);
  assert.match(text, /1200/i);
  assert.match(text, /MagickFormat\.Jpeg/i);
  assert.match(text, /quality\s*=\s*8[0-9]/i);
  assert.match(text, /crypto\.subtle\.digest\s*\(\s*["']SHA-256["']/i);
  assert.match(text, /sourceSha256/i);
  assert.match(text, /canonicalSha256/i);
  assert.match(text, /SOCIAL_MEDIA_CANONICAL_GEOMETRY_INVALID/i);
});

test('canonical promotion is no-overwrite, DB-verified, and compensates orphaned uploads', () => {
  const text = source();
  assert.match(text, /canonical\/media\//i);
  assert.match(text, /upload\s*\(/i);
  assert.match(text, /upsert\s*:\s*false/i);
  assert.match(text, /vvip_social_media_finalize/i);
  assert.match(text, /remove\s*\(/i);
  assert.match(text, /CANONICAL_PROMOTION_ROLLBACK|ORPHAN/i);
});

test('finalizer uses claim/complete/fail RPCs and leaves retry scheduling to PostgreSQL', () => {
  const text = source();
  assert.match(text, /vvip_social_media_webhook_claim/i);
  assert.match(text, /vvip_social_media_webhook_complete/i);
  assert.match(text, /vvip_social_media_webhook_fail/i);
  assert.doesNotMatch(text, /setTimeout\s*\(/i);
  assert.doesNotMatch(text, /next_attempt_at\s*:/i);
});
