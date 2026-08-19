'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTION = path.join(ROOT, 'supabase/functions/social-media-read-ticket/index.ts');

function source() {
  assert.equal(fs.existsSync(FUNCTION), true, `Gate 2 private read broker missing: ${FUNCTION}`);
  return fs.readFileSync(FUNCTION, 'utf8');
}

test('private read broker accepts only media_id under caller authorization', () => {
  const text = source();
  assert.match(text, /request\.method\s*!==\s*["']POST["']/);
  assert.match(text, /Authorization/i);
  assert.match(text, /AUTHORIZATION_REQUIRED/);
  assert.match(text, /media_id/i);
  assert.match(text, /REQUEST_FIELD_NOT_ALLOWED/);
});

test('visibility is authorized as the user, then one-time grant is consumed only by service authority', () => {
  const text = source();
  assert.match(text, /vvip_social_media_request_read/);
  assert.match(text, /vvip_social_media_consume_read/);
  assert.match(text, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(text, /SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY/);
  assert.match(text, /global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authorization/i);
  assert.match(text, /grant_token:\s*grant\.read_token/i);
});

test('broker returns a short private signed download capability and never exposes DB read token', () => {
  const text = source();
  assert.match(text, /createSignedUrl\s*\(/);
  assert.match(text, /SIGNED_READ_SECONDS\s*=\s*60/);
  assert.match(text, /signed_url/);
  const responseStart = text.indexOf('return jsonResponse(200');
  assert.notEqual(responseStart, -1);
  const response = text.slice(responseStart, responseStart + 700);
  assert.doesNotMatch(response, /read_token\s*:/i);
  assert.doesNotMatch(response, /canonical_storage_path\s*:/i);
});

test('private-read public errors never echo database or storage messages', () => {
  const text = source();
  assert.match(text, /console\.error\s*\(/i);
  assert.match(text, /READ_DENIED/i);
  assert.match(text, /READ_GRANT_CONSUME_FAILED/i);
  assert.match(text, /SIGNED_READ_FAILED/i);
  assert.doesNotMatch(text, /throw\s+new\s+Error\s*\(\s*`READ_DENIED:\$\{grantError\.message\}`/i);
  assert.doesNotMatch(text, /throw\s+new\s+Error\s*\(\s*`READ_GRANT_CONSUME_FAILED:\$\{consumeError\.message\}`/i);
  assert.doesNotMatch(text, /throw\s+new\s+Error\s*\(\s*`SIGNED_READ_FAILED:\$\{signedError\?\.message/i);
});
