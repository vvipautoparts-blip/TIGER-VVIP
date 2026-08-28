'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SQL = path.resolve(__dirname, 'sql', 'media-finalizer-live-verification.sql');
const sqlExists = fs.existsSync(SQL);
const sql = sqlExists ? fs.readFileSync(SQL, 'utf8').replace(/\r/g, '') : '';

function stripSqlCommentsAndStrings(source) {
  return source
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''");
}

test('read-only live verification SQL exists', () => {
  assert.equal(sqlExists, true, 'MEDIA_DB_LIVE_VERIFICATION_SQL_MISSING');
});

test('live verification is catalog-only and contains no mutation verbs', { skip: !sqlExists }, () => {
  const executable = stripSqlCommentsAndStrings(sql);
  assert.doesNotMatch(
    executable,
    /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|reindex|cluster)\b/i,
    'MEDIA_DB_LIVE_VERIFICATION_MUTATION_VERB',
  );
  assert.match(executable, /^\s*with\b/i);
  assert.match(executable, /\bselect\b/i);
});

test('live verification proves the exact three-migration and eight-check contract', { skip: !sqlExists }, () => {
  for (const token of [
    '20260816090001',
    '20260827120000',
    '20260828140000',
    'vvip_media_finalization_jobs',
    'vvip_marketplace_listing_media',
    'vvip_marketplace_request_media_finalization',
    'vvip_marketplace_claim_media_finalization',
    'vvip_marketplace_complete_media_finalization',
    'vvip_marketplace_fail_media_finalization',
    'listing-media',
    'listing-media-canonical',
    'vvip_listing_media_canonical_member_read',
    'migrations',
    'jobTable',
    'canonicalColumns',
    'requestRpc',
    'trustedRpcs',
    'rls',
    'storage',
    'tokenLease',
  ]) {
    assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `MEDIA_DB_LIVE_VERIFICATION_TOKEN_MISSING:${token}`);
  }
});

test('live verifier never self-labels a database as Production authority', { skip: !sqlExists }, () => {
  assert.doesNotMatch(sql, /zelcngyyvbomuzokvuxo/i, 'MEDIA_DB_LIVE_VERIFIER_HARDCODED_PROJECT_REF');
  assert.doesNotMatch(sql, /ap-northeast-2/i, 'MEDIA_DB_LIVE_VERIFIER_HARDCODED_REGION');
  assert.doesNotMatch(sql, /\bas\s+project_ref\b/i, 'MEDIA_DB_LIVE_VERIFIER_SELF_ASSERTED_PROJECT_REF');
  assert.doesNotMatch(sql, /\bas\s+region\b/i, 'MEDIA_DB_LIVE_VERIFIER_SELF_ASSERTED_REGION');
});

test('live verifier requires every service-role job-table privilege independently', { skip: !sqlExists }, () => {
  assert.doesNotMatch(sql, /'SELECT,INSERT,UPDATE,DELETE'/i, 'MEDIA_DB_LIVE_VERIFIER_ANY_OF_PRIVILEGE_BUG');
  const privileges = [...sql.matchAll(
    /has_table_privilege\(\s*'service_role'\s*,\s*'public\.vvip_media_finalization_jobs'\s*,\s*'(SELECT|INSERT|UPDATE|DELETE)'\s*\)/gi,
  )].map((match) => match[1].toUpperCase());
  assert.deepEqual(
    [...new Set(privileges)].sort(),
    ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
    'MEDIA_DB_LIVE_VERIFIER_SERVICE_ROLE_PRIVILEGES_INCOMPLETE',
  );
});

test('live verifier rejects the legacy anonymous canonical-storage policy', { skip: !sqlExists }, () => {
  assert.match(sql, /policyname\s*=\s*'vvip_listing_media_canonical_read'/i, 'MEDIA_DB_LIVE_VERIFIER_LEGACY_STORAGE_POLICY_NOT_CHECKED');
  assert.match(sql, /not\s+exists\s*\([\s\S]*vvip_listing_media_canonical_read/i, 'MEDIA_DB_LIVE_VERIFIER_LEGACY_STORAGE_POLICY_NOT_REJECTED');
});

test('live verification reads bounded metadata and not marketplace rows or storage objects', { skip: !sqlExists }, () => {
  const executable = stripSqlCommentsAndStrings(sql);
  assert.doesNotMatch(executable, /\bfrom\s+public\.vvip_marketplace_(?:listings|listing_media)\b/i);
  assert.doesNotMatch(executable, /\bfrom\s+storage\.objects\b/i);
  assert.match(executable, /\bfrom\s+storage\.buckets\b/i);
  assert.match(executable, /\bfrom\s+pg_policies\b/i);
  assert.match(executable, /\bfrom\s+supabase_migrations\.schema_migrations\b/i);
});

test('live verification returns one bounded JSON contract object', { skip: !sqlExists }, () => {
  assert.match(sql, /jsonb_build_object\s*\(/i);
  assert.match(sql, /as\s+contract_checks\b/i);
  assert.match(sql, /as\s+required_migrations\b/i);
  assert.doesNotMatch(sql, /now\s*\(|clock_timestamp\s*\(|current_timestamp\b/i);
});
