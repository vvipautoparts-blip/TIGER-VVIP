'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/repository-governance-policy.v1.json');
const { verifyRepositoryGovernance } = require('../scripts/tsn26/release/repository-governance-proof.cjs');

const SOURCE_SHA = '1'.repeat(40);
const NOW = new Date('2026-08-26T06:30:00.000Z');

function statusRule() {
  return {
    type: 'required_status_checks',
    parameters: {
      strict_required_status_checks_policy: true,
      required_status_checks: policy.required_status_checks.map((context) => ({ context })),
    },
  };
}

function secureSnapshot() {
  return {
    observed_at: '2026-08-26T06:29:30.000Z',
    source_sha: SOURCE_SHA,
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    default_branch: 'main',
    ruleset: {
      id: 19739694,
      target: 'branch',
      enforcement: 'active',
      conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
      bypass_actors: [],
      current_user_can_bypass: 'never',
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: true,
            require_last_push_approval: false,
            required_review_thread_resolution: true,
          },
        },
        statusRule(),
      ],
    },
  };
}

test('active default-branch ruleset with strict required checks produces a release-consumable PASS proof', () => {
  const result = verifyRepositoryGovernance(secureSnapshot(), { policy, now: NOW });
  assert.equal(result.status, 'PASS');
  assert.equal(result.source_sha, SOURCE_SHA);
  assert.equal(result.protected_branch, 'main');
  assert.equal(result.strict_base_freshness, true);
  assert.equal(result.required_checks_complete, true);
  assert.equal(result.failures.length, 0);
  assert.match(result.ref, /^proof:\/\/repository-governance\/[0-9a-f]{16}$/);
  assert.match(result.digest, /^sha256:[0-9a-f]{64}$/);
});

test('current-like PR-only ruleset is blocked when automated merge checks and stale-review protections are absent', () => {
  const snapshot = secureSnapshot();
  snapshot.ruleset.rules = [
    { type: 'deletion' },
    { type: 'non_fast_forward' },
    {
      type: 'pull_request',
      parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
      },
    },
  ];
  const result = verifyRepositoryGovernance(snapshot, { policy, now: NOW });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.failures.includes('REQUIRED_STATUS_CHECKS_RULE_MISSING'));
  assert.ok(result.failures.includes('STALE_REVIEW_PROTECTION_REQUIRED'));
  assert.ok(result.failures.includes('REVIEW_THREAD_RESOLUTION_REQUIRED'));
  assert.equal(result.required_checks_complete, false);
});

test('loose status checks or missing critical contexts fail closed', () => {
  const loose = secureSnapshot();
  loose.ruleset.rules.find((rule) => rule.type === 'required_status_checks').parameters.strict_required_status_checks_policy = false;
  assert.ok(verifyRepositoryGovernance(loose, { policy, now: NOW }).failures.includes('STRICT_STATUS_CHECKS_REQUIRED'));

  const incomplete = secureSnapshot();
  incomplete.ruleset.rules.find((rule) => rule.type === 'required_status_checks').parameters.required_status_checks.pop();
  const incompleteResult = verifyRepositoryGovernance(incomplete, { policy, now: NOW });
  assert.ok(incompleteResult.failures.some((item) => item.startsWith('REQUIRED_STATUS_CHECK_MISSING:')));
});

test('inactive, bypassable, non-default, stale, or cross-head governance evidence is rejected', () => {
  const cases = [
    [(s) => { s.ruleset.enforcement = 'evaluate'; }, 'RULESET_NOT_ACTIVE'],
    [(s) => { s.ruleset.bypass_actors = [{ actor_id: 1 }]; }, 'RULESET_BYPASS_FORBIDDEN'],
    [(s) => { s.ruleset.current_user_can_bypass = 'always'; }, 'CURRENT_USER_BYPASS_FORBIDDEN'],
    [(s) => { s.ruleset.conditions.ref_name.include = ['refs/heads/release']; }, 'DEFAULT_BRANCH_NOT_TARGETED'],
    [(s) => { s.source_sha = '9'.repeat(40); }, 'SOURCE_SHA_MISMATCH'],
    [(s) => { s.observed_at = '2026-08-26T05:00:00.000Z'; }, 'GOVERNANCE_PROOF_STALE'],
  ];
  for (const [mutate, expected] of cases) {
    const snapshot = secureSnapshot();
    mutate(snapshot);
    const result = verifyRepositoryGovernance(snapshot, { policy, now: NOW, expectedSourceSha: SOURCE_SHA });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.failures.includes(expected), `${expected} missing from ${result.failures.join(',')}`);
  }
});
