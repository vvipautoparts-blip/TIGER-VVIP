'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCountryEconomicGate } = require('../scripts/tsn26/country/country-economic-gate.cjs');

function greenProfile() {
  return {
    country_code: 'XY',
    policy_version: 'XY-TEST-2026.08.001',
    gates: { legal: true, security: true, payment: true, privacy: true },
    economics_bps: {
      actual_tax: 800,
      withholding: 100,
      regulatory_cost: 100,
      psp_fee: 250,
      fx_buffer: 100,
      refund_reserve: 150,
      fraud_reserve: 100,
    },
    cost_classification: {
      actual_tax: 'FISCAL_REGULATORY_RESERVE',
      withholding: 'FISCAL_REGULATORY_RESERVE',
      regulatory_cost: 'FISCAL_REGULATORY_RESERVE',
      psp_fee: 'OPERATIONS:RISK',
      fx_buffer: 'OPERATIONS:RISK',
      refund_reserve: 'OPERATIONS:RISK',
      fraud_reserve: 'OPERATIONS:RISK',
    },
  };
}

test('country gate keeps TIGER 16% reserve distinct from statutory country tax', () => {
  const result = evaluateCountryEconomicGate(greenProfile());
  assert.equal(result.constitution_id, 'TFC-2026.08.001');
  assert.equal(result.fiscal_regulatory_reserve_bps, 1600);
  assert.equal(result.country_actual_tax_bps, 800);
  assert.equal(result.fiscal_reserve_is_statutory_tax, false);
  assert.equal(result.status, 'GREEN');
  assert.equal(result.go_live_allowed, true);
  assert.equal(result.constitutional_change_required, false);
});

test('every non-zero country cost must be explicitly classified into an existing constitutional budget', () => {
  const profile = greenProfile();
  delete profile.cost_classification.psp_fee;
  const result = evaluateCountryEconomicGate(profile);
  assert.equal(result.status, 'RED');
  assert.equal(result.go_live_allowed, false);
  assert.ok(result.reasons.includes('UNCLASSIFIED_COST:psp_fee'));
});

test('country costs may not silently consume owner, partner, or sales allocations', () => {
  const profile = greenProfile();
  profile.cost_classification.psp_fee = 'SALES_POOL';
  const result = evaluateCountryEconomicGate(profile);
  assert.equal(result.status, 'RED');
  assert.ok(result.reasons.includes('FORBIDDEN_COST_ACCOUNT:SALES_POOL'));
});

test('capacity breach does not mutate constitution; it blocks go-live and requires commercial review', () => {
  const profile = greenProfile();
  profile.economics_bps.actual_tax = 1700;
  const result = evaluateCountryEconomicGate(profile);
  assert.equal(result.status, 'RED');
  assert.equal(result.go_live_allowed, false);
  assert.equal(result.constitutional_change_required, true);
  assert.ok(result.reasons.includes('ACCOUNT_CAPACITY_EXCEEDED:FISCAL_REGULATORY_RESERVE'));
});

test('legal, security, payment and privacy gates are all mandatory', () => {
  for (const gate of ['legal', 'security', 'payment', 'privacy']) {
    const profile = greenProfile();
    profile.gates[gate] = false;
    const result = evaluateCountryEconomicGate(profile);
    assert.equal(result.go_live_allowed, false);
    assert.ok(result.reasons.includes(`COUNTRY_GATE_FAILED:${gate}`));
  }
});
