'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const WORKFLOW = path.join(WORKFLOW_DIR, 'tiger-media-sovereign-sealed-build.yml');
const GENOME = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const MIGRATION_SET = path.join(ROOT, 'scripts', 'release', 'media-cell-migration-set.cjs');
const LEGACY_BUILD = path.join(WORKFLOW_DIR, 'media-finalizer-build.yml');
const LEGACY_DEPLOY = path.join(WORKFLOW_DIR, 'media-finalizer-deploy.yml');
const CALLER_REF = './.github/workflows/tiger-media-sovereign-sealed-build.yml';

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

function assertFullActionPins(source) {
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/);
    if (!match) continue;
    const ref = match[1];
    if (ref.startsWith('./')) continue;
    const at = ref.lastIndexOf('@');
    assert.notEqual(at, -1, `ACTION_REF_MISSING:${ref}`);
    assert.match(ref.slice(at + 1), /^[0-9a-f]{40}$/, `ACTION_NOT_IMMUTABLE:${ref}`);
  }
}

function workflowFiles() {
  return fs.readdirSync(WORKFLOW_DIR)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => path.join(WORKFLOW_DIR, name));
}

test('replacement Sovereign Sealed Build, Genome, and migration-set authorities exist', () => {
  read(WORKFLOW);
  read(GENOME);
  read(MIGRATION_SET);
});

test('Sovereign Sealed Build is reusable-only and has no live event/manual trigger', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /workflow_call:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:/m);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(workflow, /release_sha:/);
  assert.match(workflow, /db_convergence_state:/);
  assert.match(workflow, /db_convergence_evidence_sha256:/);
});

test('Sovereign Sealed Build is Seoul-only least-privilege build authority', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /name:\s*TIGER Media Sovereign Sealed Build/);
  assert.match(workflow, /environment:\s*media-build/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /attestations:\s*write/);
  assert.match(workflow, /artifact-metadata:\s*write/);
  assert.match(workflow, /ap-northeast-2/);
  assert.match(workflow, /TIGER-VVIP-GitHub-MediaBuild/);
  assert.match(workflow, /tiger-media-finalizer/);
  assert.match(workflow, /ENHANCED/);
  assert.doesNotMatch(workflow, /TIGER-VVIP-GitHub-ProductionDeploy/);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/);
});

test('Sovereign Sealed Build requires exact current protected main head, not an ancestor', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /SOURCE_SHA/);
  assert.match(workflow, /SOURCE_TREE/);
  assert.match(workflow, /MAIN_SHA/);
  assert.match(workflow, /refs\/remotes\/origin\/main/);
  assert.match(workflow, /test\s+"\$SOURCE_SHA"\s*=\s*"\$MAIN_SHA"/);
  assert.doesNotMatch(workflow, /merge-base\s+--is-ancestor/);
  assert.match(workflow, /test\s+"\$\(git rev-parse HEAD\)"\s*=\s*"\$SOURCE_SHA"/);
});

test('Sealed Build pins reviewed supply-chain actions and Syft by immutable identity', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);
  assert.match(workflow, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(workflow, /aws-actions\/configure-aws-credentials@e6de054238d6b7531b4efff3b6587d9aade6a06c/);
  const attestRefs = workflow.match(/actions\/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d/g) || [];
  assert.equal(attestRefs.length, 2, 'SEALED_BUILD_MUST_CREATE_TWO_ATTESTATIONS');
  assert.match(workflow, /syft_1\.51\.0_linux_amd64\.tar\.gz/);
  assert.match(workflow, /2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f/);
  assertFullActionPins(workflow);
});

test('Sealed Build proves source/tests/build once/push once and uses immutable digest evidence', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /npm\s+ci/);
  assert.match(workflow, /node\s+--test\s+tests\/media-finalizer-\*\.test\.cjs/);
  const builds = workflow.match(/^\s*docker\s+build\b/gm) || [];
  const pushes = workflow.match(/^\s*docker\s+push\b/gm) || [];
  assert.equal(builds.length, 1, 'SEALED_BUILD_MUST_BUILD_EXACTLY_ONCE');
  assert.equal(pushes.length, 1, 'SEALED_BUILD_MUST_PUSH_EXACTLY_ONCE');
  assert.match(workflow, /MANIFEST_DIGEST/);
  assert.match(workflow, /IMAGE_URI/);
  assert.match(workflow, /cyclonedx-json/);
  assert.match(workflow, /media-cell-migration-set\.cjs/);
  assert.match(workflow, /media-cell-genome\.cjs/);
  assert.match(workflow, /media-cell-passport\.cjs/);
});

test('provenance and CycloneDX attestations are verified against exact reusable signer identity', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /gh\s+attestation\s+verify/);
  assert.match(workflow, /--signer-workflow/);
  assert.match(workflow, /tiger-media-sovereign-sealed-build\.yml/);
  assert.match(workflow, /--source-digest\s+"?\$SOURCE_SHA"?/);
  assert.match(workflow, /--source-ref\s+['"]refs\/heads\/main['"]/);
  assert.match(workflow, /--predicate-type\s+https:\/\/cyclonedx\.org\/bom/);
});

test('Sealed Build contains no runtime or cross-authority deployment mutation', () => {
  const workflow = read(WORKFLOW);
  assert.doesNotMatch(workflow, /aws\s+cloudformation\s+(?:deploy|create-change-set|execute-change-set)/i);
  assert.doesNotMatch(workflow, /aws\s+lambda\s+|update-function-code|update-alias|create-function/i);
  assert.doesNotMatch(workflow, /aws\s+cloudfront\s+|aws\s+wafv2\s+|aws\s+acm\s+|aws\s+route53\s+/i);
  assert.doesNotMatch(workflow, /aws\s+secretsmanager\s+(?:put-secret-value|update-secret)/i);
  assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up|link)/i);
  assert.match(workflow, /TIGER_MEDIA_SEALED_BUILD=PASS/);
  assert.match(workflow, /TIGER_MEDIA_RUNTIME_DEPLOYED=NO/);
  assert.match(workflow, /TIGER_MEDIA_DARK_BOOTSTRAP=NOT_STARTED/);
});

test('no current workflow calls the reusable live Sealed Build', () => {
  for (const file of workflowFiles()) {
    if (file === WORKFLOW) continue;
    const source = read(file);
    assert.equal(source.includes(CALLER_REF), false, `LIVE_SEALED_BUILD_CALLER_FORBIDDEN_IN_THIS_SLICE:${path.basename(file)}`);
  }
});

test('legacy Media build and deploy authorities remain fail-closed', () => {
  for (const file of [LEGACY_BUILD, LEGACY_DEPLOY]) {
    const source = read(file);
    assert.match(source, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
    assert.match(source, /exit\s+1/);
    assert.doesNotMatch(source, /id-token:\s*write/);
    assert.doesNotMatch(source, /configure-aws-credentials|docker\s+(?:build|push)|aws\s+cloudformation/i);
  }
});
