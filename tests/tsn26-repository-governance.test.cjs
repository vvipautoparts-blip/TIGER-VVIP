'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/repository-governance-policy.v1.json');
const { evaluateRepositoryGovernance } = require('../scripts/tsn26/release/repository-governance-proof.cjs');

const SOURCE_SHA = '1'.repeat(40);
const MAIN_SHA = '2'.repeat(40);

function compliantRuleset() {
  return {
    id: 19739694,
    name: 'PRODUCTION-MAIN-GOVERNANCE',
    target: 'branch',
    source_type: 'Repository',
    source: 'vvipautoparts-blip/TIGER-VVIP',
    enforcement: 'active',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    bypass_actors: [],
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 1,
          require_extra_approval_for_unattributed_changes: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: policy.required_status_checks.map((context) => ({ context })),
        },
      },
    ],
  };
}

function evaluate(ruleset = compliantRuleset()) {
  return evaluateRepositoryGovernance({
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    candidate_source_sha: SOURCE_SHA,
    target_branch: 'main',
    target_sha: MAIN_SHA,
    target_protected: true,
    ruleset,
  }, { policy, evaluatedAt: new Date('2026-08-26T06:20:00.000Z') });
}

test('repository governance proof passes only for active no-bypass default-branch rules with sovereign checks', () => {
  const proof = evaluate();
  assert.equal(proof.status, 'PASS');
  assert.equal(proof.source_sha, SOURCE_SHA);
  assert.equal(proof.target_sha, MAIN_SHA);
  assert.equal(proof.ruleset_id, 19739694);
  assert.equal(proof.failures.length, 0);
  assert.equal(proof.required_checks_present, true);
  assert.match(proof.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(proof.ref, `proof://repository-governance/${SOURCE_SHA}`);
});

test('missing required status checks is RED even when PR approval rules are active', () => {
  const ruleset = compliantRuleset();
  ruleset.rules = ruleset.rules.filter((rule) => rule.type !== 'required_status_checks');
  const proof = evaluate(ruleset);
  assert.equal(proof.status, 'FAIL');
  assert.equal(proof.required_checks_present, false);
  assert.ok(proof.failures.includes('REQUIRED_STATUS_CHECKS_RULE_MISSING'));
});

test('partial or non-strict status checks cannot satisfy repository governance', () => {
  const partial = compliantRuleset();
  const statusRule = partial.rules.find((rule) => rule.type === 'required_status_checks');
  statusRule.parameters.strict_required_status_checks_policy = false;
  statusRule.parameters.required_status_checks = [{ context: policy.required_status_checks[0] }];
  const proof = evaluate(partial);
  assert.equal(proof.status, 'FAIL');
  assert.ok(proof.failures.includes('REQUIRED_STATUS_CHECKS_NOT_STRICT'));
  assert.ok(proof.failures.some((failure) => failure.startsWith('REQUIRED_STATUS_CHECK_MISSING:')));
});

test('bypass actors, inactive enforcement, weak PR review, deletion or force-push gaps fail closed', () => {
  const cases = [
    ['RULESET_NOT_ACTIVE', (r) => { r.enforcement = 'evaluate'; }],
    ['RULESET_BYPASS_FORBIDDEN', (r) => { r.bypass_actors = [{ actor_id: 1 }]; }],
    ['PR_APPROVAL_REQUIRED', (r) => { r.rules.find((x) => x.type === 'pull_request').parameters.required_approving_review_count = 0; }],
    ['DELETION_PROTECTION_REQUIRED', (r) => { r.rules = r.rules.filter((x) => x.type !== 'deletion'); }],
    ['NON_FAST_FORWARD_PROTECTION_REQUIRED', (r) => { r.rules = r.rules.filter((x) => x.type !== 'non_fast_forward'); }],
  ];
  for (const [expected, mutate] of cases) {
    const ruleset = compliantRuleset();
    mutate(ruleset);
    assert.ok(evaluate(ruleset).failures.includes(expected), expected);
  }
});

test('proof is bound to exact repository, candidate source SHA, protected main and current target SHA', () => {
  const bad = {
    repository: 'other/repo',
    candidate_source_sha: 'bad',
    target_branch: 'release',
    target_sha: 'bad',
    target_protected: false,
    ruleset: compliantRuleset(),
  };
  const proof = evaluateRepositoryGovernance(bad, { policy, evaluatedAt: new Date('2026-08-26T06:20:00.000Z') });
  assert.equal(proof.status, 'FAIL');
  for (const failure of [
    'REPOSITORY_MISMATCH',
    'SOURCE_SHA_INVALID',
    'TARGET_BRANCH_MISMATCH',
    'TARGET_SHA_INVALID',
    'TARGET_NOT_PROTECTED',
  ]) assert.ok(proof.failures.includes(failure), failure);
});
