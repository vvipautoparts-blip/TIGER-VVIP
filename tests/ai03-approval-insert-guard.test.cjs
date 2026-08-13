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

test('new approval requests can only enter the database as pending with clean lifecycle timestamps', () => {
  const source = sql();
  assert.match(source, /if\s+tg_op\s*=\s*'INSERT'\s+then/i);
  assert.match(source, /new\.status\s*<>\s*'pending'/i);
  assert.match(source, /AI_APPROVAL_INSERT_MUST_BE_PENDING/i);
  for (const field of ['approved_at', 'rejected_at', 'consumed_at', 'expired_at', 'revoked_at']) {
    assert.match(source, new RegExp(`new\\.${field}\\s+is\\s+not\\s+null`, 'i'));
  }
  assert.match(source, /AI_APPROVAL_INSERT_LIFECYCLE_DIRTY/i);
  assert.match(source, /new\.created_at\s*:=\s*clock_timestamp\s*\(\s*\)/i);
});

test('approval guard runs before INSERT as well as UPDATE and DELETE', () => {
  const source = sql();
  assert.match(
    source,
    /create\s+trigger\s+ai_approval_requests_guard\s+before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.ai_approval_requests/i,
  );
});

test('approval identity and request reason cannot be rewritten after insertion', () => {
  const source = sql();
  assert.match(source, /new\.id\s+is\s+distinct\s+from\s+old\.id/i);
  assert.match(source, /new\.reason\s+is\s+distinct\s+from\s+old\.reason/i);
});
