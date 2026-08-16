"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260808003000_lc03_supabase_security_hardening.sql"
);
const retirementMigrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260816104500_retire_legacy_profile_rpc.sql"
);
const legacyRehearsalPath = path.join(
  __dirname,
  "sql",
  "lc03-legacy-drift-reconciliation.sql"
);
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

function loadRetirementMigration() {
  return fs.readFileSync(retirementMigrationPath, "utf8");
}

function loadLegacyRehearsal() {
  return fs.readFileSync(legacyRehearsalPath, "utf8");
}

test("all Supabase migration versions are globally unique before local stack startup", () => {
  const ownersByVersion = new Map();
  for (const filename of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    const match = filename.match(/^(\d+)_/);
    assert.ok(match, `migration filename must start with a numeric version: ${filename}`);
    const version = match[1];
    const owners = ownersByVersion.get(version) || [];
    owners.push(filename);
    ownersByVersion.set(version, owners);
  }

  const duplicates = [...ownersByVersion.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([version, owners]) => `${version}: ${owners.join(", ")}`);

  assert.deepEqual(
    duplicates,
    [],
    `Supabase migration versions must be unique; duplicate versions would corrupt schema_migrations: ${duplicates.join(" | ")}`
  );
});

test("LC-03 hardening migration exists and creates a non-public helper schema", () => {
  const sql = loadMigration();
  assert.match(sql, /create schema if not exists vvip_private/i);
  assert.match(sql, /revoke all on schema vvip_private from public, anon, authenticated/i);
  assert.match(sql, /grant usage on schema vvip_private to anon, authenticated/i);
});

test("marketplace SECURITY DEFINER helpers leave the exposed public RPC schema without object recreation", () => {
  const sql = loadMigration();
  assert.match(sql, /alter function public\.vvip_marketplace_country_is_active\(text\) set schema vvip_private/i);
  assert.match(sql, /alter function public\.vvip_marketplace_actor_can_review\(text\) set schema vvip_private/i);
  assert.doesNotMatch(sql, /grant execute on function public\.vvip_marketplace_(country_is_active|actor_can_review)/i);
  assert.doesNotMatch(sql, /drop function .*vvip_marketplace_(country_is_active|actor_can_review)/i);
});

test("PL/pgSQL callers are rewired to the moved private helpers", () => {
  const sql = loadMigration();
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\(NEW\.active_market_country\)/i);
  assert.match(sql, /vvip_private\.vvip_marketplace_actor_can_review\(current_listing\.active_market_country\)/i);
});

test("private country helper remains policy-callable while review helper is not browser-executable", () => {
  const sql = loadMigration();
  assert.match(sql, /grant execute on function vvip_private\.vvip_marketplace_country_is_active\(text\)\s+to anon, authenticated/i);
  assert.match(sql, /revoke all on function vvip_private\.vvip_marketplace_actor_can_review\(text\)\s+from public, anon, authenticated/i);
});

test("current public review RPC stays least-privileged while the historical profile resolver is retired", () => {
  const lc03 = loadMigration();
  const retirement = loadRetirementMigration();

  // LC-03 is immutable historical hardening evidence: at that point the resolver still existed.
  assert.match(lc03, /revoke all on function public\.vvip_resolve_own_profile\(text\)\s+from public, anon, authenticated/i);
  assert.match(lc03, /grant execute on function public\.vvip_resolve_own_profile\(text\)\s+to authenticated/i);

  // Current sovereign authority is the later retirement migration: no browser/server RPC survives.
  assert.match(retirement, /revoke all on function public\.vvip_resolve_own_profile\(text\)\s+from public, anon, authenticated/i);
  assert.match(retirement, /drop function if exists public\.vvip_resolve_own_profile\(text\)/i);
  assert.doesNotMatch(retirement, /grant execute on function public\.vvip_resolve_own_profile/i);

  assert.match(lc03, /revoke all on function public\.vvip_marketplace_review_listing\(uuid, text, text\)\s+from public, anon, authenticated/i);
  assert.match(lc03, /grant execute on function public\.vvip_marketplace_review_listing\(uuid, text, text\)\s+to authenticated/i);
});

test("LC-03 local drift rehearsal converges through the current resolver retirement without mutating migration history", () => {
  const sql = loadLegacyRehearsal();
  const createResolver = sql.search(/create or replace function public\.vvip_resolve_own_profile\s*\([^)]*text[^)]*\)/i);
  const applyLc03 = sql.indexOf("\\i supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql");
  const applyRetirement = sql.indexOf("\\i supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql");

  assert.notEqual(createResolver, -1, "rehearsal must locally recreate the retired resolver as legacy drift");
  assert.notEqual(applyLc03, -1, "rehearsal must reapply immutable LC-03 hardening");
  assert.notEqual(applyRetirement, -1, "rehearsal must reapply the current retirement migration");
  assert.ok(createResolver < applyLc03, "legacy resolver fixture must exist before LC-03 is replayed");
  assert.ok(applyLc03 < applyRetirement, "current retirement must run after historical LC-03 hardening");
  assert.match(
    sql,
    /to_regprocedure\('public\.vvip_resolve_own_profile\(text\)'\)\s+is\s+not\s+null[\s\S]*raise exception 'LC03_RETIRED_PROFILE_RPC_STILL_PRESENT'/i
  );
});

test("legacy profile enumeration and trigger helpers fail closed when present", () => {
  const sql = loadMigration();
  for (const signature of [
    "public.lookup_profile_by_email(text)",
    "public.lookup_profile_by_phone(text)",
    "public.handle_new_user()",
    "public.set_profiles_updated_at()",
    "public.rls_auto_enable()",
    "public.set_vvip_tiger_updated_at()",
    "public.parts_sync_vehicle_reference_ids()",
    "public.set_updated_at()"
  ]) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sql, new RegExp(`to_regprocedure\\('${escaped}'\\)`, "i"));
  }
  assert.match(sql, /revoke all on function public\.lookup_profile_by_email\(text\) from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.lookup_profile_by_phone\(text\) from public, anon, authenticated/i);
});

test("trigger helpers get fixed search paths and cannot be invoked as public RPCs", () => {
  const sql = loadMigration();
  for (const fn of [
    "set_vvip_tiger_updated_at",
    "handle_new_user",
    "set_profiles_updated_at",
    "parts_sync_vehicle_reference_ids",
    "set_updated_at"
  ]) {
    assert.match(sql, new RegExp(`alter function public\\.${fn}\\(\\) set search_path = pg_catalog`, "i"));
  }
});
