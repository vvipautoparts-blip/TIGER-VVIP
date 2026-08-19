'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260819110000_advertising_financial_authority.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const tables = [
  'vvip_ad_country_payment_profiles',
  'vvip_ad_payments',
  'vvip_ad_financial_transactions',
  'vvip_ad_ledger_entries',
  'vvip_ad_campaigns',
  'vvip_ad_verified_deliveries',
];

for (const table of tables) {
  assert(new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i').test(sql), `${table} must exist`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must enable RLS`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must FORCE RLS`);
}

assert(/idempotency_key[^\n]+unique/i.test(sql) || /unique\s*\([^)]*idempotency_key/i.test(sql), 'financial writes must be idempotent');
assert(/vvip_ad_reject_ledger_mutation/i.test(sql), 'ledger entries must reject UPDATE/DELETE');
assert(/vvip_ad_post_balanced_transaction/i.test(sql), 'double-entry posting must have one authority function');
assert(/sum\s*\(/i.test(sql) && /BALANCED|UNBALANCED|zero/i.test(sql), 'posting must enforce a zero-sum journal');
assert(/pg_advisory_xact_lock/i.test(sql), 'spend/refund paths must serialize wallet mutations');
assert(/vvip_ad_post_settled_payment/i.test(sql), 'settled payments must have a service-only posting authority');
assert(/vvip_ad_post_refund/i.test(sql), 'refunds must have a service-only posting authority');
assert(/vvip_ad_record_verified_delivery/i.test(sql), 'verified delivery must atomically settle campaign spend');
assert(/visible_ratio/i.test(sql) && /visible_ms/i.test(sql) && /bot_detected/i.test(sql), 'verified delivery must encode viewability/bot evidence');
assert(/grant\s+execute[\s\S]+to\s+service_role/i.test(sql), 'money-changing RPCs must be callable only by protected service authority');
assert(/vvip_ad_reconciliation_summary/i.test(sql), 'reconciliation must be machine queryable');
assert(/country_payment_profiles/i.test(sql) && /activation_state/i.test(sql), 'country payment activation must fail closed');

console.log('financial-authority-schema.test.js: PASS');
