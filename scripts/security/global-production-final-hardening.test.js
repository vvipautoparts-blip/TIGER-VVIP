'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migration = path.join(__dirname,'..','..','supabase','migrations','20260819124500_global_production_final_hardening.sql');
assert(fs.existsSync(migration),'final production hardening migration must exist');
const sql = fs.readFileSync(migration,'utf8');

for (const indexName of [
  'vvip_ad_campaigns_country_code_idx',
  'vvip_ad_payments_country_code_idx',
  'vvip_marketplace_country_sector_activation_sector_idx',
  'vvip_marketplace_listings_sector_idx',
  'vvip_marketplace_reports_listing_idx',
]) {
  assert(new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}\\b`,'i').test(sql),`${indexName} is required`);
}

assert(/alter\s+function\s+public\.parts_sync_vehicle_reference_ids\(\)\s+set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i.test(sql),'legacy trigger must use a fixed search_path');
assert(/revoke\s+all\s+on\s+function\s+public\.parts_sync_vehicle_reference_ids\(\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(sql),'legacy trigger must not expose direct browser EXECUTE');
assert(!/grant\s+execute[\s\S]+parts_sync_vehicle_reference_ids[\s\S]+to\s+(anon|authenticated)/i.test(sql),'legacy trigger must not restore browser EXECUTE');

console.log('global-production-final-hardening.test.js: PASS');
