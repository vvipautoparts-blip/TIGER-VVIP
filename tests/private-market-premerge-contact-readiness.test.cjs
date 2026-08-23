'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateMarketGenesisReadiness } = require('../scripts/marketplace/market-readiness-gate.js');

const REQUIRED_WORKFLOWS = Object.freeze([
  'VVIP Quality Gate',
  'TIGER CleanGuard',
  'Project Control Integrity',
  'Zero-Residue Full History',
]);

function snapshot(authorityOverrides = {}) {
  const sha = '36e15ea84a9cd3abec75d3da338f46dd9ee2ddae';
  return {
    expected_head_sha: sha,
    observed_head_sha: sha,
    workflows: REQUIRED_WORKFLOWS.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
      contact_handoff_enabled: true,
      contact_replay_protection_durable: true,
      ...authorityOverrides,
    },
    compatibility: {
      policy_version: 'policy-2026-08',
      active_policy_version: 'policy-2026-08',
      sector_physics_version: '1.0.0',
      active_sector_physics_version: '1.0.0',
      compiler_projection_version: 'genesis-projection-1',
      index_projection_version: 'genesis-projection-1',
      cache_projection_version: 'genesis-projection-1',
      organic_path_verified: true,
      pulse_proof_available: true,
    },
  };
}

function evaluate(value) {
  return evaluateMarketGenesisReadiness(value, { requiredWorkflows: REQUIRED_WORKFLOWS });
}

test('rollout blocks contact/handoff when replay protection is not durable across runtime instances', () => {
  const verdict = evaluate(snapshot({ contact_replay_protection_durable: false }));
  assert.equal(verdict.ready, false);
  assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
  assert.ok(verdict.reason_codes.includes('CONTACT_REPLAY_PROTECTION_NOT_DURABLE'));
});

test('durable replay protection is required only when contact/handoff is enabled', () => {
  const contactDisabled = evaluate(snapshot({
    contact_handoff_enabled: false,
    contact_replay_protection_durable: false,
  }));
  assert.equal(contactDisabled.ready, true);

  const durableContact = evaluate(snapshot({
    contact_handoff_enabled: true,
    contact_replay_protection_durable: true,
  }));
  assert.equal(durableContact.ready, true);
});
