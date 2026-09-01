'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'authorizedIsolatedCampaigns',
  'remediationRetest',
  'zeroCriticalHigh',
  'securityEvidenceBundle',
  'protectedExactHead'
]);

function verifyF12LaunchEvidence(evidence, context = {}) {
  return verifyPhaseEvidence(evidence, {
    phase: 'F12',
    schemaVersion: 'TIGER_F12_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        metrics.campaignsRequired !== 5 ||
        !Number.isInteger(metrics.campaignsPassed) ||
        metrics.campaignsPassed < 5 ||
        metrics.isolatedCampaigns !== true ||
        metrics.unresolvedCritical !== 0 ||
        metrics.unresolvedHigh !== 0
      ) return 'F12_REQUIRES_5_CAMPAIGNS_AND_ZERO_CRITICAL_HIGH';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF12LaunchEvidence });
