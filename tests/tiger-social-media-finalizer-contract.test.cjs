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

test('finalizer is service-only and never authorizes a browser JWT as worker authority', () => {
  const text = source();
  assert.match(text, /x-tiger-worker-secret/i);
  assert.match(text, /timingSafe|constantTime|crypto\.subtle/i);
  assert.doesNotMatch(text, /auth\.getUser\s*\(/i);
  assert.match(text, /SUPABASE_SERVICE_ROLE_KEY/i);
});

test('finalizer downloads actual bytes and enforces the real 5 MiB envelope', () => {
  const text = source();
  assert.match(text, /storage[\s\S]{0,300}download\s*\(/i);
  assert.match(text, /Uint8Array/i);
  assert.match(text, /byteLength/i);
  assert.match(text, /5\s*\*\s*1024\s*\*\s*1024|5242880/i);
  assert.match(text, /SOCIAL_MEDIA_SIZE_INVALID|MEDIA_SIZE_INVALID/i);
});

test('finalizer recognizes JPEG and WebP by magic bytes rather than headers or filename extensions', () => {
  const text = source();
  assert.match(text, /0xff[\s\S]{0,80}0xd8[\s\S]{0,80}0xff/i);
  assert.match(text, /RIFF/i);
  assert.match(text, /WEBP/i);
  assert.match(text, /VP8X/i);
  assert.match(text, /VP8L/i);
  assert.match(text, /VP8/i);
  assert.doesNotMatch(text, /headers\.get\s*\(\s*["']content-type["']\s*\)[\s\S]{0,200}(canonical|mime)/i);
  assert.doesNotMatch(text, /endsWith\s*\(\s*["']\.(?:jpg|jpeg|webp)["']\s*\)/i);
});

test('finalizer parses actual dimensions and computes SHA-256 from the byte stream', () => {
  const text = source();
  assert.match(text, /parseJpegDimensions/i);
  assert.match(text, /parseWebpDimensions/i);
  assert.match(text, /width/i);
  assert.match(text, /height/i);
  assert.match(text, /crypto\.subtle\.digest\s*\(\s*["']SHA-256["']/i);
  assert.match(text, /320/i);
  assert.match(text, /4096/i);
  assert.match(text, /240/i);
});

test('finalizer uses claim/finalize/fail RPCs and leaves retry timing to the database', () => {
  const text = source();
  assert.match(text, /vvip_social_media_webhook_claim/i);
  assert.match(text, /vvip_social_media_finalize/i);
  assert.match(text, /vvip_social_media_webhook_complete/i);
  assert.match(text, /vvip_social_media_webhook_fail/i);
  assert.doesNotMatch(text, /setTimeout\s*\(/i);
  assert.doesNotMatch(text, /next_attempt_at\s*:/i);
});
