'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const sql = fs.readFileSync('supabase/migrations/20260829183000_nexus_sector_publication.sql', 'utf8');

test('NEXUS reposts inherit authoritative sector and intent from the original post', () => {
  assert.match(sql, /create or replace function public\.vvip_social_repost_post\s*\(/i);
  assert.match(sql, /select\s+post\.body\s*,\s*post\.audience\s*,\s*post\.sector_key\s*,\s*post\.intent_class/i);
  assert.match(sql, /insert into public\.vvip_social_posts\s*\(\s*author_subject\s*,\s*body\s*,\s*audience\s*,\s*sector_key\s*,\s*intent_class/i);
});

test('repost snapshots cannot detach from inherited NEXUS classification', () => {
  assert.match(sql, /create or replace function public\.vvip_social_guard_repost_snapshot_write\s*\(/i);
  assert.match(sql, /new\.sector_key\s+is\s+distinct\s+from\s+v_original_sector/i);
  assert.match(sql, /new\.intent_class\s+is\s+distinct\s+from\s+v_original_intent/i);
});

test('original classification changes synchronize to existing repost snapshots', () => {
  assert.match(sql, /create or replace function public\.vvip_social_sync_repost_snapshot\s*\(/i);
  assert.match(sql, /set\s+body\s*=\s*new\.body\s*,\s*sector_key\s*=\s*new\.sector_key\s*,\s*intent_class\s*=\s*new\.intent_class/i);
  assert.match(sql, /after update of body\s*,\s*sector_key\s*,\s*intent_class\s+on public\.vvip_social_posts/i);
});
