'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260823003000_sensitive_permission_grants.sql',
);

function migrationText() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function functionBlock(sql, functionName) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\b[\\s\\S]*?\\$\\$;`,
    'i',
  );
  return sql.match(pattern)?.[0] || '';
}

test('migration creates grant, state-event, and short-lived lease persistence', () => {
  const sql = migrationText();

  assert.match(sql, /create table if not exists public\.sensitive_permission_grants/i);
  assert.match(sql, /create table if not exists public\.sensitive_permission_grant_events/i);
  assert.match(sql, /create table if not exists public\.sensitive_permission_leases/i);

  for (const field of [
    'principal',
    'action',
    'resource_scope',
    'sector_scope',
    'entity_scope',
    'geo_policy_scope',
    'purpose',
    'reason',
    'grantor',
    'policy_version',
    'issued_at',
    'not_before',
    'expires_at',
    'delegability_ceiling',
    'audit_evidence_ref',
  ]) {
    assert.match(sql, new RegExp(`\\b${field}\\b`, 'i'));
  }
});

test('all sensitive permission tables enable and force RLS with no browser-role mutations', () => {
  const sql = migrationText();
  const tables = [
    'sensitive_permission_grants',
    'sensitive_permission_grant_events',
    'sensitive_permission_leases',
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
  }

  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i);
});

test('audit-bearing grants and state events are append-only and cannot be deleted', () => {
  const sql = migrationText();

  assert.match(sql, /SENSITIVE_PERMISSION_GRANT_IMMUTABLE/);
  assert.match(sql, /SENSITIVE_PERMISSION_EVENT_IMMUTABLE/);
  assert.match(sql, /before\s+delete\s+or\s+update\s+on\s+public\.sensitive_permission_grants/i);
  assert.match(sql, /before\s+delete\s+or\s+update\s+on\s+public\.sensitive_permission_grant_events/i);
  assert.doesNotMatch(sql, /grant\s+delete\s+on\s+table\s+public\.sensitive_permission_grants/i);
  assert.doesNotMatch(sql, /grant\s+delete\s+on\s+table\s+public\.sensitive_permission_grant_events/i);
});

test('revocation and expiry are explicit append-only state events', () => {
  const sql = migrationText();

  assert.match(sql, /event_type\s+text/i);
  assert.match(sql, /event_type\s+in\s*\([^)]*'GRANTED'[^)]*'REVOKED'[^)]*'EXPIRED'/is);
  assert.match(sql, /event_type\s+is\s+distinct\s+from\s+null/i);
  assert.match(sql, /create or replace function public\.revoke_sensitive_permission_grant/i);
  assert.match(sql, /create or replace function public\.expire_sensitive_permission_grant/i);
  assert.match(sql, /insert into public\.sensitive_permission_grant_events/i);
});

test('grant and lease expiry paths are indexed', () => {
  const sql = migrationText();

  assert.match(sql, /create index if not exists sensitive_permission_grants_expiry_idx[\s\S]*expires_at/i);
  assert.match(sql, /create index if not exists sensitive_permission_leases_status_expiry_idx[\s\S]*status[\s\S]*expires_at/i);
});

test('grant creation verifies exact delegation authority and subset ceilings before insert', () => {
  const sql = migrationText();
  const block = functionBlock(sql, 'create_sensitive_permission_grant');

  assert.notEqual(block, '');
  assert.match(block, /DELEGATE_PERMISSION/);
  assert.match(block, /owner:root/i);
  assert.match(block, /sensitive_text_array_is_subset/i);
  assert.match(block, /sensitive_resource_scope_is_subset/i);
  assert.match(block, /delegability_ceiling/i);
  assert.match(block, /expires_at/i);
  assert.match(block, /SENSITIVE_PERMISSION_DELEGATION_DENIED/);

  const subsetCheck = block.search(/sensitive_text_array_is_subset/i);
  const insertGrant = block.search(/insert into public\.sensitive_permission_grants/i);
  assert.ok(subsetCheck >= 0 && insertGrant > subsetCheck, 'subset verification must precede grant insertion');
});

test('grant creation and state mutation functions are service-role only with safe definer paths', () => {
  const sql = migrationText();
  const signatures = [
    'create_sensitive_permission_grant',
    'revoke_sensitive_permission_grant',
    'expire_sensitive_permission_grant',
    'create_sensitive_permission_lease',
    'consume_sensitive_permission_lease',
  ];

  for (const name of signatures) {
    const block = functionBlock(sql, name);
    assert.match(block, /security\s+definer\s+set\s+search_path\s*=\s*public,\s*pg_temp/i);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}[^;]* from public, anon, authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}[^;]* to service_role`, 'i'));
  }
});

test('leases are exact-bound, required, short-lived, single-use, and fail closed after revoke or expiry', () => {
  const sql = migrationText();
  const consume = functionBlock(sql, 'consume_sensitive_permission_lease');

  assert.match(sql, /status\s+in\s*\([^)]*'ISSUED'[^)]*'CONSUMED'[^)]*'REVOKED'[^)]*'EXPIRED'/is);
  for (const declaration of [
    /grant_id\s+uuid/i,
    /principal\s+text/i,
    /action\s+text/i,
    /scope_digest\s+text/i,
    /nonce_hash\s+text/i,
    /not_before\s+timestamptz/i,
    /expires_at\s+timestamptz/i,
    /consumed_at\s+timestamptz/i,
    /revoked_at\s+timestamptz/i,
  ]) {
    assert.match(sql, declaration);
  }
  assert.match(sql, /constraint\s+sensitive_permission_lease_required_bindings_check\s+check/i);
  for (const field of [
    'grant_id',
    'principal',
    'action',
    'scope_digest',
    'nonce_hash',
    'not_before',
    'expires_at',
  ]) {
    assert.match(sql, new RegExp(`${field}\\s+is\\s+distinct\\s+from\\s+null`, 'i'));
  }

  assert.notEqual(consume, '');
  assert.match(consume, /for update/i);
  assert.match(consume, /status\s*<>\s*'ISSUED'/i);
  assert.match(consume, /principal/i);
  assert.match(consume, /action/i);
  assert.match(consume, /scope_digest/i);
  assert.match(consume, /nonce_hash/i);
  assert.match(consume, /not_before/i);
  assert.match(consume, /expires_at/i);
  assert.match(consume, /SENSITIVE_PERMISSION_LEASE_(?:CONSUMED|REPLAY_OR_CONFLICT)/);
});

test('migration is definition-only and contains no remote apply or production deployment command', () => {
  const sql = migrationText();

  assert.doesNotMatch(sql, /supabase\s+db\s+push/i);
  assert.doesNotMatch(sql, /psql\s+/i);
  assert.doesNotMatch(sql, /production/i);
});
