'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');

function workflowSource() {
  assert.equal(fs.existsSync(WORKFLOW), true, 'SEALED_BUILD_WORKFLOW_MISSING');
  return fs.readFileSync(WORKFLOW, 'utf8').replace(/\r/g, '');
}

test('sealed build attestation authority is least-privilege when storage records are disabled', () => {
  const source = workflowSource();
  assert.match(source, /^  contents: read$/m);
  assert.match(source, /^  id-token: write$/m);
  assert.match(source, /^  attestations: write$/m);
  assert.doesNotMatch(source, /^  artifact-metadata: write$/m);
  assert.equal((source.match(/create-storage-record:\s*false/g) || []).length, 2);
});

test('sealed build pins the exact Syft 1.51.0 Linux amd64 release asset and checksum', () => {
  const source = workflowSource();
  assert.match(source, /syft_1\.51\.0_linux_amd64\.tar\.gz/);
  assert.match(source, /2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f/);
});
