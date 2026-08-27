'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-infra-rehearsal.yml');

function readWorkflow() {
  assert.equal(fs.existsSync(WORKFLOW), true, 'MEDIA_INFRA_REHEARSAL_WORKFLOW_REQUIRED');
  return fs.readFileSync(WORKFLOW, 'utf8').replace(/\r/g, '');
}

test('media IaC has an exact-head pull-request rehearsal that runs real cfn-lint and CloudFormation Guard', () => {
  const workflow = readWorkflow();

  assert.match(workflow, /^name: TIGER Media Finalizer Infra Rehearsal$/m);
  assert.match(workflow, /^  pull_request:\s*$/m);
  assert.match(workflow, /infra\/media-finalizer\/\*\*/);
  assert.match(workflow, /media-finalizer-infra-rehearsal\.yml/);
  assert.match(workflow, /SOURCE_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /ref:\s*\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git rev-parse HEAD/);

  assert.match(workflow, /cfn-lint==1\.55\.1/);
  assert.match(workflow, /cloudformation-guard\/releases\/download\/3\.2\.0\/cfn-guard-v3-x86_64-linux-latest\.tar\.gz/);
  assert.doesNotMatch(workflow, /cloudformation-guard\/releases\/download\/v3\.2\.0/);
  assert.match(workflow, /c78f7a1a6c2674f7edbf0ebdc0590126487a14b103e434aea31205a4d1034d21/);
  assert.match(workflow, /cfn-lint\s+infra\/media-finalizer\/template\.yaml/);
  assert.match(workflow, /cfn-guard\s+validate\s+--data\s+infra\/media-finalizer\/template\.yaml\s+--rules\s+infra\/media-finalizer\/guard\/media-finalizer\.guard/);

  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /TIGER_MEDIA_INFRA_REHEARSAL=PASS/);
  assert.doesNotMatch(workflow, /configure-aws-credentials|id-token:\s*write|aws\s+cloudformation\s+(?:deploy|execute-change-set|create-change-set)/i);
});
