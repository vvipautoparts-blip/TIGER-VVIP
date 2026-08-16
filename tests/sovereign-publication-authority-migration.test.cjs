"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql";
const repositoryPath = "scripts/runtime/vvip-marketplace-repository.js";
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const repository = fs.readFileSync(repositoryPath, "utf8");

test("sovereign convergence migration exists and is forward-only", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.match(sql, /^-- VVIP TIGER[\s\S]*\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;\s*$/i);
  assert.doesNotMatch(sql, /\btruncate\b|\bdrop\s+table\b/i);
});

test("canonical publication RPC is one security-definer transaction with safe search path and row locks", () => {
  assert.match(sql, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_marketplace_request_publication\s*\(\s*target_listing\s+uuid\s*,\s*target_plan_id\s+text\s*,\s*entitlement_receipt\s+text\s*\)/is);
  assert.match(sql, /language\s+plpgsql[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*extensions/is);
  assert.match(sql, /from\s+public\.vvip_marketplace_listings[\s\S]*for\s+update/is);
  assert.match(sql, /from\s+public\.vvip_listing_activation_entitlements[\s\S]*for\s+update/is);
  assert.match(sql, /from\s+public\.vvip_visibility_plans[\s\S]*for\s+share/is);
});

test("publication RPC requires owner, active market, dynamic sector, active plan and canonical media", () => {
  for (const token of [
    "MARKETPLACE_AUTH_REQUIRED",
    "MARKETPLACE_OWNER_REQUIRED",
    "MARKETPLACE_PUBLICATION_STATE_INVALID",
    "MARKETPLACE_COUNTRY_NOT_ACTIVE",
    "MARKETPLACE_SECTOR_NOT_ACTIVE",
    "MARKETPLACE_MEDIA_COUNT_INVALID",
    "MEDIA_SERVER_FINALIZATION_REQUIRED",
    "VISIBILITY_PLAN_NOT_ACTIVE"
  ]) assert.ok(sql.includes(token), `missing fail-closed publication token: ${token}`);

  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\s*\(/i);
  assert.match(sql, /vvip_marketplace_sectors[\s\S]*is_enabled/is);
  assert.match(sql, /media_count\s*<\s*1\s+or\s+media_count\s*>\s*7/i);
  assert.match(sql, /finalization_state\s*<>\s*'CANONICAL'/i);
  assert.match(sql, /canonical_storage_path\s+is\s+null/i);
  assert.match(sql, /canonical_sha256\s*!~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /source_sha256\s*!~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /canonical_mime_type\s+not\s+in\s*\(\s*'image\/jpeg'\s*,\s*'image\/webp'\s*\)/i);
  assert.match(sql, /canonical_verified_at\s+is\s+null/i);
});

test("entitlement receipt is the idempotency key and retries return immutable first result", () => {
  assert.match(sql, /vvip_hash_entitlement_receipt\s*\(\s*entitlement_receipt\s*\)/i);
  assert.match(sql, /entitlement_receipt_hash\s*=\s*receipt_hash/i);
  assert.match(sql, /entitlement_state\s*=\s*'CONSUMED'/i);
  assert.match(sql, /vvip_publication_intent_audit[\s\S]*entitlement_id/is);
  assert.match(sql, /correlation_id/i);
  assert.match(sql, /result_status/i);
  assert.match(sql, /create\s+unique\s+index[\s\S]*vvip_publication_intent_audit[\s\S]*entitlement_id/is);
  assert.match(sql, /where[\s\S]*entitlement_state\s*=\s*'ISSUED'/is);
  assert.match(sql, /ENTITLEMENT_REPLAY_BLOCKED/i);
});

test("browser status bypass is explicitly closed by the converged listing guard", () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_guard_listing_write\s*\(\s*\)/i);
  assert.match(sql, /NEW\.status\s*=\s*'PENDING_REVIEW'[\s\S]*MARKETPLACE_PUBLICATION_RPC_REQUIRED/is);
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\s*\(\s*NEW\.active_market_country\s*\)/i);
});

test("canonical RPC consumes entitlement once, moves only to PENDING_REVIEW and appends immutable evidence", () => {
  assert.match(sql, /set\s+entitlement_state\s*=\s*'CONSUMED'/i);
  assert.match(sql, /set\s+status\s*=\s*'PENDING_REVIEW'/i);
  assert.doesNotMatch(sql, /set\s+status\s*=\s*'ACTIVE'/i);
  assert.match(sql, /insert\s+into\s+public\.vvip_publication_intent_audit/i);
  assert.match(sql, /PUBLICATION_PREPARED/i);
});

test("only authenticated receives canonical publication execute and old publication authorities are retired safely", () => {
  const grants = sql.match(/grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_request_publication\s*\([^;]+?\)\s+to\s+authenticated\s*;/gi) || [];
  assert.equal(grants.length, 1);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_request_publication\s*\([^;]+?\)\s+from\s+public\s*,\s*anon\s*;/i);
  assert.doesNotMatch(sql, /grant\s+execute[\s\S]*vvip_marketplace_request_publication[\s\S]*to\s+(?:anon|public)/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(sql, /drop\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(sql, /to_regprocedure\s*\(\s*'public\.vvip_marketplace_submit_listing\(uuid,uuid\)'\s*\)/i);
});

test("browser repository targets only the canonical publication RPC after convergence", () => {
  assert.match(repository, /client\.rpc\(["']vvip_marketplace_request_publication["']/);
  assert.doesNotMatch(repository, /client\.rpc\(["']vvip_marketplace_prepare_publication["']/);
});
