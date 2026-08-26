"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260820205500_social_bookmarks.sql";

function migration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("Social Bookmarks are private, actor-scoped, and unique per post", () => {
  const sql = migration();
  assert.match(sql, /create table public\.vvip_social_bookmarks/i);
  assert.match(sql, /unique\s*\(post_id, actor_subject\)/i);
  assert.match(sql, /references public\.vvip_social_posts\s*\(post_id\)\s*on delete cascade/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /actor_subject\s*=\s*\(select public\.vvip_marketplace_actor_id\(\)\)/i);
});

test("Social Bookmarks expose no browser table CRUD and only bounded owner RPCs", () => {
  const sql = migration();
  assert.match(sql, /revoke all privileges on table public\.vvip_social_bookmarks from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_bookmarks.*authenticated/i);
  assert.match(sql, /create function public\.vvip_social_bookmark_state\(p_post_id uuid\)/i);
  assert.match(sql, /create function public\.vvip_social_save_post\(p_post_id uuid\)/i);
  assert.match(sql, /create function public\.vvip_social_unsave_post\(p_post_id uuid\)/i);
  assert.match(sql, /security definer set search_path = pg_catalog/i);
  assert.match(sql, /grant execute on function public\.vvip_social_bookmark_state\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_save_post\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_unsave_post\(uuid\) to authenticated/i);
});

test("saving requires current Clerk actor and current post visibility without exposing saver identity", () => {
  const sql = migration();
  assert.match(sql, /public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /public\.vvip_social_can_view_post\(p_post_id, v_actor\)/i);
  assert.match(sql, /on conflict \(post_id, actor_subject\) do nothing/i);
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /jsonb_agg\s*\(.*actor_subject/i);
});
