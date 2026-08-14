'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const workflow=fs.readFileSync(path.resolve(__dirname,'../.github/workflows/f05-heif-wasm-build.yml'),'utf8');
const promoterPath=path.resolve(__dirname,'../scripts/media/promote-f05-heif-artifact.sh');

test('F05 PR decoder build is verification-only and cannot push branch mutations',()=>{
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/github\.event_name\s*==\s*'pull_request'/);
  assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository/);
  assert.match(workflow,/github\.actor\s*==\s*github\.repository_owner/);
  assert.match(workflow,/ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/);

  const buildJob=workflow.match(/\n\s{2}build-f05-heif-wasm:\n([\s\S]*?)(?=\n\s{2}[a-zA-Z0-9_-]+:\n|$)/);
  assert.ok(buildJob,'build-f05-heif-wasm job must exist');
  assert.match(buildJob[1],/permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(buildJob[1],/promote-f05-heif-artifact\.sh/);
  assert.doesNotMatch(buildJob[1],/contents:\s*write/);
});

test('F05 artifact promotion is explicit owner-only workflow_dispatch with branch and SHA guards',()=>{
  const promoteJob=workflow.match(/\n\s{2}promote-f05-heif-wasm:\n([\s\S]*?)(?=\n\s{2}[a-zA-Z0-9_-]+:\n|$)/);
  assert.ok(promoteJob,'promote-f05-heif-wasm job must exist');
  assert.match(promoteJob[1],/github\.event_name\s*==\s*'workflow_dispatch'/);
  assert.match(promoteJob[1],/github\.actor\s*==\s*github\.repository_owner/);
  assert.match(promoteJob[1],/startsWith\(inputs\.head_ref,\s*'feat\/f05-hybrid-heic-local-media-isolated-'\)/);
  assert.match(promoteJob[1],/permissions:\s*\n\s*contents:\s*write/);
  assert.match(promoteJob[1],/bash scripts\/media\/promote-f05-heif-artifact\.sh/);
  assert.match(promoteJob[1],/git rev-parse HEAD/);

  assert.equal(fs.existsSync(promoterPath),true);
  const promoter=fs.readFileSync(promoterPath,'utf8');
  assert.match(promoter,/0061736d/);
  assert.match(promoter,/sha256sum -c/);
  assert.match(promoter,/workers\/media\/f05-heif-decoder\.v1\.wasm/);
  assert.match(promoter,/git push origin/);
  assert.match(promoter,/F05_EXPECTED_HEAD/);
});

test('generated runtime artifacts do not retrigger the PR build workflow',()=>{
  const pathsBlock=workflow.match(/paths:\s*([\s\S]*?)\n\s*workflow_dispatch:/);
  assert.ok(pathsBlock);
  assert.doesNotMatch(pathsBlock[1],/workers\/media/);
});
