"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260818143000_social_comments.sql";

function migration() {
  assert.equal(fs.existsSync(migrationPath), true, "Social Comments migration must exist");
  return fs.readFileSync(migrationPath, "utf8");
}

test("Social Comments stores bounded one-level replies with useful lookup indexes", () => {
  const sql = migration();

  assert.match(sql, /create table public\.vvip_social_comments/i);
  assert.match(sql, /body text not null check \(char_length\(btrim\(body\)\) between 1 and 2000\)/i);
  assert.match(sql, /parent_comment_id uuid references public\.vvip_social_comments\s*\(comment_id\)\s*on delete cascade/i);
  assert.match(sql, /vvip_social_comments_post_idx[\s\S]*\(post_id, created_at, comment_id\)/i);
  assert.match(sql, /vvip_social_comments_parent_idx[\s\S]*\(parent_comment_id, created_at, comment_id\)/i);
  assert.match(sql, /vvip_social_comments_author_idx[\s\S]*\(author_subject, updated_at desc\)/i);
});

test("Social Comments exposes exact authenticated RPCs and no direct browser table authority", () => {
  const sql = migration();

  assert.match(sql, /alter table public\.vvip_social_comments enable row level security/i);
  assert.match(sql, /alter table public\.vvip_social_comments force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_comments from public, anon, authenticated/i);

  for (const signature of [
    "vvip_social_comment_list\\(p_post_id uuid\\)",
    "vvip_social_comment_create\\(p_post_id uuid, p_body text, p_parent_comment_id uuid default null\\)",
    "vvip_social_comment_update\\(p_comment_id uuid, p_body text\\)",
    "vvip_social_comment_remove\\(p_comment_id uuid\\)",
  ]) {
    assert.match(sql, new RegExp(`create function public\\.${signature}`, "i"));
  }

  assert.match(sql, /grant execute on function public\.vvip_social_comment_list\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_comment_create\(uuid, text, uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_comment_update\(uuid, text\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_comment_remove\(uuid\) to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_comments.*authenticated/i);
});

test("Social Comments derives actor and visibility on the server and denies nested or cross-post replies", () => {
  const sql = migration();

  assert.match(sql, /v_actor text := public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /public\.vvip_social_can_view_post\(p_post_id, v_actor\)/i);
  assert.match(sql, /author_subject[\s\S]*v_actor/i);
  assert.match(sql, /parent\.parent_comment_id is not null/i);
  assert.match(sql, /parent\.post_id\s*(?:<>|!=)\s*p_post_id/i);
  assert.match(sql, /target\.author_subject\s*(?:<>|!=)\s*v_actor/i);
  assert.match(sql, /SOCIAL_COMMENT_REPLY_DEPTH_DENIED/);
  assert.match(sql, /SOCIAL_COMMENT_PARENT_POST_MISMATCH/);
  assert.match(sql, /SOCIAL_COMMENT_OWNER_REQUIRED/);
  assert.doesNotMatch(sql, /auth\.uid\s*\(/i);
});
