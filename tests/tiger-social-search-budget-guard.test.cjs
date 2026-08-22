"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const guardPath = path.join(__dirname, "../supabase/migrations/20260821160100_social_search_budget_guard.sql");

test("P0-C budget guard rejects request 31 before the table CHECK can fire", () => {
  assert.equal(fs.existsSync(guardPath), true, "forward-only budget guard migration must exist");
  const sql = fs.readFileSync(guardPath, "utf8");

  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.vvip_social_search_consume_budget/i);
  assert.match(sql, /FOR\s+UPDATE/i);
  assert.match(sql, /v_existing_count\s*>=\s*30/i);
  assert.match(sql, /SOCIAL_SEARCH_RATE_LIMITED/i);
  assert.match(sql, /SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|SCHEMA|DATABASE)/i);
  assert.doesNotMatch(sql, /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
});
