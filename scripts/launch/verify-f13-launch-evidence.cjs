'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'uniqueActorsProgram',
  'simultaneousActiveProgram',
  'latencyErrorSaturation',
  'costFinancialInvariants',
  'protectedExactHead'
]);

function verifyF13LaunchEvidence(evidence, context = {}) {
  return verifyPhaseEvidence(evidence, {
    phase: 'F13',
    schemaVersion: 'TIGER_F13_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        metrics.uniqueActorsRequired !== 4000000 ||
        !Number.isInteger(metrics.uniqueActorsPassed) ||
        metrics.uniqueActorsPassed < 4000000 ||
        metrics.simultaneousActiveRequired !== 4000000 ||
        !Number.isInteger(metrics.simultaneousActivePassed) ||
        metrics.simultaneousActivePassed < 4000000 ||
        metrics.reproducible !== true
      ) return 'F13_REQUIRES_BOTH_4M_PROGRAMS';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF13LaunchEvidence });
