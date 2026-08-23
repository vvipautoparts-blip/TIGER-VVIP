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
  '20260823051000_owner_sealed_disclosure_runtime.sql',
);

function sql() {
  return fs.readFileSync(migrationPath, 'utf8');
}

function functionBlock(source, name) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b[\\s\\S]*?\\$\\$;`,
    'i',
  );
  return source.match(pattern)?.[0] || '';
}

test('migration persists immutable disclosure requests, append-only events, and single-use leases', () => {
  const source = sql();

  assert.match(source, /create table if not exists public\.owner_sealed_disclosure_requests/i);
  assert.match(source, /create table if not exists public\.owner_sealed_disclosure_events/i);
  assert.match(source, /create table if not exists public\.owner_sealed_disclosure_leases/i);

  for (const field of [
    'request_id',
    'requester',
    'artifact_id',
    'classification',
    'artifact_scope_digest',
    'purpose',
    'nonce_digest',
    'challenge_digest',
    'owner_authorization_id',
    'audit_evidence_ref',
    'status',
    'issued_at',
    'not_before',
    'expires_at',
    'consumed_at',
    'revoked_at',
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`, 'i'));
  }

  assert.match(source, /OWNER_SEALED_DISCLOSURE_REQUEST_IMMUTABLE/);
  assert.match(source, /OWNER_SEALED_DISCLOSURE_EVENT_IMMUTABLE/);
  assert.match(source, /before\s+delete\s+or\s+update\s+on\s+public\.owner_sealed_disclosure_requests/i);
  assert.match(source, /before\s+delete\s+or\s+update\s+on\s+public\.owner_sealed_disclosure_events/i);
});

test('owner step-up authority explicitly supports APPROVE_DISCLOSURE without weakening existing actions', () => {
  const source = sql();

  assert.match(source, /APPROVE_DISCLOSURE/);
  assert.match(source, /ai_owner_stepup_action_check/i);
  assert.match(source, /MERGE_RELEASE/);
  assert.match(source, /PROMOTE_DATABASE/);
  assert.match(source, /ACTIVATE_PRODUCTION/);
  assert.match(source, /CHANGE_OWNER_SECURITY/);
  assert.match(source, /CHANGE_AI_SECURITY_POLICY/);
});

