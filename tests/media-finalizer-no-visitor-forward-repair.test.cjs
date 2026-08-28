'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260828140000_media_no_visitor_forward_repair.sql',
);

function normalizedMigration() {
  assert.equal(fs.existsSync(MIGRATION), true, 'MEDIA_NO_VISITOR_FORWARD_REPAIR_MISSING');
  return fs.readFileSync(MIGRATION, 'utf8').replace(/\s+/g, ' ').toLowerCase();
}

test('late media convergence reasserts NO_VISITOR_MODE after out-of-order historical migrations', () => {
  const sql = normalizedMigration();

  assert.match(sql, /drop policy if exists vvip_listing_media_canonical_read on storage\.objects/);
  assert.match(sql, /drop policy if exists vvip_listing_media_canonical_member_read on storage\.objects/);
  assert.match(sql, /create policy vvip_listing_media_canonical_member_read on storage\.objects for select to authenticated/);
  assert.match(sql, /revoke execute on function vvip_private\.vvip_marketplace_canonical_media_is_readable\(text\) from anon/);
  assert.match(sql, /revoke select on table public\.vvip_marketplace_listing_media from anon/);
  assert.match(sql, /revoke select on table public\.vvip_marketplace_public_feed from anon/);

  assert.doesNotMatch(sql, /\bto\s+anon\b/);
  assert.doesNotMatch(sql, /\bgrant\s+[^;]*\s+to\s+anon\b/);
});

test('forward repair preserves the authenticated canonical-media contract', () => {
  const sql = normalizedMigration();
  assert.match(sql, /bucket_id\s*=\s*'listing-media-canonical'/);
  assert.match(sql, /vvip_private\.vvip_marketplace_canonical_media_is_readable\(storage\.objects\.name\)/);
  assert.match(sql, /media_no_visitor_forward_repair=pass/);
});
