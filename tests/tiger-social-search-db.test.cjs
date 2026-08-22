"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationPath = path.join(root, "supabase/migrations/20260821160000_social_search_convergence.sql");
const workflowPath = path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml");

test("P0-C migration exists before search can be implemented", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    "P0-C requires a forward-only Social Search migration"
  );
});

test("P0-C database authority is RPC-only, block-aware, lifecycle-aware and actor/query cursor bound", () => {
  assert.equal(fs.existsSync(migrationPath), true, "P0-C migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.vvip_social_search_budget/i);
  assert.match(sql, /ALTER\s+TABLE\s+public\.vvip_social_search_budget\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
  assert.match(sql, /vvip_social_search_people\s*\(/i);
  assert.match(sql, /vvip_social_search_posts\s*\(/i);
  assert.match(sql, /vvip_social_is_blocked_pair/i);
  assert.match(sql, /vvip_social_can_view_post/i);
  assert.match(sql, /profile_state\s*=\s*'active'/i);
  assert.match(sql, /query_digest/i);
  assert.match(sql, /actor_profile_id/i);
  assert.match(sql, /SOCIAL_SEARCH_RATE_LIMITED/i);
  assert.match(sql, /vvip_gate5_cursor_encode/i);
  assert.match(sql, /vvip_gate5_cursor_decode/i);
  assert.match(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.vvip_social_search_people/i);
  assert.match(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.vvip_social_search_posts/i);

  assert.doesNotMatch(sql, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*vvip_social_search_budget[^;]*authenticated/is);
  assert.doesNotMatch(sql, /jsonb_build_object\([^;]*'subject'/is);
});

test("P0-C migration pins SECURITY DEFINER search paths and keeps cursor helpers browser-private", () => {
  assert.equal(fs.existsSync(migrationPath), true, "P0-C migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  const securityDefinerCount = (sql.match(/SECURITY\s+DEFINER/gi) || []).length;
  const pinnedPathCount = (sql.match(/SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*pg_catalog,\s*public/gi) || []).length;
  assert.ok(securityDefinerCount >= 3, "budget helper plus People/Post RPCs must be trusted functions");
  assert.equal(pinnedPathCount, securityDefinerCount, "every SECURITY DEFINER function must pin search_path");
});

test("Social DB rehearsal is required to execute the P0-C structural and behavioral proof", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /20260821160000_social_search_convergence\.sql/);
  assert.match(workflow, /20260821160100_social_search_budget_guard\.sql/);
  assert.match(workflow, /20260821160200_social_search_adaptive_30_shield\.sql/);
  assert.match(workflow, /tests\/tiger-social-search-db\.test\.cjs/);
  assert.match(workflow, /tests\/sql\/tiger-social-search-convergence\.sql/);
  assert.match(workflow, /node --test tests\/tiger-social-search-runtime\.test\.cjs/);
  assert.match(workflow, /Prove P0-C Social Search privacy, cursor, and budget behavior/);
});