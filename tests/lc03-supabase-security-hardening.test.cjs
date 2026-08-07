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
  assert.match(sql, /revoke all on schema vvip_private from public/i);
});

test("marketplace security-definer helpers move out of the exposed public RPC schema", () => {
  const sql = loadMigration();
  assert.match(sql, /create or replace function vvip_private\.vvip_marketplace_country_is_active\(target_country text\)/i);
  assert.match(sql, /create or replace function vvip_private\.vvip_marketplace_actor_can_review\(target_country text\)/i);
  assert.match(sql, /drop function if exists public\.vvip_marketplace_country_is_active\(text\)/i);
  assert.match(sql, /drop function if exists public\.vvip_marketplace_actor_can_review\(text\)/i);
  assert.doesNotMatch(sql, /grant execute on function public\.vvip_marketplace_(country_is_active|actor_can_review)/i);
});

test("RLS and trusted review are rewired to private helpers before public helpers are removed", () => {
  const sql = loadMigration();
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\(active_market_country\)/i);
  assert.match(sql, /vvip_private\.vvip_marketplace_actor_can_review\(current_listing\.active_market_country\)/i);
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\(listing\.active_market_country\)/i);
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
    "public.set_vvip_tiger_updated_at()"
  ]) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sql, new RegExp(`to_regprocedure\\('${escaped}'\\)`, "i"));
  }
  assert.match(sql, /revoke all on function public\.lookup_profile_by_email\(text\) from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.lookup_profile_by_phone\(text\) from public, anon, authenticated/i);
});

test("trigger helpers get fixed search paths and cannot be invoked as public RPCs", () => {
  const sql = loadMigration();
  assert.match(sql, /alter function public\.set_vvip_tiger_updated_at\(\) set search_path = pg_catalog/i);
  assert.match(sql, /alter function public\.handle_new_user\(\) set search_path = pg_catalog/i);
  assert.match(sql, /alter function public\.set_profiles_updated_at\(\) set search_path = pg_catalog/i);
});
