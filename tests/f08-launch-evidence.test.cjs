'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const verifierPath = path.join(root, 'scripts/launch/verify-f08-launch-evidence.cjs');
const evidencePath = path.join(root, 'config/launch/evidence/f08-showcase.json');

function load() { return JSON.parse(fs.readFileSync(evidencePath, 'utf8')); }
function complete() {
  const e = load();
  e.status = 'PASS';
  e.release = { sha: 'a'.repeat(40), artifactSha256: 'b'.repeat(64) };
  for (const name of ['implementation','focusedTests','isolatedRehearsal','protectedExactHead']) {
    e[name].status = 'PASS'; e[name].evidence = ['proof'];
  }
  e.protectedExactHead.runnerExecuted = true;
  e.protectedExactHead.sha = e.release.sha;
  e.isolatedRehearsal.objectCount = 25000;
  e.isolatedRehearsal.validationOk = true;
  e.launchGatePass = true;
  return e;
}

test('current F08 launch evidence stays fail-closed', () => {
  const { verifyF08LaunchEvidence } = require(verifierPath);
  const result = verifyF08LaunchEvidence(load(), {});
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, false);
  assert.ok(result.blockingSections.includes('isolatedRehearsal'));
  assert.ok(result.blockingSections.includes('protectedExactHead'));
});

test('F08 isolated rehearsal PASS requires exactly 25,000 validated objects', () => {
  const { verifyF08LaunchEvidence } = require(verifierPath);
  const e = complete();
  e.isolatedRehearsal.objectCount = 24999;
  const result = verifyF08LaunchEvidence(e, { currentHeadSha: e.release.sha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_REHEARSAL_PASS_REQUIRES_EXACTLY_25000_VALIDATED_OBJECTS'));
});

test('F08 protected PASS requires runner execution on release SHA', () => {
  const { verifyF08LaunchEvidence } = require(verifierPath);
  const e = complete();
  e.protectedExactHead.runnerExecuted = false;
  const result = verifyF08LaunchEvidence(e, { currentHeadSha: e.release.sha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_PROTECTED_PASS_REQUIRES_RUNNER_EXECUTION'));
});

test('F08 cannot claim launch PASS without exact release identity and all sections PASS', () => {
  const { verifyF08LaunchEvidence } = require(verifierPath);
  const e = load();
  e.status = 'PASS'; e.launchGatePass = true;
  const result = verifyF08LaunchEvidence(e, {});
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_PASS_REQUIRES_RELEASE_IDENTITY'));
  assert.ok(result.errors.includes('F08_PASS_REQUIRES_ALL_SECTIONS_PASS'));
});

test('fully evidenced F08 exact release can pass', () => {
  const { verifyF08LaunchEvidence } = require(verifierPath);
  const e = complete();
  const result = verifyF08LaunchEvidence(e, { currentHeadSha: e.release.sha });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, true);
});
