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
  '20260807094000_tiger_sovereign_trust_fabric.sql',
);

function migration() {
  assert.equal(fs.existsSync(migrationPath), true, 'AI-03 trust-fabric migration must exist');
  return fs.readFileSync(migrationPath, 'utf8');
}

test('trust fabric defines the complete privileged control-plane tables', () => {
  const sql = migration();
  for (const table of [
    'ai_approval_requests',
    'ai_audit_events',
    'ai_usage_ledger',
    'ai_prompt_versions',
    'ai_agent_runtime_state',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
  }
});

test('approval rows bind owner, agent, action, exact payload and scope digests, expiry and lifecycle state', () => {
  const sql = migration();
  assert.match(sql, /owner_subject\s+text\s+not null/i);
  assert.match(sql, /requesting_agent\s+text\s+not null/i);
  assert.match(sql, /action\s+text\s+not null/i);
  assert.match(sql, /payload_digest\s+text\s+not null/i);
  assert.match(sql, /scope_digest\s+text\s+not null/i);
  assert.match(sql, /payload_digest\s*~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /scope_digest\s*~\s*'\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /expires_at\s+timestamptz\s+not null/i);
  assert.match(sql, /status\s+text\s+not null\s+default\s+'pending'/i);
  for (const status of ['pending', 'approved', 'rejected', 'consumed', 'expired', 'revoked']) {
    assert.match(sql, new RegExp(`'${status}'`, 'i'));
  }
});

test('L4 approval consumption is atomic, exact payload/scope match, expiring, and service-role only', () => {
  const sql = migration();
  assert.match(sql, /create or replace function public\.consume_ai_owner_approval/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /payload_digest\s*=\s*p_payload_digest/i);
  assert.match(sql, /scope_digest\s*=\s*p_scope_digest/i);
  assert.match(sql, /owner_subject\s*=\s*p_owner_subject/i);
  assert.match(sql, /requesting_agent\s*=\s*p_agent/i);
  assert.match(sql, /action\s*=\s*p_action/i);
  assert.match(sql, /expires_at\s*>=\s*p_now/i);
  assert.match(sql, /status\s*=\s*'approved'/i);
  assert.match(sql, /set\s+status\s*=\s*'consumed'/i);
  assert.match(sql, /revoke all on function public\.consume_ai_owner_approval[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.consume_ai_owner_approval[\s\S]*to service_role/i);
});

test('approval immutable-binding trigger includes scope digest and scope document', () => {
  const sql = migration();
  assert.match(sql, /new\.scope_digest\s+is distinct from\s+old\.scope_digest/i);
  assert.match(sql, /new\.scope\s+is distinct from\s+old\.scope/i);
});

test('audit and usage ledgers are append-only at the database boundary', () => {
  const sql = migration();
  assert.match(sql, /create or replace function public\.reject_ai_append_only_mutation/i);
  for (const table of ['ai_audit_events', 'ai_usage_ledger']) {
    assert.match(sql, new RegExp(`create trigger .*${table}.*before update or delete on public\\.${table}`, 'is'));
  }
});

test('browser roles receive no direct trust-fabric grants or policies', () => {
  const sql = migration();
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i);
  assert.doesNotMatch(sql, /create\s+policy[\s\S]*?to\s+(?:anon|authenticated)/i);
});

test('runtime state starts fail-safe with agents disabled, shadowed and killed', () => {
  const sql = migration();
  assert.match(sql, /enabled\s+boolean\s+not null\s+default\s+false/i);
  assert.match(sql, /shadow_mode\s+boolean\s+not null\s+default\s+true/i);
  assert.match(sql, /kill_switch\s+boolean\s+not null\s+default\s+true/i);
  assert.match(sql, /max_level\s+text\s+not null\s+default\s+'L1'/i);
});
