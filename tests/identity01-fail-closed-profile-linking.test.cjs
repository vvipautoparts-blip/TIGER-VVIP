'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_REL = 'supabase/migrations/20260808232000_identity01_fail_closed_profile_linking.sql';
const MIGRATION_PATH = path.join(__dirname, '..', MIGRATION_REL);

function migrationText() {
  return fs.existsSync(MIGRATION_PATH) ? fs.readFileSync(MIGRATION_PATH, 'utf8') : '';
}

test('IDENTITY-01 is a forward migration after LC04', () => {
  assert.ok(
    fs.existsSync(MIGRATION_PATH),
    `missing forward migration: ${MIGRATION_REL}`,
  );
  assert.ok('20260808232000' > '20260808134000', 'IDENTITY-01 must sort after LC04');
});

test('IDENTITY-01 fails closed instead of claiming an unbound legacy profile by email', () => {
  const text = migrationText();

  assert.match(text, /create or replace function public\.vvip_resolve_own_profile\(p_email text default null\)/i);
  assert.match(text, /v_clerk_user_id text := nullif\(v_jwt ->> 'sub', ''\)/i);
  assert.match(text, /where clerk_user_id = v_clerk_user_id/i);

  assert.match(
    text,
    /where lower\(email\) = v_jwt_email[\s\S]*?clerk_user_id is null[\s\S]*?btrim\(clerk_user_id\) = ''/i,
  );
  assert.match(text, /'status',\s*'identity_migration_required'/i);
  assert.match(text, /'ok',\s*false/i);

  assert.doesNotMatch(text, /legacy_profile_recovered/i);
  assert.doesNotMatch(text, /update\s+public\.profiles/i);
  assert.doesNotMatch(text, /where lower\(email\) = v_client_email_hint/i);
});

test('IDENTITY-01 preserves subject-bound creation and authenticated-only execution', () => {
  const text = migrationText();

  assert.match(text, /if v_role <> 'authenticated'/i);
  assert.match(text, /v_clerk_user_id not like 'user\\_%'/i);
  assert.match(text, /security definer/i);
  assert.match(text, /set search_path = pg_catalog, public/i);

  assert.match(
    text,
    /insert into public\.profiles[\s\S]*?email,[\s\S]*?clerk_user_id[\s\S]*?values\s*\([\s\S]*?v_jwt_email,[\s\S]*?v_clerk_user_id/i,
  );
  assert.match(text, /where clerk_user_id = v_clerk_user_id[\s\S]*?profile_loaded_after_conflict/i);

  assert.match(
    text,
    /revoke all on function public\.vvip_resolve_own_profile\(text\) from public, anon, authenticated/i,
  );
  assert.match(
    text,
    /grant execute on function public\.vvip_resolve_own_profile\(text\) to authenticated/i,
  );

  assert.doesNotMatch(text, /supabase\s+db\s+push|production[_ -]?approved|owner[_ -]?approved/i);
});
