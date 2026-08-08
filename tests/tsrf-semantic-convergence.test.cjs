const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function readRequired(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  assert.equal(
    fs.existsSync(absolutePath),
    true,
    `TSRF_MISSING_COMPONENT:${relativePath}`,
  );
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertAll(text, expectations, component) {
  for (const [label, pattern] of expectations) {
    assert.match(text, pattern, `${component}:${label}`);
  }
}

test('TSRF trust fabric exists with fail-closed browser authority and shadow defaults', () => {
  const component = 'supabase/migrations/20260808130000_tsrf_ai_trust_fabric.sql';
  const sql = readRequired(component);

  assertAll(sql, [
    ['approval table', /create table if not exists public\.ai_approval_requests/i],
    ['audit table', /create table if not exists public\.ai_audit_events/i],
    ['usage table', /create table if not exists public\.ai_usage_ledger/i],
    ['runtime state', /create table if not exists public\.ai_agent_runtime_state/i],
    ['browser approval revoked', /revoke all on table public\.ai_approval_requests from anon, authenticated/i],
    ['browser audit revoked', /revoke all on table public\.ai_audit_events from anon, authenticated/i],
    ['shadow default', /shadow_mode boolean not null default true/i],
    ['kill switch default', /kill_switch boolean not null default true/i],
    ['L1 default', /max_level text not null default 'L1'/i],
  ], component);
});

test('TSRF runtime atomicity provides server-only reservation with idempotency and release binding', () => {
  const component = 'supabase/migrations/20260808131000_tsrf_ai_runtime_atomicity.sql';
  const sql = readRequired(component);

  assertAll(sql, [
    ['reservation table', /create table if not exists public\.ai_runtime_reservations/i],
    ['idempotency key', /idempotency_key text not null/i],
    ['release digest', /release_digest text not null/i],
    ['unique reservation', /unique\s*\([^)]*idempotency_key[^)]*\)/is],
    ['browser reservation revoked', /revoke all on table public\.ai_runtime_reservations from anon, authenticated/i],
    ['atomic reservation function', /create or replace function public\.reserve_ai_runtime_capacity/i],
    ['browser function revoked', /revoke all on function public\.reserve_ai_runtime_capacity\([^;]+from public, anon, authenticated/is],
  ], component);
});

test('TSRF owner authorization lease is phishing-resistant, exact-bound, expiring, and one-use', () => {
  const component = 'supabase/migrations/20260808132000_tsrf_owner_authorization_leases.sql';
  const sql = readRequired(component);

  assertAll(sql, [
    ['lease table', /create table if not exists public\.ai_owner_stepup_authorizations/i],
    ['release binding', /release_digest text not null/i],
    ['payload binding', /payload_digest text not null/i],
    ['scope binding', /scope_digest text not null/i],
    ['environment binding', /environment text not null/i],
    ['phishing resistant passkey', /WEBAUTHN_PASSKEY/i],
    ['phishing resistant MFA', /IDP_PHISHING_RESISTANT_MFA/i],
    ['expiry', /expires_at timestamptz not null/i],
    ['single-use consume function', /create or replace function public\.consume_ai_owner_stepup_authorization/i],
    ['replay rejection', /STEPUP_REPLAY_OR_CONFLICT/i],
    ['browser table revoked', /revoke all on table public\.ai_owner_stepup_authorizations from anon, authenticated/i],
  ], component);
});

test('TSRF AI edge gateway exists and remains inference-only and fail-closed', () => {
  const component = 'supabase/functions/tiger-sovereign-ai/index.ts';
  const source = readRequired(component);

  assertAll(source, [
    ['disabled fail-closed marker', /AI_DISABLED/],
    ['origin allowlist', /ALLOWED_ORIGINS/],
    ['server-side OpenAI key', /OPENAI_API_KEY/],
    ['no provider retention', /store\s*:\s*false/],
    ['release binding', /release[_A-Za-z]*digest/i],
  ], component);

  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY[^\n]*(window|localStorage|document)/i, `${component}:service-role-client-leak`);
});
