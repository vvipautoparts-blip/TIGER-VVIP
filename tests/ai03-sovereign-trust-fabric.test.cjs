'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const foundationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260808130000_tsrf_ai_trust_fabric.sql',
);
const stepupPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260808132000_tsrf_owner_authorization_leases.sql',
);
const hardeningPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260813050000_tiger_sovereign_trust_fabric.sql',
);

function readRequired(filePath, label) {
  assert.equal(fs.existsSync(filePath), true, `${label} must exist`);
  return fs.readFileSync(filePath, 'utf8');
}

function executable(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n\r]*/g, '');
}

function foundation() {
  return executable(readRequired(foundationPath, 'authoritative TSRF trust fabric'));
}

function stepup() {
  return executable(readRequired(stepupPath, 'authoritative TSRF owner step-up lease'));
}

function hardening() {
  return executable(readRequired(hardeningPath, 'AI-03 convergence hardening'));
}

test('AI-03 hardens the authoritative TSRF control plane instead of recreating privileged tables', () => {
  const sql = hardening();
  for (const table of [
    'ai_approval_requests',
    'ai_audit_events',
    'ai_usage_ledger',
    'ai_prompt_versions',
    'ai_agent_runtime_state',
    'ai_owner_stepup_authorizations',
  ]) {
    assert.doesNotMatch(
      sql,
      new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+public\\.${table}\\b`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`, 'i'),
    );
  }
  assert.match(sql, /AI03_TSRF_PREREQUISITE_MISSING/i);
  assert.match(sql, /AI03_TSRF_SCHEMA_MISMATCH/i);
  assert.doesNotMatch(sql, /ai_agent_usage_ledger\s*\(/i);
});

test('authoritative approval rows retain exact release, environment, payload and scope binding', () => {
  const sql = foundation();
  for (const field of [
    /owner_subject\s+text\s+not null/i,
    /requesting_agent\s+text\s+not null/i,
    /action\s+text\s+not null/i,
    /release_digest\s+text\s+not null/i,
    /payload_digest\s+text\s+not null/i,
    /scope_digest\s+text\s+not null/i,
    /environment\s+text\s+not null/i,
    /scope\s+jsonb\s+not null/i,
    /expires_at\s+timestamptz\s+not null/i,
    /status\s+text\s+not null\s+default\s+'pending'/i,
  ]) {
    assert.match(sql, field);
  }
  for (const action of ['merge_pr', 'deploy_production', 'change_prices']) {
    assert.match(sql, new RegExp(`'${action}'`, 'i'));
  }
});

test('L4 approval consumption is row-locked, exact-bound and database-timed with no caller clock', () => {
  const sql = hardening();
  assert.match(
    sql,
    /drop\s+function\s+public\.consume_ai_owner_approval\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*timestamptz\s*\)/i,
  );
  const signature = sql.match(
    /create\s+or\s+replace\s+function\s+public\.consume_ai_owner_approval\s*\(([\s\S]*?)\)\s*returns/i,
  );
  assert.ok(signature, 'consume_ai_owner_approval signature must exist');
  assert.doesNotMatch(signature[1], /p_now|timestamp|timestamptz/i);
  assert.match(sql, /v_now\s+timestamptz\s*:=\s*clock_timestamp\s*\(\s*\)/i);
  assert.match(sql, /select[\s\S]*from\s+public\.ai_approval_requests[\s\S]*for\s+update/i);
  for (const binding of [
    /owner_subject\s*=\s*p_owner_subject/i,
    /requesting_agent\s*=\s*p_agent/i,
    /action\s*=\s*p_action/i,
    /release_digest\s*=\s*p_release_digest/i,
    /payload_digest\s*=\s*p_payload_digest/i,
    /scope_digest\s*=\s*p_scope_digest/i,
    /environment\s*=\s*p_environment/i,
  ]) {
    assert.match(sql, binding);
  }
  assert.match(sql, /set\s+status\s*=\s*'consumed'/i);
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.consume_ai_owner_approval[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.consume_ai_owner_approval[\s\S]*to\s+service_role/i,
  );
});

