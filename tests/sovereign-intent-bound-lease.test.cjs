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
  '20260823061000_sovereign_intent_bound_execution_lease.sql',
);

function source() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function functionBlock(sql, name) {
  const pattern = new RegExp(
    'create\\s+or\\s+replace\\s+function\\s+public\\.' + name + '\\b[\\s\\S]*?\\$\\$;',
    'i',
  );
  return (sql.match(pattern) || [''])[0];
}

test('forward migration extends existing sensitive lease authority instead of creating a parallel lease table', () => {
  const sql = source();

  assert.match(sql, /alter table public\.sensitive_permission_leases/i);
  assert.doesNotMatch(sql, /create\s+table[^;]*(sovereign|execution)[^;]*lease/i);

  for (const field of [
    'intent_id',
    'intent_digest',
    'proof_evidence_ref',
    'session_evidence_ref',
    'policy_version',
    'authority_version',
  ]) {
    assert.match(sql, new RegExp('add column if not exists\\s+' + field + '\\b', 'i'), field);
  }
});

test('new lease bindings are immutable and digest-shaped', () => {
  const sql = source();
  const guard = functionBlock(sql, 'guard_sensitive_permission_lease_mutation');

  assert.match(sql, /intent_digest[^\n]*\^\[0-9a-f\]\{64\}\$/i);
  for (const field of [
    'intent_id',
    'intent_digest',
    'proof_evidence_ref',
    'session_evidence_ref',
    'policy_version',
    'authority_version',
  ]) {
    assert.match(guard, new RegExp('new\\.' + field + '[\\s\\S]*old\\.' + field + '|old\\.' + field + '[\\s\\S]*new\\.' + field, 'i'), field);
  }
});

test('issuance uses database time, locks intent and grant, and binds exact authority context', () => {
  const sql = source();
  const issue = functionBlock(sql, 'create_sovereign_intent_bound_execution_lease');

  assert.ok(issue);
  assert.match(issue, /statement_timestamp\(\)/i);
  assert.doesNotMatch(issue, /\bp_now\b/i);
  assert.match(issue, /from public\.sovereign_action_intents[\s\S]*for update/i);
  assert.match(issue, /from public\.sensitive_permission_grants[\s\S]*for update/i);
  assert.match(issue, /sensitive_permission_grant_is_active\s*\([^;]*v_server_now/i);

  for (const binding of [
    'principal',
    'action',
    'intent_digest',
    'policy_version',
    'authority_version',
  ]) {
    assert.match(issue, new RegExp('v_intent\\.' + binding + '[\\s\\S]*p_' + binding + '|p_' + binding + '[\\s\\S]*v_intent\\.' + binding, 'i'), binding);
  }

  assert.match(issue, /v_intent\.status\s*(?:<>|!=)\s*'CONFIRMED'|v_intent\.status\s+not\s+in/i);
  assert.match(issue, /v_intent\.expires_at\s*<=\s*v_server_now/i);
});

test('lease scope is database-derived and must remain inside the active persistent grant', () => {
  const sql = source();
  const issue = functionBlock(sql, 'create_sovereign_intent_bound_execution_lease');

  assert.match(issue, /sensitive_resource_scope_is_subset\s*\(\s*p_resource_scope\s*,\s*v_grant\.resource_scope\s*\)/i);
  assert.match(issue, /sensitive_text_array_is_subset\s*\(\s*p_sector_scope\s*,\s*v_grant\.sector_scope\s*\)/i);
  assert.match(issue, /sensitive_text_array_is_subset\s*\(\s*p_entity_scope\s*,\s*v_grant\.entity_scope\s*\)/i);
  assert.match(issue, /sensitive_text_array_is_subset\s*\(\s*p_geo_policy_scope\s*,\s*v_grant\.geo_policy_scope\s*\)/i);
  assert.match(issue, /sensitive_permission_scope_digest\s*\(/i);
  assert.doesNotMatch(issue, /p_scope_digest/i);
});

test('lease expiry is dominated by intent and grant expiry and bounded by server policy', () => {
  const sql = source();
  const issue = functionBlock(sql, 'create_sovereign_intent_bound_execution_lease');

  assert.match(issue, /interval\s+'60 seconds'/i);
  assert.match(issue, /least\s*\([^)]*v_intent\.expires_at[^)]*v_grant\.expires_at/i);
  assert.match(issue, /p_expires_at\s*<=\s*v_max_expires_at/i);
  assert.match(issue, /p_expires_at\s*>\s*v_server_now/i);
});

test('consume is single-use, database-timed, exact-bound and rechecks active grant plus nonterminal intent', () => {
  const sql = source();
  const consume = functionBlock(sql, 'consume_sovereign_intent_bound_execution_lease');

  assert.ok(consume);
  assert.match(consume, /statement_timestamp\(\)/i);
  assert.doesNotMatch(consume, /\bp_now\b/i);
  assert.match(consume, /from public\.sensitive_permission_leases[\s\S]*for update/i);
  assert.match(consume, /v_lease\.status\s*(?:<>|!=)\s*'ISSUED'/i);
  assert.match(consume, /sensitive_permission_grant_is_active\s*\([^;]*v_server_now/i);
  assert.match(consume, /from public\.sovereign_action_intents[\s\S]*for update/i);
  assert.match(consume, /v_intent\.status\s*(?:<>|!=)\s*'CONFIRMED'|v_intent\.status\s+not\s+in/i);

  for (const binding of [
    'principal',
    'action',
    'intent_digest',
    'policy_version',
    'authority_version',
    'session_evidence_ref',
  ]) {
    assert.match(consume, new RegExp('v_lease\\.' + binding + '[\\s\\S]*p_' + binding + '|p_' + binding + '[\\s\\S]*v_lease\\.' + binding, 'i'), binding);
  }

  assert.match(consume, /set\s+status\s*=\s*'CONSUMED'/i);
});

test('session continuity is reference-bound for server live recheck and browser roles cannot issue/consume leases', () => {
  const sql = source();
  const issue = functionBlock(sql, 'create_sovereign_intent_bound_execution_lease');
  const consume = functionBlock(sql, 'consume_sovereign_intent_bound_execution_lease');

  assert.match(issue, /p_session_evidence_ref\s+text/i);
  assert.match(consume, /p_session_evidence_ref\s+text/i);
  assert.doesNotMatch(issue, /p_session_active|p_session_trusted/i);
  assert.doesNotMatch(consume, /p_session_active|p_session_trusted/i);

  for (const fn of [
    'create_sovereign_intent_bound_execution_lease',
    'consume_sovereign_intent_bound_execution_lease',
  ]) {
    assert.match(sql, new RegExp('revoke all on function public\\.' + fn + '[^;]* from public, anon, authenticated', 'i'));
    assert.match(sql, new RegExp('grant execute on function public\\.' + fn + '[^;]* to service_role', 'i'));
  }
});
