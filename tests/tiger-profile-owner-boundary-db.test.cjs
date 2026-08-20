"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260820223000_profile_owner_boundary.sql",
);

function readMigration() {
  assert.equal(fs.existsSync(migrationPath), true, "profile owner boundary migration must exist");
  return fs.readFileSync(migrationPath, "utf8").toLowerCase();
}

test("owner profile RPCs derive identity from the canonical Clerk-backed actor boundary", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.vvip_get_my_social_profile\s*\(\s*\)/,
  );
  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.vvip_upsert_my_social_profile\s*\(/,
  );
  assert.match(sql, /public\.vvip_marketplace_actor_id\(\)/);
  assert.doesNotMatch(sql, /p_subject\s+/);
  assert.doesNotMatch(sql, /p_clerk_user_id\s+/);
  assert.doesNotMatch(sql, /\bfrom\s+public\.profiles\b/);
  assert.doesNotMatch(sql, /\bjoin\s+public\.profiles\b/);
});

test("browser cannot mutate lifecycle state or gain direct projection table CRUD", () => {
  const sql = readMigration();

  const upsertStart = sql.indexOf("create or replace function public.vvip_upsert_my_social_profile");
  const upsertSignature = sql.slice(
    upsertStart,
    sql.indexOf("returns jsonb", upsertStart),
  );

  assert.doesNotMatch(upsertSignature, /profile_state/);
  assert.match(sql, /select\s+p\.profile_state\s*,\s*p\.profile_id\s+into\s+v_state\s*,\s*v_profile_id/);
  assert.match(sql, /if\s+found\s+and\s+v_state\s*<>\s*'active'\s+then/);
  assert.match(sql, /where\s+subject\s*=\s*v_actor\s+and\s+profile_state\s*=\s*'active'/);
  assert.match(sql, /social_profile_mutation_disabled/);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_profile_projection\s+from\s+authenticated/);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all).*table\s+public\.vvip_social_profile_projection\s+to\s+authenticated/);
});

test("owner RPC outputs never return the canonical Clerk subject", () => {
  const sql = readMigration();

  assert.match(sql, /'profile_id'/);
  assert.match(sql, /'display_name'/);
  assert.match(sql, /'profile_state'/);
  assert.doesNotMatch(sql, /'subject'\s*,/);
  assert.doesNotMatch(sql, /'clerk_user_id'\s*,/);
});

test("owner RPC execution is authenticated-only and security definers use scanner-visible pg_catalog search paths", () => {
  const sql = readMigration();
  const definerLines = sql
    .split("\n")
    .filter((line) => line.includes("security definer"));

  assert.equal(definerLines.length, 2);
  for (const line of definerLines) {
    assert.match(line, /security\s+definer.*search_path\s*=\s*pg_catalog/);
  }

  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_get_my_social_profile\(\)\s+to\s+authenticated/,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_upsert_my_social_profile\(text,text,text,text,text,text\)\s+to\s+authenticated/,
  );
  assert.doesNotMatch(sql, /grant\s+execute.*to\s+anon/);
});
