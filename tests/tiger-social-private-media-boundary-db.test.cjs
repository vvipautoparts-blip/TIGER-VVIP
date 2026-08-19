'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const MIGRATION = 'supabase/migrations/20260819140000_social_private_media_boundary.sql';

function sql() {
  assert.equal(
    fs.existsSync(MIGRATION),
    true,
    'Social private-media boundary migration must exist before Gate 2 can be GREEN'
  );
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('Social media authority is post-bound, private, FORCE-RLS, and browser-table-closed', () => {
  const text = sql();
  assert.match(text, /create\s+table\s+public\.vvip_social_media_assets/i);
  assert.match(text, /post_id\s+uuid\s+not\s+null\s+references\s+public\.vvip_social_posts\s*\(post_id\)/i);
  assert.match(text, /alter\s+table\s+public\.vvip_social_media_assets\s+enable\s+row\s+level\s+security/i);
  assert.match(text, /alter\s+table\s+public\.vvip_social_media_assets\s+force\s+row\s+level\s+security/i);
  assert.match(text, /revoke\s+all(?:\s+privileges)?\s+on\s+table\s+public\.vvip_social_media_assets\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.doesNotMatch(text, /grant\s+(select|insert|update|delete).*vvip_social_media_assets.*to\s+authenticated/i);
});

test('Social media uses a non-public bucket and strict normalized image envelope', () => {
  const text = sql();
  assert.match(text, /'social-private-media'/i);
  assert.match(text, /insert\s+into\s+storage\.buckets/i);
  assert.match(text, /false\s*,\s*5242880/i);
  assert.match(text, /image\/jpeg/i);
  assert.match(text, /image\/webp/i);
  assert.doesNotMatch(text, /image\/png/i);
  assert.match(text, /byte_size\s+integer\s+not\s+null\s+check\s*\(byte_size\s+between\s+1\s+and\s+5242880\)/i);
  assert.match(text, /width\s+integer\s+not\s+null\s+check\s*\(width\s+between\s+320\s+and\s+4096\)/i);
  assert.match(text, /height\s+integer\s+not\s+null\s+check\s*\(height\s+between\s+240\s+and\s+4096\)/i);
});

test('Browser upload reservation is actor-derived, post-owner-bound, idempotent, and path-isolated', () => {
  const text = sql();
  assert.match(text, /create\s+function\s+public\.vvip_social_media_reserve_upload/i);
  assert.match(text, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(text, /vvip_social_posts/i);
  assert.match(text, /author_subject\s*=\s*v_actor/i);
  assert.match(text, /idempotency_key/i);
  assert.match(text, /unique\s*\(owner_subject\s*,\s*post_id\s*,\s*idempotency_key\)/i);
  assert.match(text, /source\//i);
  assert.match(text, /owner_subject/i);
  assert.match(text, /post_id/i);
  assert.match(text, /media_id/i);
});

test('Private read capability is current-actor authorization, short-lived, and visibility/block aware', () => {
  const text = sql();
  assert.match(text, /create\s+table\s+public\.vvip_social_media_read_grants/i);
  assert.match(text, /token_hash\s+text\s+not\s+null\s+unique/i);
  assert.match(text, /create\s+function\s+public\.vvip_social_media_request_read/i);
  assert.match(text, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(text, /vvip_social_can_view_post\s*\(/i);
  assert.match(text, /interval\s+'2 minutes'/i);
  assert.match(text, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public,\s*extensions/i);
  assert.doesNotMatch(text, /grant\s+execute\s+on\s+function\s+public\.vvip_social_is_blocked_pair/i);
});

test('Trusted finalization inbox is idempotent, bounded-retry, and dead-letters instead of silent loss', () => {
  const text = sql();
  assert.match(text, /create\s+table\s+public\.vvip_social_media_finalization_events/i);
  assert.match(text, /event_key\s+text\s+not\s+null\s+unique/i);
  assert.match(text, /event_state\s+text\s+not\s+null/i);
  assert.match(text, /DEAD_LETTER/i);
  assert.match(text, /attempt_count\s+smallint\s+not\s+null\s+default\s+0\s+check\s*\(attempt_count\s+between\s+0\s+and\s+3\)/i);
  assert.match(text, /create\s+function\s+public\.vvip_social_media_apply_finalization_event/i);
  assert.match(text, /on\s+conflict\s*\(event_key\)/i);
  assert.match(text, /service_role/i);
});

test('Canonical evidence is trusted-only and storage policies never make Social media anonymous/public', () => {
  const text = sql();
  assert.match(text, /canonical_storage_path/i);
  assert.match(text, /canonical_sha256/i);
  assert.match(text, /SOCIAL_MEDIA_CANONICAL_FIELDS_TRUSTED_ONLY/i);
  assert.match(text, /on\s+storage\.objects/i);
  assert.match(text, /bucket_id\s*=\s*'social-private-media'/i);
  assert.doesNotMatch(text, /to\s+anon/i);
  assert.doesNotMatch(text, /grant\s+execute.*vvip_social_media_apply_finalization_event.*authenticated/i);
});
