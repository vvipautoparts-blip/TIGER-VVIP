"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260824133000_social_follow_preferences_surface.sql";
const proofPath = "tests/sql/tiger-p0-follow-preferences-surface.sql";
const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";

test("P0 Follow preferences migration converges legacy subject RPCs to UUID-only durable authority", () => {
  assert.equal(fs.existsSync(migrationPath), true, "forward-only follow preferences migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table public\.vvip_social_feed_preferences/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_feed_preferences from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.vvip_social_get_relationship_controls\s*\(\s*p_profile_id\s+uuid/i);
  assert.match(sql, /create or replace function public\.vvip_social_follow_profile\s*\(\s*p_profile_id\s+uuid/i);
  assert.match(sql, /create or replace function public\.vvip_social_unfollow_profile\s*\(\s*p_profile_id\s+uuid/i);
  assert.match(sql, /create or replace function public\.vvip_social_list_feed_preferences\s*\(/i);
  assert.match(sql, /create or replace function public\.vvip_social_set_feed_preference\s*\(\s*p_profile_id\s+uuid\s*,\s*p_action\s+text/i);
  assert.match(sql, /revoke all on function public\.vvip_social_follow_state\(text\)\s+from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.vvip_social_follow_user\(text\)\s+from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.vvip_social_unfollow_user\(text\)\s+from public, anon, authenticated/i);
  assert.match(sql, /interval '24 hours'/i);
  assert.match(sql, /interval '7 days'/i);
  assert.match(sql, /p_action\s+not in\s*\([\s\S]{0,220}'normal'/i);
  assert.match(sql, /delete from public\.vvip_social_follows[^;]+follower_subject[^;]+followee_subject/i);
  assert.match(sql, /delete from public\.vvip_social_feed_preferences[^;]+actor_subject[^;]+target_subject/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)[^;]+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+follow_(?:state|user)\(text\)[^;]+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+to\s+anon/i);
});

test("P0 Follow preferences proof and workflow fail closed on behavior markers", () => {
  assert.equal(fs.existsSync(proofPath), true, "transaction-scoped follow preferences proof must exist");
  const proof = fs.readFileSync(proofPath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");

  for (const marker of [
    "P0_FOLLOW_RPC_BOUNDARY=PASS",
    "P0_FOLLOW_PROFILE_UUID=PASS",
    "P0_FOLLOW_PRIVATE_PREFERENCES=PASS",
    "P0_FOLLOW_PREFERENCE_ACTIONS=PASS",
    "P0_FOLLOW_BLOCK_CLEANUP=PASS",
    "P0_FOLLOW_LIFECYCLE_UNFOLLOW=PASS",
    "P0_FOLLOW_DENIALS=PASS",
    "TIGER_P0_FOLLOW_PREFERENCES_DB_BEHAVIOR=PASS",
  ]) assert.match(proof, new RegExp(marker));

  assert.match(proof, /rollback;/i);
  assert.doesNotMatch(proof, /\\quit\s+1/i);
  assert.match(proof, /select\s+1\s*\/\s*0\s*;/i);
  assert.match(workflow, /20260824133000_social_follow_preferences_surface\.sql/);
  assert.match(workflow, /follow_proof_log/);
  assert.match(workflow, /TIGER_P0_FOLLOW_PREFERENCES_DB_BEHAVIOR=PASS/);
  assert.match(workflow, /P0_FOLLOW_\.\*=FAIL/);
  assert.doesNotMatch(workflow, /supabase db push|--linked/);
});
