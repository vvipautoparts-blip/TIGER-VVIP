'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'lc03-supabase-security-rehearsal.yml');

function workflowText() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('LC03 rehearsal binds both jobs to exact PR head or push SHA', () => {
  const workflow = workflowText();
  assert.match(workflow, /SOURCE_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/);
  const exactCheckoutMatches = workflow.match(/ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/g) || [];
  assert.equal(exactCheckoutMatches.length, 2);
  assert.match(workflow, /git rev-parse HEAD/);
});

test('LC03 local DB job emits a structured real proof only after successful reset and drift rehearsal', () => {
  const workflow = workflowText();
  const resetIndex = workflow.indexOf('Rebuild database from repository migrations');
  const driftIndex = workflow.indexOf('Rehearse known Production legacy drift locally');
  const sourceProofIndex = workflow.indexOf('Create LC03 local source proof');
  assert.ok(resetIndex >= 0 && driftIndex > resetIndex && sourceProofIndex > driftIndex);
  assert.match(workflow, /LC03_LOCAL_DB_REBUILD_V1/);
  assert.match(workflow, /local_only_contract/);
  assert.match(workflow, /legacy_drift_rehearsal/);
  assert.match(workflow, /db_reset/);
});

test('LC03 packages local evidence through the bounded local bridge and uploads exact-SHA artifact', () => {
  const workflow = workflowText();
  assert.match(workflow, /buildLocalDbRebuildEvidence/);
  assert.match(workflow, /scripts\/tsrf\/evidence\/local-bridge\.cjs/);
  assert.match(workflow, /candidateDir:\s*path\.join\(process\.env\.RUNNER_TEMP, 'vvip-candidate'\)/);
  assert.match(workflow, /outputDir:\s*path\.join\(process\.env\.RUNNER_TEMP, 'tsrf-local-evidence'\)/);
  assert.match(workflow, /actions\/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f/);
  assert.match(workflow, /name:\s*tsrf-db-rebuild-proof-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(workflow, /if-no-files-found:\s*error/);
});

test('LC03 local evidence path remains local-only and carries no Production or remote mutation authority', () => {
  const workflow = workflowText();
  assert.doesNotMatch(workflow, /supabase\s+db\s+push/i);
  assert.doesNotMatch(workflow, /supabase\s+db\s+(?:reset|push)[^\n]*--linked/i);
  assert.doesNotMatch(workflow, /environment:\s*production/i);
  assert.doesNotMatch(workflow, /PRODUCTION_SERVICE_ROLE|PRODUCTION_DB_PASSWORD|L4_ENABLED/);
  assert.doesNotMatch(workflow, /git\s+merge|gh\s+pr\s+merge|supabase\s+functions\s+deploy/i);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /contents:\s*read/);
});
