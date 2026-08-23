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
  '20260823060000_sovereign_action_intents.sql',
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

test('migration creates a bounded persistent action-intent authority with immutable canonical fields', () => {
  const sql = source();

  assert.match(sql, /create table if not exists public\.sovereign_action_intents/i);
  for (const field of [
    'intent_id', 'principal', 'identity_issuer', 'identity_subject', 'action',
    'resource_type', 'resource_id', 'canonical_scope', 'risk_tier',
    'required_proof_classes', 'policy_version', 'authority_version',
    'release_sha', 'release_proof_ref', 'request_nonce_digest',
    'correlation_id', 'intent_digest', 'status', 'created_at', 'expires_at',
  ]) {
    assert.match(sql, new RegExp('\\b' + field + '\\b', 'i'), field);
  }

  assert.match(sql, /intent_digest\s+text[^,]*check[^\n]*\^\[0-9a-f\]\{64\}\$/i);
  assert.match(sql, /status\s+text[^,]*default\s+'PENDING'/i);
});

test('database time is authoritative and client p_now is absent from action-intent functions', () => {
  const sql = source();

  assert.match(sql, /statement_timestamp\(\)/i);
  assert.doesNotMatch(sql, /\bp_now\b/i);

  for (const name of [
    'create_sovereign_action_intent',
    'finalize_sovereign_action_intent',
    'expire_sovereign_action_intent',
  ]) {
    const block = functionBlock(sql, name);
    assert.ok(block, name + ' must exist');
    assert.match(block, /statement_timestamp\(\)/i, name + ' must use database time');
    assert.doesNotMatch(block, /\bp_now\b/i, name + ' cannot accept caller time');
  }
});

test('intent lifetime is database-bounded to no more than 120 seconds and expiry must be after creation', () => {
  const sql = source();
  const createBlock = functionBlock(sql, 'create_sovereign_action_intent');

  assert.match(createBlock, /interval\s+'120 seconds'/i);
  assert.match(createBlock, /p_expires_at\s*>\s*v_server_now/i);
  assert.match(createBlock, /p_expires_at\s*<=\s*v_server_now\s*\+\s*interval\s+'120 seconds'/i);
});

test('nonce digest, correlation id and digest prevent duplicate/replayed intent creation', () => {
  const sql = source();

  assert.match(sql, /unique\s*\(\s*request_nonce_digest\s*\)/i);
  assert.match(sql, /unique\s*\(\s*correlation_id\s*\)/i);
  assert.match(sql, /unique\s*\(\s*intent_digest\s*\)/i);
  assert.match(sql, /request_nonce_digest[^\n]*\^\[0-9a-f\]\{64\}\$/i);
});

test('state machine is fail-closed and only permits explicit terminal transitions', () => {
  const sql = source();

  assert.match(sql, /status\s+in\s*\(\s*'PENDING'\s*,\s*'CONFIRMED'\s*,\s*'EXECUTED'\s*,\s*'DENIED'\s*,\s*'EXPIRED'\s*,\s*'CANCELLED'\s*\)/i);
  const guard = functionBlock(sql, 'guard_sovereign_action_intent_mutation');
  assert.ok(guard);
  assert.match(guard, /PENDING[\s\S]*CONFIRMED/i);
  assert.match(guard, /CONFIRMED[\s\S]*EXECUTED/i);
  assert.match(guard, /DENIED|EXPIRED|CANCELLED/i);
  assert.match(guard, /SOvereign_action_intent.*immutable|transition.*denied/i);
});

test('RLS is enabled and forced; browser roles cannot read or mutate privileged intent authority', () => {
  const sql = source();

  assert.match(sql, /alter table public\.sovereign_action_intents enable row level security/i);
  assert.match(sql, /alter table public\.sovereign_action_intents force row level security/i);
  assert.match(sql, /revoke all on table public\.sovereign_action_intents from public, anon, authenticated/i);

  for (const fn of [
    'create_sovereign_action_intent',
    'get_sovereign_action_intent',
    'finalize_sovereign_action_intent',
    'expire_sovereign_action_intent',
  ]) {
    assert.match(sql, new RegExp('revoke all on function public\\.' + fn + '[^;]* from public, anon, authenticated', 'i'));
    assert.match(sql, new RegExp('grant execute on function public\\.' + fn + '[^;]* to service_role', 'i'));
  }
});

test('canonical action fields cannot be rewritten after insert', () => {
  const sql = source();
  const guard = functionBlock(sql, 'guard_sovereign_action_intent_mutation');

  for (const field of [
    'principal', 'identity_issuer', 'identity_subject', 'action', 'resource_type',
    'resource_id', 'canonical_scope', 'risk_tier', 'required_proof_classes',
    'policy_version', 'authority_version', 'release_sha', 'release_proof_ref',
    'request_nonce_digest', 'correlation_id', 'intent_digest', 'created_at', 'expires_at',
  ]) {
    assert.match(guard, new RegExp('old\\.' + field + '[\\s\\S]*new\\.' + field, 'i'), field);
  }
});

test('service-role create derives canonical row timestamp and never accepts browser execution authority/proof objects', () => {
  const sql = source();
  const createBlock = functionBlock(sql, 'create_sovereign_action_intent');

  assert.doesNotMatch(createBlock, /execution_authority/i);
  assert.doesNotMatch(createBlock, /proof_envelope/i);
  assert.doesNotMatch(createBlock, /grant_id/i);
  assert.doesNotMatch(createBlock, /lease_id/i);
});
