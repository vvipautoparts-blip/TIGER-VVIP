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

test('LC04 workflow verifies canonical no-synthesis before Production-drift convergence', () => {
  const workflow = text();
  const staticIndex = workflow.indexOf('Run LC04 migration contract');
  const resetIndex = workflow.indexOf('Rebuild isolated local database');
  const canonicalIndex = workflow.indexOf('Verify canonical build does not synthesize legacy helpers');
  const driftIndex = workflow.indexOf('Rehearse observed Production legacy helper drift');
  assert.ok(
    staticIndex >= 0 && resetIndex > staticIndex && canonicalIndex > resetIndex && driftIndex > canonicalIndex,
  );
  assert.match(workflow, /tests\/sql\/lc04-production-legacy-rpc-behavior\.sql/);
  assert.match(workflow, /tests\/sql\/lc04-production-legacy-drift-fixture\.sql/);
  assert.match(workflow, /20260808134000_lc04_production_legacy_rpc_hardening\.sql/);
  assert.match(workflow, /tests\/sql\/lc04-production-legacy-drift-convergence\.sql/);
});

test('LC04 workflow emits exact migration digest evidence before database rehearsal', () => {
  const workflow = text();
  assert.match(workflow, /Emit exact LC04 migration SHA-256/);
  assert.match(workflow, /sha256sum supabase\/migrations\/20260808134000_lc04_production_legacy_rpc_hardening\.sql/);
  assert.match(workflow, /actions\/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f/);
  assert.match(workflow, /lc04-migration-sha256-/);
  assert.match(workflow, /if-no-files-found:\s*error/);
});

test('LC04 workflow verifies repository cleanliness after rehearsal', () => {
  const workflow = text();
  assert.match(workflow, /git status --porcelain=v1 -uall/);
  assert.match(workflow, /LC04_LOCAL_REHEARSAL=PASS/);
});
