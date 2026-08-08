"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HISTORICAL_PATH = path.join(
  ROOT,
  "supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql"
);
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql"
);

function migrationText() {
  assert.equal(
    fs.existsSync(MIGRATION_PATH),
    true,
    "IDENTITY-01 forward migration must exist"
  );
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

test("historical profile resolver migration remains preserved", () => {
  const historical = fs.readFileSync(HISTORICAL_PATH, "utf8");
  assert.match(historical, /status', 'legacy_profile_recovered'/);
  assert.match(
    historical,
    /update\s+public\.profiles[\s\S]*?set[\s\S]*?clerk_user_id\s*=\s*v_clerk_user_id/i
  );
});

test("IDENTITY-01 adds a forward replacement resolver migration", () => {
  const sql = migrationText();
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.vvip_resolve_own_profile\s*\(p_email\s+text\s+default\s+null\)/i
  );
  assert.match(sql, /language\s+plpgsql/i);
  assert.match(sql, /security\s+definer/i);
  assert.match(sql, /set\s+search_path\s*=\s*public/i);
});

test("replacement resolver is subject-first and never restores ownership by email", () => {
  const sql = migrationText();
  const subjectLookup = sql.search(/where\s+clerk_user_id\s*=\s*v_clerk_user_id/i);
  const legacyCheck = sql.search(/identity_migration_required/i);

  assert.notEqual(subjectLookup, -1, "exact external subject lookup must exist");
  assert.notEqual(legacyCheck, -1, "legacy migration-required state must exist");
  assert.ok(subjectLookup < legacyCheck, "subject lookup must occur before legacy email handling");

  assert.doesNotMatch(sql, /legacy_profile_recovered/i);
  assert.doesNotMatch(sql, /update\s+public\.profiles/i);
  assert.doesNotMatch(
    sql,
    /set[\s\S]{0,300}clerk_user_id\s*=\s*v_clerk_user_id[\s\S]{0,500}where[\s\S]{0,300}email/i
  );
});

test("legacy email match is existence-only and fails closed without profile disclosure", () => {
  const sql = migrationText();
  assert.match(sql, /select\s+exists\s*\(/i);
  assert.match(sql, /lower\s*\(email\)\s*=\s*v_email/i);
  assert.match(
    sql,
    /nullif\s*\(trim\s*\(coalesce\s*\(clerk_user_id,\s*''\)\s*\),\s*''\)\s+is\s+null/i
  );
  assert.match(sql, /'ok',\s*false[\s\S]*?'status',\s*'identity_migration_required'/i);
});

test("new profile creation is explicitly bound to the authenticated subject", () => {
  const sql = migrationText();
  assert.match(
    sql,
    /insert\s+into\s+public\.profiles\s*\([\s\S]*?email\s*,[\s\S]*?clerk_user_id[\s\S]*?\)\s*values\s*\([\s\S]*?v_email\s*,[\s\S]*?v_clerk_user_id/i
  );
  assert.match(sql, /'status',\s*'profile_created'/i);
});

test("uniqueness recovery remains subject-only and fail closed", () => {
  const sql = migrationText();
  const conflict = sql.match(/exception[\s\S]*?when\s+unique_violation[\s\S]*?end;/i);
  assert.ok(conflict, "unique_violation handler must exist");
  assert.match(conflict[0], /where\s+clerk_user_id\s*=\s*v_clerk_user_id/i);
  assert.doesNotMatch(conflict[0], /where[\s\S]{0,200}email/i);
  assert.match(conflict[0], /'status',\s*'profile_conflict'/i);
});

test("IDENTITY-01 changes function behavior only, not schema or RLS", () => {
  const sql = migrationText();
  assert.doesNotMatch(sql, /\balter\s+table\b/i);
  assert.doesNotMatch(sql, /\bcreate\s+policy\b/i);
  assert.doesNotMatch(sql, /\bdrop\s+policy\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.profiles\b/i);

  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.vvip_resolve_own_profile\s*\(text\)\s+from\s+public/i
  );
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.vvip_resolve_own_profile\s*\(text\)\s+from\s+anon/i
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_resolve_own_profile\s*\(text\)\s+to\s+authenticated/i
  );
});
