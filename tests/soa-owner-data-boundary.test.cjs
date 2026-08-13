'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260813170000_soa_owner_security_foundation.sql');

function sql() {
  assert.equal(fs.existsSync(migrationPath), true, 'SOA owner security migration must exist');
  return fs.readFileSync(migrationPath, 'utf8').toLowerCase();
}

const tables = [
  'soa_owner_authority_bindings',
  'soa_owner_public_profiles',
  'soa_owner_private_vault',
  'soa_owner_audit_events',
  'soa_owner_authorization_leases',
  'soa_owner_security_state',
];

test('SOA creates physically separate owner security boundaries', () => {
  const source = sql();
  for (const table of tables) {
    assert.match(source, new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`));
  }
  assert.doesNotMatch(source, /insert\s+into\s+public\.soa_owner_/i, 'migration must not seed real owner data');
});

test('SOA authority and publication states are explicit and legacy roles are not authority', () => {
  const source = sql();
  for (const state of ['pending', 'verified', 'active', 'suspended', 'revoked']) assert.match(source, new RegExp(`'${state}'`));
  for (const state of ['draft', 'reviewed', 'published', 'withdrawn']) assert.match(source, new RegExp(`'${state}'`));
  assert.doesNotMatch(source, /super_admin\s*['"]/i);
  assert.doesNotMatch(source, /role\s*=\s*['"]owner['"]/i);
});

test('SOA enforces RLS and FORCE RLS on every owner security table', () => {
  const source = sql();
  for (const table of tables) {
    assert.match(source, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`));
    assert.match(source, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`));
  }
});

test('private authority surfaces are default-deny to browser roles while public projection is read-only', () => {
  const source = sql();
  const protectedTables = tables.filter((table) => table !== 'soa_owner_public_profiles');
  for (const table of protectedTables) {
    assert.match(source, new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public,\\s*anon,\\s*authenticated`));
  }
  assert.match(source, /revoke\s+all\s+on\s+table\s+public\.soa_owner_public_profiles\s+from\s+public,\s*anon,\s*authenticated/);
  assert.match(source, /grant\s+select\s+on\s+table\s+public\.soa_owner_public_profiles\s+to\s+anon,\s*authenticated/);
  assert.match(source, /publication_status\s*=\s*'published'/);
});

test('owner audit is append-only and implementation avoids SECURITY DEFINER', () => {
  const source = sql();
  assert.match(source, /before\s+update\s+or\s+delete\s+on\s+public\.soa_owner_audit_events/);
  assert.match(source, /raise\s+exception\s+'soa_owner_audit_append_only'/);
  assert.doesNotMatch(source, /security\s+definer/);
});

test('L4 authorization lease is exact-bound, short-lived and single-use', () => {
  const source = sql();
  for (const field of ['owner_authority_id', 'clerk_user_id', 'session_id', 'action_code', 'target_resource', 'environment', 'policy_version', 'release_digest', 'nonce', 'issued_at', 'expires_at', 'consumed_at']) {
    assert.match(source, new RegExp(`\\b${field}\\b`), `missing lease binding ${field}`);
  }
  assert.match(source, /unique\s*\(nonce\)/);
  assert.match(source, /interval\s+'120 seconds'/);
  assert.match(source, /issued_at\s+timestamptz\s+not\s+null\s+default\s+clock_timestamp\(\)/);
  assert.match(source, /consumed_at\s+timestamptz/);
});

test('private vault stores encrypted envelopes, not named plaintext PII columns', () => {
  const source = sql();
  assert.match(source, /encrypted_payload\s+bytea\s+not\s+null/);
  assert.match(source, /key_version\s+text\s+not\s+null/);
  assert.doesNotMatch(source, /private_email\s+text|private_phone\s+text|legal_full_name\s+text/);
});
