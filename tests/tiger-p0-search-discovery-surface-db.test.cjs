"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260824140000_social_search_discovery_surface.sql";
const proofPath = "tests/sql/tiger-p0-search-discovery-surface.sql";
const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";

test("P0 Search migration is bounded, subject-blind, and visibility-authorized", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /create or replace function public\.vvip_social_search_discovery\s*\(\s*p_query\s+text\s*,\s*p_limit\s+integer/i);
  assert.match(sql, /create or replace function public\.vvip_social_discover_profiles\s*\(\s*p_limit\s+integer/i);
  assert.match(sql, /char_length\(v_query\)\s*<\s*2/i);
  assert.match(sql, /char_length\(v_query\)\s*>\s*100/i);
  assert.match(sql, /p_limit\s*>\s*25/i);
  assert.match(sql, /vvip_social_can_view_post\s*\(/i);
  assert.match(sql, /vvip_social_is_blocked_pair\s*\(/i);
  assert.match(sql, /profile\.profile_state\s*=\s*'active'/i);
  assert.doesNotMatch(sql, /'subject'\s*,/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)[^;]+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+to\s+anon/i);
});

test("P0 Search proof and workflow fail closed on behavior markers", () => {
  assert.equal(fs.existsSync(proofPath), true);
  const proof = fs.readFileSync(proofPath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const marker of [
    "P0_SEARCH_RPC_BOUNDARY=PASS",
    "P0_SEARCH_PEOPLE=PASS",
    "P0_SEARCH_POST_VISIBILITY=PASS",
    "P0_SEARCH_DISCOVERY=PASS",
    "P0_SEARCH_BLOCK_PRIVACY=PASS",
    "P0_SEARCH_LIFECYCLE_PRIVACY=PASS",
    "P0_SEARCH_DENIALS=PASS",
    "TIGER_P0_SEARCH_DISCOVERY_DB_BEHAVIOR=PASS",
  ]) assert.match(proof, new RegExp(marker));
  assert.match(proof, /rollback;/i);
  assert.doesNotMatch(proof, /\\quit\s+1/i);
  assert.match(proof, /select\s+1\s*\/\s*0\s*;/i);
  assert.match(workflow, /20260824140000_social_search_discovery_surface\.sql/);
  assert.match(workflow, /search_proof_log/);
  assert.match(workflow, /TIGER_P0_SEARCH_DISCOVERY_DB_BEHAVIOR=PASS/);
  assert.match(workflow, /P0_SEARCH_\.\*=FAIL/);
});
