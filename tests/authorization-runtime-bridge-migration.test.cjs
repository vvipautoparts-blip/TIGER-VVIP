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
  '20260823050000_authorization_runtime_bridge.sql',
);

function sqlText() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function resolverBlock(sql) {
  return sql.match(
    /create\s+or\s+replace\s+function\s+public\.resolve_authorization_snapshot\s*\([\s\S]*?\$\$;/i,
  )?.[0] || '';
}

test('migration is source-only and defines one database snapshot resolver', () => {
  const sql = sqlText();
  const block = resolverBlock(sql);

  assert.match(sql, /source[- ]only/i);
  assert.notEqual(block, '');
  assert.match(block, /returns\s+table\s*\([\s\S]*capability_id\s+text[\s\S]*scope_projection\s+jsonb[\s\S]*expires_at\s+timestamptz/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+push/i);
  assert.doesNotMatch(sql, /psql\s+/i);
});

test('resolver derives security time from the database and never accepts caller time', () => {
  const block = resolverBlock(sqlText());

  assert.doesNotMatch(block, /\bp_now\b/i);
  assert.doesNotMatch(block, /caller[_ -]?time/i);
  assert.match(block, /v_server_now\s+timestamptz\s*:=\s*statement_timestamp\(\)/i);
  assert.match(block, /grant_row\.not_before\s*<=\s*v_server_now/i);
  assert.match(block, /grant_row\.expires_at\s*>\s*v_server_now/i);
});

test('resolver is a safe service-role-only SECURITY DEFINER boundary', () => {
  const sql = sqlText();
  const block = resolverBlock(sql);

  assert.match(block, /security\s+definer\s+set\s+search_path\s*=\s*public,\s*pg_temp/i);
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.resolve_authorization_snapshot\([^;]+\)\s+from\s+public,\s*anon,\s*authenticated/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.resolve_authorization_snapshot\([^;]+\)\s+to\s+service_role/i,
  );
  assert.doesNotMatch(sql, /grant\s+execute[^;]+to\s+(?:anon|authenticated)/i);
});

test('resolver binds authenticated principal, target, surface, and policy explicitly', () => {
  const block = resolverBlock(sqlText());

  for (const parameter of [
    'p_authenticated_principal',
    'p_target_id',
    'p_surface',
    'p_resource_scope',
    'p_sector_scope',
    'p_entity_scope',
    'p_geo_policy_scope',
    'p_policy_version',
  ]) {
    assert.match(block, new RegExp(`\\b${parameter}\\b`, 'i'));
  }

  assert.match(block, /grant_row\.principal\s*=\s*p_authenticated_principal/i);
  assert.match(block, /grant_row\.policy_version\s*=\s*p_policy_version/i);
  assert.match(block, /p_surface\s*<>\s*'PROFILE_MORE_MENU'/i);
  assert.match(block, /p_resource_scope\s*->>\s*'kind'\s*<>\s*'profile'/i);
  assert.match(block, /jsonb_array_length\(p_resource_scope\s*->\s*'ids'\)\s*<>\s*1/i);
  assert.match(block, /p_resource_scope\s*->\s*'ids'\s*@>\s*jsonb_build_array\(p_target_id\)/i);
  assert.match(block, /p_target_id\s*=\s*any\s*\(p_entity_scope\)/i);
});

test('resolver fails closed on malformed or wildcard scope and checks every scope dimension', () => {
  const block = resolverBlock(sqlText());

  assert.match(block, /sensitive_resource_scope_is_bounded\(p_resource_scope,\s*false\)/i);
  assert.match(block, /'\*'\s*=\s*any\s*\(p_sector_scope\)/i);
  assert.match(block, /'\*'\s*=\s*any\s*\(p_entity_scope\)/i);
  assert.match(block, /'\*'\s*=\s*any\s*\(p_geo_policy_scope\)/i);

  assert.match(block, /sensitive_resource_scope_is_subset\(p_resource_scope,\s*grant_row\.resource_scope\)/i);
  assert.match(block, /sensitive_text_array_is_subset\(p_sector_scope,\s*grant_row\.sector_scope\)/i);
  assert.match(block, /sensitive_text_array_is_subset\(p_entity_scope,\s*grant_row\.entity_scope\)/i);
  assert.match(block, /sensitive_text_array_is_subset\(p_geo_policy_scope,\s*grant_row\.geo_policy_scope\)/i);
});

test('resolver excludes revoked expired scheduled and never-granted authorities', () => {
  const block = resolverBlock(sqlText());

  assert.match(block, /granted_event\.event_type\s*=\s*'GRANTED'/i);
  assert.match(block, /terminal_event\.event_type\s+in\s*\('REVOKED',\s*'EXPIRED'\)/i);
  assert.match(block, /terminal_event\.occurred_at\s*<=\s*v_server_now/i);
  assert.match(block, /not\s+exists\s*\([\s\S]*terminal_event/i);
});

test('profile surface exposes only canonical profile permission capabilities', () => {
  const block = resolverBlock(sqlText());

  assert.match(block, /grant_row\.action\s+in\s*\('VIEW_PERMISSION_STATE',\s*'GRANT_PERMISSION'\)/i);
  assert.doesNotMatch(block, /APPROVE_PAYMENT_DATA_PRODUCTION/);
});

test('resolver returns a minimal projection without raw authority internals', () => {
  const block = resolverBlock(sqlText());

  assert.match(block, /grant_row\.action\s+as\s+capability_id/i);
  assert.match(block, /jsonb_build_object\([\s\S]*'resource_scope'[\s\S]*'sector_scope'[\s\S]*'entity_scope'[\s\S]*'geo_policy_scope'/i);
  assert.match(block, /grant_row\.expires_at/i);

  for (const forbidden of [
    'audit_evidence_ref',
    'delegability_ceiling',
    'nonce_hash',
    'grantor',
    'parent_delegation_grant_id',
    'owner_stepup',
    'approval_code',
  ]) {
    assert.doesNotMatch(block, new RegExp(forbidden, 'i'));
  }
});
