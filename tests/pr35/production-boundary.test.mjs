import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('production adapters contain no endpoint or credential and document fail-closed configuration', () => {
  for (const path of [
    'scripts/pr35/pr35-production-adapter.js',
    'scripts/pr35/pr35-assignment-repository.js'
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /https?:\/\//i);
    assert.doesNotMatch(source, /(supabase_url|anon_key|service_role|api[_-]?key|bearer\s+)/i);
    assert.match(source, /CONFIGURATION_REQUIRED/);
    assert.match(source, /REMOTE_ENFORCEMENT_FAILED/);
  }
});

test('review-only SQL covers the Pass 05 schema and fail-closed RLS design', () => {
  const sql = read('docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql');
  assert.match(sql, /^\/\* REVIEW ONLY — DO NOT APPLY/);
  assert.match(sql, /\bbegin;/i);
  assert.match(sql, /\brollback;\s*$/i);
  for (const table of [
    'roles', 'permissions', 'role_permissions', 'user_role_assignments',
    'permission_requests', 'tiger_care_tickets', 'tiger_care_messages',
    'tiger_care_internal_notes', 'tiger_care_escalations',
    'admin_activity_logs', 'notification_outbox'
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /auth\.jwt\(\)->>'sub'/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.match(sql, /deny self-assignment/i);
  assert.match(sql, /owner-role assignment or revocation/i);
  assert.match(sql, /requester ticket\/message isolation/i);
  assert.match(sql, /revoke insert, update, delete, truncate on public\.admin_activity_logs/i);
  assert.doesNotMatch(sql, /grant\s+.+\s+to\s+service_role/i);
});

test('Pass 05 remains outside migrations and is recorded in change control', () => {
  assert.equal(existsSync(new URL('supabase/migrations/20260714_pr35_owner_control_tiger_care_review.sql', root)), false);
  assert.match(read('docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md'), /Pass 05:/);
  const allowlist = read('docs/launch/pr35/CHANGED_FILES.allowlist').trim().split('\n');
  assert.ok(allowlist.includes('docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql'));
  assert.ok(allowlist.includes('docs/launch/pr35/CODEX_REVIEW_ROUND2.md'));
  assert.ok(allowlist.includes('docs/launch/pr35/CODEX_REVIEW_ROUND3.md'));
  assert.ok(allowlist.includes('tests/pr35/production-boundary.test.mjs'));
  assert.deepEqual(allowlist, [...allowlist].sort());
});
