'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260814200000_global_launch_browser_acl_least_privilege.sql',
);

function source() {
  assert.equal(fs.existsSync(MIGRATION), true, 'browser ACL hardening migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('anonymous browser role is read-only at the table ACL layer', () => {
  const sql = source();
  assert.match(
    sql,
    /revoke\s+insert\s*,\s*update\s*,\s*delete\s*,\s*truncate\s*,\s*references\s*,\s*trigger\s*,\s*maintain\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon/i,
  );
});

test('authenticated browser role cannot hold database maintenance or schema-adjacent table privileges', () => {
  const sql = source();
  assert.match(
    sql,
    /revoke\s+truncate\s*,\s*references\s*,\s*trigger\s*,\s*maintain\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+authenticated/i,
  );
});

test('future app-owned table defaults preserve browser least privilege including PostgreSQL 17 MAINTAIN', () => {
  const sql = source();
  assert.match(
    sql,
    /alter default privileges for role postgres in schema public[\s\S]*revoke insert, update, delete, truncate, references, trigger, maintain on tables from anon/i,
  );
  assert.match(
    sql,
    /alter default privileges for role postgres in schema public[\s\S]*revoke truncate, references, trigger, maintain on tables from authenticated/i,
  );
});

test('migration does not attempt cross-owner default ACL changes', () => {
  const sql = source();
  assert.doesNotMatch(sql, /alter default privileges for role supabase_admin/i);
});

test('anonymous role cannot use app-owned public-schema sequences for writes', () => {
  const sql = source();
  assert.match(sql, /revoke\s+all\s+privileges\s+on\s+all\s+sequences\s+in\s+schema\s+public\s+from\s+anon/i);
  assert.match(
    sql,
    /alter default privileges for role postgres in schema public[\s\S]*revoke all privileges on sequences from anon/i,
  );
});

test('future app-owned browser function execution must be granted explicitly', () => {
  const sql = source();
  assert.match(
    sql,
    /alter default privileges for role postgres in schema public[\s\S]*revoke execute on functions from anon, authenticated/i,
  );
});

test('migration changes privileges only and contains no business-data mutation', () => {
  const sql = source();
  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\btruncate\s+table\b/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|schema|column)\b/i);
  assert.doesNotMatch(sql, /\bgrant\s+/i);
});
