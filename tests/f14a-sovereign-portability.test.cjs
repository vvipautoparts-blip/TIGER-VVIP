const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'scripts', 'reliability', 'f14a-portability-contract.js');
function loadContract() { return require(modulePath); }

test('F14A requires a provider-neutral export/import and country-control capability set', () => {
  const { REQUIRED_PORTABILITY_CAPABILITIES } = loadContract();
  assert.deepEqual(REQUIRED_PORTABILITY_CAPABILITIES, ['database.export','database.import','objects.export','objects.import','configuration.export','configuration.import','health.probe','country.suspend','country.resume']);
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.doesNotMatch(source, /\b(?:aws|azure|gcp|firebase)\b/i);
});

test('F14A adapter validation fails closed when any portable capability is missing', () => {
  const { REQUIRED_PORTABILITY_CAPABILITIES, validatePortabilityAdapter } = loadContract();
  const valid = validatePortabilityAdapter({ adapterId: 'portable-primary-v1', capabilities: REQUIRED_PORTABILITY_CAPABILITIES.slice() });
  assert.equal(valid.ok, true);
  assert.equal(valid.missing.length, 0);
  assert.throws(() => validatePortabilityAdapter({ adapterId: 'incomplete-v1', capabilities: REQUIRED_PORTABILITY_CAPABILITIES.filter((item) => item !== 'objects.import') }), /F14_PORTABILITY_CAPABILITY_MISSING:objects\.import/);
});

test('F14A country suspension and resume affect only the requested active market', () => {
  const { transitionCountryAvailability } = loadContract();
  const initial = Object.freeze({ JO: Object.freeze({ state: 'ACTIVE', legalApproved: true, taxConfigured: true }), US: Object.freeze({ state: 'ACTIVE', legalApproved: true, taxConfigured: true }) });
  const suspended = transitionCountryAvailability(initial, 'JO', 'SUSPEND');
  assert.equal(suspended.JO.state, 'SUSPENDED');
  assert.deepEqual(suspended.US, initial.US);
  assert.equal(initial.JO.state, 'ACTIVE');
  const resumed = transitionCountryAvailability(suspended, 'JO', 'RESUME');
  assert.equal(resumed.JO.state, 'ACTIVE');
  assert.deepEqual(resumed.US, initial.US);
});

test('F14A recovery evaluation needs explicit targets and measured evidence', () => {
  const { evaluateRecoveryEvidence } = loadContract();
  assert.throws(() => evaluateRecoveryEvidence({}), /F14_RECOVERY_TARGET_REQUIRED/);
  assert.equal(evaluateRecoveryEvidence({ targetRtoSeconds:900,targetRpoSeconds:300,measuredRtoSeconds:null,measuredRpoSeconds:null,restoreVerified:null,failoverVerified:null,dataIntegrityVerified:null }).result, 'BLOCKED');
  const pass = evaluateRecoveryEvidence({ targetRtoSeconds:900,targetRpoSeconds:300,measuredRtoSeconds:720,measuredRpoSeconds:120,restoreVerified:true,failoverVerified:true,dataIntegrityVerified:true });
  assert.equal(pass.result, 'PASS');
  assert.equal(pass.rtoWithinTarget, true);
  assert.equal(pass.rpoWithinTarget, true);
  const fail = evaluateRecoveryEvidence({ targetRtoSeconds:900,targetRpoSeconds:300,measuredRtoSeconds:901,measuredRpoSeconds:120,restoreVerified:true,failoverVerified:true,dataIntegrityVerified:true });
  assert.equal(fail.result, 'FAIL');
  assert.equal(fail.rtoWithinTarget, false);
});