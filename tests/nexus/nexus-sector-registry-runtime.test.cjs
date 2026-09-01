'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const sql = fs.readFileSync('supabase/migrations/20260829184500_nexus_sector_registry_runtime.sql', 'utf8');
const bootstrap = fs.readFileSync('scripts/nexus/bootstrap.js', 'utf8');

test('NEXUS exposes only enabled sectors through a bounded authenticated RPC', () => {
  assert.match(sql, /create or replace function public\.vvip_nexus_sector_registry\s*\(\s*\)/i);
  assert.match(sql, /from public\.vvip_marketplace_sectors/i);
  assert.match(sql, /where\s+sector\.is_enabled/i);
  assert.match(sql, /order by\s+sector\.display_order\s*,\s*sector\.sector_key/i);
  assert.match(sql, /grant execute on function public\.vvip_nexus_sector_registry\(\)\s+to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.vvip_nexus_sector_registry\(\)\s+to anon/i);
});

test('NEXUS bootstrap loads the sector registry from authenticated runtime and fails closed', () => {
  assert.match(bootstrap, /vvip_nexus_sector_registry/);
  assert.match(bootstrap, /async function hydrateServerSectorRegistry\s*\(/);
  assert.match(bootstrap, /root\.VVIP_SUPABASE/);
  assert.match(bootstrap, /VVIPRuntimeReady/);
  assert.match(bootstrap, /root\.VVIP_FUSION_SECTOR_REGISTRY\s*=\s*Object\.freeze/);
  assert.match(bootstrap, /ensureComposerFields\(root\)/);
  assert.doesNotMatch(bootstrap, /const current = enabledSectors\(root\);\s*if \(current\.length > 0\) return/s);
  assert.doesNotMatch(bootstrap, /general|legacy|unknown/i);
});
