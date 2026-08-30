'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SQL = path.join(ROOT, 'tests', 'sql', 'media-finalizer-db-contract.sql');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-db-rehearsal.yml');

function requiredFile(file, code) {
  assert.equal(fs.existsSync(file), true, code);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

test('local rehearsal proves the complete sovereign media DB contract', () => {
  const sql = requiredFile(SQL, 'MEDIA_DB_CONTRACT_SQL_MISSING');
  const workflow = requiredFile(WORKFLOW, 'MEDIA_DB_REHEARSAL_WORKFLOW_MISSING');

  for (const marker of [
    'MEDIA_DB_MIGRATIONS=PASS',
    'MEDIA_DB_JOB_TABLE=PASS',
    'MEDIA_DB_CANONICAL_COLUMNS=PASS',
    'MEDIA_DB_REQUEST_RPC=PASS',
    'MEDIA_DB_TRUSTED_RPCS=PASS',
    'MEDIA_DB_RLS=PASS',
    'MEDIA_DB_STORAGE=PASS',
    'MEDIA_DB_TOKEN_LEASE=PASS',
    'TIGER_MEDIA_DB_CONTRACT=PASS',
  ]) {
    assert.match(sql, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `MISSING_CONTRACT_MARKER:${marker}`);
  }

  assert.match(sql, /20260816090001/);
  assert.match(sql, /20260827120000/);
  assert.match(sql, /20260828140000/);
  assert.match(sql, /vvip_media_finalization_jobs/);
  assert.match(sql, /vvip_marketplace_request_media_finalization/);
  assert.match(sql, /vvip_marketplace_claim_media_finalization/);
  assert.match(sql, /vvip_marketplace_complete_media_finalization/);
  assert.match(sql, /vvip_marketplace_fail_media_finalization/);
  assert.match(sql, /listing-media-canonical/);
  assert.match(sql, /listing-media/);
  assert.match(sql, /vvip_listing_media_canonical_member_read/);
  assert.match(sql, /vvip_listing_media_canonical_read/);

  assert.match(workflow, /tests\/sql\/media-finalizer-db-contract\.sql/);
  assert.match(workflow, /TIGER_MEDIA_DB_CONTRACT=PASS/);
  assert.match(workflow, /20260816090001_sovereign_media_finalization\.sql/);
  assert.match(workflow, /20260827120000_sealed_media_identity_binding\.sql/);
  assert.match(workflow, /20260828140000_media_no_visitor_forward_repair\.sql/);
  assert.match(workflow, /MEDIA_NO_VISITOR_FORWARD_REPAIR_MIGRATION_SHA256/);
});

test('local DB contract requires every service-role privilege and rejects the legacy anonymous storage policy', () => {
  const sql = requiredFile(SQL, 'MEDIA_DB_CONTRACT_SQL_MISSING');
  assert.doesNotMatch(sql, /'SELECT,INSERT,UPDATE,DELETE'/i, 'MEDIA_DB_LOCAL_ANY_OF_PRIVILEGE_BUG');
  const privileges = [...sql.matchAll(
    /has_table_privilege\(\s*'service_role'\s*,\s*'public\.vvip_media_finalization_jobs'\s*,\s*'(SELECT|INSERT|UPDATE|DELETE)'\s*\)/gi,
  )].map((match) => match[1].toUpperCase());
  assert.deepEqual(
    [...new Set(privileges)].sort(),
    ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
    'MEDIA_DB_LOCAL_SERVICE_ROLE_PRIVILEGES_INCOMPLETE',
  );
  assert.match(sql, /not\s+exists\s*\([\s\S]*policyname\s*=\s*'vvip_listing_media_canonical_read'/i);
});

test('local contract proof stays local-only and never promotes Production', () => {
  const workflow = requiredFile(WORKFLOW, 'MEDIA_DB_REHEARSAL_WORKFLOW_MISSING');
  assert.doesNotMatch(workflow, /supabase\s+(?:link|db\s+push|migration\s+repair)/i);
  assert.doesNotMatch(workflow, /zelcngyyvbomuzokvuxo/);
  assert.match(workflow, /supabase\s+db\s+reset\s+--local/);
});
