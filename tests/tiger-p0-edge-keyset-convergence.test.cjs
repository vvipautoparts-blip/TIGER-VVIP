"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260821133000_social_edge_keyset_convergence.sql";

test("P0-D feed keyset cursor is profile-bound and subject-blind", () => {
  assert.equal(fs.existsSync(migrationPath), true, "forward migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.vvip_gate5_cursor_encode\s*\(p_payload\s+jsonb\)/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.vvip_gate5_cursor_decode\s*\(p_cursor\s+text\)/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.vvip_social_feed_read_keyset\s*\(/i);
  assert.match(sql, /'actor_profile_id'/);
  assert.match(sql, /'v'\s*,\s*2/);
  assert.match(sql, /'kind'\s*,\s*'social_feed'/);
  assert.match(sql, /vvip_social_actor_active\s*\(\)/i);
  assert.match(sql, /vvip_social_can_view_post\s*\(/i);
  assert.match(sql, /author_profile_id/i);
  assert.match(sql, /author_display_name/i);
  assert.match(sql, /author_avatar_url/i);
  assert.match(sql, /author_available/i);
  assert.match(sql, /GATE5_CURSOR_CONTEXT_MISMATCH/);
  assert.match(sql, /LIMIT\s+\(v_limit\s*\+\s*1\)/i);
  assert.match(sql, /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.vvip_gate5_cursor_encode\(jsonb\)\s+FROM\s+PUBLIC/i);
  assert.match(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.vvip_social_feed_read_keyset\(text,\s*integer\)\s+TO\s+authenticated/i);

  assert.doesNotMatch(sql, /'actor'\s*,\s*v_actor/i);
  assert.doesNotMatch(sql, /jsonb_build_object\([^)]*author_subject/is);
  assert.doesNotMatch(sql, /vvip_social_mutes/i);
  assert.doesNotMatch(sql, /OFFSET\s+/i);
});

test("P0-D convergence never imports the stale Gate5 migration filenames", () => {
  assert.equal(fs.existsSync("supabase/migrations/20260820007000_gate5_feed_keyset.sql"), false);
  assert.equal(fs.existsSync("supabase/migrations/20260820007100_gate5_social_keyset.sql"), false);
});

test("LC03 security rehearsal is triggered by the P0-D migration", () => {
  const workflow = fs.readFileSync(".github/workflows/lc03-supabase-security-rehearsal.yml", "utf8");
  assert.match(
    workflow,
    /supabase\/migrations\/20260821133000_social_edge_keyset_convergence\.sql/,
    "P0-D migration must trigger LC03 on the exact PR head",
  );
});
