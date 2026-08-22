"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260821160200_social_search_adaptive_30_shield.sql";
const migration = path.join(root, migrationRel);

test("Adaptive 30 Shield is a forward-only server-authoritative cooldown", () => {
  assert.equal(fs.existsSync(migration), true, `${migrationRel} must exist`);
  const sql = fs.readFileSync(migration, "utf8");

  assert.match(sql, /blocked_until/i);
  assert.match(sql, /interval\s+'30 seconds'/i);
  assert.match(sql, /SOCIAL_SEARCH_RATE_LIMITED/i);
  assert.match(sql, /v_existing_count\s*>=\s*30|request_count\s*>=\s*30/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /FOR\s+UPDATE/i);
  assert.match(sql, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.vvip_social_search_budget\s+FROM\s+anon\s*,\s*authenticated/i);
  assert.doesNotMatch(sql, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL).*vvip_social_search_budget.*(?:anon|authenticated)/i);
});

test("Adaptive 30 Shield keeps request 30 usable and starts the cooldown for request 31", () => {
  assert.equal(fs.existsSync(migration), true, `${migrationRel} must exist`);
  const sql = fs.readFileSync(migration, "utf8");

  assert.match(sql, /v_next_count\s*:=\s*v_existing_count\s*\+\s*1/i);
  assert.match(sql, /v_next_count\s*=\s*30/i);
  assert.match(sql, /blocked_until\s*=\s*v_now\s*\+\s*interval\s+'30 seconds'/i);
  assert.match(sql, /v_existing_blocked_until\s*>\s*v_now/i);
});
