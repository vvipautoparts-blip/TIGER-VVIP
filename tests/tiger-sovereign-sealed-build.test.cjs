'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'tiger-media-sovereign-sealed-build.yml');
const GENOME = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const LEGACY_BUILD = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');
const LEGACY_DEPLOY = path.join(ROOT, '.github', 'workflows', 'media-finalizer-deploy.yml');

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

function assertFullActionPins(source) {
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/);
    if (!match) continue;
    const ref = match[1];
    const at = ref.lastIndexOf('@');
    assert.notEqual(at, -1, `ACTION_REF_MISSING:${ref}`);
    const pin = ref.slice(at + 1);
    assert.match(pin, /^[0-9a-f]{40}$/, `ACTION_NOT_IMMUTABLE:${ref}`);
  }
}

test('replacement Sovereign Sealed Build and Genome authorities exist', () => {
  read(WORKFLOW);
  read(GENOME);
});

test('Sovereign Sealed Build is Seoul-only build authority with immutable evidence', () => {
  const workflow = read(WORKFLOW);
  assert.match(workflow, /name:\s*TIGER Media Sovereign Sealed Build/);
  assert.match(workflow, /environment:\s*media-build/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /attestations:\s*write/);
  assert.match(workflow, /ap-northeast-2/);
  assert.match(workflow, /TIGER-VVIP-GitHub-MediaBuild/);
  assert.match(workflow, /SOURCE_SHA/);
  assert.match(workflow, /SOURCE_TREE/);
  assert.match(workflow, /npm\s+ci/);
  assert.match(workflow, /docker\s+build/);
  assert.match(workflow, /docker\s+push/);
  assert.match(workflow, /sha256:/);
  assert.match(workflow, /syft_1\.51\.0_linux_amd64\.tar\.gz/);
  assert.match(workflow, /2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f/);
  assert.match(workflow, /cyclonedx-json/);
  assert.match(workflow, /media-cell-genome\.cjs/);
  assert.match(workflow, /media-cell-passport\.cjs/);
  assert.match(workflow, /TIGER_MEDIA_SEALED_BUILD=PASS/);
  assert.match(workflow, /TIGER_MEDIA_RUNTIME_DEPLOYED=NO/);
  assert.match(workflow, /TIGER_MEDIA_DARK_BOOTSTRAP=NOT_STARTED/);
  assert.doesNotMatch(workflow, /TIGER-VVIP-GitHub-ProductionDeploy/);
  assert.doesNotMatch(workflow, /aws\s+cloudformation\s+(?:deploy|create-change-set|execute-change-set)/i);
  assert.doesNotMatch(workflow, /aws\s+lambda\s+|update-function-code|update-alias|create-function/i);
  assert.doesNotMatch(workflow, /aws\s+cloudfront\s+|aws\s+wafv2\s+|aws\s+acm\s+/i);
  assertFullActionPins(workflow);
});

test('Sealed Build has one build and one push mutation path', () => {
  const workflow = read(WORKFLOW);
  const builds = workflow.match(/^\s*docker\s+build\b/gm) || [];
  const pushes = workflow.match(/^\s*docker\s+push\b/gm) || [];
  assert.equal(builds.length, 1, 'SEALED_BUILD_MUST_BUILD_EXACTLY_ONCE');
  assert.equal(pushes.length, 1, 'SEALED_BUILD_MUST_PUSH_EXACTLY_ONCE');
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
