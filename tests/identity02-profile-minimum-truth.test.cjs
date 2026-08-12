'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_REL = 'supabase/migrations/20260812063600_identity02_profile_resolver_minimum_truth.sql';
const MIGRATION_PATH = path.join(__dirname, '..', MIGRATION_REL);

function migrationText() {
  return fs.existsSync(MIGRATION_PATH) ? fs.readFileSync(MIGRATION_PATH, 'utf8') : '';
}

test('IDENTITY-02 is a forward profile migration after global launch convergence', () => {
  assert.ok(
    fs.existsSync(MIGRATION_PATH),
    `missing forward migration: ${MIGRATION_REL}`,
  );
  assert.ok('20260812063600' > '20260808224500', 'IDENTITY-02 must sort after current global launch migrations');
});

test('IDENTITY-02 rejects non-Clerk subjects without removing the new-profile email compatibility fallback', () => {
  const text = migrationText();

  assert.match(text, /create or replace function public\.vvip_resolve_own_profile\(p_email text default null\)/i);
  assert.match(text, /v_clerk_user_id text := nullif\(v_jwt ->> 'sub', ''\)/i);
  assert.match(text, /v_clerk_user_id not like 'user\\_%' escape '\\'/i);
  assert.match(text, /'status',\s*'invalid_clerk_subject'/i);

  assert.match(text, /v_profile_email text := coalesce\([\s\S]*?v_verified_email,[\s\S]*?p_email/i);
  assert.match(text, /where clerk_user_id = v_clerk_user_id/i);
  assert.match(text, /'status',\s*'identity_migration_required'/i);
  assert.doesNotMatch(text, /where lower\(email\) = [^;]*p_email/i);
  assert.doesNotMatch(text, /update\s+public\.profiles/i);
});

test('IDENTITY-02 returns a bounded own-profile response instead of the full administrative row', () => {
  const text = migrationText();

  assert.match(text, /v_safe_profile jsonb/i);
  assert.match(text, /jsonb_strip_nulls\(jsonb_build_object\(/i);
  assert.match(text, /'id',\s*v_profile\.id/i);
  assert.match(text, /'email',\s*v_profile\.email/i);
  assert.match(text, /'full_name',\s*v_profile\.full_name/i);
  assert.match(text, /'display_name',\s*v_profile\.display_name/i);
  assert.match(text, /'avatar_url',\s*v_profile\.avatar_url/i);
  assert.match(text, /'account_status',\s*v_profile\.account_status/i);

  assert.doesNotMatch(text, /'profile',\s*to_jsonb\(v_profile\)/i);
  assert.doesNotMatch(text, /'role',\s*v_profile\.role/i);
  assert.doesNotMatch(text, /'is_approved',\s*v_profile\.is_approved/i);
  assert.doesNotMatch(text, /'superior_id',\s*v_profile\.superior_id/i);
  assert.doesNotMatch(text, /'subscription',\s*v_profile\.subscription/i);
  assert.doesNotMatch(text, /'business_status',\s*v_profile\.business_status/i);
});

test('IDENTITY-02 tightens definer search path and preserves prior authenticated execution without a new broad grant', () => {
  const text = migrationText();

  assert.match(text, /to_regprocedure\('public\.vvip_resolve_own_profile\(text\)'\) is null/i);
  assert.match(text, /language plpgsql security definer set search_path = pg_catalog/i);
  assert.doesNotMatch(text, /set search_path\s*=\s*pg_catalog\s*,\s*public/i);

  assert.match(text, /revoke all on function public\.vvip_resolve_own_profile\(text\) from public, anon/i);
  assert.doesNotMatch(text, /revoke all on function public\.vvip_resolve_own_profile\(text\)[^;]*authenticated/i);
  assert.doesNotMatch(text, /grant\s+execute on function public\.vvip_resolve_own_profile\(text\) to authenticated/i);
});
