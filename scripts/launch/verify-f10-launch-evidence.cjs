'use strict';

const REQUIRED_CHECKS = Object.freeze([
  'criticalCatalog',
  'runtimeIntegration',
  'automatedAccessibility',
  'manualWcag22AA',
  'rtlLtrVisual',
  'protectedExactHead'
]);

const ALLOWED_STATUS = new Set(['PASS', 'IN_PROGRESS', 'BLOCKED', 'NOT_EVIDENCED', 'FOUNDATION_EXISTS']);

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function hasEvidence(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.trim());
}

function verifyF10LaunchEvidence(evidence, context = {}) {
  const errors = [];
  const blockingChecks = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return Object.freeze({
      ok: false,
      launchGatePass: false,
      blockingChecks: Object.freeze([...REQUIRED_CHECKS]),
      errors: Object.freeze(['F10_EVIDENCE_OBJECT_REQUIRED'])
    });
  }

  if (evidence.schemaVersion !== 'TIGER_F10_LAUNCH_EVIDENCE_V1') {
    errors.push('F10_EVIDENCE_SCHEMA_INVALID');
  }

  const checks = evidence.checks && typeof evidence.checks === 'object' && !Array.isArray(evidence.checks)
    ? evidence.checks
    : {};

  for (const name of REQUIRED_CHECKS) {
    const check = checks[name];
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      errors.push(`F10_MISSING_CHECK:${name}`);
      blockingChecks.push(name);
      continue;
    }
    if (!ALLOWED_STATUS.has(check.status)) {
      errors.push(`F10_INVALID_CHECK_STATUS:${name}`);
      blockingChecks.push(name);
      continue;
    }
    if (check.status === 'PASS') {
      if (!hasEvidence(check.evidence)) errors.push(`F10_PASS_CHECK_REQUIRES_EVIDENCE:${name}`);
    } else {
      blockingChecks.push(name);
    }
  }

  const allPass = REQUIRED_CHECKS.every(name =>
    checks[name] && checks[name].status === 'PASS' && hasEvidence(checks[name].evidence)
  );

  if (evidence.status === 'PASS' && !allPass) {
    errors.push('F10_PASS_REQUIRES_ALL_CHECKS_PASS');
  }
  if (allPass && evidence.status !== 'PASS') {
    errors.push('F10_STATUS_MUST_MATCH_EVIDENCE');
  }
  if (evidence.status === 'PASS' && !isSha(evidence.releaseSha)) {
    errors.push('F10_PASS_REQUIRES_RELEASE_SHA');
  }
  if (evidence.status === 'PASS' && context.currentHeadSha && evidence.releaseSha !== context.currentHeadSha) {
    errors.push('F10_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD');
  }

  return Object.freeze({
    ok: errors.length === 0,
    launchGatePass: evidence.status === 'PASS' && allPass && errors.length === 0,
    blockingChecks: Object.freeze([...new Set(blockingChecks)]),
    errors: Object.freeze(errors)
  });
}

module.exports = Object.freeze({
  REQUIRED_CHECKS,
  verifyF10LaunchEvidence
});
