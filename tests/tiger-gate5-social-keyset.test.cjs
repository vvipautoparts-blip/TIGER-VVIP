"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION = path.join(
  __dirname,
  "../supabase/migrations/20260820007100_gate5_social_keyset.sql"
);

function migration() {
  assert.equal(fs.existsSync(MIGRATION), true, "Gate 5 Social keyset migration must exist");
  return fs.readFileSync(MIGRATION, "utf8");
}

test("comments use actor/post-bound chronological keysets without OFFSET", () => {
  const sql = migration();
  assert.match(sql, /function\s+public\.vvip_social_comment_list_keyset/i);
  assert.match(sql, /'kind'\s*,\s*'social_comments'/i);
  assert.match(sql, /'post_id'\s*,\s*p_post_id/i);
  assert.match(sql, /v_cursor_actor\s*<>\s*v_actor/i);
  assert.match(sql, /v_cursor_post_id\s*<>\s*p_post_id/i);
  assert.match(sql, /\(comment\.created_at,\s*comment\.comment_id\)\s*>\s*\(v_after_created_at,\s*v_after_comment_id\)/i);
  assert.match(sql, /order\s+by\s+comment\.created_at\s*,\s*comment\.comment_id/i);
  assert.doesNotMatch(sql, /\boffset\b/i);
});

test("friend relationships use actor-bound updated_at/id keysets", () => {
  const sql = migration();
  assert.match(sql, /function\s+public\.vvip_social_relationship_read_keyset/i);
  assert.match(sql, /'kind'\s*,\s*'social_relationships'/i);
  assert.match(sql, /\(relationship\.updated_at,\s*relationship\.relationship_id\)\s*<\s*\(v_after_updated_at,\s*v_after_relationship_id\)/i);
  assert.match(sql, /order\s+by\s+relationship\.updated_at\s+desc\s*,\s*relationship\.relationship_id\s+desc/i);
  assert.doesNotMatch(sql, /\boffset\b/i);
});

test("both Social keyset RPCs remain bounded, actor-derived, and authenticated-only", () => {
  const sql = migration();
  assert.match(sql, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_comment_list_keyset/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_relationship_read_keyset/i);
  assert.match(sql, /least\s*\(\s*greatest\s*\(\s*coalesce\s*\(\s*p_limit/i);
});