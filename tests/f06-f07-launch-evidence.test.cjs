'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function load(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function complete(relative) {
  const value = load(relative);
  value.status = 'PASS';
  value.releaseSha = 'a'.repeat(40);
  for (const check of Object.values(value.checks)) { check.status = 'PASS'; check.evidence = ['proof']; }
  return value;
}

test('F06 cannot pass while internal 16 percent is unresolved or Shadow Ledger is non-zero', () => {
  const { verifyF06LaunchEvidence } = require('../scripts/launch/verify-f06-launch-evidence.cjs');
  const current = load('config/launch/evidence/f06-finance.json');
  let result = verifyF06LaunchEvidence(current, { currentHeadSha: current.releaseSha, finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 } });
  assert.equal(result.launchGatePass, false);

  const value = complete('config/launch/evidence/f06-finance.json');
  value.metrics = { shadowLedgerImbalanceMinor: 0 };
  result = verifyF06LaunchEvidence(value, { currentHeadSha: value.releaseSha, finance: { distributionExecutionAuthorized: true, pendingOwnerDecisionPercent: 0 } });
  assert.equal(result.launchGatePass, true, result.errors.join('\n'));

  result = verifyF06LaunchEvidence(value, { currentHeadSha: value.releaseSha, finance: { distributionExecutionAuthorized: false, pendingOwnerDecisionPercent: 16 } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F06_REQUIRES_EXECUTABLE_FINANCE_AND_ZERO_SHADOW_LEDGER'));
});

test('F07 requires lawful platform-service payment runtime, country gates, profitability and zero intermediation', () => {
  const { verifyF07LaunchEvidence } = require('../scripts/launch/verify-f07-launch-evidence.cjs');
  const value = complete('config/launch/evidence/f07-pulse-country.json');
  value.metrics = { launchCountries: 1, allCountryGatesPass: true, profitabilityCertificate: true, platformServicePaymentRuntime: true, marketplaceIntermediationRole: 'NONE' };
  let result = verifyF07LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.launchGatePass, true, result.errors.join('\n'));

  value.metrics.platformServicePaymentRuntime = false;
  result = verifyF07LaunchEvidence(value, { currentHeadSha: value.releaseSha });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F07_REQUIRES_PAYMENT_COUNTRY_PROFITABILITY_NO_INTERMEDIATION'));
});
