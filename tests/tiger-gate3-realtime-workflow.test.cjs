'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/tiger-gate3-realtime-messaging-rehearsal.yml');
const REHEARSAL = path.join(ROOT, 'tests/sql/tiger-gate3-realtime-messaging.sql');

function readRequired(file, label) {
  assert.equal(fs.existsSync(file), true, `${label} missing: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

test('Gate 3 workflow is exact-SHA, local-only, pinned, and evidence-producing', () => {
  const text = readRequired(WORKFLOW, 'Gate 3 workflow');
  assert.match(text, /SOURCE_SHA:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*&&\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/);
  assert.match(text, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(text, /supabase\/setup-cli@[0-9a-f]{40}/i);
  assert.match(text, /version:\s*2\.109\.0/);
  assert.match(text, /SUPABASE_ACCESS_TOKEN\|SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF/);
  assert.match(text, /supabase start/);
  assert.match(text, /supabase db reset --local/);
  assert.match(text, /node --test[\s\\]+tests\/tiger-gate3-realtime-messaging-db\.test\.cjs[\s\\]+tests\/tiger-gate3-realtime-workflow\.test\.cjs/s);
  assert.match(text, /tests\/sql\/tiger-gate3-realtime-messaging\.sql/);
  assert.match(text, /TIGER_GATE3_DB_REHEARSAL=PASS/);
  assert.match(text, /sha256sum[\s\S]*20260820005000_social_realtime_messaging\.sql[\s\S]*tiger-gate3-realtime-messaging-db\.test\.cjs[\s\S]*tiger-gate3-realtime-workflow\.test\.cjs[\s\S]*tiger-gate3-realtime-messaging\.sql[\s\S]*tiger-gate3-realtime-messaging-rehearsal\.yml/);
  assert.match(text, /name:\s*tiger-gate3-realtime-messaging-rehearsal-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
});

test('Gate 3 DB rehearsal proves the normative messaging invariants and rolls back', () => {
  const text = readRequired(REHEARSAL, 'Gate 3 SQL rehearsal');
  for (const marker of [
    'FRIEND_OPEN_IDEMPOTENT=PASS',
    'EXACTLY_TWO_MEMBERS=PASS',
    'NON_FRIEND_OPEN_DENIED=PASS',
    'THIRD_PARTY_DENIED=PASS',
    'IDEMPOTENT_SEND=PASS',
    'MONOTONIC_SEQUENCE=PASS',
    'KEYSET_CATCHUP=PASS',
    'READ_CURSOR_MONOTONIC=PASS',
    'READ_CURSOR_TAIL_BOUND=PASS',
    'BLOCK_SEND_TICKET_DENIED=PASS',
    'OLD_EPOCH_DENIED=PASS',
    'UNBLOCK_EPOCH_ADVANCED=PASS',
    'CURRENT_EPOCH_AUTHORIZED=PASS',
    'REALTIME_PRESENCE_ONLY=PASS',
    'TIGER_GATE3_DB_REHEARSAL=PASS',
  ]) {
    assert.match(text, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(text, /rollback\s*;/i);
});
