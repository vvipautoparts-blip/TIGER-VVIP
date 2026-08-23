'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_REQUIRED_WORKFLOWS,
  evaluateMarketGenesisReadiness,
} = require('../scripts/marketplace/market-readiness-gate.js');

const SAMPLE_SHA = '881ef74eca17245c96316ddf301f1501fb73b0db';

function snapshotWithOnlyQualityGate() {
  return {
    expected_head_sha: SAMPLE_SHA,
    observed_head_sha: SAMPLE_SHA,
    workflows: [
      { name: 'VVIP Quality Gate', status: 'completed', conclusion: 'success' },
    ],
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
      contact_handoff_enabled: false,
      contact_replay_protection_durable: false,
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

test('M11 caller cannot shrink the module-owned required workflow set', () => {
  assert.deepEqual(DEFAULT_REQUIRED_WORKFLOWS, [
    'VVIP Quality Gate',
    'TIGER CleanGuard',
    'Project Control Integrity',
    'Zero-Residue Full History',
  ]);
  assert.equal(Object.isFrozen(DEFAULT_REQUIRED_WORKFLOWS), true);

  const verdict = evaluateMarketGenesisReadiness(
    snapshotWithOnlyQualityGate(),
    { requiredWorkflows: ['VVIP Quality Gate'] },
  );

  assert.equal(verdict.ready, false);
  assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
  assert.ok(verdict.reason_codes.includes('REQUIRED_WORKFLOW_NOT_GREEN'));
});
