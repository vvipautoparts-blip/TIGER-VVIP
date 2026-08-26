"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260824143000_social_account_lifecycle_surface.sql";
const proofPath = "tests/sql/tiger-p0-account-lifecycle-surface.sql";
const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";

test("P0 Account lifecycle migration is self-bound and subject-blind", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /create or replace function public\.vvip_social_get_my_lifecycle_state\s*\(\s*\)/i);
  assert.match(sql, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(sql, /profile\.subject\s*=\s*v_actor/i);
  assert.match(sql, /profile_state/i);
  assert.doesNotMatch(sql, /'subject'\s*,/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)[^;]+to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+to\s+anon/i);
});

test("P0 Account lifecycle proof and workflow fail closed on behavior markers", () => {
  assert.equal(fs.existsSync(proofPath), true);
  const proof = fs.readFileSync(proofPath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const marker of [
    "P0_ACCOUNT_LIFECYCLE_RPC_BOUNDARY=PASS",
    "P0_ACCOUNT_LIFECYCLE_ACTIVE=PASS",
    "P0_ACCOUNT_LIFECYCLE_DEACTIVATED=PASS",
    "P0_ACCOUNT_LIFECYCLE_REACTIVATED=PASS",
    "P0_ACCOUNT_LIFECYCLE_DELETED=PASS",
    "P0_ACCOUNT_LIFECYCLE_DENIALS=PASS",
    "TIGER_P0_ACCOUNT_LIFECYCLE_DB_BEHAVIOR=PASS",
  ]) assert.match(proof, new RegExp(marker));
  assert.match(proof, /rollback;/i);
  assert.doesNotMatch(proof, /\\quit\s+1/i);
  assert.match(proof, /select\s+1\s*\/\s*0\s*;/i);
  assert.match(workflow, /20260824143000_social_account_lifecycle_surface\.sql/);
  assert.match(workflow, /account_lifecycle_proof_log/);
  assert.match(workflow, /P0_ACCOUNT_LIFECYCLE_\.\*=FAIL/);
});
