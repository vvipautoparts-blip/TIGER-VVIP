"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";
const proofPath = "tests/sql/tiger-p0-profile-surface.sql";
const migrationPath = "supabase/migrations/20260824123000_social_profile_surface.sql";

test("P0 Profile migration keeps the surface and keyset timeline actor-bound", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    "forward-only Profile surface migration must exist before its static boundary contract is read",
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_social_get_profile_surface\s*\(/i);
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_social_list_profile_posts\s*\(/i);
  assert.match(sql, /vvip_social_actor_active\s*\(\s*\)/i);
  assert.match(sql, /vvip_social_is_blocked_pair\s*\(/i);
  assert.match(sql, /vvip_social_can_view_post\s*\(/i);
  assert.match(sql, /'viewer_is_owner'/i);
  assert.match(sql, /'friends_count'/i);
  assert.match(sql, /'followers_count'/i);
  assert.match(sql, /'following_count'/i);
  assert.match(sql, /'posts_count'/i);
  assert.match(sql, /'can_message'/i);
  assert.match(sql, /'kind'\s*,\s*'social_profile_timeline'/i);
  assert.match(sql, /'actor_profile_id'/i);
  assert.match(sql, /'target_profile_id'/i);
  assert.match(sql, /GATE5_CURSOR_CONTEXT_MISMATCH/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_get_profile_surface\(uuid\)\s+to\s+authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_list_profile_posts\(uuid,\s*text,\s*integer\)\s+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+\bto\s+anon\b/i);
  assert.doesNotMatch(sql, /\boffset\b/i);
});

test("P0 Profile timeline rejects cursors with null actor or target bindings", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /v_cursor_actor_profile_id\s+is\s+null[\s\S]{0,240}v_cursor_target_profile_id\s+is\s+null/i,
    "nullable UUID comparisons must fail closed before actor and target context matching",
  );
});

test("P0 Profile Surface is wired into the exact-head local-only Social DB rehearsal", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /20260824123000_social_profile_surface\.sql/);
  assert.match(workflow, /tests\/tiger-p0-profile-surface-read-model\.test\.cjs/);
  assert.match(workflow, /tests\/tiger-p0-profile-surface\.test\.cjs/);
  assert.match(workflow, /tests\/tiger-p0-profile-surface-db\.test\.cjs/);
  assert.match(workflow, /tests\/sql\/tiger-p0-profile-surface\.sql/);
  assert.match(workflow, /Prove P0 Profile surface privacy and timeline behavior/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("P0 Profile SQL proof executes boundary, privacy, lifecycle, and keyset behavior", () => {
  const proof = fs.readFileSync(proofPath, "utf8");

  for (const marker of [
    "P0_PROFILE_RPC_BOUNDARY=PASS",
    "P0_PROFILE_SAFE_PUBLIC_SURFACE=PASS",
    "P0_PROFILE_OWNER_SURFACE=PASS",
    "P0_PROFILE_TIMELINE_VISIBILITY=PASS",
    "P0_PROFILE_CURSOR_BINDING=PASS",
    "P0_PROFILE_NULL_CURSOR_BINDING=PASS",
    "P0_PROFILE_BLOCK_PRIVACY=PASS",
    "P0_PROFILE_LIFECYCLE_PRIVACY=PASS",
    "TIGER_P0_PROFILE_SURFACE_DB_BEHAVIOR=PASS",
  ]) assert.match(proof, new RegExp(marker));

  assert.match(proof, /user_profilealice01/);
  assert.match(proof, /position\('user_profilebob001'/);
  assert.match(proof, /has_table_privilege\('authenticated', 'public\.vvip_social_profile_projection', 'SELECT'\)/);
  assert.match(proof, /has_table_privilege\('authenticated', 'public\.vvip_social_posts', 'SELECT'\)/);
  assert.match(proof, /author_subject/);
  assert.match(proof, /GATE5_CURSOR_CONTEXT_MISMATCH/);
  assert.match(proof, /bob_page_one_post_id/);
  assert.match(proof, /blocked_continued_timeline/);
  assert.match(proof, /inactive_continued_timeline/);
  assert.match(proof, /rollback;/i);
});
