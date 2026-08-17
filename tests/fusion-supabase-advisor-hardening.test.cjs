'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816100000_sovereign_public_api_hardening.sql');
const REPOSITORY = path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('public projections run with invoker security and base-table least privilege', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'public API hardening migration must exist');
  const sql = read(MIGRATION);

  for (const token of [
    'alter view public.vvip_marketplace_public_feed set (security_invoker = true)',
    'alter view public.vvip_visibility_plan_catalog set (security_invoker = true)',
    'vvip_marketplace_media_public_canonical_read',
    'vvip_visibility_plans_public_active_read',
    'canonical_storage_path',
    'finalization_state',
    'vvip_private.vvip_marketplace_country_is_active'
  ]) {
    assert.ok(sql.toLowerCase().includes(token.toLowerCase()), `missing advisor hardening contract: ${token}`);
  }

  assert.match(sql, /revoke\s+select\s+on\s+public\.vvip_marketplace_listing_media\s+from\s+anon,\s*authenticated/i);
  const mediaGrant = sql.match(/grant\s+select\s*\(([^)]+)\)\s+on\s+public\.vvip_marketplace_listing_media\s+to\s+anon,\s*authenticated/i);
  assert.ok(mediaGrant, 'safe column-level media SELECT grant is required');

  const grantedColumns = mediaGrant[1]
    .split(',')
    .map((column) => column.trim().toLowerCase())
    .filter(Boolean);
  for (const forbidden of [
    'owner_subject',
    'storage_path',
    'source_sha256',
    'canonical_sha256',
    'canonical_verifier',
    'finalization_error_code'
  ]) {
    assert.equal(grantedColumns.includes(forbidden), false, `public media grant must exclude ${forbidden}`);
  }
  for (const required of ['canonical_storage_path', 'finalization_state']) {
    assert.equal(grantedColumns.includes(required), true, `public media grant must retain ${required}`);
  }
});

test('browser registers media with client UUID and never asks PostgREST to return raw media rows', () => {
  const source = read(REPOSITORY);
  assert.match(source, /media_id:\s*mediaId/);
  assert.match(source, /await\s+client\.from\(["']vvip_marketplace_listing_media["']\)\.insert\(rows\)/);
  assert.doesNotMatch(source, /vvip_marketplace_listing_media["']\)\.insert\(rows\)\.select\(/);
});
