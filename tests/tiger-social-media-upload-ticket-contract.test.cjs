'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTION = path.join(ROOT, 'supabase/functions/social-media-upload-ticket/index.ts');

function source() {
  assert.equal(
    fs.existsSync(FUNCTION),
    true,
    'Gate 2 signed-upload Edge Function must exist before this contract can turn GREEN'
  );
  return fs.readFileSync(FUNCTION, 'utf8');
}

test('upload ticket request schema accepts only post_id and idempotency_key', () => {
  const text = source();
  assert.match(text, /type\s+UploadTicketRequest\s*=\s*\{[\s\S]*post_id\??\s*:\s*string[\s\S]*idempotency_key\??\s*:\s*string[\s\S]*\}/i);
  assert.doesNotMatch(
    text,
    /type\s+UploadTicketRequest\s*=\s*\{[\s\S]*\b(?:mime_type|content_type|byte_size|width|height|sha256|filename)\b/i
  );
});

test('upload ticket reserves a server-derived path under caller auth then mints a no-upsert signed upload capability', () => {
  const text = source();
  assert.match(text, /Authorization/i);
  assert.match(text, /vvip_social_media_reserve_upload/i);
  assert.match(text, /target_post\s*:\s*postId/i);
  assert.match(text, /request_idempotency_key\s*:\s*idempotencyKey/i);
  assert.match(text, /createSignedUploadUrl\s*\(/i);
  assert.match(text, /upsert\s*:\s*false/i);
  assert.match(text, /social-private-media/i);
  assert.doesNotMatch(text, /service[_-]?role[^\n]{0,200}(return|jsonResponse)/i);
});

test('upload ticket explicitly rejects browser attempts to submit canonical media facts', () => {
  const text = source();
  for (const field of ['mime_type', 'content_type', 'byte_size', 'width', 'height', 'sha256', 'filename']) {
    assert.match(
      text,
      new RegExp(`(?:hasOwnProperty|in)\\s*(?:\\.call\\s*)?[^\\n]{0,160}["']${field}["']|["']${field}["'][^\\n]{0,160}(?:hasOwnProperty|\\sin\\s)`, 'i'),
      `expected explicit rejection guard for ${field}`
    );
  }
});

test('upload ticket is bounded, POST-only, no-store, and does not trust client content headers', () => {
  const text = source();
  assert.match(text, /MAX_BODY_BYTES/i);
  assert.match(text, /request\.method\s*!==\s*["']POST["']/i);
  assert.match(text, /Cache-Control["']?\s*:\s*["']no-store["']/i);
  assert.doesNotMatch(text, /request\.headers\.get\s*\(\s*["']content-type["']\s*\)[\s\S]{0,200}(mime|canonical)/i);
});
