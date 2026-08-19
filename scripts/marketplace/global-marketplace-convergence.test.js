'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260819120000_global_marketplace_convergence.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const canonicalSectors = [
  'AUTOMOTIVE',
  'REAL_ESTATE',
  'CONSTRUCTION',
  'PROFESSIONAL_SERVICES_TRADES',
  'EQUIPMENT',
  'TRADE_SUPPLY_BUSINESS',
  'ENGINEERING_CONSULTING_DESIGN',
];

for (const sector of canonicalSectors) {
  assert(sql.includes(`'${sector}'`), `missing canonical sector ${sector}`);
}
assert(!/\bmaterials\b/i.test(sql), 'retired materials sector must not survive the current contract');
assert(/MARKETPLACE_LEGACY_SECTOR_MAPPING_REQUIRED/.test(sql), 'legacy sector drift must fail closed');

for (const table of [
  'vvip_marketplace_sector_catalog',
  'vvip_marketplace_listings',
  'vvip_marketplace_listing_media',
  'vvip_marketplace_listing_audit',
  'vvip_marketplace_reports',
]) {
  assert(new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${table}\\b`, 'i').test(sql), `${table} must exist`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must enable RLS`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must FORCE RLS`);
}

assert(/vvip_marketplace_country_is_active/i.test(sql), 'marketplace country activation must be explicit');
assert(/vvip_country_launch_ready/i.test(sql), 'marketplace country activation must include the legal country gate');
assert(/vvip_marketplace_search/i.test(sql), 'search/filter authority must be an RPC');
assert(/p_country_code/i.test(sql) && /p_sector/i.test(sql) && /p_price_min/i.test(sql) && /p_price_max/i.test(sql), 'search must filter country, sector and price');
assert(/vvip_marketplace_submit_listing/i.test(sql), 'owners need a guarded submit transition');
assert(/vvip_marketplace_review_listing/i.test(sql), 'moderation needs a protected review transition');
assert(/vvip_marketplace_report_listing/i.test(sql), 'users need a guarded listing report RPC');
assert(/vvip_marketplace_reject_audit_mutation/i.test(sql), 'audit history must be append-only');
assert(/vvip_marketplace_reject_report_mutation/i.test(sql), 'report history must be append-only');
assert(/listing-media/i.test(sql), 'real listing images must use the private listing-media bucket');
assert(/grant\s+execute[\s\S]+vvip_marketplace_review_listing[\s\S]+to\s+service_role/i.test(sql), 'review authority must be service protected');

console.log('global-marketplace-convergence.test.js: PASS');
