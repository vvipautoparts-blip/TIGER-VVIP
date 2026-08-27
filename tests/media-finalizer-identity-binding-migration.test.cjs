'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260827120000_sealed_media_identity_binding.sql'
);
const HISTORICAL = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260816090001_sovereign_media_finalization.sql'
);

function migrationSource() {
  assert.equal(fs.existsSync(MIGRATION), true, 'SEALED_MEDIA_IDENTITY_BINDING_MIGRATION_MISSING');
  return fs.readFileSync(MIGRATION, 'utf8');
}

function claimFunctionSource(source) {
  const start = source.search(/(?:create|create\s+or\s+replace)\s+function\s+public\.vvip_marketplace_claim_media_finalization\s*\(/i);
  assert.ok(start >= 0, 'TRUSTED_MEDIA_CLAIM_FUNCTION_MISSING');
  const tail = source.slice(start);
  const marker = tail.search(/\n(?:revoke|grant|create\s+(?:or\s+replace\s+)?function|commit\s*;)/i);
  return marker > 0 ? tail.slice(0, marker) : tail;
}

test('identity binding is a new forward-only migration and does not rewrite historical media authority', () => {
  assert.equal(fs.existsSync(HISTORICAL), true, 'HISTORICAL_MEDIA_FINALIZATION_MIGRATION_MISSING');
  const source = migrationSource();
  assert.match(source, /^-- VVIP TIGER — sealed media identity binding/m);
  assert.doesNotMatch(source, /alter\s+table\s+public\.vvip_media_finalization_jobs\s+drop/i);
  assert.doesNotMatch(source, /drop\s+table/i);
});

test('trusted claim appends owner_subject without reordering existing fields and binds job to media ownership', () => {
  const source = migrationSource();
  const claim = claimFunctionSource(source);

  assert.match(
    claim,
    /returns\s+table\s*\(\s*job_id\s+uuid\s*,\s*media_id\s+uuid\s*,\s*listing_id\s+uuid\s*,\s*source_storage_path\s+text\s*,\s*expected_mime_type\s+text\s*,\s*expected_byte_size\s+integer\s*,\s*expected_width\s+integer\s*,\s*expected_height\s+integer\s*,\s*owner_subject\s+text\s*\)/i
  );
  assert.match(claim, /current_media\.owner_subject\s*<>\s*current_job\.owner_subject/i);
  assert.match(claim, /MEDIA_FINALIZATION_BINDING_INVALID/);
  assert.match(claim, /current_job\.owner_subject/i);
});

test('trusted claim preserves token replay lease expiry and attempt protections', () => {
  const claim = claimFunctionSource(migrationSource());

  assert.match(claim, /finalization_token\s+is\s+null/i);
  assert.match(claim, /token_hash\s*=\s*token_digest/i);
  assert.match(claim, /job_state\s+in\s*\('REQUESTED',\s*'PROCESSING'\)/i);
  assert.match(claim, /expires_at\s*<=\s*statement_timestamp\(\)/i);
  assert.match(claim, /attempt_count\s*>=\s*3/i);
  assert.match(claim, /lease_expires_at\s*>\s*statement_timestamp\(\)/i);
  assert.match(claim, /attempt_count\s*=\s*attempt_count\s*\+\s*1/i);
  assert.match(claim, /lease_expires_at\s*=\s*statement_timestamp\(\)\s*\+\s*interval\s*'2 minutes'/i);
});

test('claim remains security-definer fixed-search-path and service-role only', () => {
  const source = migrationSource();
  const claim = claimFunctionSource(source);

  assert.match(claim, /language\s+plpgsql[\s\S]*security\s+definer/i);
  assert.match(claim, /set\s+search_path\s*=\s*pg_catalog,\s*public,\s*extensions/i);
  assert.match(
    source,
    /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_claim_media_finalization\(uuid,\s*text\)\s+from\s+public,\s*anon,\s*authenticated/i
  );
  assert.match(
    source,
    /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_claim_media_finalization\(uuid,\s*text\)\s+to\s+service_role/i
  );
  assert.doesNotMatch(
    source,
    /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_claim_media_finalization\([^;]+\)\s+to\s+(?:public|anon|authenticated)/i
  );
});

test('migration does not introduce any browser-facing owner lookup or owner metadata grant', () => {
  const source = migrationSource();
  assert.doesNotMatch(source, /create\s+(?:or\s+replace\s+)?function\s+public\.[^(]*(?:owner|subject)[^(]*\([^)]*\)[\s\S]*grant\s+execute[\s\S]*to\s+(?:anon|authenticated)/i);
  assert.doesNotMatch(source, /grant\s+select\s*\([^)]*owner_subject[^)]*\)\s+on/i);
});
