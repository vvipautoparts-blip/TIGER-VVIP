"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const coreShellPath = "scripts/social/core-shell.js";
const repostMigrationPath = "supabase/migrations/20260824111500_social_reposts.sql";

test("current Social shell wires private save and bounded repost actions to RPCs", () => {
  const source = fs.readFileSync(coreShellPath, "utf8");

  assert.match(source, /vvip_social_bookmark_state/);
  assert.match(source, /vvip_social_save_post/);
  assert.match(source, /vvip_social_unsave_post/);
  assert.match(source, /vvip_social_repost_post/);
  assert.match(source, /data-social-save-trigger/);
  assert.match(source, /data-social-share-trigger/);
  assert.match(source, /data-social-post-audience/);
  assert.doesNotMatch(source, /\.from\s*\(\s*["']vvip_social_bookmarks["']\s*\)/);
  assert.doesNotMatch(source, /\.from\s*\(\s*["']vvip_social_reposts["']\s*\)/);
});

test("repost persistence preserves original identity, privacy ceiling, and one active repost per actor", () => {
  const sql = fs.readFileSync(repostMigrationPath, "utf8");

  assert.match(sql, /create table public\.vvip_social_reposts/i);
  assert.match(sql, /original_post_id uuid not null references public\.vvip_social_posts \(post_id\) on delete cascade/i);
  assert.match(sql, /repost_post_id uuid not null unique references public\.vvip_social_posts \(post_id\) on delete cascade/i);
  assert.match(sql, /unique \(original_post_id, actor_subject\)/i);
  assert.match(sql, /create function public\.vvip_social_repost_post\(p_original_post_id uuid, p_audience text\)/i);
  assert.match(sql, /SOCIAL_REPOST_AUDIENCE_WIDENING_FORBIDDEN/i);
  assert.match(sql, /public\.vvip_social_can_view_post\(p_original_post_id, v_actor\)/i);
  assert.match(sql, /grant execute on function public\.vvip_social_repost_post\(uuid, text\) to authenticated/i);
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
});

test("repost table is not browser-readable or directly mutable", () => {
  const sql = fs.readFileSync(repostMigrationPath, "utf8");

  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_reposts from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_reposts.*authenticated/i);
});
