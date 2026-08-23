'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260823190000_market_genesis_durable_replay.sql',
);

function loadSql() {
  assert.equal(
    fs.existsSync(MIGRATION_PATH),
    true,
    'Market Genesis durable replay migration must exist before the SQL authority contract can pass',
  );
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

function compact(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('persists only bounded replay authority with unique hashed nonce and capability identity', () => {
  const sql = loadSql();
  const normalized = compact(sql);

  assert.match(normalized, /create table (if not exists )?public\.market_contact_replay_authority/);
  assert.match(normalized, /capability_id text primary key/);
  assert.match(normalized, /authorization_nonce_hash text not null/);
  assert.match(normalized, /unique\s*\(authorization_nonce_hash\)|authorization_nonce_hash_unique unique\s*\(authorization_nonce_hash\)/);
  assert.match(normalized, /authorization_nonce_hash[^;]*check[^;]*\^\[0-9a-f\]\{64\}\$/);
  assert.match(normalized, /expires_at timestamptz not null/);
  assert.match(normalized, /consumed_at timestamptz/);
  assert.match(normalized, /expires_at\s*>\s*issued_at/);

  for (const forbiddenColumn of [
    'raw_nonce',
    'email',
    'phone',
    'message_body',
    'message_content',
    'checkout',
    'order_status',
    'payment_intent',
    'escrow_state',
    'settlement_state',
    'transaction_state',
    'deal_status',
  ]) {
    assert.equal(
      new RegExp(`\\b${forbiddenColumn}\\s+(text|json|jsonb|uuid|boolean|numeric|integer|bigint|timestamptz)\\b`, 'i').test(sql),
      false,
      `${forbiddenColumn} must not be stored by durable replay authority`,
    );
  }
});

test('forces RLS and exposes no raw browser table authority', () => {
  const normalized = compact(loadSql());

  assert.match(normalized, /alter table public\.market_contact_replay_authority enable row level security/);
  assert.match(normalized, /alter table public\.market_contact_replay_authority force row level security/);
  assert.match(normalized, /revoke all on table public\.market_contact_replay_authority from public, anon, authenticated/);
  assert.doesNotMatch(normalized, /grant\s+(select|insert|update|delete|all)[^;]*market_contact_replay_authority[^;]*to\s+(anon|authenticated)/);
});

test('issues capabilities atomically through a service-role-only security definer RPC', () => {
  const normalized = compact(loadSql());

  assert.match(normalized, /create or replace function public\.issue_market_contact_capability\s*\(/);
  assert.match(normalized, /security definer/);
  assert.match(normalized, /set search_path = pg_catalog/);
  assert.match(normalized, /insert into public\.market_contact_replay_authority/);
  assert.match(normalized, /on conflict do nothing/);
  assert.match(normalized, /get diagnostics [a-z0-9_]+ = row_count/);
  assert.match(normalized, /contact_capability_issued/);
  assert.match(normalized, /contact_replay_or_conflict/);
  assert.match(normalized, /revoke all on function public\.issue_market_contact_capability[^;]+from public, anon, authenticated/);
  assert.match(normalized, /grant execute on function public\.issue_market_contact_capability[^;]+to service_role/);
});

test('consumes handoff authority exactly once with full binding and expiry checks', () => {
  const normalized = compact(loadSql());

  assert.match(normalized, /create or replace function public\.consume_market_contact_capability\s*\(/);
  assert.match(normalized, /security definer/);
  assert.match(normalized, /set search_path = pg_catalog/);
  assert.match(normalized, /update public\.market_contact_replay_authority set consumed_at = statement_timestamp\(\)/);

  for (const predicate of [
    'capability_id = p_capability_id',
    'request_id = p_request_id',
    'requester_subject = p_requester_subject',
    'owner_subject_ref = p_owner_subject_ref',
    'ad_id = p_ad_id',
    'sector_id = p_sector_id',
    'country = p_country',
    'channel = p_channel',
    'policy_version = p_policy_version',
    'physics_version = p_physics_version',
    'consumed_at is null',
    'expires_at > statement_timestamp()',
  ]) {
    assert.ok(normalized.includes(predicate), `consume RPC must enforce: ${predicate}`);
  }

  assert.match(normalized, /get diagnostics [a-z0-9_]+ = row_count/);
  assert.match(normalized, /handoff_capability_consumed/);
  assert.match(normalized, /handoff_replay_or_conflict/);
  assert.match(normalized, /revoke all on function public\.consume_market_contact_capability[^;]+from public, anon, authenticated/);
  assert.match(normalized, /grant execute on function public\.consume_market_contact_capability[^;]+to service_role/);
});
