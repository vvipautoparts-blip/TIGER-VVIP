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
  '20260813050000_tiger_sovereign_trust_fabric.sql',
);

function migration() {
  assert.equal(fs.existsSync(migrationPath), true, 'AI-03 trust-fabric migration must exist');
  return fs.readFileSync(migrationPath, 'utf8');
}

function executableSql() {
  return migration()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n\r]*/g, '');
}

test('trust fabric creates the complete privileged control plane without IF NOT EXISTS drift masking', () => {
  const sql = executableSql();
  for (const table of [
    'ai_approval_requests',
    'ai_audit_events',
    'ai_usage_ledger',
    'ai_prompt_versions',
    'ai_agent_runtime_state',
  ]) {
    assert.match(sql, new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, 'i'));
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    assert.match(sql, new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`, 'i'));
  }
});

test('approval rows bind owner, agent, action, exact payload/scope digests and one-way lifecycle state', () => {
  const sql = executableSql();
  for (const field of [
    /owner_subject\s+text\s+not null/i,
    /requesting_agent\s+text\s+not null/i,
    /action\s+text\s+not null/i,
    /payload_digest\s+text\s+not null/i,
    /scope_digest\s+text\s+not null/i,
    /scope\s+jsonb\s+not null/i,
    /expires_at\s+timestamptz\s+not null/i,
    /status\s+text\s+not null\s+default\s+'pending'/i,
  ]) {
    assert.match(sql, field);
  }
  assert.match(sql, /payload_digest\s*~\s*'\^\[0-9a-f\]\{64\}\\?\$'/i);
  assert.match(sql, /scope_digest\s*~\s*'\^\[0-9a-f\]\{64\}\\?\$'/i);
  for (const status of ['pending', 'approved', 'rejected', 'consumed', 'expired', 'revoked']) {
    assert.match(sql, new RegExp(`'${status}'`, 'i'));
  }
  for (const action of ['merge_pr', 'deploy_production', 'change_prices']) {
    assert.match(sql, new RegExp(`'${action}'`, 'i'));
  }
});

test('browser roles receive no direct table/function grant and privileged functions are not SECURITY DEFINER', () => {
  const sql = executableSql();
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all|execute)[^;]*\s+to\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(sql, /create\s+policy[\s\S]*?\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(sql, /security\s+definer/i);
});

test('L4 approval consumption is row-locked, exact-bound, database-timed and has no caller time parameter', () => {
  const sql = executableSql();
  const signature = sql.match(/create\s+or\s+replace\s+function\s+public\.consume_ai_owner_approval\s*\(([\s\S]*?)\)\s*returns/i);
  assert.ok(signature, 'consume_ai_owner_approval signature must exist');
  assert.doesNotMatch(signature[1], /p_now|timestamp|timestamptz/i);
  assert.match(sql, /select[\s\S]*from\s+public\.ai_approval_requests[\s\S]*for\s+update/i);
  assert.match(sql, /clock_timestamp\s*\(\s*\)/i);
  assert.match(sql, /owner_subject\s*=\s*p_owner_subject/i);
  assert.match(sql, /requesting_agent\s*=\s*p_agent/i);
  assert.match(sql, /action\s*=\s*p_action/i);
  assert.match(sql, /payload_digest\s*=\s*p_payload_digest/i);
  assert.match(sql, /scope_digest\s*=\s*p_scope_digest/i);
  assert.match(sql, /status\s*=\s*'approved'/i);
  assert.match(sql, /set\s+status\s*=\s*'consumed'/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.consume_ai_owner_approval[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.consume_ai_owner_approval[\s\S]*to\s+service_role/i);
});

test('approval mutation guard protects immutable binding and rejects invalid transition/delete', () => {
  const sql = executableSql();
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.guard_ai_approval_mutation/i);
  assert.match(sql, /tg_op\s*=\s*'DELETE'/i);
  for (const field of [
    'owner_subject',
    'requesting_agent',
    'action',
    'payload_digest',
    'scope_digest',
    'scope',
    'decision_passport_id',
    'created_at',
    'expires_at',
  ]) {
    assert.match(sql, new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`, 'i'));
  }
  assert.match(sql, /AI_APPROVAL_INVALID_TRANSITION/i);
  assert.match(sql, /clock_timestamp\s*\(\s*\)/i);
});

test('audit, usage and prompt-version records are append-only at the database boundary', () => {
  const sql = executableSql();
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.reject_ai_append_only_mutation/i);
  for (const table of ['ai_audit_events', 'ai_usage_ledger', 'ai_prompt_versions']) {
    assert.match(sql, new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${table}`, 'i'));
  }
});

test('runtime state bootstraps every approved agent fail-safe', () => {
  const sql = executableSql();
  assert.match(sql, /enabled\s+boolean\s+not null\s+default\s+false/i);
  assert.match(sql, /shadow_mode\s+boolean\s+not null\s+default\s+true/i);
  assert.match(sql, /kill_switch\s+boolean\s+not null\s+default\s+true/i);
  assert.match(sql, /max_level\s+text\s+not null\s+default\s+'L1'/i);
  assert.match(sql, /trust_score\s+numeric\([^)]*\)\s+not null\s+default\s+0/i);
  assert.match(sql, /daily_budget_microusd\s+bigint\s+not null\s+default\s+0/i);
  assert.match(sql, /requests_per_minute\s+integer\s+not null\s+default\s+0/i);
  for (const agent of ['general_manager', 'technical_manager', 'financial_analytics_manager', 'user_assistant']) {
    assert.match(sql, new RegExp(`'${agent}'`, 'i'));
  }
});

test('migration is transactional and contains no destructive or RLS-disabling SQL', () => {
  const sql = executableSql();
  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /commit\s*;\s*$/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|schema|database)\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bauth\./i);
});
