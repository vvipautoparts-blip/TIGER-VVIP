'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260808134000_lc04_production_legacy_rpc_hardening.sql',
);

function sql() {
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

const POLICY_HELPERS = [
  ['user_role_for', 'uuid'],
  ['current_user_role', ''],
  ['is_field_representative', ''],
  ['is_reviewer', ''],
  ['is_super_admin', ''],
  ['is_team_member', 'uuid'],
  ['can_publish_owner', 'uuid'],
  ['can_self_update_profile', 'uuid, text, boolean, uuid, text, text'],
];

function signature(name, args) {
  return `${name}(${args})`;
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('LC04 migration exists, is transactional, and keeps private helper schema non-exposed', () => {
  const text = sql();
  assert.match(text, /^-- TIGER VVIP LC-04/m);
  assert.match(text, /begin;/i);
  assert.match(text, /commit;/i);
  assert.match(text, /create schema if not exists vvip_private/i);
  assert.match(text, /revoke all on schema vvip_private from public, anon, authenticated/i);
  assert.match(text, /grant usage on schema vvip_private to anon, authenticated/i);
});

test('all production policy SECURITY DEFINER helpers move out of public without drop/recreate identity loss', () => {
  const text = sql();
  for (const [name, args] of POLICY_HELPERS) {
    const publicSig = `public.${signature(name, args)}`;
    assert.match(text, new RegExp(`to_regprocedure\\('${escaped(publicSig)}'\\)`, 'i'));
    assert.match(text, new RegExp(`alter function ${escaped(publicSig)} set schema vvip_private`, 'i'));
    assert.doesNotMatch(text, new RegExp(`drop function[^;]*${escaped(name)}`, 'i'));
  }
});

test('private helper graph uses fixed search paths and private-qualified helper calls', () => {
  const text = sql();
  assert.match(text, /create or replace function vvip_private\.user_role_for\(target_user uuid\)/i);
  assert.match(text, /set search_path = pg_catalog/i);
  assert.match(text, /vvip_private\.user_role_for\(auth\.uid\(\)\)/i);
  assert.match(text, /vvip_private\.current_user_role\(\)/i);
  assert.doesNotMatch(text, /public\.current_user_role\(\)/i);
  assert.doesNotMatch(text, /public\.user_role_for\(auth\.uid\(\)\)/i);
});

test('policy helpers retain only explicit role execution after moving out of exposed API schema', () => {
  const text = sql();
  for (const [name, args] of POLICY_HELPERS) {
    const privateSig = `vvip_private.${signature(name, args)}`;
    assert.match(
      text,
      new RegExp(`revoke all on function ${escaped(privateSig)}\\s+from public, anon, authenticated`, 'i'),
    );
    assert.match(
      text,
      new RegExp(`grant execute on function ${escaped(privateSig)}\\s+to anon, authenticated`, 'i'),
    );
  }
});

test('legacy enumeration and trigger/event-trigger functions are not browser RPCs', () => {
  const text = sql();
  for (const publicSig of [
    'public.lookup_profile_by_email(text)',
    'public.lookup_profile_by_phone(text)',
    'public.handle_new_user()',
    'public.set_profiles_updated_at()',
    'public.rls_auto_enable()',
    'public.parts_sync_vehicle_reference_ids()',
    'public.set_updated_at()',
  ]) {
    assert.match(text, new RegExp(`to_regprocedure\\('${escaped(publicSig)}'\\)`, 'i'));
    assert.match(
      text,
      new RegExp(`revoke all on function ${escaped(publicSig)} from public, anon, authenticated`, 'i'),
    );
  }
});

test('profile resolver is authenticated-only, JWT-authoritative, and never hardcodes a Clerk development issuer', () => {
  const text = sql();
  assert.match(text, /create or replace function public\.vvip_resolve_own_profile\(p_email text default null\)/i);
  assert.match(text, /security definer/i);
  assert.match(text, /set search_path = pg_catalog, public/i);
  assert.match(text, /v_clerk_user_id text := nullif\(v_jwt ->> 'sub', ''\)/i);
  assert.match(text, /v_role text := coalesce\(auth\.role\(\), ''\)/i);
  assert.match(text, /if v_role <> 'authenticated'/i);
  assert.match(text, /v_clerk_user_id not like 'user\\_%'/i);
  assert.doesNotMatch(text, /\.clerk\.accounts\.dev/i);
  assert.doesNotMatch(text, /where lower\(email\) = v_client_email_hint/i);
  assert.match(text, /where lower\(email\) = v_jwt_email/i);
  assert.match(text, /jsonb_build_object\([\s\S]*?'id',[\s\S]*?'clerk_user_id',[\s\S]*?'email',[\s\S]*?'display_name'/i);
  assert.match(text, /revoke all on function public\.vvip_resolve_own_profile\(text\) from public, anon, authenticated/i);
  assert.match(text, /grant execute on function public\.vvip_resolve_own_profile\(text\) to authenticated/i);
});

test('profile direct writes are removed and Clerk self-read RLS uses one-time JWT initplan form', () => {
  const text = sql();
  assert.match(text, /revoke insert, update, delete on table public\.profiles from authenticated/i);
  assert.match(text, /create policy "Clerk users can read own profile"[\s\S]*?to authenticated[\s\S]*?\(select auth\.jwt\(\) ->> 'sub'\) = clerk_user_id/i);
  assert.doesNotMatch(text, /create policy "Clerk users can (insert|update) own profile"/i);
});

test('LC04 does not contain production execution, seed authority, or destructive schema shortcuts', () => {
  const text = sql();
  assert.doesNotMatch(text, /drop table|truncate|delete\s+from|insert\s+into\s+public\.profiles\s*\([^)]*role/i);
  assert.doesNotMatch(text, /supabase\s+db\s+push|production[_ -]?approved|owner[_ -]?approved/i);
});
