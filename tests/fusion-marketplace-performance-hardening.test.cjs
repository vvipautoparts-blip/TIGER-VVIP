'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816101500_sovereign_marketplace_performance_hardening.sql');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('marketplace foreign keys have purpose-built leading-column indexes', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'performance hardening migration must exist');
  const sql = read(MIGRATION);
  for (const token of [
    'vvip_listing_activation_entitlements_plan_idx',
    'vvip_marketplace_listings_sector_idx',
    'vvip_visibility_plans_sector_idx'
  ]) {
    assert.ok(sql.includes(token), `missing performance index: ${token}`);
  }
  assert.match(sql, /on\s+public\.vvip_listing_activation_entitlements\s*\(plan_id/i);
  assert.match(sql, /on\s+public\.vvip_marketplace_listings\s*\(sector/i);
  assert.match(sql, /on\s+public\.vvip_visibility_plans\s*\(sector/i);
});

test('authenticated media reads are represented by one permissive policy', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /drop policy if exists vvip_marketplace_media_owner_read/i);
  assert.match(sql, /drop policy if exists vvip_marketplace_media_public_canonical_read/i);
  assert.match(sql, /create policy vvip_marketplace_media_authenticated_read[\s\S]+for select[\s\S]+to authenticated/i);
  assert.match(sql, /create policy vvip_marketplace_media_anon_canonical_read[\s\S]+for select[\s\S]+to anon/i);
  assert.match(sql, /owner_subject\s*=\s*public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /finalization_state\s*=\s*'CANONICAL'/i);
});
