'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateTechnologyProfile } = require('../scripts/security/technology-maturity-firewall.cjs');
test('only final/stable technology may be sovereign production dependency', () => {
  for (const maturity of ['FINAL_STANDARD','STABLE_PRODUCTION','PROVIDER_MANAGED_STABLE']) {
    assert.equal(evaluateTechnologyProfile({maturity},{target:'SOVEREIGN_PRODUCTION'}).allowed, true);
  }
  for (const maturity of ['CANDIDATE','PREVIEW','DRAFT','EXPERIMENTAL']) {
    assert.equal(evaluateTechnologyProfile({maturity},{target:'SOVEREIGN_PRODUCTION'}).allowed, false);
  }
});
test('unknown maturity fails closed and preview may be lab only', () => {
  assert.equal(evaluateTechnologyProfile({maturity:'FUTURE_MAGIC'},{target:'SOVEREIGN_PRODUCTION'}).code, 'TECH_MATURITY_UNKNOWN');
  assert.equal(evaluateTechnologyProfile({maturity:'PREVIEW'},{target:'LAB'}).allowed, true);
});
