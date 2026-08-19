'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260819112000_country_legal_activation_authority.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

for (const table of ['vvip_country_legal_evidence', 'vvip_country_activation_audit']) {
  assert(new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i').test(sql), `${table} must exist`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must enable RLS`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must FORCE RLS`);
}

for (const field of ['privacy_version','terms_version','cookies_version','consent_version','delete_account_verified','legal_approved','tax_configured','data_residency_ready']) {
  assert(new RegExp(`\\b${field}\\b`, 'i').test(sql), `${field} must be part of country activation evidence`);
}

assert(/activation_state/i.test(sql), 'country activation state must be explicit');
assert(/vvip_country_launch_ready/i.test(sql), 'country launch readiness must be queryable');
assert(/vvip_country_activate/i.test(sql), 'country activation must be transactional');
assert(/vvip_country_reject_audit_mutation/i.test(sql), 'country activation history must be append-only');
assert(/create\s+or\s+replace\s+function\s+public\.vvip_ad_country_payment_active/i.test(sql), 'payment activation must also require legal country readiness');
assert(/grant\s+execute[\s\S]+vvip_country_activate[\s\S]+to\s+service_role/i.test(sql), 'country activation must be protected by service authority');
assert(!/grant\s+execute[\s\S]+vvip_country_activate[\s\S]+to\s+authenticated/i.test(sql), 'authenticated users must never activate countries');

console.log('country-activation-schema.test.js: PASS');
