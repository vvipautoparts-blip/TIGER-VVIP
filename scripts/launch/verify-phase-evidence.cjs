'use strict';

const ALLOWED_STATUS = new Set(['PASS', 'IN_PROGRESS', 'BLOCKED', 'NOT_EVIDENCED', 'FOUNDATION_EXISTS']);

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function hasEvidence(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.trim());
}

function verifyPhaseEvidence(evidence, {
  phase,
  schemaVersion,
  requiredChecks,
  currentHeadSha,
  validatePassMetrics
}) {
  const errors = [];
  const blockingChecks = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return Object.freeze({
      ok: false,
      launchGatePass: false,
      blockingChecks: Object.freeze([...requiredChecks]),
      errors: Object.freeze([`${phase}_EVIDENCE_OBJECT_REQUIRED`])
    });
  }

  if (evidence.schemaVersion !== schemaVersion) errors.push(`${phase}_EVIDENCE_SCHEMA_INVALID`);
  const checks = evidence.checks && typeof evidence.checks === 'object' && !Array.isArray(evidence.checks)
    ? evidence.checks
    : {};

  for (const name of requiredChecks) {
    const check = checks[name];
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      errors.push(`${phase}_MISSING_CHECK:${name}`);
      blockingChecks.push(name);
      continue;
    }
    if (!ALLOWED_STATUS.has(check.status)) {
      errors.push(`${phase}_INVALID_CHECK_STATUS:${name}`);
      blockingChecks.push(name);
      continue;
    }
    if (check.status === 'PASS') {
      if (!hasEvidence(check.evidence)) errors.push(`${phase}_PASS_CHECK_REQUIRES_EVIDENCE:${name}`);
    } else {
      blockingChecks.push(name);
    }
  }

  const allPass = requiredChecks.every(name =>
    checks[name] && checks[name].status === 'PASS' && hasEvidence(checks[name].evidence)
  );

  if (evidence.status === 'PASS' && !allPass) errors.push(`${phase}_PASS_REQUIRES_ALL_CHECKS_PASS`);
  if (allPass && evidence.status !== 'PASS') errors.push(`${phase}_STATUS_MUST_MATCH_EVIDENCE`);

  if (evidence.status === 'PASS') {
    if (!isSha(evidence.releaseSha)) errors.push(`${phase}_PASS_REQUIRES_RELEASE_SHA`);
    if (currentHeadSha && evidence.releaseSha !== currentHeadSha) {
      errors.push(`${phase}_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD`);
    }
    if (typeof validatePassMetrics === 'function') {
      const metricError = validatePassMetrics(evidence.metrics || {});
      if (metricError) errors.push(metricError);
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    launchGatePass: evidence.status === 'PASS' && allPass && errors.length === 0,
    blockingChecks: Object.freeze([...new Set(blockingChecks)]),
    errors: Object.freeze(errors)
  });
}

module.exports = Object.freeze({ verifyPhaseEvidence });
