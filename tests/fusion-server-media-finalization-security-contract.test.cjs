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
  "20260816090000_sovereign_media_finalization.sql"
);

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("canonical media RLS uses the private country-activation authority", () => {
  const sql = loadMigration();
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\(listing\.active_market_country\)/i);
  assert.doesNotMatch(sql, /public\.vvip_marketplace_country_is_active\(/i);
});
