"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20260806100000_v14_marketplace_hardening.sql"),
  "utf8"
);

test("listing audit trigger appends through a security-definer function", () => {
  assert.match(sql, /create or replace function public\.vvip_marketplace_record_listing_audit\(\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /insert into public\.vvip_marketplace_listing_audit/i);
  assert.match(sql, /revoke all on function public\.vvip_marketplace_record_listing_audit\(\) from public, anon, authenticated/i);
});
