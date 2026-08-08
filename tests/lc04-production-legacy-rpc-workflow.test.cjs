'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'lc04-production-legacy-rpc-rehearsal.yml');

function text() {
  return fs.readFileSync(WORKFLOW, 'utf8');
}

test('LC04 workflow is exact-head, read-only, and local-only', () => {
  const workflow = text();
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /SOURCE_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/);
  assert.match(workflow, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /supabase db reset --local/);
  assert.doesNotMatch(workflow, /supabase\s+db\s+push/i);
  assert.doesNotMatch(workflow, /supabase\s+link/i);
  assert.doesNotMatch(workflow, /environment:\s*production/i);
});

test('LC04 workflow fails closed if remote Supabase credentials are present', () => {
  const workflow = text();
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD/);
  assert.match(workflow, /SUPABASE_PROJECT_REF/);
  assert.match(workflow, /LC04_LOCAL_ONLY=BLOCKED_REMOTE_CREDENTIAL_ENV/);
});

test('LC04 workflow runs static contract then local database behavioral assertions', () => {
  const workflow = text();
  const staticIndex = workflow.indexOf('Run LC04 migration contract');
  const resetIndex = workflow.indexOf('Rebuild isolated local database');
  const behaviorIndex = workflow.indexOf('Run LC04 database behavior assertions');
  assert.ok(staticIndex >= 0 && resetIndex > staticIndex && behaviorIndex > resetIndex);
  assert.match(workflow, /tests\/lc04-production-legacy-rpc-hardening\.test\.cjs/);
  assert.match(workflow, /tests\/sql\/lc04-production-legacy-rpc-behavior\.sql/);
});

test('LC04 workflow verifies repository cleanliness after rehearsal', () => {
  const workflow = text();
  assert.match(workflow, /git status --porcelain=v1 -uall/);
  assert.match(workflow, /LC04_LOCAL_REHEARSAL=PASS/);
});