test('all disclosure persistence is RLS enabled+forced and browser roles have no mutation authority', () => {
  const source = sql();
  for (const table of [
    'owner_sealed_disclosure_requests',
    'owner_sealed_disclosure_events',
    'owner_sealed_disclosure_leases',
  ]) {
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(source, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(source, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
  }

  assert.doesNotMatch(source, /grant\s+(?:insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i);
});

test('issue_disclosure_lease is service-role-only, database-time authoritative, and has no caller time parameter', () => {
  const source = sql();
  const issue = functionBlock(source, 'issue_disclosure_lease');

  assert.notEqual(issue, '');
  assert.match(issue, /security\s+definer\s+set\s+search_path\s*=\s*public,\s*pg_temp/i);
  assert.match(issue, /statement_timestamp\(\)/i);
  assert.doesNotMatch(issue, /\bp_now\b/i);
  assert.match(source, /revoke all on function public\.issue_disclosure_lease[^;]* from public, anon, authenticated/i);
  assert.match(source, /grant execute on function public\.issue_disclosure_lease[^;]* to service_role/i);
});

test('owner-sealed issuance locks and consumes the exact owner authorization in the same transaction', () => {
  const source = sql();
  const issue = functionBlock(source, 'issue_disclosure_lease');

  assert.match(issue, /classification\s+in\s*\([^)]*'CONFIDENTIAL'[^)]*'OWNER_ONLY'/is);
  assert.match(issue, /from public\.ai_owner_stepup_authorizations/i);
  assert.match(issue, /for update/i);
  assert.match(issue, /owner_subject\s*<>\s*'owner:root'/i);
  assert.match(issue, /action\s*<>\s*'APPROVE_DISCLOSURE'/i);
  assert.match(issue, /assurance\s*<>\s*'PHISHING_RESISTANT'/i);
  assert.match(issue, /payload_digest\s*<>\s*p_challenge_digest/i);
  assert.match(issue, /scope_digest\s*<>\s*p_artifact_scope_digest/i);
  assert.match(issue, /nonce_hash\s*<>\s*p_nonce_digest/i);
  assert.match(issue, /status\s*<>\s*'verified'/i);
  assert.match(issue, /update public\.ai_owner_stepup_authorizations[\s\S]*status\s*=\s*'consumed'/i);

  const lock = issue.search(/for update/i);
  const consume = issue.search(/update public\.ai_owner_stepup_authorizations/i);
  const leaseInsert = issue.search(/insert into public\.owner_sealed_disclosure_leases/i);
  assert.ok(lock >= 0 && consume > lock && leaseInsert > consume, 'owner authorization must lock+consume before lease insert');
});

test('one owner authorization and one request cannot issue multiple different leases', () => {
  const source = sql();

  assert.match(source, /unique\s*\(\s*request_id\s*\)/i);
  assert.match(source, /unique\s*\(\s*owner_authorization_id\s*\)/i);
  assert.match(source, /DISCLOSURE_LEASE_ALREADY_ISSUED|DISCLOSURE_REQUEST_CONFLICT/);
});

test('issued lease is exact-bound to every disclosure request invariant', () => {
  const source = sql();
  const issue = functionBlock(source, 'issue_disclosure_lease');

  for (const field of [
    'p_request_id',
    'p_requester',
    'p_artifact_id',
    'p_classification',
    'p_artifact_scope_digest',
    'p_purpose',
    'p_nonce_digest',
    'p_challenge_digest',
    'p_audit_evidence_ref',
  ]) {
    assert.match(issue, new RegExp(`\\b${field}\\b`, 'i'));
  }

  assert.match(issue, /owner_authorization_id/i);
  assert.match(issue, /expires_at/i);
  assert.match(issue, /not_before/i);
});

test('consume_disclosure_lease is atomic, exact-bound, database-time authoritative, and single-use', () => {
  const source = sql();
  const consume = functionBlock(source, 'consume_disclosure_lease');

  assert.notEqual(consume, '');
  assert.match(consume, /security\s+definer\s+set\s+search_path\s*=\s*public,\s*pg_temp/i);
  assert.match(consume, /statement_timestamp\(\)/i);
  assert.doesNotMatch(consume, /\bp_now\b/i);
  assert.match(consume, /from public\.owner_sealed_disclosure_leases/i);
  assert.match(consume, /for update/i);
  assert.match(consume, /status\s*<>\s*'ISSUED'/i);

  for (const field of [
    'request_id',
    'requester',
    'artifact_id',
    'classification',
    'artifact_scope_digest',
    'purpose',
    'nonce_digest',
    'challenge_digest',
  ]) {
    assert.match(consume, new RegExp(`\\b${field}\\b`, 'i'));
  }

  assert.match(consume, /update public\.owner_sealed_disclosure_leases[\s\S]*status\s*=\s*'CONSUMED'/i);
  assert.match(consume, /DISCLOSURE_LEASE_CONSUMED/);
  assert.match(consume, /DISCLOSURE_LEASE_REPLAY_OR_CONFLICT/);
  assert.match(source, /revoke all on function public\.consume_disclosure_lease[^;]* from public, anon, authenticated/i);
  assert.match(source, /grant execute on function public\.consume_disclosure_lease[^;]* to service_role/i);
});

test('lease lifetime is bounded by request expiry and owner authorization expiry when owner-sealed', () => {
  const issue = functionBlock(sql(), 'issue_disclosure_lease');

  assert.match(issue, /least\s*\(/i);
  assert.match(issue, /p_request_expires_at/i);
  assert.match(issue, /v_owner_authorization\.expires_at/i);
});

test('migration never stores or accepts raw reusable approval secrets', () => {
  const source = sql();

  assert.doesNotMatch(source, /approval[_-]?code/i);
  assert.doesNotMatch(source, /\botp\b/i);
  assert.doesNotMatch(source, /\bpassword\b/i);
  assert.doesNotMatch(source, /authorization_header/i);
  assert.doesNotMatch(source, /bearer_token/i);
});

test('migration is source-only and contains no remote apply/deployment command', () => {
  const source = sql();

  assert.doesNotMatch(source, /supabase\s+db\s+push/i);
  assert.doesNotMatch(source, /psql\s+/i);
  assert.doesNotMatch(source, /deploy-pages|functions\s+deploy/i);
});
