'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_PATH = path.join(process.cwd(), '.github', 'workflows', 'pages.yml');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

function externalActions(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1] || null)
    .filter(Boolean)
    .filter((value) => !value.startsWith('./'));
}

test('Production release requires explicit exact-SHA manual dispatch', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release_sha:/);
  assert.doesNotMatch(workflow, /\n\s{2}push\s*:/, 'automatic push-triggered Production release is forbidden');
  assert.match(workflow, /EXPECTED_RELEASE_SHA/);
  assert.match(workflow, /git\s+rev-parse\s+origin\/main/);
  assert.match(workflow, /RELEASE_SHA_MISMATCH/);
});

test('Production release permissions are least-privilege until deploy', () => {
  const jobsIndex = workflow.indexOf('\njobs:');
  assert.ok(jobsIndex > 0, 'jobs section must exist');
  const workflowHeader = workflow.slice(0, jobsIndex);
  assert.match(workflowHeader, /permissions:\s*\n\s{2}contents:\s*read/);
  assert.doesNotMatch(workflowHeader, /pages:\s*write/);
  assert.doesNotMatch(workflowHeader, /id-token:\s*write/);
  assert.match(
    workflow,
    /deploy:[\s\S]*?permissions:[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/,
    'deploy job must own Pages and OIDC write permissions',
  );
});

test('Production workflow external actions are immutable full-SHA references', () => {
  const mutable = externalActions(workflow).filter(
    (action) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/.test(action),
  );
  assert.deepEqual(mutable, [], `mutable action references: ${mutable.join(', ')}`);
});

test('Production verification dependencies cannot drift during the run', () => {
  assert.doesNotMatch(workflow, /python\s+-m\s+pip\s+install\s+--upgrade\s+pip/i);
  assert.match(workflow, /pytest==9\.1\.1/);
});

test('release manifest is bound to the owner-approved exact SHA', () => {
  assert.match(workflow, /--source-sha\s+"\$EXPECTED_RELEASE_SHA"/);
  assert.match(workflow, /RELEASE_MANIFEST_SHA_MISMATCH/);
});
