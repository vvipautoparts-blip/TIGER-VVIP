"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql";
const repositoryPath = "scripts/runtime/vvip-marketplace-repository.js";
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const repository = fs.readFileSync(repositoryPath, "utf8");
const requestStart = sql.indexOf("create function public.vvip_marketplace_request_publication");
const reviewStart = sql.indexOf("create or replace function public.vvip_marketplace_review_listing");
const requestSql = requestStart >= 0 ? sql.slice(requestStart, reviewStart > requestStart ? reviewStart : undefined) : "";
const reviewSql = reviewStart >= 0 ? sql.slice(reviewStart) : "";

test("sovereign convergence migration exists, is forward-only, and refuses silent legacy financial conversion", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.match(sql, /^-- VVIP TIGER[\s\S]*\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;\s*$/i);
  assert.doesNotMatch(sql, /\btruncate\b|\bdrop\s+table\b/i);
  assert.match(sql, /LEGACY_ENTITLEMENT_STATE_REQUIRES_MANUAL_CONVERGENCE/);
});

test("entitlement schema reserves before moderation and protects financial evidence from listing deletion", () => {
  for (const token of ["RESERVED", "reserved_at", "activation_duration_minutes", "redeem_expires_at"]) {
    assert.ok(sql.includes(token), `missing entitlement lifecycle token: ${token}`);
  }
  assert.match(sql, /entitlement_state[\s\S]*'ISSUED'[\s\S]*'RESERVED'[\s\S]*'CONSUMED'[\s\S]*'REVOKED'[\s\S]*'EXPIRED'/i);
  assert.match(sql, /foreign key\s*\(listing_id\)[\s\S]*on delete restrict/i);
  assert.match(sql, /activation_starts_at[\s\S]*drop not null/i);
  assert.match(sql, /activation_expires_at[\s\S]*drop not null/i);
});

test("canonical publication RPC is one security-definer transaction with safe search path and row locks", () => {
  assert.match(sql, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_marketplace_request_publication\s*\(\s*target_listing\s+uuid\s*,\s*target_plan_id\s+text\s*,\s*entitlement_receipt\s+text\s*\)/is);
  assert.match(requestSql, /language\s+plpgsql[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*extensions/is);
  assert.match(requestSql, /from\s+public\.vvip_marketplace_listings[\s\S]*for\s+update/is);
  assert.match(requestSql, /from\s+public\.vvip_listing_activation_entitlements[\s\S]*for\s+update/is);
  assert.match(requestSql, /from\s+public\.vvip_visibility_plans[\s\S]*for\s+share/is);
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
  ]) assert.ok(requestSql.includes(token), `missing fail-closed publication token: ${token}`);

  assert.match(requestSql, /vvip_private\.vvip_marketplace_country_is_active\s*\(/i);
  assert.match(requestSql, /vvip_marketplace_sectors[\s\S]*is_enabled/is);
  assert.match(requestSql, /media_count\s*<\s*1\s+or\s+media_count\s*>\s*7/i);
  assert.match(requestSql, /finalization_state\s*<>\s*'CANONICAL'/i);
  assert.match(requestSql, /canonical_storage_path\s+is\s+null/i);
  assert.match(requestSql, /canonical_sha256\s*!~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(requestSql, /source_sha256\s*!~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(requestSql, /canonical_mime_type\s+not\s+in\s*\(\s*'image\/jpeg'\s*,\s*'image\/webp'\s*\)/i);
  assert.match(requestSql, /canonical_verified_at\s+is\s+null/i);
});

test("publication request is idempotent while RESERVED and never consumes visibility before approval", () => {
  assert.match(requestSql, /vvip_hash_entitlement_receipt\s*\(\s*entitlement_receipt\s*\)/i);
  assert.match(requestSql, /entitlement_receipt_hash\s*=\s*receipt_hash/i);
  assert.match(requestSql, /entitlement_state\s*=\s*'RESERVED'[\s\S]*current_listing\.status\s*=\s*'PENDING_REVIEW'/i);
  assert.match(requestSql, /set\s+entitlement_state\s*=\s*'RESERVED'/i);
  assert.match(requestSql, /reserved_at\s*=\s*statement_timestamp\(\)/i);
  assert.match(requestSql, /where[\s\S]*entitlement_state\s*=\s*'ISSUED'/is);
  assert.match(requestSql, /PUBLICATION_RESERVED/);
  assert.doesNotMatch(requestSql, /set\s+entitlement_state\s*=\s*'CONSUMED'/i);
  assert.doesNotMatch(requestSql, /set\s+status\s*=\s*'ACTIVE'/i);
});

test("browser status bypass is explicitly closed by the converged listing guard", () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_guard_listing_write\s*\(\s*\)/i);
  assert.match(sql, /NEW\.status\s*=\s*'PENDING_REVIEW'[\s\S]*MARKETPLACE_PUBLICATION_RPC_REQUIRED/is);
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active\s*\(\s*NEW\.active_market_country\s*\)/i);
});

