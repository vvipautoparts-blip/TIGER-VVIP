'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const verifierPath = path.join(root, 'scripts/launch/verify-global-launch-passport.cjs');
const passportPath = path.join(root, 'config/launch/global-launch-passport.json');

function loadJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function completePassport() {
  const passport = loadJson(passportPath);
  passport.release.frozen = true;
  passport.release.sha = 'a'.repeat(40);
  passport.release.artifactSha256 = 'b'.repeat(64);
  passport.ownerAuthorization = { status: 'PASS', exactReleaseSha: passport.release.sha, artifactSha256: passport.release.artifactSha256, evidence: ['owner-auth-evidence'] };
  for (const gate of Object.values(passport.gates)) { gate.status = 'PASS'; gate.evidence = ['proof']; }
  passport.globalLaunchEligible = true;
  return passport;
}
function completeContext(overrides = {}) {
  return {
    currentHeadSha: 'a'.repeat(40),
    finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 },
    f05LaunchGatePass: true,
    f06LaunchGatePass: true,
    f07LaunchGatePass: true,
    f08LaunchGatePass: true,
    f09LaunchGatePass: true,
    f10LaunchGatePass: true,
    f11LaunchGatePass: true,
    f12LaunchGatePass: true,
    f13LaunchGatePass: true,
    f14LaunchGatePass: true,
    f15LaunchGatePass: true,
    ...overrides
  };
}

test('current global launch passport is fail-closed while mandatory gates are incomplete', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = loadJson(passportPath);
  const result = verifyGlobalLaunchPassport(passport, { currentHeadSha: passport.release.sha, finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 } });
  assert.equal(result.ok, true); assert.equal(result.globalLaunchEligible, false); assert.ok(result.blockingGates.length > 0);
});

test('passport rejects an eligibility claim when any mandatory gate is not PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = loadJson(passportPath); passport.globalLaunchEligible = true;
  const result = verifyGlobalLaunchPassport(passport, { currentHeadSha: passport.release.sha, finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 } });
  assert.equal(result.ok, false); assert.ok(result.errors.includes('GLOBAL_LAUNCH_ELIGIBLE_REQUIRES_ALL_GATES_PASS'));
});

test('Shadow Ledger PASS requires both F06 evidence and executable finance', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = completePassport();
  let result = verifyGlobalLaunchPassport(passport, completeContext({ f06LaunchGatePass: false }));
  assert.equal(result.ok, false); assert.ok(result.errors.includes('SHADOW_LEDGER_PASS_REQUIRES_F06_EVIDENCE_PASS'));
  result = verifyGlobalLaunchPassport(passport, { ...completeContext(), finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 } });
  assert.equal(result.ok, false); assert.ok(result.errors.includes('SHADOW_LEDGER_PASS_REQUIRES_EXECUTABLE_FINANCIAL_DISTRIBUTION'));
});

test('Country Gates and Pricing Profitability PASS require subordinate F07 evidence PASS', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, completeContext({ f07LaunchGatePass: false }));
  assert.equal(result.ok, false); assert.ok(result.errors.includes('COUNTRY_PRICING_PASS_REQUIRES_F07_EVIDENCE_PASS'));
});

test('passport rejects exact-head mismatch', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, completeContext({ currentHeadSha: 'c'.repeat(40) }));
  assert.equal(result.ok, false); assert.ok(result.errors.includes('PASSPORT_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD'));
});

test('fully evidenced exact-release passport can become globally eligible', () => {
  const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = completePassport();
  const result = verifyGlobalLaunchPassport(passport, completeContext());
  assert.equal(result.ok, true, result.errors.join('\n')); assert.equal(result.globalLaunchEligible, true); assert.deepEqual(result.blockingGates, []);
});

test('Fusion authority binds the machine-readable global launch passport', () => {
  const fusion = loadJson(path.join(root, 'config/fusion/current-authority.json'));
  assert.equal(fusion.tigerGlobalLaunchPassportConfig, 'config/launch/global-launch-passport.json');
  assert.equal(fusion.globalLaunchEligibilityRequiresAllPassportGates, true);
  assert.equal(fusion.globalLaunchStatementAllowedOnlyWhen, 'F16_LAUNCH_PASSPORT_PASS');
});

test('Fusion validator fails closed if the Launch Passport gate is weakened', () => {
  const { verifyCurrentAuthority } = require(path.join(root, 'scripts/fusion/verify-current-authority.cjs'));
  for (const mutate of [fusion => { fusion.tigerGlobalLaunchPassportConfig = 'config/launch/optional.json'; }, fusion => { fusion.globalLaunchEligibilityRequiresAllPassportGates = false; }]) {
    const fusion = loadJson(path.join(root, 'config/fusion/current-authority.json')); mutate(fusion); assert.equal(verifyCurrentAuthority(fusion).ok, false);
  }
});

for (const [label, contextField, errorCode] of [
  ['hybrid media', 'f05LaunchGatePass', 'HYBRID_MEDIA_PASS_REQUIRES_F05_EVIDENCE_PASS'],
  ['25K showcase', 'f08LaunchGatePass', 'SHOWCASE_25K_PASS_REQUIRES_F08_EVIDENCE_PASS'],
  ['bounded AI', 'f09LaunchGatePass', 'BOUNDED_AI_PASS_REQUIRES_F09_EVIDENCE_PASS'],
  ['language accessibility', 'f10LaunchGatePass', 'LANGUAGE_ACCESSIBILITY_PASS_REQUIRES_F10_EVIDENCE_PASS'],
  ['mobile certification', 'f11LaunchGatePass', 'MOBILE_CERTIFICATION_PASS_REQUIRES_F11_EVIDENCE_PASS'],
  ['security red team', 'f12LaunchGatePass', 'SECURITY_RED_TEAM_PASS_REQUIRES_F12_EVIDENCE_PASS'],
  ['digital twin 4M', 'f13LaunchGatePass', 'DIGITAL_TWIN_4M_PASS_REQUIRES_F13_EVIDENCE_PASS'],
  ['recovery', 'f14LaunchGatePass', 'RECOVERY_PASS_REQUIRES_F14_EVIDENCE_PASS'],
  ['runtime vacuum', 'f15LaunchGatePass', 'RUNTIME_VACUUM_PASS_REQUIRES_F15_EVIDENCE_PASS']
]) {
  test(`${label} PASS requires subordinate phase evidence PASS`, () => {
    const { verifyGlobalLaunchPassport } = require(verifierPath); const passport = completePassport();
    const result = verifyGlobalLaunchPassport(passport, completeContext({ [contextField]: false }));
    assert.equal(result.ok, false, label); assert.ok(result.errors.includes(errorCode), label);
  });
}

test('global launch passport includes bounded AI as a mandatory gate', () => {
  const { REQUIRED_GATES } = require(verifierPath); const passport = loadJson(passportPath);
  assert.ok(REQUIRED_GATES.includes('boundedAi')); assert.ok(passport.gates.boundedAi);
});
