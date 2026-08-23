'use strict';

const {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  validateContactReplayReleaseEvidence,
} = require('../marketplace/market-release-evidence-contract.js');
const {
  validateMarketSourceReadinessEvidence,
} = require('../marketplace/market-source-readiness-evidence.js');

const UNVERIFIED_RELEASE_EVIDENCE_SCHEMA = 'UNVERIFIED';

function deriveMarketGenesisTrustState({
  sourceReadinessEvidence,
  releaseEvidence,
  expectedSourceSha,
  expectedSourceTree,
  expectedHeadSha,
  observedHeadSha,
  wholeVehicleAd,
  transactionAuthorityEnabled,
} = {}) {
  const sourceValidation = validateMarketSourceReadinessEvidence(
    sourceReadinessEvidence,
    { expectedSourceSha, expectedSourceTree },
  );
  const sourceDurable = sourceValidation.ok === true
    && sourceReadinessEvidence?.authority?.contact_replay_protection_durable === true
    && sourceReadinessEvidence?.deployed_durable_verified === false;

  const releaseValidation = sourceDurable
    ? validateContactReplayReleaseEvidence({
      release: releaseEvidence,
      expectedHeadSha,
      observedHeadSha,
    })
    : Object.freeze({ ok: false, reason_code: 'SOURCE_NOT_VERIFIED' });

  const deployedDurableVerified = sourceDurable && releaseValidation.ok === true;

  return Object.freeze({
    whole_vehicle_ad: wholeVehicleAd === false ? false : true,
    transaction_authority_enabled: transactionAuthorityEnabled === false ? false : true,
    source_durable: sourceDurable,
    deployed_durable_verified: deployedDurableVerified,
    release_evidence_schema: deployedDurableVerified
      ? RELEASE_EVIDENCE_SCHEMA_VERSION
      : UNVERIFIED_RELEASE_EVIDENCE_SCHEMA,
  });
}

module.exports = {
  deriveMarketGenesisTrustState,
};