test("trusted review is the only place that consumes entitlement and starts paid visibility", () => {
  assert.match(reviewSql, /security\s+definer/i);
  assert.match(reviewSql, /vvip_private\.vvip_marketplace_actor_can_review\s*\(/i);
  assert.match(reviewSql, /entitlement_state\s*=\s*'RESERVED'[\s\S]*for\s+update/is);
  assert.match(reviewSql, /decision\s*=\s*'APPROVE'[\s\S]*set\s+entitlement_state\s*=\s*'CONSUMED'/is);
  assert.match(reviewSql, /activation_start\s*:=\s*statement_timestamp\(\)/i);
  assert.match(reviewSql, /activation_end\s*:=\s*activation_start\s*\+\s*make_interval\s*\(\s*mins\s*=>\s*current_entitlement\.activation_duration_minutes\s*\)/i);
  assert.match(reviewSql, /decision\s*=\s*'REJECT'[\s\S]*entitlement_state\s*=\s*case[\s\S]*'EXPIRED'[\s\S]*'ISSUED'/is);
  assert.match(reviewSql, /decision\s*=\s*'BLOCK'[\s\S]*entitlement_state\s*=\s*'REVOKED'/is);
  assert.match(reviewSql, /PUBLICATION_APPROVED/);
  assert.match(reviewSql, /PUBLICATION_REJECTED/);
  assert.match(reviewSql, /PUBLICATION_BLOCKED/);
});

test("audit lifecycle is append-only and supports multiple reserve-review cycles", () => {
  assert.match(sql, /event_type[\s\S]*PUBLICATION_RESERVED[\s\S]*PUBLICATION_APPROVED[\s\S]*PUBLICATION_REJECTED[\s\S]*PUBLICATION_BLOCKED/i);
  assert.doesNotMatch(sql, /unique\s+index[\s\S]*vvip_publication_intent_audit[\s\S]*\(entitlement_id\)/i);
  assert.match(sql, /PUBLICATION_AUDIT_APPEND_ONLY/);
});

test("only authenticated receives historical canonical publication execute and old publication authorities are retired safely", () => {
  const grants = sql.match(/grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_request_publication\s*\([^;]+?\)\s+to\s+authenticated\s*;/gi) || [];
  assert.equal(grants.length, 1);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_request_publication\s*\([^;]+?\)\s+from\s+public\s*,\s*anon\s*;/i);
  assert.doesNotMatch(sql, /grant\s+execute[\s\S]*vvip_marketplace_request_publication[\s\S]*to\s+(?:anon|public)/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(sql, /drop\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(sql, /to_regprocedure\s*\(\s*'public\.vvip_marketplace_submit_listing\(uuid,uuid\)'\s*\)/i);
});

test("browser repository targets only the latest submit-for-review RPC", () => {
  assert.match(repository, /client\.rpc\(["']vvip_marketplace_submit_for_review["']/);
  assert.doesNotMatch(repository, /client\.rpc\(["']vvip_marketplace_(?:request|prepare)_publication["']/);
  assert.doesNotMatch(repository, /\brequestPublication\b|\bprepareForPublication\b/);
});
