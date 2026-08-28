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

test('live verification proves the exact migration and eight contract checks', { skip: !sqlExists }, () => {
  for (const token of [
    '20260816090001',
    '20260827120000',
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
  assert.doesNotMatch(sql, /now\s*\(|clock_timestamp\s*\(|current_timestamp\b/i);
});
