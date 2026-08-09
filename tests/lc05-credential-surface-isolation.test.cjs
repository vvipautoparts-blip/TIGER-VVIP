'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260808135000_lc05_credential_surface_isolation.sql');

function sql() {
  return fs.readFileSync(migrationPath, 'utf8');
}

test('LC05 is convergence-only and never creates legacy credential tables', () => {
  const text = sql();
  assert.match(text, /^-- TIGER VVIP LC-05/m);
  assert.match(text, /to_regclass\('public\.otp_codes'\)/i);
  assert.match(text, /to_regclass\('public\.email_verifications'\)/i);
  assert.doesNotMatch(text, /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.(?:otp_codes|email_verifications)/i);
});

test('existing legacy credential tables are forced behind RLS and lose all browser privileges', () => {
  const text = sql();
  for (const table of ['otp_codes', 'email_verifications']) {
    assert.match(text, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(text, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(text, new RegExp(`revoke all privileges on table public\\.${table} from public, anon, authenticated`, 'i'));
  }
});

test('LC05 removes all direct RLS policies from legacy credential tables without recreating client policies', () => {
  const text = sql();
  assert.match(text, /from pg_policies/i);
  assert.match(text, /tablename in \('otp_codes', 'email_verifications'\)/i);
  assert.match(text, /drop policy %I on %I\.%I/i);
  assert.doesNotMatch(text, /create\s+policy[\s\S]*?on\s+public\.(?:otp_codes|email_verifications)/i);
  assert.doesNotMatch(text, /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i);
});

test('modern sovereign phone OTP challenge store is untouched', () => {
  const text = sql();
  assert.doesNotMatch(text, /alter\s+table\s+public\.phone_otp_challenges/i);
  assert.doesNotMatch(text, /drop\s+policy[\s\S]*?phone_otp_challenges/i);
  assert.doesNotMatch(text, /revoke[\s\S]*?phone_otp_challenges/i);
});

test('LC05 contains no Production command, credential data mutation, or destructive table operation', () => {
  const text = sql();
  assert.doesNotMatch(text, /drop\s+table|truncate|delete\s+from|update\s+public\.(?:otp_codes|email_verifications)|insert\s+into\s+public\.(?:otp_codes|email_verifications)/i);
  assert.doesNotMatch(text, /supabase\s+db\s+push|production[_ -]?approved|owner[_ -]?approved/i);
});
