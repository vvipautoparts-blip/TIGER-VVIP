'use strict';

const STATES = Object.freeze([
  'EXECUTED_GREEN',
  'EXECUTED_CODE_RED',
  'EXECUTED_SECURITY_RED',
  'EXECUTED_POLICY_RED',
  'BLOCKED_RUNNER',
  'BLOCKED_PROVIDER',
  'BLOCKED_ACCOUNT',
  'STALE',
  'REVOKED',
  'UNVERIFIED'
]);

function classifyCiJob(job, options = {}) {
  const diagnostic = String(options.diagnostic || '');
  if (diagnostic === 'BLOCKED_PROVIDER') return 'BLOCKED_PROVIDER';
  if (diagnostic === 'BLOCKED_ACCOUNT') return 'BLOCKED_ACCOUNT';
  if (options.revoked === true) return 'REVOKED';
  if (options.stale === true) return 'STALE';
  if (!job || typeof job !== 'object') return 'UNVERIFIED';

  const steps = Array.isArray(job.steps) ? job.steps : [];
  const runnerId = Number(job.runner_id || 0);

  if (runnerId === 0 && steps.length === 0) return 'BLOCKED_RUNNER';
  if (job.status !== 'completed' || runnerId <= 0 || steps.length === 0) return 'UNVERIFIED';

  if (job.conclusion === 'success') {
    const invalid = steps.some((step) => !['success', 'skipped', 'neutral'].includes(String(step.conclusion || '')));
    return invalid ? 'UNVERIFIED' : 'EXECUTED_GREEN';
  }

  if (job.conclusion === 'failure') {
    if (options.domain === 'security') return 'EXECUTED_SECURITY_RED';
    if (options.domain === 'policy') return 'EXECUTED_POLICY_RED';
    return 'EXECUTED_CODE_RED';
  }

  return 'UNVERIFIED';
}

module.exports = Object.freeze({ classifyCiJob, STATES });
