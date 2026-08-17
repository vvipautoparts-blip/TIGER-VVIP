'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260817060000_retire_lc04_legacy_profile_helper_graph.sql';
const migration = path.join(root, migrationRel);
const expectedHash = '692c3c54f636583b623935b18df1263b31d10ca32d900144fb5a84209b2896c2';

const signatures = [
  'public.lookup_profile_by_email(text)',
  'public.lookup_profile_by_phone(text)',
  'public.can_self_update_profile(uuid, text, boolean, uuid, text, text)',
  'public.can_publish_owner(uuid)',
  'public.is_team_member(uuid)',
  'public.is_field_representative()',
  'public.is_reviewer()',
  'public.is_super_admin()',
  'public.current_user_role()',
  'public.user_role_for(uuid)',
  'vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text)',
  'vvip_private.can_publish_owner(uuid)',
  'vvip_private.is_team_member(uuid)',
  'vvip_private.is_field_representative()',
  'vvip_private.is_reviewer()',
  'vvip_private.is_super_admin()',
  'vvip_private.current_user_role()',
  'vvip_private.user_role_for(uuid)',
];

function sql() {
  return fs.readFileSync(migration, 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('LC04 final retirement is content-addressed', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expectedHash, `LC04 final retirement hash drift: expected=${expectedHash} actual=${actual}`);
});

test('LC04 final retirement drops every exact legacy signature with RESTRICT', () => {
  const source = sql();
  for (const signature of signatures) {
    assert.match(
      source,
      new RegExp(`drop\\s+function\\s+if\\s+exists\\s+${escapeRegex(signature)}\\s+restrict\\s*;`, 'i'),
      `missing restrictive retirement for ${signature}`,
    );
  }
  assert.doesNotMatch(source, /drop\s+function[^;]*\bcascade\b/i);
});

test('LC04 final retirement preserves the sovereign Clerk-only profile boundary', () => {
  const source = sql();
  assert.match(source, /to_regclass\('public\.profiles'\)\s+is\s+not\s+null/i);
  assert.match(source, /LC04_FINAL_PUBLIC_PROFILES_RETURNED/);
  assert.match(source, /to_regclass\('public\.vvip_clerk_profiles'\)\s+is\s+null/i);
  assert.match(source, /LC04_FINAL_CLERK_PROFILE_AUTHORITY_MISSING/);
  assert.doesNotMatch(source, /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.profiles\b/i);
  assert.doesNotMatch(source, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_resolve_own_profile\b/i);
});

test('LC04 final retirement asserts zero known residue in-transaction', () => {
  const source = sql();
  assert.match(source, /begin\s*;/i);
  assert.match(source, /commit\s*;/i);
  assert.match(source, /LC04_FINAL_LEGACY_FUNCTION_REMAINS/);
  for (const signature of signatures) {
    assert.ok(source.includes(`'${signature}'`), `missing postcondition signature ${signature}`);
  }
});
