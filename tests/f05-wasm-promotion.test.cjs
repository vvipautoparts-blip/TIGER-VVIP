'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const workflow=fs.readFileSync(path.resolve(__dirname,'../.github/workflows/f05-heif-wasm-build.yml'),'utf8');
const promoterPath=path.resolve(__dirname,'../scripts/media/promote-f05-heif-artifact.sh');

test('F05 WASM build promotion is same-repo, owner, branch scoped and writes only after verification',()=>{
  assert.match(workflow,/contents:\s*write/);
  assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository/);
  assert.match(workflow,/github\.actor\s*==\s*github\.repository_owner/);
  assert.match(workflow,/startsWith\(github\.event\.pull_request\.head\.ref,\s*'feat\/f05-hybrid-heic-local-media-isolated-'\)/);
  assert.match(workflow,/ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/);
  assert.match(workflow,/bash scripts\/media\/promote-f05-heif-artifact\.sh/);
  assert.equal(fs.existsSync(promoterPath),true);
  const promoter=fs.readFileSync(promoterPath,'utf8');
  assert.match(promoter,/0061736d/);
  assert.match(promoter,/sha256sum -c/);
  assert.match(promoter,/workers\/media\/f05-heif-decoder\.v1\.wasm/);
  assert.match(promoter,/git push origin/);
  assert.match(promoter,/F05_EXPECTED_HEAD/);
});

test('generated runtime artifacts do not retrigger the build-promotion workflow',()=>{
  const pathsBlock=workflow.match(/paths:\s*([\s\S]*?)\n\s*workflow_dispatch:/);
  assert.ok(pathsBlock);
  assert.doesNotMatch(pathsBlock[1],/workers\/media/);
});
