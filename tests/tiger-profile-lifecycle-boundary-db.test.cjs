"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260820231500_profile_lifecycle_boundary.sql",
);

function readMigration() {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    "profile lifecycle boundary migration must exist",
  );
  return fs.readFileSync(migrationPath, "utf8").toLowerCase();
}

test("self lifecycle RPCs derive identity from the canonical Clerk-backed actor boundary", () => {
  const sql = readMigration();

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_deactivate_my_social_profile\s*\(\s*\)/);
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_reactivate_my_social_profile\s*\(\s*\)/);
  assert.match(sql, /public\.vvip_marketplace_actor_id\(\)/);

  const deactivateStart = sql.indexOf("create or replace function public.vvip_deactivate_my_social_profile");
  const reactivateStart = sql.indexOf("create or replace function public.vvip_reactivate_my_social_profile");
  const trustedDeleteStart = sql.indexOf("create or replace function public.vvip_mark_social_profile_deleted");

  assert.ok(deactivateStart >= 0);
  assert.ok(reactivateStart >= 0);
  assert.ok(trustedDeleteStart >= 0);

  const deactivateSignature = sql.slice(deactivateStart, sql.indexOf("returns jsonb", deactivateStart));
  const reactivateSignature = sql.slice(reactivateStart, sql.indexOf("returns jsonb", reactivateStart));

  assert.doesNotMatch(deactivateSignature, /p_subject|p_profile_state|p_state/);
  assert.doesNotMatch(reactivateSignature, /p_subject|p_profile_state|p_state/);
});

test("deactivation preserves data for deterministic reactivation and deleted state is terminal", () => {
  const sql = readMigration();

  assert.match(sql, /profile_state\s*=\s*'deactivated'/);
  assert.match(sql, /profile_state\s*=\s*'active'/);
  assert.match(sql, /social_profile_deleted_terminal/);
  assert.match(sql, /pg_advisory_xact_lock\s*\(\s*hashtextextended\s*\(\s*v_actor\s*,\s*0\s*\)\s*\)/);

  assert.doesNotMatch(
    sql,
    /vvip_deactivate_my_social_profile[\s\S]*?set\s+display_name\s*=\s*null/,
  );
});

test("only the trusted lifecycle boundary can mark a Clerk subject deleted", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.vvip_mark_social_profile_deleted\s*\(\s*p_subject\s+text\s*\)/,
  );
  assert.match(sql, /p_subject\s*!~\s*'\^user_/);
  assert.match(sql, /profile_state\s*=\s*'deleted'/);
  assert.match(sql, /display_name\s*=\s*'deleted member'/);
  assert.match(sql, /avatar_url\s*=\s*null/);
  assert.match(sql, /business_name\s*=\s*null/);
  assert.match(sql, /location\s*=\s*null/);
  assert.match(sql, /specialization\s*=\s*null/);
  assert.match(sql, /business_description\s*=\s*null/);

  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_mark_social_profile_deleted\(text\)\s+to\s+service_role/,
  );
  assert.doesNotMatch(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_mark_social_profile_deleted\(text\)\s+to\s+authenticated/,
  );
  assert.doesNotMatch(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_mark_social_profile_deleted\(text\)\s+to\s+anon/,
  );
});

test("browser lifecycle execution is authenticated-only and direct projection CRUD remains unavailable", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_deactivate_my_social_profile\(\)\s+to\s+authenticated/,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_reactivate_my_social_profile\(\)\s+to\s+authenticated/,
  );
  assert.doesNotMatch(sql, /grant\s+execute.*vvip_(?:deactivate|reactivate)_my_social_profile.*to\s+anon/);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_profile_projection\s+from\s+authenticated/);
  assert.doesNotMatch(
    sql,
    /grant\s+(?:select|insert|update|delete|all).*table\s+public\.vvip_social_profile_projection\s+to\s+authenticated/,
  );
});

test("all lifecycle security definers pin pg_catalog search_path", () => {
  const sql = readMigration();
  const definerLines = sql.split("\n").filter((line) => line.includes("security definer"));

  assert.equal(definerLines.length, 3);
  for (const line of definerLines) {
    assert.match(line, /security\s+definer.*search_path\s*=\s*pg_catalog/);
  }
});
