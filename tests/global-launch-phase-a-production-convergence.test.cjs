'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260808223000_global_launch_phase_a_identity_convergence.sql'
);

function migration() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function executableSql(sql) {
  return sql.replace(/^\s*--.*$/gm, '');
}

test('global launch phase A is forward-only and transactional', () => {
  const sql = migration();
  const executable = executableSql(sql);
  assert.match(sql, /^-- VVIP TIGER GLOBAL LAUNCH PHASE A/m);
  assert.match(executable, /begin;/i);
  assert.match(executable, /commit;/i);
  assert.doesNotMatch(executable, /drop\s+table|\btruncate\b|delete\s+from\s+public\.profiles/i);
});

test('phase A emits its content address for Steel Shield promotion', () => {
  const digest = crypto.createHash('sha256').update(migration()).digest('hex');
  assert.match(digest, /^[a-f0-9]{64}$/);
  console.log(`GLOBAL_LAUNCH_PHASE_A_SHA256=${digest}`);
});

test('legacy SECURITY DEFINER helpers move out of public without dropping object identity', () => {
  const sql = migration();
  for (const signature of [
    'user_role_for(uuid)',
    'current_user_role()',
    'is_field_representative()',
    'is_reviewer()',
    'is_super_admin()',
    'is_team_member(uuid)',
    'can_publish_owner(uuid)',
    'can_self_update_profile(uuid, text, boolean, uuid, text, text)'
  ]) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(sql, new RegExp(`alter function public\\.${escaped} set schema vvip_private`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`drop function[^;]*${escaped}`, 'i'));
  }
});

test('profile authority is subject-first, direct writes are revoked, and email never transfers ownership', () => {
  const sql = migration();
  assert.match(sql, /revoke all on table public\.profiles from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.profiles to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:select,\s*)?(?:insert|update|delete)[^;]*public\.profiles\s+to\s+authenticated/i);
  assert.match(sql, /where clerk_user_id = v_clerk_user_id/i);
  assert.match(sql, /identity_migration_required/i);
  assert.match(sql, /where lower\(email\) = v_verified_email[\s\S]*clerk_user_id[\s\S]*is null/i);
  assert.doesNotMatch(sql, /update\s+public\.profiles[\s\S]*set\s+clerk_user_id\s*=\s*v_clerk_user_id[\s\S]*where\s+lower\(email\)/i);
  assert.match(sql, /revoke all on function public\.vvip_resolve_own_profile\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.vvip_resolve_own_profile\(text\) to authenticated/i);
});

test('legacy credential and transitional profile tables become server-only', () => {
  const sql = migration();
  for (const table of ['otp_codes', 'email_verifications', 'vvip_clerk_profiles']) {
    assert.ok(sql.includes(`'${table}'`), `${table} must be in the isolation set`);
  }
  assert.match(sql, /revoke all privileges on table public\.%I from public, anon, authenticated/i);
});

test('browser enumeration and trigger helpers lose RPC execution', () => {
  const sql = migration();
  for (const signature of [
    'lookup_profile_by_email(text)',
    'lookup_profile_by_phone(text)',
    'handle_new_user()',
    'set_profiles_updated_at()',
    'set_vvip_tiger_updated_at()',
    'handle_new_supabase_user()',
    'guard_profile_privileged_fields()',
    'rls_auto_enable()',
    'parts_sync_vehicle_reference_ids()',
    'set_updated_at()'
  ]) {
    assert.ok(sql.includes(`'${signature}'`), `${signature} must be in the RPC lock set`);
  }
  assert.match(sql, /revoke all on function public\.' \|\| signature \|\| ' from public, anon, authenticated/i);
});
