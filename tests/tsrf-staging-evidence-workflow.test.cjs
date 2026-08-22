'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'tsrf-staging-evidence.yml');

function workflowText() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('staging evidence workflow is manual, least-privilege, and checks out exact requested SHA', () => {
  const workflow = workflowText();
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /source_sha:/);
  assert.match(workflow, /proof_artifact_id:/);
  assert.match(workflow, /permissions:[\s\S]*?actions:\s*read[\s\S]*?contents:\s*read/);
  assert.match(workflow, /uses:\s*actions\/checkout@b4ffde65f46336ab88eb53be808477a3936bae11/);
  assert.match(workflow, /ref:\s*\$\{\{\s*inputs\.source_sha\s*\}\}/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /git rev-parse HEAD\^\{tree\}/);
  assert.match(workflow, /HEAD_MISMATCH/);
});

test('workflow derives runner identity, model configuration, and producer authority only from trusted GitHub context', () => {
  const workflow = workflowText();
  assert.match(workflow, /github\.run_id/);
  assert.match(workflow, /runner\.os/);
  assert.match(workflow, /runner\.arch/);
  assert.match(workflow, /environment:\s*staging/);
  assert.match(workflow, /vars\.TIGER_AI_OPENAI_MODEL/);
  assert.match(workflow, /vars\.TIGER_AI_PROMPT_VERSION/);
  assert.match(workflow, /vars\.TIGER_AI_MAX_OUTPUT_TOKENS/);
  assert.match(workflow, /vars\.TIGER_IDENTITY_VERIFIER_URL/);
  assert.match(workflow, /vars\.TSRF_STAGING_PROOF_PRODUCER_WORKFLOW_ID/);
  assert.match(workflow, /BLOCKED_STAGING_IDENTITY_UNPROVEN/);
  assert.match(workflow, /BLOCKED_STAGING_PRODUCER_UNPROVEN/);

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
    'producer_workflow_id',
  ]) {
    assert.doesNotMatch(inputBlock, new RegExp(`\\b${forbidden}\\s*:`));
  }
});

test('workflow retrieves proof bytes only from an exact-SHA successful allowlisted producer run', () => {
  const workflow = workflowText();
  assert.match(workflow, /Download trusted same-SHA Staging proof artifact/);
  assert.match(workflow, /inputs\.proof_artifact_id/);
  assert.match(workflow, /actions\/artifacts\/\$?\{?PROOF_ARTIFACT_ID\}?/);
  assert.match(workflow, /actions\/runs\/\$?\{?producer_run_id\}?/);
  assert.match(workflow, /tsrf-staging-source-proof-\$\{?SOURCE_SHA\}?/);
  assert.match(workflow, /artifact\.workflow_run\.head_sha/);
  assert.match(workflow, /producerRun\.head_sha/);
  assert.match(workflow, /producerRun\.workflow_id/);
  assert.match(workflow, /producerRun\.status\s*!==\s*['"]completed['"]/);
  assert.match(workflow, /producerRun\.conclusion\s*!==\s*['"]success['"]/);
  assert.match(workflow, /BLOCKED_STAGING_PRODUCER_UNPROVEN/);
  assert.match(workflow, /unzip\s+-Z1/);
  assert.match(workflow, /proof-input\.json/);
  assert.match(workflow, /source-proof\.json/);
});

test('workflow writes evidence only under runner temp and binds artifact name to exact source SHA', () => {
  const workflow = workflowText();
  assert.match(workflow, /RUNNER_TEMP/);
  assert.match(workflow, /tsrf-.*\$\{\{\s*inputs\.source_sha\s*\}\}/i);
  assert.match(workflow, /actions\/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f/);
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
