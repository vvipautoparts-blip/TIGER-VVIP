'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const CHECKOUT_V7_SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const UPLOAD_ARTIFACT_V6_SHA = 'b7c566a772e6b6bfb58ed0dc250532a479d7789f';
const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'tsrf-staging-evidence.yml');

function workflowText() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('staging evidence workflow is manual, read-only, and checks out exact requested SHA', () => {
  const workflow = workflowText();
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /source_sha:/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, new RegExp(`uses:\\s*actions\\/checkout@${CHECKOUT_V7_SHA}`));
  assert.match(workflow, /ref:\s*\$\{\{\s*inputs\.source_sha\s*\}\}/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /git rev-parse HEAD\^\{tree\}/);
  assert.match(workflow, /HEAD_MISMATCH/);
});

test('workflow derives runner identity and model configuration only from trusted GitHub context', () => {
  const workflow = workflowText();
  assert.match(workflow, /github\.run_id/);
  assert.match(workflow, /runner\.os/);
  assert.match(workflow, /runner\.arch/);
  assert.match(workflow, /environment:\s*staging/);
  assert.match(workflow, /vars\.TIGER_AI_OPENAI_MODEL/);
  assert.match(workflow, /vars\.TIGER_AI_PROMPT_VERSION/);
  assert.match(workflow, /vars\.TIGER_AI_MAX_OUTPUT_TOKENS/);
  assert.match(workflow, /vars\.TIGER_IDENTITY_VERIFIER_URL/);
  assert.match(workflow, /BLOCKED_STAGING_IDENTITY_UNPROVEN/);

  const inputBlock = workflow.match(/workflow_dispatch:[\s\S]*?permissions:/)?.[0] || '';
  for (const forbidden of [
    'workflow_run_id',
    'runner_identity',
    'authorized',
    'productionReady',
    'model',
    'prompt_version',
    'max_output_tokens',
    'provider_endpoint',
  ]) {
    assert.doesNotMatch(inputBlock, new RegExp(`\\b${forbidden}\\s*:`));
  }
});

test('workflow writes evidence only under runner temp and binds artifact name to exact source SHA', () => {
  const workflow = workflowText();
  assert.match(workflow, /RUNNER_TEMP/);
  assert.match(workflow, /tsrf-.*\$\{\{\s*inputs\.source_sha\s*\}\}/i);
  assert.match(workflow, new RegExp(`actions\\/upload-artifact@${UPLOAD_ARTIFACT_V6_SHA}`));
  assert.match(workflow, /if-no-files-found:\s*error/);
});

test('workflow contains no Production mutation, merge, L4, or remote DB promotion path', () => {
  const workflow = workflowText();
  assert.doesNotMatch(workflow, /supabase\s+db\s+push/i);
  assert.doesNotMatch(workflow, /environment:\s*production/i);
  assert.doesNotMatch(workflow, /PRODUCTION_DB_PASSWORD|PRODUCTION_SERVICE_ROLE|L4_ENABLED/);
  assert.doesNotMatch(workflow, /git\s+merge|gh\s+pr\s+merge|enable[_ -]?l4/i);
  assert.doesNotMatch(workflow, /deploy-pages|supabase\s+functions\s+deploy/i);
});

test('workflow explicitly refuses to fabricate a Staging proof source', () => {
  const workflow = workflowText();
  assert.match(workflow, /BLOCKED_NO_SAME_SHA_STAGING_PROOF/);
  assert.match(workflow, /same[-_ ]sha/i);
  assert.doesNotMatch(workflow, /result:\s*PASS[\s\S]*BLOCKED_NO_SAME_SHA_STAGING_PROOF/);
});
