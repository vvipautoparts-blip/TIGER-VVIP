'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const files = {
  fingerprint: path.join(root, 'scripts/release/srpc/sql/staging-schema-fingerprint.sql'),
  runtime: path.join(root, 'scripts/release/srpc/sql/staging-runtime-proof.sql'),
  phaseA: path.join(root, 'scripts/release/srpc/sql/phase-a-regression.sql'),
};

function source(name) {
  assert.equal(fs.existsSync(files[name]), true, `${name} SRPC SQL proof must exist`);
  return fs.readFileSync(files[name], 'utf8');
}

test('schema fingerprint covers the complete Phase B structural surface', () => {
  const sql = source('fingerprint');
  for (const table of [
    'vvip_authority_roles',
    'vvip_authority_permissions',
    'vvip_authority_principals',
    'vvip_authority_assignments',
    'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals',
    'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events',
    'vvip_marketplace_listings',
    'vvip_marketplace_listing_media',
    'vvip_marketplace_favorites',
    'vvip_marketplace_listing_audit',
  ]) assert.match(sql, new RegExp(table, 'i'));
  for (const catalog of [
    'pg_class', 'pg_namespace', 'pg_proc', 'pg_trigger', 'pg_indexes', 'pg_policies',
    'information_schema.table_privileges', 'information_schema.routine_privileges', 'storage.buckets',
  ]) assert.match(sql, new RegExp(catalog.replace('.', '\\.'), 'i'));
  for (const key of ['force_rls', 'authority_seed_counts', 'marketplace_row_counts', 'storage_bucket']) {
    assert.match(sql, new RegExp(key, 'i'));
  }
});

test('runtime proof is transaction-scoped and exercises every required trust boundary', () => {
  const sql = source('runtime');
  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /rollback\s*;/i);
  assert.match(sql, /set\s+local\s+role\s+authenticated/i);
  assert.match(sql, /set_config\s*\(\s*'request\.jwt\.claims'/i);
  for (const marker of [
    'SRPC_SYNTHETIC_ID_COLLISION',
    'SRPC_EXPECTED_DENIAL_MISSING:NON_CLERK',
    'SRPC_EXPECTED_DENIAL_MISSING:INACTIVE_COUNTRY',
    'SRPC_EXPECTED_DENIAL_MISSING:SELF_PROMOTE',
    'SRPC_EXPECTED_DENIAL_MISSING:UNAUTHORIZED_REVIEWER',
    'SRPC_EXPECTED_DENIAL_MISSING:AUDIT_MUTATION',
    'SRPC_ACTIVE_AUDIT_MISSING',
  ]) assert.match(sql, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const id of ['XZ', 'user_srpc_reviewer', 'user_srpc_owner', 'user_srpc_intruder',
    '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000b101']) {
    assert.match(sql, new RegExp(id, 'i'));
  }
  for (const residue of ['country_rows', 'principal_rows', 'listing_rows', 'audit_rows']) {
    assert.match(sql, new RegExp(residue, 'i'));
  }
});

test('Phase A regression proof checks profile boundary, retired credentials, and helper isolation', () => {
  const sql = source('phaseA');
  assert.match(sql, /public\.profiles/i);
  assert.match(sql, /relrowsecurity/i);
  assert.match(sql, /relforcerowsecurity/i);
  assert.match(sql, /authenticated/i);
  assert.match(sql, /SELECT/i);
  for (const table of ['otp_codes', 'email_verifications', 'vvip_clerk_profiles']) {
    assert.match(sql, new RegExp(table, 'i'));
  }
  for (const helper of [
    'user_role_for', 'current_user_role', 'is_field_representative', 'is_reviewer',
    'is_super_admin', 'is_team_member', 'can_publish_owner', 'can_self_update_profile',
  ]) assert.match(sql, new RegExp(helper, 'i'));
  assert.match(sql, /duplicate_clerk_subject_groups/i);
  assert.match(sql, /public_helper_count/i);
});

test('SRPC proof SQL contains no persistent or destructive primitive', () => {
  for (const name of Object.keys(files)) {
    const sql = source(name);
    assert.doesNotMatch(sql, /\bcommit\s*;/i, `${name} must never commit proof writes`);
    assert.doesNotMatch(sql, /\btruncate\b/i, `${name} must not truncate`);
    assert.doesNotMatch(sql, /delete\s+from\s+public\.vvip_/i, `${name} must not delete VVIP business rows`);
  }
});
