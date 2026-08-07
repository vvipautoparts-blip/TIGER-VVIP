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

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

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
  assert.match(sql, /grant execute on function vvip_private\.vvip_marketplace_country_is_active\(text\) to anon, authenticated/i);
  assert.match(sql, /revoke all on function vvip_private\.vvip_marketplace_actor_can_review\(text\) from public, anon, authenticated/i);
});

test("intentional public RPCs preserve explicit least-privilege grants", () => {
  const sql = loadMigration();
  assert.match(sql, /revoke all on function public\.vvip_resolve_own_profile\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_resolve_own_profile\(text\) to authenticated/i);
  assert.match(sql, /revoke all on function public\.vvip_marketplace_review_listing\(uuid, text, text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_marketplace_review_listing\(uuid, text, text\) to authenticated/i);
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
