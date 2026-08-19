'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migrationPath = 'supabase/migrations/20260819132000_social_post_returning_rls_fix.sql';

function migration() {
  return fs.readFileSync(migrationPath, 'utf8');
}

test('post RETURNING fix is forward-only and lock-bounded', () => {
  const sql = migration();
  assert.match(sql, /begin;/i);
  assert.match(sql, /set\s+local\s+lock_timeout\s*=\s*'2s'/i);
  assert.match(sql, /commit;/i);
  assert.doesNotMatch(sql, /drop\s+policy|drop\s+table|drop\s+column|disable\s+row\s+level\s+security/i);
});

test('owner read policy fixes INSERT RETURNING without widening non-owner visibility', () => {
  const sql = migration();
  assert.match(sql, /create\s+policy\s+vvip_social_post_owner_read_returning/i);
  assert.match(sql, /on\s+public\.vvip_social_posts/i);
  assert.match(sql, /for\s+select\s+to\s+authenticated/i);
  assert.match(sql, /author_subject\s*=\s*\(select\s+public\.vvip_marketplace_actor_id\(\)\)/i);
  assert.doesNotMatch(sql, /grant\s+execute|vvip_social_is_blocked_pair|alter\s+policy\s+vvip_social_post_visible_read/i);
});
