'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname,'..','..','supabase','migrations','20260819123000_owner_observability_authority.sql'),'utf8');

for (const table of ['vvip_observability_events','vvip_observability_incidents','vvip_observability_health_samples']) {
  assert(new RegExp(`create\\s+table\\s+public\\.${table}\\b`,'i').test(sql), `${table} must exist`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,'i').test(sql), `${table} must enable RLS`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`,'i').test(sql), `${table} must FORCE RLS`);
}
assert(/vvip_observability_record_event/i.test(sql),'event ingestion RPC required');
assert(/vvip_observability_open_incident/i.test(sql),'incident opening RPC required');
assert(/vvip_observability_resolve_incident/i.test(sql),'incident resolution RPC required');
assert(/vvip_owner_operational_snapshot/i.test(sql),'owner operational snapshot required');
assert(/vvip_observability_reject_event_mutation/i.test(sql),'events must be append-only');
assert(/source_kind[^\n]+check/i.test(sql),'event source must be constrained');
assert(/severity[^\n]+check/i.test(sql),'severity must be constrained');
assert(/grant\s+execute[\s\S]+vvip_observability_record_event[\s\S]+to\s+service_role/i.test(sql),'ingestion must be service protected');
assert(!/grant\s+execute[\s\S]+vvip_owner_operational_snapshot[\s\S]+to\s+anon/i.test(sql),'owner snapshot must never be public');

console.log('owner-observability-schema.test.js: PASS');
