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

const SHA = '36e15ea84a9cd3abec75d3da338f46dd9ee2ddae';
const MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function deployedReplayEvidence(sha = SHA) {
  return {
    target_environment: 'production',
    contact_replay_release_evidence: {
      schema_version: 'market-contact-replay-release-evidence-v1',
      environment: 'production',
      release_sha: sha,
      migration_sha256: MIGRATION_SHA256,
      migration_applied: true,
      migration_applied_at: '2026-08-23T15:00:00.000Z',
      probe_completed_at: '2026-08-23T15:05:00.000Z',
      probe_run_id: 'probe-32650000000',
      runtime_instance_count: 2,
      duplicate_nonce_probe: {
        attempts: 2,
        successes: 1,
        replay_rejections: 1,
      },
      duplicate_consume_probe: {
        attempts: 2,
        successes: 1,
        replay_rejections: 1,
      },
    },
  };
}

function snapshot(authorityOverrides = {}, release) {
  return {
    expected_head_sha: SHA,
    observed_head_sha: SHA,
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
    ...(release === undefined ? {} : { release }),
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

test('boolean-only source durability cannot authorize contact/handoff rollout', () => {
  const verdict = evaluate(snapshot({
    contact_handoff_enabled: true,
    contact_replay_protection_durable: true,
  }));
  assert.equal(verdict.ready, false);
  assert.equal(verdict.state, 'ROLLOUT_BLOCKED');
  assert.ok(verdict.reason_codes.includes('CONTACT_REPLAY_RELEASE_EVIDENCE_MISSING'));
});

test('release evidence is required only when contact/handoff is enabled', () => {
  const contactDisabled = evaluate(snapshot({
    contact_handoff_enabled: false,
    contact_replay_protection_durable: false,
  }));
  assert.equal(contactDisabled.ready, true);
});

test('exact deployed durable replay evidence authorizes contact/handoff rollout', () => {
  const verdict = evaluate(snapshot({}, deployedReplayEvidence()));
  assert.equal(verdict.ready, true);
  assert.equal(verdict.state, 'ROLLOUT_ELIGIBLE');
  assert.deepEqual(verdict.reason_codes, []);
});

test('release evidence failure reason is propagated without weakening other readiness checks', () => {
  const evidence = deployedReplayEvidence();
  evidence.contact_replay_release_evidence.environment = 'staging';
  const verdict = evaluate(snapshot({}, evidence));
  assert.equal(verdict.ready, false);
  assert.ok(verdict.reason_codes.includes('CONTACT_REPLAY_RELEASE_ENVIRONMENT_MISMATCH'));
});
