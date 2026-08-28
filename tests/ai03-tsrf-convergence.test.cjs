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

function sql() {
  return fs.readFileSync(migrationPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n\r]*/g, '');
}

test('AI-03 converges on the existing TSRF control plane instead of recreating privileged tables', () => {
  const source = sql();

  for (const table of [
    'ai_approval_requests',
    'ai_audit_events',
    'ai_usage_ledger',
    'ai_prompt_versions',
    'ai_agent_runtime_state',
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+public\\.${table}\\b`, 'i'),
      `AI-03 must harden the existing TSRF ${table} table rather than create a parallel definition`,
    );
  }

  assert.match(source, /to_regclass\s*\(\s*'public\.ai_approval_requests'\s*\)/i);
  assert.match(source, /AI03_TSRF_PREREQUISITE_MISSING/i);
  assert.match(source, /AI03_TSRF_SCHEMA_MISMATCH/i);
});

test('AI-03 preserves authoritative TSRF release and environment bindings', () => {
  const source = sql();
  assert.match(source, /release_digest/i);
  assert.match(source, /environment/i);
  assert.match(source, /new\.release_digest\s+is\s+distinct\s+from\s+old\.release_digest/i);
  assert.match(source, /new\.environment\s+is\s+distinct\s+from\s+old\.environment/i);
});

test('approval consumption removes the legacy caller-clock RPC and binds release/environment exactly', () => {
  const source = sql();

  assert.match(
    source,
    /drop\s+function\s+public\.consume_ai_owner_approval\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*timestamptz\s*\)/i,
    'the legacy p_now approval RPC must be removed, not left callable beside the hardened RPC',
  );

  const signature = source.match(
    /create\s+or\s+replace\s+function\s+public\.consume_ai_owner_approval\s*\(([\s\S]*?)\)\s*returns/i,
  );
  assert.ok(signature, 'hardened consume_ai_owner_approval function must exist');
  assert.doesNotMatch(signature[1], /p_now|timestamp|timestamptz/i);
  for (const parameter of [
    'p_release_digest',
    'p_payload_digest',
    'p_scope_digest',
    'p_environment',
  ]) {
    assert.match(signature[1], new RegExp(`\\b${parameter}\\b`, 'i'));
  }

  assert.match(source, /release_digest\s*=\s*p_release_digest/i);
  assert.match(source, /payload_digest\s*=\s*p_payload_digest/i);
  assert.match(source, /scope_digest\s*=\s*p_scope_digest/i);
  assert.match(source, /environment\s*=\s*p_environment/i);
  assert.match(source, /v_now\s+timestamptz\s*:=\s*clock_timestamp\s*\(\s*\)/i);
  assert.match(source, /for\s+update/i);
});

test('AI-03 keeps TSRF browser isolation and forced RLS while hardening it', () => {
  const source = sql();

  for (const table of [
    'ai_approval_requests',
    'ai_audit_events',
    'ai_usage_ledger',
    'ai_prompt_versions',
    'ai_agent_runtime_state',
  ]) {
    assert.match(
      source,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'),
    );
    assert.match(
      source,
      new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`, 'i'),
    );
  }

  assert.doesNotMatch(source, /security\s+definer/i);
  assert.doesNotMatch(source, /disable\s+row\s+level\s+security/i);
});
