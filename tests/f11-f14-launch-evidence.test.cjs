'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function loadJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function verifier(phase) {
  return require(path.join(root, `scripts/launch/verify-${phase}-launch-evidence.cjs`));
}

function complete(relative) {
  const value = loadJson(relative);
  value.status = 'PASS';
  value.releaseSha = 'a'.repeat(40);
  for (const check of Object.values(value.checks)) {
    check.status = 'PASS';
    check.evidence = ['proof'];
  }
  return value;
}

test('F11 requires 20/20 Android and 20/20 iOS on physical devices', () => {
  const relative = 'config/launch/evidence/f11-mobile.json';
  const current = loadJson(relative);
  let result = verifier('f11').verifyF11LaunchEvidence(current, { currentHeadSha: current.releaseSha });
  assert.equal(result.launchGatePass, false);

  const value = complete(relative);
  value.metrics = { androidRequired: 20, androidPassed: 20, iosRequired: 20, iosPassed: 20, physicalDevices: true };
  result = verifier('f11').verifyF11LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.launchGatePass, true);

  value.metrics.iosPassed = 19;
  result = verifier('f11').verifyF11LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F11_REQUIRES_ANDROID_20_AND_IOS_20_PHYSICAL'));
});

test('F12 requires at least five isolated red-team campaigns and zero unresolved Critical/High', () => {
  const relative = 'config/launch/evidence/f12-red-team.json';
  const value = complete(relative);
  value.metrics = { campaignsRequired: 5, campaignsPassed: 5, isolatedCampaigns: true, unresolvedCritical: 0, unresolvedHigh: 0 };
  let result = verifier('f12').verifyF12LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.launchGatePass, true, result.errors.join('\n'));

  value.metrics.unresolvedHigh = 1;
  result = verifier('f12').verifyF12LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F12_REQUIRES_5_CAMPAIGNS_AND_ZERO_CRITICAL_HIGH'));
});

test('F13 requires both 4M reproducible unique actors and 4M simultaneous active users', () => {
  const relative = 'config/launch/evidence/f13-digital-twin.json';
  const value = complete(relative);
  value.metrics = { uniqueActorsRequired: 4000000, uniqueActorsPassed: 4000000, simultaneousActiveRequired: 4000000, simultaneousActivePassed: 4000000, reproducible: true };
  let result = verifier('f13').verifyF13LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.launchGatePass, true, result.errors.join('\n'));

  value.metrics.simultaneousActivePassed = 3999999;
  result = verifier('f13').verifyF13LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F13_REQUIRES_BOTH_4M_PROGRAMS'));
});

test('F14 requires measured restore/failover plus non-negative RTO/RPO evidence', () => {
  const relative = 'config/launch/evidence/f14-recovery.json';
  const value = complete(relative);
  value.metrics = { measuredRtoSeconds: 120, measuredRpoSeconds: 30 };
  let result = verifier('f14').verifyF14LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.launchGatePass, true, result.errors.join('\n'));

  value.metrics.measuredRpoSeconds = null;
  result = verifier('f14').verifyF14LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F14_REQUIRES_MEASURED_RTO_RPO'));
});

test('F11-F14 claimed PASS is exact-head bound', () => {
  for (const [phase, relative, method] of [
    ['f11', 'config/launch/evidence/f11-mobile.json', 'verifyF11LaunchEvidence'],
    ['f12', 'config/launch/evidence/f12-red-team.json', 'verifyF12LaunchEvidence'],
    ['f13', 'config/launch/evidence/f13-digital-twin.json', 'verifyF13LaunchEvidence'],
    ['f14', 'config/launch/evidence/f14-recovery.json', 'verifyF14LaunchEvidence']
  ]) {
    const value = complete(relative);
    if (phase === 'f11') value.metrics = { androidRequired: 20, androidPassed: 20, iosRequired: 20, iosPassed: 20, physicalDevices: true };
    if (phase === 'f12') value.metrics = { campaignsRequired: 5, campaignsPassed: 5, isolatedCampaigns: true, unresolvedCritical: 0, unresolvedHigh: 0 };
    if (phase === 'f13') value.metrics = { uniqueActorsRequired: 4000000, uniqueActorsPassed: 4000000, simultaneousActiveRequired: 4000000, simultaneousActivePassed: 4000000, reproducible: true };
    if (phase === 'f14') value.metrics = { measuredRtoSeconds: 120, measuredRpoSeconds: 30 };
    const result = verifier(phase)[method](value, { currentHeadSha: 'b'.repeat(40) });
    assert.equal(result.ok, false, phase);
    assert.ok(result.errors.some(code => code.endsWith('_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD')), phase);
  }
});
