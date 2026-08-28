'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RUNBOOK = path.join(ROOT, 'docs', 'operations', 'TIGER_MEDIA_DB_CONVERGENCE_RUNBOOK.md');

function loadRunbook() {
  assert.equal(fs.existsSync(RUNBOOK), true, 'MEDIA_DB_CONVERGENCE_RUNBOOK_MISSING');
  return fs.readFileSync(RUNBOOK, 'utf8').replace(/\r/g, '');
}

test('runbook pins the exact Seoul production authority and migration set', () => {
  const text = loadRunbook();
  for (const token of [
    'OWNER-ONLY MUTATION BOUNDARY',
    'zelcngyyvbomuzokvuxo',
    'ap-northeast-2',
    '20260816090001',
    '20260827120000',
    'tests/sql/media-finalizer-live-verification.sql',
    'config/media-finalizer-supabase-advisor-classification.json',
    'scripts/release/media-cell-db-convergence-evidence.cjs',
    'DB_CONVERGENCE=VERIFIED_LIVE',
    'evidenceSha256',
  ]) {
    assert.match(text, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `MEDIA_DB_RUNBOOK_TOKEN_MISSING:${token}`);
  }
});

test('runbook requires exact protected main and local rehearsal before owner promotion', () => {
  const text = loadRunbook();
  assert.match(text, /git\s+status\s+--porcelain/i);
  assert.match(text, /git\s+rev-parse\s+HEAD/i);
  assert.match(text, /origin\/main/i);
  assert.match(text, /TIGER Media Finalizer DB Rehearsal/i);
  assert.match(text, /9\/9/i);
  assert.match(text, /all\s+\*\*9\/9\*\*\s+required protected PR workflows GREEN,[^\n]*including[^\n]*TIGER Media Finalizer DB Rehearsal/i);
  assert.doesNotMatch(text, /\*\*9\/9\*\*[^\n]*plus[^\n]*TIGER Media Finalizer DB Rehearsal/i);
  assert.match(text, /pending migration set[^\n]*exactly/i);
});

test('runbook keeps production mutation owner-only and explicitly forbids unsafe agent actions', () => {
  const text = loadRunbook();
  assert.match(text, /autonomous agents?\s+(?:must|shall)\s+not/i);
  assert.match(text, /owner[^\n]*executes?[^\n]*promotion/i);
  for (const forbidden of [
    'supabase link',
    'supabase db push',
    'supabase db reset',
    'supabase migration repair',
    'destructive rollback',
    'remote DDL',
    'remote DML',
  ]) {
    assert.match(text, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `MEDIA_DB_RUNBOOK_FORBIDDEN_RULE_MISSING:${forbidden}`);
  }
});

test('runbook closes the anonymous-auth advisor condition before VERIFIED_LIVE', () => {
  const text = loadRunbook();
  assert.match(text, /Supabase Anonymous Sign-ins/i);
  assert.match(text, /disable/i);
  assert.match(text, /auth_allow_anonymous_sign_ins/i);
  assert.match(text, /must be absent/i);
  assert.match(text, /authenticated_security_definer_function_executable/i);
  assert.match(text, /INTENTIONAL_AND_TESTED/i);
});

test('post-apply verification is read-only, bounded, and fail-closed', () => {
  const text = loadRunbook();
  assert.match(text, /read-only live verification/i);
  assert.match(text, /Supabase Advisors/i);
  assert.match(text, /fail closed/i);
  assert.match(text, /no user rows/i);
  assert.match(text, /no storage object contents/i);
  assert.match(text, /VERIFIED_LIVE[^\n]*only/i);
});
