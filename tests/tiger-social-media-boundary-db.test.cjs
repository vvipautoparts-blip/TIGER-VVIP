'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migrationPath = 'supabase/migrations/20260819140000_social_media_boundary.sql';

function migration() {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    'social media boundary migration must exist before this slice can turn GREEN'
  );
  return fs.readFileSync(migrationPath, 'utf8');
}

test('social media authority is private, owner-bound, and inherits post visibility', () => {
  const sql = migration();
  assert.match(sql, /create\s+table\s+public\.vvip_social_media/i);
  assert.match(sql, /post_id\s+uuid\s+not\s+null\s+references\s+public\.vvip_social_posts/i);
  assert.match(sql, /owner_subject\s+text\s+not\s+null/i);
  assert.match(sql, /storage_path\s+text\s+not\s+null/i);
  assert.match(sql, /enable\s+row\s+level\s+security/i);
  assert.match(sql, /force\s+row\s+level\s+security/i);
  assert.match(sql, /vvip_social_can_view_post/i);
  assert.match(sql, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.doesNotMatch(sql, /grant\s+select\s*,?\s*insert\s*,?\s*update\s*,?\s*delete\s+on\s+table\s+public\.vvip_social_media\s+to\s+anon/i);
});

test('social media accepts only bounded image metadata and non-public object paths', () => {
  const sql = migration();
  assert.match(sql, /image\/jpeg/i);
  assert.match(sql, /image\/webp/i);
  assert.match(sql, /byte_size\s+between\s+1\s+and\s+10485760/i);
  assert.match(sql, /storage_path\s+like\s+'social-private\/%'/i);
  assert.match(sql, /sha256/i);
  assert.doesNotMatch(sql, /publicUrl|getPublicUrl|public_bucket/i);
});

test('browser writes use bounded RPCs and server-derived actor identity', () => {
  const sql = migration();
  for (const fn of ['vvip_social_media_register', 'vvip_social_media_remove', 'vvip_social_media_read']) {
    assert.match(sql, new RegExp(`function\\s+public\\.${fn}`, 'i'));
  }
  assert.match(sql, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_media\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_media_register/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_media_remove/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_media_read/i);
});

test('media webhook inbox is idempotent and dead-letter capable', () => {
  const sql = migration();
  assert.match(sql, /create\s+table\s+public\.vvip_social_media_webhook_inbox/i);
  assert.match(sql, /idempotency_key\s+text\s+not\s+null\s+unique/i);
  assert.match(sql, /processing_state[^;]*(pending|processing|completed|dead_letter)/is);
  assert.match(sql, /attempt_count/i);
  assert.match(sql, /next_attempt_at/i);
  assert.match(sql, /last_error_code/i);
  assert.match(sql, /dead_letter/i);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_media_webhook_inbox\s+from\s+public,\s*anon,\s*authenticated/i);
});
