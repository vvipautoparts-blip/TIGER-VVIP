'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'pages.yml');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

function externalActions(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1] || null)
    .filter(Boolean)
    .filter((value) => !value.startsWith('./'));
}

test('Production promotion requires explicit exact-SHA and exact-artifact manual dispatch', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release_sha:/);
  assert.match(workflow, /artifact_id:/);
  assert.doesNotMatch(workflow, /\n\s{2}push\s*:/, 'automatic push-triggered Production release is forbidden');
  assert.match(workflow, /EXPECTED_RELEASE_SHA/);
  assert.match(workflow, /ARTIFACT_ID/);
  assert.match(workflow, /git\s+rev-parse\s+origin\/main/);
  assert.match(workflow, /RELEASE_SHA_MISMATCH/);
  assert.match(workflow, /INVALID_ARTIFACT_ID/);
});

test('Production release permissions are least-privilege until deploy', () => {
  const jobsIndex = workflow.indexOf('\njobs:');
  assert.ok(jobsIndex > 0, 'jobs section must exist');
  const workflowHeader = workflow.slice(0, jobsIndex);
  assert.match(workflowHeader, /permissions:\s*\n\s{2}contents:\s*read[\s\S]*?actions:\s*read[\s\S]*?attestations:\s*read/);
  assert.doesNotMatch(workflowHeader, /pages:\s*write/);
  assert.doesNotMatch(workflowHeader, /id-token:\s*write/);

  const deployIndex = workflow.indexOf('\n  deploy:');
  assert.ok(deployIndex > jobsIndex, 'deploy job must exist');
  const verificationJobs = workflow.slice(jobsIndex, deployIndex);
  assert.doesNotMatch(verificationJobs, /pages:\s*write/);
  assert.doesNotMatch(verificationJobs, /id-token:\s*write/);
  assert.match(
    workflow.slice(deployIndex),
    /permissions:[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/,
    'deploy job must exclusively own Pages and OIDC write permissions',
  );
});

test('Production workflow external actions are immutable full-SHA references', () => {
  const mutable = externalActions(workflow).filter(
    (action) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/.test(action),
  );
  assert.deepEqual(mutable, [], `mutable action references: ${mutable.join(', ')}`);
});

test('Production promotion is verification-only and cannot drift through runtime dependency installation', () => {
  assert.doesNotMatch(workflow, /pip\s+install|python\s+-m\s+pip\s+install/i);
  assert.doesNotMatch(workflow, /npm\s+(?:ci|install|update)|pnpm\s+(?:install|update)|yarn\s+(?:install|upgrade)/i);
  assert.doesNotMatch(workflow, /tools\/vvip_public_release\.py/);
  assert.doesNotMatch(workflow, /(?:npm|pnpm|yarn)\s+(?:run\s+)?build\b/i);
  assert.match(workflow, /scripts\/release\/verify-production-artifact\.py/);
  assert.match(workflow, /gh\s+attestation\s+verify/);
});

test('previously-built release bytes remain bound to owner-approved exact SHA and trusted builder identity', () => {
  assert.match(workflow, /actions\/artifacts\/\$\{\{\s*inputs\.artifact_id\s*\}\}/);
  assert.match(workflow, /workflow_run\.head_sha/);
  assert.match(workflow, /\.head_sha/);
  assert.match(workflow, /production-release-artifact\.yml/);
  assert.match(workflow, /--release-sha\s+"\$EXPECTED_RELEASE_SHA"/);
  assert.match(workflow, /--source-digest\s+"\$EXPECTED_RELEASE_SHA"/);
  assert.match(workflow, /--source-ref\s+refs\/heads\/main/);
  assert.match(workflow, /PROMOTION_MAIN_SHA_MISMATCH/);
  assert.doesNotMatch(workflow, /--source-sha\s+"\$EXPECTED_RELEASE_SHA"/, 'promotion must never rebuild release bytes');
});
