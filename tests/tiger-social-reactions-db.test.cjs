"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260818133000_social_reactions.sql";

function migration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("Social Reactions uses one actor reaction per post and canonical familiar reaction vocabulary", () => {
  const sql = migration();
  assert.match(sql, /create table public\.vvip_social_reactions/i);
  assert.match(sql, /unique\s*\(post_id, actor_subject\)/i);
  for (const reaction of ["like", "love", "support", "haha", "wow", "sad", "angry"]) {
    assert.match(sql, new RegExp(`'${reaction}'`));
  }
  assert.match(sql, /references public\.vvip_social_posts\s*\(post_id\)\s*on delete cascade/i);
});

test("Social Reactions keeps browser authority behind RLS and bounded RPCs", () => {
  const sql = migration();
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_reactions from public, anon, authenticated/i);
  assert.match(sql, /create function public\.vvip_social_reaction_summary/i);
  assert.match(sql, /create function public\.vvip_social_set_reaction/i);
  assert.match(sql, /create function public\.vvip_social_remove_reaction/i);
  assert.match(sql, /security definer set search_path = pg_catalog/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_reactions.*authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_reaction_summary\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_set_reaction\(uuid, text\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_remove_reaction\(uuid\) to authenticated/i);
});

test("reaction RPCs are bound to current Clerk actor and visible Social posts", () => {
  const sql = migration();
  assert.match(sql, /public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /audience = 'public'/i);
  assert.match(sql, /audience = 'friends'/i);
  assert.match(sql, /relationship_state = 'friends'/i);
  assert.match(sql, /actor_subject = v_actor/i);
  assert.match(sql, /on conflict \(post_id, actor_subject\)/i);
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
});
