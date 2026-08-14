'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260814190500_global_launch_db_safety_convergence.sql',
);

function source() {
  assert.equal(fs.existsSync(MIGRATION), true, 'global-launch DB safety migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('anonymous Supabase Auth identities cannot become marketplace owner actors', () => {
  const sql = source();

  assert.match(sql, /auth\.jwt\(\)\s*->>\s*'is_anonymous'/i);
  assert.match(sql, /coalesce\([\s\S]*is_anonymous[\s\S]*false\)\s+is\s+false/i);
  assert.match(sql, /sub[\s\S]*like\s+'user\\_%'/i);
  assert.match(sql, /else\s+null/i);
});

test('permanent platform identity compatibility remains explicit and narrowly shaped', () => {
  const sql = source();

  assert.match(sql, /nullif\(auth\.jwt\(\)\s*->>\s*'sub',\s*''\)/i);
  assert.match(sql, /like\s+'user\\_%'\s+escape\s+'\\'/i);
  assert.doesNotMatch(sql, /coalesce\([\s\S]*sub[\s\S]*random|gen_random_uuid\(\)/i);
});

test('marketplace actor helper is callable only by identities that need RLS evaluation', () => {
  const sql = source();

  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_actor_id\(\)[\s\S]*from\s+public,\s*anon,\s*authenticated/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_actor_id\(\)[\s\S]*to\s+anon,\s*authenticated,\s*service_role/i,
  );
});

test('legacy trigger helpers pin search_path and remain non-browser RPCs', () => {
  const sql = source();

  for (const fn of ['parts_sync_vehicle_reference_ids', 'set_updated_at']) {
    assert.match(sql, new RegExp(`alter function public\\.${fn}\\(\\) set search_path = pg_catalog`, 'i'));
    assert.match(
      sql,
      new RegExp(`revoke all on function public\\.${fn}\\(\\) from public, anon, authenticated`, 'i'),
    );
  }
});

test('migration is forward-only hardening and seeds no business or authority rows', () => {
  const sql = source();

  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.(?:vvip_authority|vvip_country|vvip_marketplace|profiles|orders|commissions)/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(sql, /truncate\s+/i);
  assert.doesNotMatch(sql, /drop\s+(?:table|schema)\s+/i);
});
