'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820003100_social_media_reservation_content_identity_hardening.sql',
);

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, `Gate 2 hardening migration missing: ${MIGRATION}`);
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('reservation function has a fail-fast two-second PostgreSQL lock budget', () => {
  const text = sql();
  assert.match(
    text,
    /alter\s+function\s+public\.vvip_social_media_reserve_upload\s*\(\s*uuid\s*,\s*text\s*\)\s+set\s+lock_timeout\s+(?:to|=)\s+'2s'/i,
  );
});

test('identical canonical bytes across different media IDs do not become a global ownership collision', () => {
  const text = sql();
  assert.match(
    text,
    /alter\s+table\s+public\.vvip_social_media_assets\s+drop\s+constraint\s+if\s+exists\s+vvip_social_media_assets_canonical_sha256_key/i,
  );
  assert.match(
    text,
    /alter\s+table\s+public\.vvip_social_media_passports\s+drop\s+constraint\s+if\s+exists\s+vvip_social_media_passports_canonical_sha256_key/i,
  );
  assert.match(text, /create\s+index\s+if\s+not\s+exists\s+vvip_social_media_assets_canonical_sha_idx/i);
  assert.match(text, /create\s+index\s+if\s+not\s+exists\s+vvip_social_media_passports_canonical_sha_idx/i);
  assert.doesNotMatch(text, /create\s+unique\s+index[^;]*canonical_sha256/i);
});
