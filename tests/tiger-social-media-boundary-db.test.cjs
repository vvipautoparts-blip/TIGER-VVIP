'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260819123000_social_media_boundary.sql');

function migrationText() {
  assert.equal(fs.existsSync(MIGRATION), true, 'social media boundary migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('social media boundary creates a private canonical bucket only', () => {
  const sql = migrationText();
  assert.match(sql, /insert\s+into\s+storage\.buckets/i);
  assert.match(sql, /tiger-social-media/);
  assert.match(sql, /public\s*=\s*false/i);
  assert.doesNotMatch(sql, /public\s*=\s*true/i);
  assert.match(sql, /image\/jpeg/i);
  assert.match(sql, /image\/webp/i);
});

test('social media metadata is bound to one parent post and owner with fail-closed constraints', () => {
  const sql = migrationText();
  assert.match(sql, /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.vvip_social_post_media/i);
  assert.match(sql, /post_id\s+uuid\s+not\s+null\s+references\s+public\.vvip_social_posts\s*\(post_id\)\s+on\s+delete\s+cascade/i);
  assert.match(sql, /owner_subject\s+text\s+not\s+null/i);
  assert.match(sql, /storage_path\s+text\s+not\s+null/i);
  assert.match(sql, /mime_type\s+text\s+not\s+null/i);
  assert.match(sql, /sha256\s+text\s+not\s+null/i);
  assert.match(sql, /mime_type\s+in\s*\(\s*'image\/jpeg'\s*,\s*'image\/webp'\s*\)/i);
  assert.match(sql, /sha256\s*~\s*'\^\[0-9a-f\]\{64\}\$'/i);
});

test('metadata uses RLS + FORCE RLS and parent-post visibility', () => {
  const sql = migrationText();
  assert.match(sql, /alter\s+table\s+public\.vvip_social_post_media\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /alter\s+table\s+public\.vvip_social_post_media\s+force\s+row\s+level\s+security/i);
  assert.match(sql, /vvip_social_post_visible_to_actor/i);
  assert.match(sql, /create\s+policy\s+vvip_social_post_media_visible_read/i);
  assert.match(sql, /create\s+policy\s+vvip_social_post_media_owner_insert/i);
  assert.match(sql, /create\s+policy\s+vvip_social_post_media_owner_delete/i);
});

test('storage object reads are joined to exact social metadata and parent visibility', () => {
  const sql = migrationText();
  assert.match(sql, /create\s+policy\s+vvip_social_media_object_visible_read/i);
  assert.match(sql, /on\s+storage\.objects\s+for\s+select/i);
  assert.match(sql, /bucket_id\s*=\s*'tiger-social-media'/i);
  assert.match(sql, /m\.storage_path\s*=\s*storage\.objects\.name/i);
  assert.match(sql, /vvip_social_post_visible_to_actor\s*\(\s*m\.post_id/i);
});

test('storage object writes are owner/path scoped rather than public or service-role browser authority', () => {
  const sql = migrationText();
  assert.match(sql, /create\s+policy\s+vvip_social_media_object_owner_insert/i);
  assert.match(sql, /create\s+policy\s+vvip_social_media_object_owner_delete/i);
  assert.match(sql, /storage\.foldername\s*\(\s*name\s*\)/i);
  assert.match(sql, /vvip_social_actor_id\s*\(\s*\)/i);
  assert.doesNotMatch(sql, /service[_-]?role/i);
  assert.doesNotMatch(sql, /publicUrl|public_url/i);
});
