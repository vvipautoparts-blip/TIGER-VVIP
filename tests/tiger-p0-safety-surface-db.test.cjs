"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260824130000_social_safety_surface.sql";
const proofPath = "tests/sql/tiger-p0-safety-surface.sql";
const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";

test("P0 Safety migration is RPC-only, subject-blind, bounded, and lifecycle-safe", () => {
  assert.equal(fs.existsSync(migrationPath), true, "forward-only safety migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table public\.vvip_social_reports/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_reports from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.vvip_social_block_state\s*\(/i);
  assert.match(sql, /create or replace function public\.vvip_social_list_my_blocks\s*\(/i);
  assert.match(sql, /create or replace function public\.vvip_social_unblock_profile\s*\(/i);
  assert.match(sql, /create or replace function public\.vvip_social_submit_report\s*\(/i);
  assert.match(sql, /p_target_kind\s+text/i);
  assert.match(sql, /p_target_id\s+uuid/i);
  assert.match(sql, /char_length\(v_details\)\s*>\s*1000/i);
  assert.match(sql, /interval '1 hour'/i);
  assert.match(sql, /vvip_social_can_view_post\s*\(/i);
  assert.match(sql, /profile\.profile_id\s*=\s*p_peer_profile_id[\s\S]{0,160}block_row\.blocker_subject\s*=\s*v_actor/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)[^;]+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+to\s+anon/i);
});

test("P0 Safety proof and workflow fail closed on behavior markers", () => {
  assert.equal(fs.existsSync(proofPath), true, "transaction-scoped safety proof must exist");
  const proof = fs.readFileSync(proofPath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");

  for (const marker of [
    "P0_SAFETY_RPC_BOUNDARY=PASS",
    "P0_SAFETY_BLOCK_STATE=PASS",
    "P0_SAFETY_INACTIVE_UNBLOCK=PASS",
    "P0_SAFETY_PROFILE_REPORT=PASS",
    "P0_SAFETY_POST_REPORT=PASS",
    "P0_SAFETY_REPORT_DEDUPE=PASS",
    "P0_SAFETY_REPORT_DENIALS=PASS",
    "TIGER_P0_SAFETY_SURFACE_DB_BEHAVIOR=PASS",
  ]) assert.match(proof, new RegExp(marker));

  assert.match(proof, /rollback;/i);
  assert.doesNotMatch(proof, /\\quit\s+1/i);
  assert.match(proof, /select\s+1\s*\/\s*0\s*;/i);
  assert.match(workflow, /20260824130000_social_safety_surface\.sql/);
  assert.match(workflow, /safety_proof_log/);
  assert.match(workflow, /TIGER_P0_SAFETY_SURFACE_DB_BEHAVIOR=PASS/);
  assert.match(workflow, /P0_SAFETY_\.\*=FAIL/);
  assert.doesNotMatch(workflow, /supabase db push|--linked/);
});
