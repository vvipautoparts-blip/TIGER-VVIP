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
  const requestTypeStart = text.search(/type\s+UploadTicketRequest\s*=\s*\{/i);
  assert.notEqual(requestTypeStart, -1, 'UploadTicketRequest type must exist');
  const requestTypeEnd = text.indexOf('};', requestTypeStart);
  assert.notEqual(requestTypeEnd, -1, 'UploadTicketRequest type must have a bounded body');
  const requestType = text.slice(requestTypeStart, requestTypeEnd + 2);

  assert.match(requestType, /post_id\??\s*:\s*string/i);
  assert.match(requestType, /idempotency_key\??\s*:\s*string/i);
  assert.doesNotMatch(
    requestType,
    /\b(?:mime_type|content_type|byte_size|width|height|sha256|filename)\b/i
  );
});

test('ticket reserves server-derived quarantine path under caller auth and mints no-upsert capability', () => {
  const text = source();
  assert.match(text, /Authorization/i);
  assert.match(text, /vvip_social_media_reserve_upload/i);
  assert.match(text, /target_post\s*:\s*postId/i);
  assert.match(text, /request_idempotency_key\s*:\s*idempotencyKey/i);
  assert.match(text, /createSignedUploadUrl\s*\(/i);
  assert.match(text, /upsert\s*:\s*false/i);
  assert.match(text, /social-private-media/i);
  assert.match(text, /quarantine/i);
  assert.match(text, /upload_lease_expires_at|lease_expires_at/i);
  assert.doesNotMatch(text, /service[_-]?role[^\n]{0,200}(return|jsonResponse)/i);
});

test('TIGER acceptance capability is fail-closed at 300 seconds without pretending provider expiry', () => {
  const text = source();
  assert.match(text, /300|5\s*\*\s*60/i);
  assert.match(text, /TIGER_UPLOAD_LEASE_EXPIRED/i);
  assert.match(text, /provider[^\n]{0,100}(ttl|expiry|expiration)|lease[^\n]{0,100}provider/i);
});

test('upload ticket explicitly rejects browser attempts to submit canonical media facts', () => {
  const text = source();
  const denylistStart = text.indexOf('const BANNED_CLIENT_FACTS');
  const denylistEnd = text.indexOf('] as const;', denylistStart);
  assert.notEqual(denylistStart, -1);
  assert.notEqual(denylistEnd, -1);
  const denylist = text.slice(denylistStart, denylistEnd);
  for (const field of ['mime_type', 'content_type', 'byte_size', 'width', 'height', 'sha256', 'filename']) {
    assert.match(denylist, new RegExp(`["']${field}["']`, 'i'), `missing denylisted canonical field ${field}`);
  }
  assert.match(text, /Object\.prototype\.hasOwnProperty\.call\s*\(\s*body\s*,\s*field\s*\)/i);
  assert.match(text, /CLIENT_CANONICAL_FACT_REJECTED/i);
});

test('upload ticket is bounded, POST-only, no-store, and does not trust client content headers', () => {
  const text = source();
  assert.match(text, /MAX_BODY_BYTES/i);
  assert.match(text, /request\.method\s*!==\s*["']POST["']/i);
  assert.match(text, /Cache-Control["']?\s*:\s*["']no-store["']/i);
  assert.doesNotMatch(text, /request\.headers\.get\s*\(\s*["']content-type["']\s*\)[\s\S]{0,200}(mime|canonical)/i);
});

test('upload public errors are stable taxonomy and never echo database or storage messages', () => {
  const text = source();
  assert.match(text, /console\.error\s*\(/i);
  assert.match(text, /RESERVATION_DENIED/i);
  assert.match(text, /SIGNED_UPLOAD_CAPABILITY_FAILED/i);
  assert.doesNotMatch(text, /throw\s+new\s+Error\s*\(\s*`RESERVATION_DENIED:\$\{reservationError\.message\}`/i);
  assert.doesNotMatch(text, /throw\s+new\s+Error\s*\(\s*`SIGNED_UPLOAD_CAPABILITY_FAILED:\$\{signedError\?\.message/i);
});
