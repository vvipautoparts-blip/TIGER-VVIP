"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20260806090000_v14_marketplace_foundation.sql"),
  "utf8"
);

test("uses Clerk subject text and never legacy auth.users UUID ownership", () => {
  assert.match(sql, /auth\.jwt\(\)\s*->>\s*'sub'/);
  assert.match(sql, /owner_subject text not null/);
  assert.doesNotMatch(sql, /references\s+auth\.users/i);
});

test("enforces seven images and image-only storage", () => {
  assert.match(sql, /position between 0 and 6/);
  assert.match(sql, /image\/jpeg/);
  assert.match(sql, /image\/png/);
  assert.match(sql, /image\/webp/);
  assert.doesNotMatch(sql, /video\//i);
});

test("fails closed for inactive countries and trusted review", () => {
  assert.match(sql, /activation_state = 'ACTIVE'/);
  assert.match(sql, /seal_status = 'VALID'/);
  assert.match(sql, /MARKETPLACE_COUNTRY_NOT_ACTIVE/);
  assert.match(sql, /MARKETPLACE_TRUSTED_REVIEW_REQUIRED/);
  assert.match(sql, /MARKETPLACE_REVIEW_AUTHORITY_REQUIRED/);
});

test("enables and forces RLS for every marketplace table", () => {
  for (const table of [
    "vvip_marketplace_listings",
    "vvip_marketplace_listing_media",
    "vvip_marketplace_favorites",
    "vvip_marketplace_listing_audit"
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }
});

test("contains no globally open OTP-style policy or seeded authority", () => {
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)\s*with check\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_authority_principals/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_country_authority_seals/i);
});
