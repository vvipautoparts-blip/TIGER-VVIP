"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260820213500_social_follows.sql";

function migration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("Social Follow is directional and independent from friendship authority", () => {
  const sql = migration();
  assert.match(sql, /create table public\.vvip_social_follows/i);
  assert.match(sql, /follower_subject\s+text\s+not null/i);
  assert.match(sql, /followee_subject\s+text\s+not null/i);
  assert.match(sql, /unique\s*\(follower_subject, followee_subject\)/i);
  assert.match(sql, /check\s*\(follower_subject\s*<>\s*followee_subject\)/i);
  assert.doesNotMatch(sql, /alter table public\.vvip_social_relationships/i);
  assert.doesNotMatch(sql, /relationship_state/i);
});

test("Social Follow exposes no browser table CRUD and only bounded current-actor RPCs", () => {
  const sql = migration();
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_follows from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_follows.*authenticated/i);
  assert.match(sql, /create function public\.vvip_social_follow_state\(p_followee_subject text\)/i);
  assert.match(sql, /create function public\.vvip_social_follow_user\(p_followee_subject text\)/i);
  assert.match(sql, /create function public\.vvip_social_unfollow_user\(p_followee_subject text\)/i);
  assert.match(sql, /security definer set search_path = pg_catalog/i);
  assert.match(sql, /grant execute on function public\.vvip_social_follow_state\(text\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_follow_user\(text\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_social_unfollow_user\(text\) to authenticated/i);
});

test("Follow mutations bind follower identity to Clerk actor and remain idempotent", () => {
  const sql = migration();
  assert.match(sql, /v_actor\s+text\s*:=\s*public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /p_followee_subject\s+not like\s+'user\\_%'\s+escape\s+'\\'/i);
  assert.match(sql, /v_actor\s*=\s*p_followee_subject/i);
  assert.match(sql, /insert into public\.vvip_social_follows\s*\(follower_subject, followee_subject\)/i);
  assert.match(sql, /values\s*\(v_actor, p_followee_subject\)/i);
  assert.match(sql, /on conflict\s*\(follower_subject, followee_subject\)\s*do nothing/i);
  assert.match(
    sql,
    /delete from public\.vvip_social_follows follow_row where follow_row\.follower_subject = v_actor and follow_row\.followee_subject = p_followee_subject;/i,
    "unfollow predicate must stay scanner-visible and actor-scoped"
  );
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
});

test("Follow state does not create a raw public follower directory", () => {
  const sql = migration();
  assert.doesNotMatch(sql, /grant\s+select\s+on\s+(table\s+)?public\.vvip_social_follows\s+to\s+(public|anon|authenticated)/i);
  assert.doesNotMatch(sql, /jsonb_agg\s*\(.*follower_subject/i);
  assert.doesNotMatch(sql, /array_agg\s*\(.*follower_subject/i);
});
