'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = 'supabase/migrations/20260815201000_f06_marketplace_publication_visibility.sql';
const REPOSITORY = 'scripts/runtime/vvip-marketplace-repository.js';
const COMPOSER = 'scripts/fusion/progressive-composer.js';
const PHASE_B = 'supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql';

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function compact(source) {
  return source.replace(/\s+/g, ' ').trim();
}

test('F06 owns one current publication/visibility migration and retires the fixed three-sector constraint', () => {
  assert.equal(fs.existsSync(path.join(ROOT, MIGRATION)), true, `${MIGRATION} must exist`);
  const sql = compact(read(MIGRATION));
  assert.match(sql, /create table if not exists public\.vvip_marketplace_sectors/i);
  assert.match(sql, /drop constraint if exists/i);
  assert.match(sql, /foreign key \(sector\).*vvip_marketplace_sectors/i);
  assert.doesNotMatch(sql, /sector\s+in\s*\(\s*'automotive'\s*,\s*'materials'\s*,\s*'real-estate'\s*\)/i);

  // Historical Phase-B may retain the old evidence, but F06 must supersede it explicitly.
  assert.match(read(PHASE_B), /sector in \('automotive', 'materials', 'real-estate'\)/i);
});

test('activation cards are market visibility entitlements, not sector prices or listing-lifetime timers', () => {
  const sql = compact(read(MIGRATION));
  assert.match(sql, /create table if not exists public\.vvip_visibility_packages/i);
  assert.match(sql, /create table if not exists public\.vvip_listing_visibility_entitlements/i);
  assert.match(sql, /impression_budget/i);
  assert.match(sql, /activation_duration_seconds/i);
  assert.match(sql, /price_minor/i);
  assert.match(sql, /active_market_country/i);
  assert.doesNotMatch(sql, /vvip_visibility_packages[\s\S]{0,1200}\bsector\b/i, 'package pricing must not be sector-coupled');
  assert.doesNotMatch(sql, /interval\s*['\"]120\s+days['\"]/i);
  assert.doesNotMatch(sql, /published_at\s*\+\s*interval/i);
});

test('trusted publication RPC is atomic, owner-scoped, country-gated, media-bounded, entitlement-gated and never sets listing expiry', () => {
  const sql = compact(read(MIGRATION));
  assert.match(sql, /create or replace function public\.vvip_marketplace_submit_listing/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path\s*=\s*pg_catalog\s*,\s*public/i);
  assert.match(sql, /vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /vvip_marketplace_country_is_active/i);
  assert.match(sql, /vvip_marketplace_listing_media/i);
  assert.match(sql, /count\(\*\)[\s\S]{0,240}(?:<=\s*7|>\s*7)/i);
  assert.match(sql, /vvip_listing_visibility_entitlements/i);
  assert.match(sql, /PENDING_REVIEW/i);
  assert.match(sql, /for update/i);
  assert.doesNotMatch(sql, /set[^;]*expires_at\s*=/i);
  assert.match(sql, /revoke all on function public\.vvip_marketplace_submit_listing/i);
  assert.match(sql, /grant execute on function public\.vvip_marketplace_submit_listing/i);
});

test('approval activates Pulse entitlement without turning activation duration into organic listing expiry', () => {
  const sql = compact(read(MIGRATION));
  assert.match(sql, /create or replace function public\.vvip_marketplace_review_listing/i);
  assert.match(sql, /vvip_listing_visibility_entitlements/i);
  assert.match(sql, /activation_started_at/i);
  assert.match(sql, /activation_expires_at/i);
  assert.match(sql, /impression_budget/i);
  assert.doesNotMatch(sql, /vvip_marketplace_listings[^;]*expires_at\s*=/i);
});

test('browser repository uses the trusted publication RPC and never promotes listing status directly', () => {
  const source = read(REPOSITORY);
  const prepare = source.match(/async function prepareForPublication\([\s\S]*?\n  }\n/);
  assert.ok(prepare, 'prepareForPublication must exist');
  assert.match(prepare[0], /rpc\/vvip_marketplace_submit_listing/i);
  assert.match(prepare[0], /request\(/i);
  assert.doesNotMatch(prepare[0], /status\s*:\s*["'](?:ACTIVE|PUBLISHED|PENDING_REVIEW)["']/i);
  assert.doesNotMatch(prepare[0], /PUBLICATION_TRANSPORT_UNAVAILABLE/i);
});

test('FUSION composer is the single authoritative create flow and does not persist authoritative drafts locally', () => {
  const source = read(COMPOSER);
  assert.match(source, /VVIP_MARKETPLACE_REPOSITORY/i);
  assert.match(source, /createDraft/i);
  assert.match(source, /prepareForPublication/i);
  assert.match(source, /requireAuth/i);
  assert.match(source, /Math\.min\(media\.images\.length,\s*7\)/i);
  assert.doesNotMatch(source, /LOCAL_DRAFT_ONLY/i);
  assert.doesNotMatch(source, /localStorage\.setItem/i);
  assert.doesNotMatch(source, /sessionStorage\.setItem/i);
});
