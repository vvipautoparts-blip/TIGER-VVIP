'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'currentDistributionContract',
  'statutoryTaxSeparation',
  'humanDigitalFinancialFirewall',
  'distributionExecutable',
  'shadowLedgerZero',
  'protectedExactHead'
]);

function verifyF06LaunchEvidence(evidence, context = {}) {
  const finance = context.finance || {};
  return verifyPhaseEvidence(evidence, {
    phase: 'F06',
    schemaVersion: 'TIGER_F06_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        finance.distributionExecutionAuthorized !== true ||
        finance.pendingOwnerDecisionPercent !== 0 ||
        metrics.shadowLedgerImbalanceMinor !== 0
      ) return 'F06_REQUIRES_EXECUTABLE_FINANCE_AND_ZERO_SHADOW_LEDGER';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF06LaunchEvidence });
