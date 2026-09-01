'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const evidencePath = path.join(root, 'config/launch/evidence/f10-i18n-accessibility.json');
const verifierPath = path.join(root, 'scripts/launch/verify-f10-launch-evidence.cjs');

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
}

function completeEvidence() {
  const value = loadEvidence();
  value.status = 'PASS';
  value.releaseSha = 'a'.repeat(40);
  for (const check of Object.values(value.checks)) {
    check.status = 'PASS';
    check.evidence = ['proof'];
  }
  return value;
}

test('current F10 evidence stays fail-closed until runtime, WCAG and exact-head proof exist', () => {
  const { verifyF10LaunchEvidence } = require(verifierPath);
  const current = loadEvidence();
  const result = verifyF10LaunchEvidence(current, { currentHeadSha: current.releaseSha });
  assert.equal(result.ok, true);
  assert.equal(result.launchGatePass, false);
  assert.ok(result.blockingChecks.length > 0);
});

test('F10 PASS requires every localization and accessibility check', () => {
  const { verifyF10LaunchEvidence } = require(verifierPath);
  const complete = completeEvidence();
  const result = verifyF10LaunchEvidence(complete, { currentHeadSha: complete.releaseSha });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, true);
});

test('manual WCAG 2.2 AA evidence is mandatory', () => {
  const { verifyF10LaunchEvidence } = require(verifierPath);
  const value = completeEvidence();
  value.status = 'IN_PROGRESS';
  value.checks.manualWcag22AA.status = 'NOT_EVIDENCED';
  value.checks.manualWcag22AA.evidence = [];
  const result = verifyF10LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, true);
  assert.equal(result.launchGatePass, false);
  assert.ok(result.blockingChecks.includes('manualWcag22AA'));
});

test('a claimed F10 PASS without all subordinate evidence is rejected', () => {
  const { verifyF10LaunchEvidence } = require(verifierPath);
  const value = loadEvidence();
  value.status = 'PASS';
  const result = verifyF10LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F10_PASS_REQUIRES_ALL_CHECKS_PASS'));
});

test('F10 PASS is bound to the exact release head', () => {
  const { verifyF10LaunchEvidence } = require(verifierPath);
  const value = completeEvidence();
  const result = verifyF10LaunchEvidence(value, { currentHeadSha: 'b'.repeat(40) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F10_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD'));
});
