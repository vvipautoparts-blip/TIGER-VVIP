"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const migrationName = "20260822101500_one_field_sector_registry_persistence.sql";
const migrationPath = path.join(migrationsDir, migrationName);

function read(name) {
  return fs.readFileSync(path.join(migrationsDir, name), "utf8");
}

test("legacy marketplace migrations expose the fixed three-sector persistence debt", () => {
  for (const name of [
    "20260806090000_v14_marketplace_foundation.sql",
    "20260808224500_global_launch_phase_b_marketplace_convergence.sql"
  ]) {
    const sql = read(name);
    assert.match(sql, /sector\s+in\s*\(\s*'automotive'\s*,\s*'materials'\s*,\s*'real-estate'\s*\)/i);
  }
});

test("forward-only persistence migration replaces the fixed sector allowlist with a governed additive registry", () => {
  assert.equal(fs.existsSync(migrationPath), true, `${migrationName} must exist`);
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.vvip_semantic_sector_registry/i);
  assert.match(sql, /legacy_sector_key\s+text\s+primary key/i);
  assert.match(sql, /semantic_view_id\s+text\s+not null\s+unique/i);
  assert.match(sql, /references public\.vvip_semantic_sector_registry\s*\(legacy_sector_key\)/i);
  assert.match(sql, /view_automotive/i);
  assert.match(sql, /view_materials/i);
  assert.match(sql, /view_real_estate/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges/i);
  assert.match(sql, /from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.vvip_marketplace_listings/i);
  assert.doesNotMatch(sql, /truncate\s+table\s+public\.vvip_marketplace_listings/i);
  assert.doesNotMatch(sql, /drop\s+table\s+public\.vvip_marketplace_listings/i);
});