test('approval mutation guard enforces clean pending inserts and immutable exact bindings', () => {
  const sql = hardening();
  assert.match(sql, /if\s+tg_op\s*=\s*'INSERT'\s+then/i);
  assert.match(sql, /AI_APPROVAL_INSERT_MUST_BE_PENDING/i);
  assert.match(sql, /AI_APPROVAL_INSERT_LIFECYCLE_DIRTY/i);
  assert.match(sql, /AI_APPROVAL_EXPIRY_INVALID/i);
  assert.match(sql, /AI_APPROVAL_SCOPE_TOO_LARGE/i);
  assert.match(sql, /AI_APPROVAL_TIMESTAMP_MUTATION_FORBIDDEN/i);
  assert.match(sql, /AI_APPROVAL_INVALID_TRANSITION/i);
  for (const field of [
    'id',
    'owner_subject',
    'requesting_agent',
    'action',
    'release_digest',
    'payload_digest',
    'scope_digest',
    'environment',
    'scope',
    'decision_passport_id',
    'reason',
    'created_at',
    'expires_at',
  ]) {
    assert.match(sql, new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`, 'i'));
  }
  assert.match(
    sql,
    /create\s+trigger\s+ai_approval_requests_mutation_guard\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.ai_approval_requests/i,
  );
});

test('owner step-up consumption also removes caller-controlled time and stays exact-bound', () => {
  const sql = hardening();
  assert.match(
    sql,
    /drop\s+function\s+public\.consume_ai_owner_stepup_authorization\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*numeric\s*,\s*timestamptz\s*\)/i,
  );
  const signature = sql.match(
    /create\s+or\s+replace\s+function\s+public\.consume_ai_owner_stepup_authorization\s*\(([\s\S]*?)\)\s*returns/i,
  );
  assert.ok(signature, 'consume_ai_owner_stepup_authorization signature must exist');
  assert.doesNotMatch(signature[1], /p_now|timestamp|timestamptz/i);
  assert.match(sql, /STEPUP_RELEASE_MISMATCH/i);
  assert.match(sql, /STEPUP_PAYLOAD_MISMATCH/i);
  assert.match(sql, /STEPUP_SCOPE_MISMATCH/i);
  assert.match(sql, /STEPUP_ENVIRONMENT_MISMATCH/i);
  assert.match(sql, /STEPUP_REPLAY_OR_CONFLICT/i);
  assert.match(stepup(), /WEBAUTHN_PASSKEY/i);
  assert.match(stepup(), /IDP_PHISHING_RESISTANT_MFA/i);
});

test('audit, usage and prompt-version records remain append-only at the authoritative database boundary', () => {
  const sql = foundation();
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.reject_ai_append_only_mutation/i);
  for (const table of ['ai_audit_events', 'ai_usage_ledger', 'ai_prompt_versions']) {
    assert.match(sql, new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${table}`, 'i'));
  }
});

test('runtime state retains fail-safe defaults and AI-03 reasserts them without mutating rows', () => {
  const base = foundation();
  const sql = hardening();
  assert.match(base, /enabled\s+boolean\s+not null\s+default\s+false/i);
  assert.match(base, /shadow_mode\s+boolean\s+not null\s+default\s+true/i);
  assert.match(base, /kill_switch\s+boolean\s+not null\s+default\s+true/i);
  assert.match(base, /max_level\s+text\s+not null\s+default\s+'L1'/i);
  assert.match(base, /trust_score\s+numeric\([^)]*\)\s+not null\s+default\s+0/i);
  assert.match(base, /daily_budget_microusd\s+bigint\s+not null\s+default\s+0/i);
  assert.match(base, /requests_per_minute\s+integer\s+not null\s+default\s+0/i);
  assert.match(sql, /alter\s+column\s+enabled\s+set\s+default\s+false/i);
  assert.match(sql, /alter\s+column\s+shadow_mode\s+set\s+default\s+true/i);
  assert.match(sql, /alter\s+column\s+kill_switch\s+set\s+default\s+true/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.ai_agent_runtime_state\b/i);
});

test('hardening is transactional and contains no table/data destruction or RLS bypass', () => {
  const sql = hardening();
  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /commit\s*;\s*$/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|schema|database)\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bauth\./i);
  assert.doesNotMatch(sql, /security\s+definer/i);
});
