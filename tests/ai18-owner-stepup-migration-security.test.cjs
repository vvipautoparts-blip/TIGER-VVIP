'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_RELATIVE = 'supabase/migrations/20260807173000_tiger_sovereign_owner_stepup_authorization.sql';
const MIGRATION = path.join(__dirname, '..', ...MIGRATION_RELATIVE.split('/'));

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, 'AI-18 step-up migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('AI-18 migration persists only non-secret step-up authorization metadata', () => {
  const source = sql();
  assert.match(source, /create table if not exists public\.ai_owner_stepup_authorizations/i);
  assert.match(source, /challenge_id text not null/i);
  assert.match(source, /owner_subject text not null/i);
  assert.match(source, /release_digest text not null/i);
  assert.match(source, /payload_digest text not null/i);
  assert.match(source, /scope_digest text not null/i);
  assert.match(source, /nonce_hash text not null/i);
  assert.match(source, /authenticator_reference_hash text not null/i);
  assert.match(source, /verification_digest text not null/i);

  assert.doesNotMatch(source, /\bpasscode\b|\bp_passcode\b|\bpassword\b|\bstatic_pin\b/i);
});

test('AI-18 database boundary is fail-closed to browser roles', () => {
  const source = sql();
  assert.match(source, /alter table public\.ai_owner_stepup_authorizations enable row level security/i);
  assert.match(source, /revoke all on table public\.ai_owner_stepup_authorizations from anon, authenticated/i);
  assert.match(source, /grant select, insert, update on table public\.ai_owner_stepup_authorizations to service_role/i);
  assert.doesNotMatch(source, /grant\s+[^;]*on table public\.ai_owner_stepup_authorizations\s+to\s+(anon|authenticated)/i);
});

test('AI-18 migration permits only phishing-resistant approved methods', () => {
  const source = sql();
  assert.match(source, /auth_method in \(\s*'WEBAUTHN_PASSKEY',\s*'IDP_PHISHING_RESISTANT_MFA'\s*\)/i);
  assert.match(source, /assurance = 'PHISHING_RESISTANT'/i);
  assert.doesNotMatch(source, /'STATIC_PASSCODE'|'SMS_OTP'|'PASSWORD_ONLY'/i);
});

test('AI-18 action/environment binding is enforced in SQL', () => {
  const source = sql();
  assert.match(source, /MERGE_RELEASE[\s\S]*REPOSITORY/i);
  assert.match(source, /PROMOTE_DATABASE[\s\S]*PRODUCTION/i);
  assert.match(source, /ACTIVATE_PRODUCTION[\s\S]*PRODUCTION/i);
  assert.match(source, /CHANGE_PRICES[\s\S]*PRODUCTION/i);
  assert.match(source, /CHANGE_OWNER_SECURITY[\s\S]*PRODUCTION/i);
  assert.match(source, /CHANGE_AI_SECURITY_POLICY[\s\S]*PRODUCTION/i);
});

test('AI-18 authorization binding fields are immutable and rows cannot be deleted', () => {
  const source = sql();
  assert.match(source, /create or replace function public\.guard_ai_owner_stepup_mutation\(\)/i);
  assert.match(source, /AI_OWNER_STEPUP_DELETE_FORBIDDEN/i);
  assert.match(source, /AI_OWNER_STEPUP_IMMUTABLE_BINDING/i);
  for (const field of [
    'challenge_id', 'owner_subject', 'action', 'release_digest', 'payload_digest', 'scope_digest',
    'environment', 'verifier_id', 'auth_method', 'assurance', 'authenticator_reference_hash', 'nonce_hash',
    'verification_digest', 'verified_at', 'expires_at',
  ]) {
    assert.match(source, new RegExp(`new\\.${field} is distinct from old\\.${field}`, 'i'));
  }
});

test('AI-18 persistent consumption is one-time, row-locked and exactly transaction-bound', () => {
  const source = sql();
  assert.match(source, /create or replace function public\.consume_ai_owner_stepup_authorization\(/i);
  assert.match(source, /for update/i);
  assert.match(source, /v_authorization\.status <> 'verified'/i);
  assert.match(source, /v_authorization\.owner_subject <> p_owner_subject/i);
  assert.match(source, /v_authorization\.action <> p_action/i);
  assert.match(source, /v_authorization\.release_digest <> p_release_digest/i);
  assert.match(source, /v_authorization\.payload_digest <> p_payload_digest/i);
  assert.match(source, /v_authorization\.scope_digest <> p_scope_digest/i);
  assert.match(source, /v_authorization\.environment <> p_environment/i);
  assert.match(source, /set status = 'consumed', consumed_at = p_now/i);
  assert.match(source, /and status = 'verified'/i);
  assert.match(source, /get diagnostics v_rows = row_count/i);
  assert.match(source, /STEPUP_REPLAY_OR_CONFLICT/i);
});

test('AI-18 SQL does not use SECURITY DEFINER for the authorization boundary', () => {
  const source = sql();
  assert.doesNotMatch(source, /security\s+definer/i);
  assert.match(source, /revoke all on function public\.consume_ai_owner_stepup_authorization/i);
  assert.match(source, /grant execute on function public\.consume_ai_owner_stepup_authorization[\s\S]*to service_role/i);
});
