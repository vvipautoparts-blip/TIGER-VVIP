'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'restoreRehearsal',
  'failoverRehearsal',
  'rollbackEvidence',
  'dataIntegrityVerification',
  'protectedExactHead'
]);

function verifyF14LaunchEvidence(evidence, context = {}) {
  return verifyPhaseEvidence(evidence, {
    phase: 'F14',
    schemaVersion: 'TIGER_F14_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        !Number.isFinite(metrics.measuredRtoSeconds) ||
        metrics.measuredRtoSeconds < 0 ||
        !Number.isFinite(metrics.measuredRpoSeconds) ||
        metrics.measuredRpoSeconds < 0
      ) return 'F14_REQUIRES_MEASURED_RTO_RPO';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF14LaunchEvidence });
