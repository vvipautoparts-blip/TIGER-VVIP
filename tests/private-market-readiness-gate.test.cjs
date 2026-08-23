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

const SAMPLE_SHA = '881ef74eca17245c96316ddf301f1501fb73b0db';

function validSnapshot(overrides = {}) {
  const base = {
    expected_head_sha: SAMPLE_SHA,
    observed_head_sha: SAMPLE_SHA,
    workflows: REQUIRED_WORKFLOWS.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
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

  return {
    ...base,
    ...overrides,
    authority: { ...base.authority, ...(overrides.authority || {}) },
    compatibility: { ...base.compatibility, ...(overrides.compatibility || {}) },
    workflows: overrides.workflows || base.workflows,
  };
}

function evaluate(snapshot) {
  return evaluateMarketGenesisReadiness(snapshot, { requiredWorkflows: REQUIRED_WORKFLOWS });
}

test('marks a compatible exact head as rollout eligible without returning deployment commands', () => {
  const verdict = evaluate(validSnapshot());

  assert.equal(verdict.ready, true);
  assert.equal(verdict.state, 'ROLLOUT_ELIGIBLE');
  assert.deepEqual(verdict.reason_codes, []);
  assert.equal(verdict.organic_mode, 'ELIGIBLE');
  assert.equal(verdict.sponsored_mode, 'ELIGIBLE');
  assert.equal(Object.isFrozen(verdict), true);
  assert.equal(Object.isFrozen(verdict.reason_codes), true);
  assert.deepEqual(Object.keys(verdict).sort(), [
    'organic_mode',
    'ready',
    'reason_codes',
    'sponsored_mode',
    'state',
  ].sort());
});

test('fails closed when the observed head is not the exact expected head', () => {
  const verdict = evaluate(validSnapshot({ observed_head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
  assert.equal(verdict.ready, false);
  assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
  assert.ok(verdict.reason_codes.includes('EXACT_HEAD_MISMATCH'));
});

test('requires every named workflow to be completed and successful', () => {
  const missing = validSnapshot({ workflows: validSnapshot().workflows.slice(0, 3) });
  const missingVerdict = evaluate(missing);
  assert.equal(missingVerdict.ready, false);
  assert.ok(missingVerdict.reason_codes.includes('REQUIRED_WORKFLOW_NOT_GREEN'));

  const failedWorkflows = validSnapshot().workflows.map((workflow) =>
    workflow.name === 'VVIP Quality Gate'
      ? { ...workflow, conclusion: 'failure' }
      : workflow,
  );
  const failedVerdict = evaluate(validSnapshot({ workflows: failedWorkflows }));
  assert.equal(failedVerdict.ready, false);
  assert.ok(failedVerdict.reason_codes.includes('REQUIRED_WORKFLOW_NOT_GREEN'));
});

test('blocks stale policy, Sector Physics, index, and cache projections', () => {
  const cases = [
    [
      { compatibility: { active_policy_version: 'policy-2026-09' } },
      'POLICY_VERSION_MISMATCH',
    ],
    [
      { compatibility: { active_sector_physics_version: '1.0.1' } },
      'SECTOR_PHYSICS_VERSION_MISMATCH',
    ],
    [
      { compatibility: { index_projection_version: 'genesis-projection-0' } },
      'PROJECTION_VERSION_MISMATCH',
    ],
    [
      { compatibility: { cache_projection_version: 'genesis-projection-0' } },
      'PROJECTION_VERSION_MISMATCH',
    ],
  ];

  for (const [override, reasonCode] of cases) {
    const verdict = evaluate(validSnapshot(override));
    assert.equal(verdict.ready, false, reasonCode);
    assert.ok(verdict.reason_codes.includes(reasonCode), reasonCode);
  }
});

test('requires the current Market Genesis authority and permanently rejects retired fallback reactivation', () => {
  const inactive = evaluate(validSnapshot({ authority: { market_genesis_active: false } }));
  assert.equal(inactive.ready, false);
  assert.ok(inactive.reason_codes.includes('MARKET_GENESIS_AUTHORITY_INACTIVE'));

  const retiredFallback = evaluate(validSnapshot({ authority: { living_classified_fabric_active: true } }));
  assert.equal(retiredFallback.ready, false);
  assert.ok(retiredFallback.reason_codes.includes('RETIRED_FALLBACK_ACTIVE'));
});

test('blocks any buyer-seller transaction capability and preserves Pulse as advertising-billing authority', () => {
  const transactionEnabled = evaluate(validSnapshot({ authority: { transaction_capabilities_enabled: true } }));
  assert.equal(transactionEnabled.ready, false);
  assert.ok(transactionEnabled.reason_codes.includes('TRANSACTION_BOUNDARY_VIOLATION'));

  const pulseDisplaced = evaluate(validSnapshot({ authority: { pulse_ad_billing_authority_preserved: false } }));
  assert.equal(pulseDisplaced.ready, false);
  assert.ok(pulseDisplaced.reason_codes.includes('PULSE_AUTHORITY_NOT_PRESERVED'));
});

test('suppresses sponsored delivery when Pulse proof is unavailable but keeps independently verified organic discovery eligible', () => {
  const verdict = evaluate(validSnapshot({ compatibility: { pulse_proof_available: false } }));
  assert.equal(verdict.ready, true);
  assert.equal(verdict.state, 'ROLLOUT_ELIGIBLE');
  assert.equal(verdict.organic_mode, 'ELIGIBLE');
  assert.equal(verdict.sponsored_mode, 'SUPPRESSED');
  assert.deepEqual(verdict.reason_codes, []);
});

test('fails closed when Pulse proof is unavailable and there is no independently safe organic path', () => {
  const verdict = evaluate(validSnapshot({
    compatibility: {
      pulse_proof_available: false,
      organic_path_verified: false,
    },
  }));

  assert.equal(verdict.ready, false);
  assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
  assert.ok(verdict.reason_codes.includes('NO_SAFE_DISCOVERY_PATH'));
  assert.equal(verdict.organic_mode, 'BLOCKED');
  assert.equal(verdict.sponsored_mode, 'SUPPRESSED');
});

test('invalid or incomplete release evidence fails closed rather than guessing readiness', () => {
  for (const snapshot of [null, {}, { expected_head_sha: SAMPLE_SHA }]) {
    const verdict = evaluate(snapshot);
    assert.equal(verdict.ready, false);
    assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
    assert.ok(verdict.reason_codes.includes('READINESS_EVIDENCE_INVALID'));
  }
});
