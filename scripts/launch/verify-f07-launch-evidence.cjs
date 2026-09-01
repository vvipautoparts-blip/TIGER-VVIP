'use strict';

const { verifyPhaseEvidence } = require('./verify-phase-evidence.cjs');

const REQUIRED_CHECKS = Object.freeze([
  'pulseVisibilityRuntime',
  'platformServicePaymentRuntime',
  'countryGates',
  'pricingProfitability',
  'marketplaceNoIntermediation',
  'protectedExactHead'
]);

function verifyF07LaunchEvidence(evidence, context = {}) {
  return verifyPhaseEvidence(evidence, {
    phase: 'F07',
    schemaVersion: 'TIGER_F07_LAUNCH_EVIDENCE_V1',
    requiredChecks: REQUIRED_CHECKS,
    currentHeadSha: context.currentHeadSha,
    validatePassMetrics(metrics) {
      if (
        !Number.isInteger(metrics.launchCountries) ||
        metrics.launchCountries < 1 ||
        metrics.allCountryGatesPass !== true ||
        metrics.profitabilityCertificate !== true ||
        metrics.platformServicePaymentRuntime !== true ||
        metrics.marketplaceIntermediationRole !== 'NONE'
      ) return 'F07_REQUIRES_PAYMENT_COUNTRY_PROFITABILITY_NO_INTERMEDIATION';
      return null;
    }
  });
}

module.exports = Object.freeze({ REQUIRED_CHECKS, verifyF07LaunchEvidence });
