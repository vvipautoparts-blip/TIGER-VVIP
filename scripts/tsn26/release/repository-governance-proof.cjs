'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('repository governance policy is required');
  if (policy.reference !== 'TSN-26' || policy.fail_closed !== true) throw new Error('repository governance policy must be TSN-26 fail-closed');
  if (!Array.isArray(policy.required_status_checks) || policy.required_status_checks.length === 0) throw new Error('repository governance required status checks are missing');
  if (new Set(policy.required_status_checks).size !== policy.required_status_checks.length) throw new Error('repository governance status checks must be unique');
  return policy;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function evaluateRepositoryGovernance(input, { policy: rawPolicy, evaluatedAt = new Date() } = {}) {
  const policy = validatePolicy(rawPolicy);
  if (!(evaluatedAt instanceof Date) || !Number.isFinite(evaluatedAt.getTime())) throw new Error('trusted evaluation time is required');

  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const failures = [];
  const repository = text(source.repository);
  const candidateSourceSha = text(source.candidate_source_sha).toLowerCase();
  const targetBranch = text(source.target_branch);
  const targetSha = text(source.target_sha).toLowerCase();
  const ruleset = source.ruleset && typeof source.ruleset === 'object' && !Array.isArray(source.ruleset) ? source.ruleset : {};
  const rules = Array.isArray(ruleset.rules) ? ruleset.rules : [];

  if (repository !== policy.repository) failures.push('REPOSITORY_MISMATCH');
  if (!SHA_RE.test(candidateSourceSha)) failures.push('SOURCE_SHA_INVALID');
  if (targetBranch !== policy.target_branch) failures.push('TARGET_BRANCH_MISMATCH');
  if (!SHA_RE.test(targetSha)) failures.push('TARGET_SHA_INVALID');
  if (policy.require_target_protected === true && source.target_protected !== true) failures.push('TARGET_NOT_PROTECTED');

  if (ruleset.source !== policy.repository || ruleset.source_type !== 'Repository' || ruleset.target !== 'branch') failures.push('RULESET_SCOPE_INVALID');
  if (policy.require_active_ruleset === true && ruleset.enforcement !== 'active') failures.push('RULESET_NOT_ACTIVE');
  const includes = ruleset.conditions && ruleset.conditions.ref_name && Array.isArray(ruleset.conditions.ref_name.include)
    ? ruleset.conditions.ref_name.include
    : [];
  if (policy.require_default_branch_scope === true && !includes.includes('~DEFAULT_BRANCH')) failures.push('RULESET_DEFAULT_BRANCH_SCOPE_REQUIRED');
  if (policy.forbid_bypass_actors === true && Array.isArray(ruleset.bypass_actors) && ruleset.bypass_actors.length > 0) failures.push('RULESET_BYPASS_FORBIDDEN');

  const ruleTypes = new Set(rules.map((rule) => rule && rule.type).filter(Boolean));
  if (policy.require_deletion_protection === true && !ruleTypes.has('deletion')) failures.push('DELETION_PROTECTION_REQUIRED');
  if (policy.require_non_fast_forward_protection === true && !ruleTypes.has('non_fast_forward')) failures.push('NON_FAST_FORWARD_PROTECTION_REQUIRED');

  const pullRequestRule = rules.find((rule) => rule && rule.type === 'pull_request');
  const prParameters = pullRequestRule && pullRequestRule.parameters && typeof pullRequestRule.parameters === 'object'
    ? pullRequestRule.parameters
    : null;
  if (!prParameters || !Number.isSafeInteger(prParameters.required_approving_review_count) || prParameters.required_approving_review_count < policy.minimum_approving_reviews) {
    failures.push('PR_APPROVAL_REQUIRED');
  }
  if (policy.require_extra_approval_for_unattributed_changes === true && (!prParameters || prParameters.require_extra_approval_for_unattributed_changes !== true)) {
    failures.push('PR_UNATTRIBUTED_CHANGE_APPROVAL_REQUIRED');
  }

  const statusRule = rules.find((rule) => rule && rule.type === 'required_status_checks');
  const statusParameters = statusRule && statusRule.parameters && typeof statusRule.parameters === 'object'
    ? statusRule.parameters
    : null;
  const configuredChecks = statusParameters && Array.isArray(statusParameters.required_status_checks)
    ? statusParameters.required_status_checks.map((item) => text(item && item.context)).filter(Boolean)
    : [];
  const configuredSet = new Set(configuredChecks);

  if (!statusParameters) failures.push('REQUIRED_STATUS_CHECKS_RULE_MISSING');
  if (statusParameters && policy.require_strict_status_checks === true && statusParameters.strict_required_status_checks_policy !== true) failures.push('REQUIRED_STATUS_CHECKS_NOT_STRICT');
  if (statusParameters && statusParameters.do_not_enforce_on_create === true) failures.push('REQUIRED_STATUS_CHECKS_CREATE_BYPASS_FORBIDDEN');
  for (const context of policy.required_status_checks) {
    if (!configuredSet.has(context)) failures.push(`REQUIRED_STATUS_CHECK_MISSING:${context}`);
  }

  const uniqueFailures = [...new Set(failures)].sort();
  const normalized = {
    proof_version: 'TIGER_REPOSITORY_GOVERNANCE_PROOF_V1',
    policy_id: policy.policy_id,
    reference: 'TSN-26',
    evaluated_at: evaluatedAt.toISOString(),
    repository: repository || null,
    source_sha: SHA_RE.test(candidateSourceSha) ? candidateSourceSha : null,
    target_branch: targetBranch || null,
    target_sha: SHA_RE.test(targetSha) ? targetSha : null,
    target_protected: source.target_protected === true,
    ruleset_id: Number.isSafeInteger(ruleset.id) ? ruleset.id : null,
    ruleset_name: text(ruleset.name) || null,
    ruleset_enforcement: text(ruleset.enforcement) || null,
    configured_status_checks: [...configuredSet].sort(),
    required_status_checks: [...policy.required_status_checks].sort(),
    required_checks_present: policy.required_status_checks.every((context) => configuredSet.has(context)),
    failures: uniqueFailures,
    status: uniqueFailures.length === 0 ? 'PASS' : 'FAIL',
  };
  const digest = sha256(normalized);
  return freezeDeep({
    ...normalized,
    ref: SHA_RE.test(candidateSourceSha) ? `proof://repository-governance/${candidateSourceSha}` : null,
    digest,
  });
}

module.exports = Object.freeze({ evaluateRepositoryGovernance, validatePolicy });
