'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const verifierPath = path.join(root, 'scripts/launch/verify-f05-launch-evidence.cjs');
const evidencePath = path.join(root, 'config/launch/evidence/f05-hybrid-media.json');

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
}

function completeEvidence() {
  const evidence = loadEvidence();
  evidence.status = 'PASS';
  evidence.release = { sha: 'a'.repeat(40), artifactSha256: 'b'.repeat(64) };
  for (const section of ['implementation','focusedTests','realFixture','supplyChain','productionPorts','browserDevice','protectedExactHead']) {
    evidence[section].status = 'PASS';
    evidence[section].evidence = ['proof'];
  }
  evidence.protectedExactHead.runnerExecuted = true;
  evidence.protectedExactHead.sha = evidence.release.sha;
  evidence.launchGatePass = true;
  return evidence;
}

test('current F05 evidence is valid but launch gate remains fail-closed', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = loadEvidence();
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: null });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, false);
  assert.ok(result.blockingSections.includes('protectedExactHead'));
  assert.ok(result.blockingSections.includes('productionPorts'));
  assert.ok(result.blockingSections.includes('browserDevice'));
});

test('F05 cannot claim PASS without all required evidence sections passing', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = loadEvidence();
  evidence.status = 'PASS';
  evidence.launchGatePass = true;
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: null });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F05_PASS_REQUIRES_ALL_SECTIONS_PASS'));
});

test('F05 protected exact-head PASS requires a runner to execute on the release SHA', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = completeEvidence();
  evidence.protectedExactHead.runnerExecuted = false;
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: evidence.release.sha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F05_PROTECTED_PASS_REQUIRES_RUNNER_EXECUTION'));
});

test('F05 PASS requires exact release SHA and artifact digest', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = completeEvidence();
  evidence.release.artifactSha256 = null;
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: evidence.release.sha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F05_PASS_REQUIRES_RELEASE_IDENTITY'));
});

test('F05 exact release SHA must match current head when supplied', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = completeEvidence();
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: 'c'.repeat(40) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F05_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD'));
});

test('fully evidenced F05 exact release can pass the launch gate', () => {
  const { verifyF05LaunchEvidence } = require(verifierPath);
  const evidence = completeEvidence();
  const result = verifyF05LaunchEvidence(evidence, { currentHeadSha: evidence.release.sha });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, true);
  assert.deepEqual(result.blockingSections, []);
});
