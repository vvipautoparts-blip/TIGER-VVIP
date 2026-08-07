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
  '20260807104500_tiger_sovereign_runtime_atomicity.sql',
);

function migration() {
  assert.equal(fs.existsSync(migrationPath), true, 'AI-13 atomic runtime migration must exist');
  return fs.readFileSync(migrationPath, 'utf8');
}

test('atomic runtime persistence defines reservations, budget/rate/concurrency counters and audit chain tables', () => {
  const sql = migration();
  for (const table of [
    'ai_runtime_reservations',
    'ai_runtime_daily_counters',
    'ai_runtime_minute_counters',
    'ai_runtime_concurrency_counters',
    'ai_audit_chain_heads',
    'ai_audit_chain_events',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
  }
});

test('runtime reservation rows are bounded, expiring and lifecycle constrained', () => {
  const sql = migration();
  assert.match(sql, /status\s+text\s+not null\s+default\s+'reserved'/i);
  for (const state of ['reserved', 'settled', 'released', 'expired']) assert.match(sql, new RegExp(`'${state}'`, 'i'));
  assert.match(sql, /estimated_cost_microusd\s+bigint\s+not null/i);
  assert.match(sql, /actual_cost_microusd\s+bigint/i);
  assert.match(sql, /expires_at\s+timestamptz\s+not null/i);
  assert.match(sql, /constraint ai_runtime_reservation_cost_check check \(estimated_cost_microusd >= 0\)/i);
  assert.match(sql, /unique\s*\(correlation_id, agent_id\)/i);
});

test('reservation RPC serializes runtime state and all counters before capacity decision', () => {
  const sql = migration();
  assert.match(sql, /create or replace function public\.reserve_ai_runtime_capacity/i);
  assert.match(sql, /from public\.ai_agent_runtime_state[\s\S]*for update/i);
  assert.match(sql, /from public\.ai_runtime_daily_counters[\s\S]*for update/i);
  assert.match(sql, /from public\.ai_runtime_minute_counters[\s\S]*for update/i);
  assert.match(sql, /from public\.ai_runtime_concurrency_counters[\s\S]*for update/i);
  assert.match(sql, /kill_switch\s*=\s*true/i);
  assert.match(sql, /daily_budget_microusd/i);
  assert.match(sql, /requests_per_minute/i);
  assert.match(sql, /max_concurrency/i);
  assert.match(sql, /BUDGET_EXCEEDED/i);
  assert.match(sql, /RATE_LIMIT_EXCEEDED/i);
  assert.match(sql, /CONCURRENCY_LIMIT_EXCEEDED/i);
});

test('settle and release are one-time row-locked transitions that return reserved capacity', () => {
  const sql = migration();
  for (const fn of ['settle_ai_runtime_capacity', 'release_ai_runtime_capacity']) {
    assert.match(sql, new RegExp(`create or replace function public\\.${fn}`, 'i'));
  }
  assert.match(sql, /from public\.ai_runtime_reservations[\s\S]*for update/i);
  assert.match(sql, /status\s*<>\s*'reserved'/i);
  assert.match(sql, /set\s+status\s*=\s*'settled'/i);
  assert.match(sql, /set\s+status\s*=\s*'released'/i);
  assert.match(sql, /greatest\s*\(0,\s*active_count\s*-\s*1\)/i);
  assert.match(sql, /greatest\s*\(0,\s*reserved_cost_microusd\s*-\s*v_reservation\.estimated_cost_microusd\)/i);
});

test('expired reservation reaper uses row locking and returns abandoned capacity', () => {
  const sql = migration();
  assert.match(sql, /create or replace function public\.expire_ai_runtime_reservations/i);
  assert.match(sql, /where status = 'reserved'[\s\S]*expires_at <= p_now[\s\S]*for update skip locked/i);
  assert.match(sql, /set\s+status\s*=\s*'expired'/i);
  assert.match(sql, /greatest\s*\(0,\s*active_count\s*-\s*1\)/i);
});

test('Black Box chain appends under a locked head with exact previous hash and monotonic sequence', () => {
  const sql = migration();
  assert.match(sql, /create or replace function public\.append_ai_audit_chain_event/i);
  assert.match(sql, /from public\.ai_audit_chain_heads[\s\S]*for update/i);
  assert.match(sql, /v_head\.head_hash\s+is distinct from\s+p_previous_hash/i);
  assert.match(sql, /v_next_sequence\s*:=\s*v_head\.sequence_no\s*\+\s*1/i);
  assert.match(sql, /insert into public\.ai_audit_chain_events/i);
  assert.match(sql, /update public\.ai_audit_chain_heads[\s\S]*set head_hash = p_event_hash,[\s\S]*sequence_no = v_next_sequence/i);
  assert.match(sql, /unique\s*\(stream_key, sequence_no\)/i);
  assert.match(sql, /unique\s*\(event_hash\)/i);
});

test('browser roles cannot call privileged runtime RPCs and no SECURITY DEFINER is used', () => {
  const sql = migration();
  assert.doesNotMatch(sql, /security\s+definer/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i);
  for (const fn of [
    'reserve_ai_runtime_capacity',
    'settle_ai_runtime_capacity',
    'release_ai_runtime_capacity',
    'expire_ai_runtime_reservations',
    'append_ai_audit_chain_event',
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*from public, anon, authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to service_role`, 'i'));
  }
});
