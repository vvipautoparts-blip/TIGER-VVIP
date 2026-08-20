'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/tiger-gate4-notification-intelligence-rehearsal.yml');
const REHEARSAL = path.join(ROOT, 'tests/sql/tiger-gate4-notification-intelligence.sql');

function readRequired(file, label) {
  assert.equal(fs.existsSync(file), true, `${label} missing: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

test('Gate 4 workflow is exact-SHA, pinned, local-only and evidence-producing', () => {
  const text = readRequired(WORKFLOW, 'Gate 4 workflow');
  assert.match(text, /SOURCE_SHA:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*&&\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/);
  assert.match(text, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(text, /actions\/setup-node@[0-9a-f]{40}/i);
  assert.match(text, /denoland\/setup-deno@[0-9a-f]{40}/i);
  assert.match(text, /supabase\/setup-cli@[0-9a-f]{40}/i);
  assert.match(text, /version:\s*2\.109\.0/);
  assert.match(text, /SUPABASE_ACCESS_TOKEN\|SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF/);
  assert.match(text, /supabase start/);
  assert.match(text, /supabase db reset --local/);
  assert.match(text, /deno\s+(?:test|check)/i);
  assert.match(text, /tests\/sql\/tiger-gate4-notification-intelligence\.sql/);
  assert.match(text, /TIGER_GATE4_DB_REHEARSAL=PASS/);
  assert.match(text, /sha256sum[\s\S]*20260820006000_notification_intelligence\.sql[\s\S]*20260820006100_notification_worker_hmac_boundary\.sql[\s\S]*tiger-notification-worker[\s\S]*tiger-gate4-notification-intelligence-db\.test\.cjs[\s\S]*tiger-gate4-notification-workflow\.test\.cjs[\s\S]*tiger-gate4-notification-intelligence\.sql[\s\S]*tiger-gate4-notification-intelligence-rehearsal\.yml/);
  assert.match(text, /name:\s*tiger-gate4-notification-intelligence-rehearsal-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
});

test('Gate 4 SQL rehearsal proves mandatory invariants, worker replay protection and rolls back', () => {
  const text = readRequired(REHEARSAL, 'Gate 4 SQL rehearsal');
  for (const marker of [
    'IDEMPOTENT_NOTIFICATION=PASS',
    'MONOTONIC_SEQUENCE=PASS',
    'THIRD_PARTY_DENIED=PASS',
    'LEGACY_AUTHORITY_CLOSED=PASS',
    'UNREAD_CONSISTENT=PASS',
    'MANDATORY_DURABLE=PASS',
    'OPTIONAL_DISABLE=PASS',
    'SAME_VIEW_SUPPRESS_PUSH=PASS',
    'STALE_LEASE_BACKGROUND=PASS',
    'PRIVATE_PREVIEW_REDACTED=PASS',
    'ENDPOINT_OWNER_BOUND=PASS',
    'ENDPOINT_SECRET_HIDDEN=PASS',
    'WORKER_NONCE_FIRST_USE=PASS',
    'WORKER_NONCE_REPLAY_DENIED=PASS',
    'WORKER_NONCE_EXPIRED_DENIED=PASS',
    'STALE_WORKER_DENIED=PASS',
    'RETRY_BUDGET_DLQ=PASS',
    'INVALID_ENDPOINT_TERMINAL=PASS',
    'TTL_EXPIRED_TERMINAL=PASS',
    'KILL_SWITCH_TRANSPORT_ONLY=PASS',
    'REALTIME_OWNER_ONLY=PASS',
    'BROWSER_BROADCAST_DENIED=PASS',
    'KEYSET_CATCHUP=PASS',
    'TIGER_GATE4_DB_REHEARSAL=PASS',
  ]) {
    assert.match(text, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(text, /rollback\s*;/i);
});
