'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const verifierPath = path.join(root, 'scripts/launch/verify-global-launch-passport.cjs');
const passportPath = path.join(root, 'config/launch/global-launch-passport.json');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function completePassport() {
  const passport = loadJson(passportPath);
  passport.release.frozen = true;
  passport.release.sha = 'a'.repeat(40);
  passport.release.artifactSha256 = 'b'.repeat(64);
  passport.ownerAuthorization = {
    status: 'PASS',
    exactReleaseSha: passport.release.sha,
    artifactSha256: passport.release.artifactSha256,
    evidence: ['owner-auth-evidence']
  };
  for (const gate of Object.values(passport.gates)) {
    gate.status = 'PASS';
    gate.evidence = ['proof'];
  }
  passport.globalLaunchEligible = true;
  return passport;
}

test('current global launch passport is fail-closed while mandatory gates are incomplete', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = loadJson(passportPath);
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 }
  });
  assert.equal(result.ok, true);
  assert.equal(result.globalLaunchEligible, false);
  assert.ok(result.blockingGates.length > 0);
});

test('passport rejects an eligibility claim when any mandatory gate is not PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = loadJson(passportPath);
  passport.globalLaunchEligible = true;
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 }
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('GLOBAL_LAUNCH_ELIGIBLE_REQUIRES_ALL_GATES_PASS'));
});

test('passport rejects Shadow Ledger PASS while current financial distribution is not executable', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 }
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('SHADOW_LEDGER_PASS_REQUIRES_EXECUTABLE_FINANCIAL_DISTRIBUTION'));
});

test('passport rejects exact-head mismatch', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: 'c'.repeat(40),
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 }
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('PASSPORT_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD'));
});

test('fully evidenced exact-release passport can become globally eligible', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 },
    f05LaunchGatePass: true,
    f08LaunchGatePass: true,
    f15LaunchGatePass: true
  });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.globalLaunchEligible, true);
  assert.deepEqual(result.blockingGates, []);
});

test('Fusion authority binds the machine-readable global launch passport', () => {
  const fusion = loadJson(path.join(root, 'config/fusion/current-authority.json'));
  assert.equal(fusion.tigerGlobalLaunchPassportConfig, 'config/launch/global-launch-passport.json');
  assert.equal(fusion.globalLaunchEligibilityRequiresAllPassportGates, true);
  assert.equal(fusion.globalLaunchStatementAllowedOnlyWhen, 'F16_LAUNCH_PASSPORT_PASS');
});

test('Fusion validator fails closed if the Launch Passport gate is weakened', () => {
  const { verifyCurrentAuthority } = require(path.join(root, 'scripts/fusion/verify-current-authority.cjs'));
  for (const mutate of [
    fusion => { fusion.tigerGlobalLaunchPassportConfig = 'config/launch/optional.json'; },
    fusion => { fusion.globalLaunchEligibilityRequiresAllPassportGates = false; }
  ]) {
    const fusion = loadJson(path.join(root, 'config/fusion/current-authority.json'));
    mutate(fusion);
    const result = verifyCurrentAuthority(fusion);
    assert.equal(result.ok, false);
  }
});

test('hybrid media PASS requires subordinate F05 launch evidence PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 },
    f05LaunchGatePass: false
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('HYBRID_MEDIA_PASS_REQUIRES_F05_EVIDENCE_PASS'));
});

test('25K showcase PASS requires subordinate F08 launch evidence PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 },
    f05LaunchGatePass: true,
    f08LaunchGatePass: false
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('SHOWCASE_25K_PASS_REQUIRES_F08_EVIDENCE_PASS'));
});

test('runtime vacuum PASS requires subordinate F15 launch evidence PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath);
  const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, {
    currentHeadSha: passport.release.sha,
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 },
    f05LaunchGatePass: true,
    f08LaunchGatePass: true,
    f15LaunchGatePass: false
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('RUNTIME_VACUUM_PASS_REQUIRES_F15_EVIDENCE_PASS'));
});
