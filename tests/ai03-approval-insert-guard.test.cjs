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

test('new approval requests can only enter pending with database-owned lifecycle time', () => {
  const source = sql();
  assert.match(source, /if\s+tg_op\s*=\s*'INSERT'\s+then/i);
  assert.match(source, /new\.status\s*<>\s*'pending'/i);
  assert.match(source, /AI_APPROVAL_INSERT_MUST_BE_PENDING/i);
  for (const field of ['approved_at', 'rejected_at', 'consumed_at', 'revoked_at']) {
    assert.match(source, new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+null`, 'i'));
  }
  assert.doesNotMatch(source, /new\.expired_at/i);
  assert.match(source, /AI_APPROVAL_INSERT_LIFECYCLE_DIRTY/i);
  assert.match(source, /v_now\s+timestamptz\s*:=\s*clock_timestamp\s*\(\s*\)/i);
  assert.match(source, /new\.created_at\s*:=\s*v_now/i);
  assert.match(source, /new\.updated_at\s*:=\s*v_now/i);
  assert.match(source, /new\.expires_at\s*<=\s*v_now/i);
  assert.match(source, /interval\s+'15 minutes'/i);
});

test('approval guard runs before INSERT as well as UPDATE and DELETE', () => {
  const source = sql();
  assert.match(
    source,
    /create\s+trigger\s+ai_approval_requests_mutation_guard\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.ai_approval_requests/i,
  );
});

test('approval identity, reason, release and environment cannot be rewritten after insertion', () => {
  const source = sql();
  for (const field of ['id', 'reason', 'release_digest', 'environment']) {
    assert.match(source, new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`, 'i'));
  }
});

test('approval lifecycle timestamps cannot be supplied during status transitions', () => {
  const source = sql();
  for (const field of ['approved_at', 'rejected_at', 'consumed_at', 'revoked_at']) {
    assert.match(
      source,
      new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`, 'i'),
    );
  }
  assert.match(source, /AI_APPROVAL_TIMESTAMP_MUTATION_FORBIDDEN/i);
});
