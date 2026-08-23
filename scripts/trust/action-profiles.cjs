'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');

const ACTION_PROFILE_IDS = Object.freeze({
  MARKET_GENESIS_CONTACT_HANDOFF: 'MARKET_GENESIS.CONTACT_HANDOFF',
});

const MARKET_GENESIS_CONTACT_HANDOFF = Object.freeze({
  profile_id: ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF,
  profile_version: 1,
  required_dimensions: Object.freeze([
    'IDENTITY',
    'SOURCE',
    'ARTIFACT',
    'RUNTIME',
    'POLICY',
    'COUNTRY',
    'RISK_SIGNAL',
    'REPLAY',
    'FRESHNESS',
  ]),
  constraints: Object.freeze({
    whole_vehicle_forbidden: true,
    transaction_authority_forbidden: true,
    source_durable_required: true,
    deployed_durable_verified_required: true,
    release_evidence_schema: 'market-contact-replay-release-evidence-v1',
  }),
  lease_policy: Object.freeze({
    ttl_ms: 45_000,
    max_uses: 1,
  }),
});

const PROFILES = new Map([
  [MARKET_GENESIS_CONTACT_HANDOFF.profile_id, MARKET_GENESIS_CONTACT_HANDOFF],
]);

function unknownProfile() {
  throw new TrustContractError('TRUST_ACTION_PROFILE_UNKNOWN');
}

function getActionProfile(profileId) {
  if (typeof profileId !== 'string') unknownProfile();
  const profile = PROFILES.get(profileId);
  if (!profile) unknownProfile();
  return profile;
}

function compileProofGeometry(profileId) {
  const profile = getActionProfile(profileId);
  const geometrySha256 = sha256Hex(canonicalJson({
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    required_dimensions: profile.required_dimensions,
    constraints: profile.constraints,
    lease_policy: profile.lease_policy,
  }));
  return Object.freeze({
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    required_dimensions: profile.required_dimensions,
    geometry_sha256: geometrySha256,
  });
}

module.exports = {
  ACTION_PROFILE_IDS,
  getActionProfile,
  compileProofGeometry,
};
