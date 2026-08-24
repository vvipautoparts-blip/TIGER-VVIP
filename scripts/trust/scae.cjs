'use strict';

const {
  TrustContractError,
  TRUST_SCHEMAS,
  TRUST_DIMENSIONS,
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  validateTrustPulse,
  digestValidated,
} = require('./contracts.cjs');
const {
  getActionProfile,
  compileProofGeometry,
} = require('./action-profiles.cjs');
const {
  isTrustedTrustPulseV2,
} = require('./deployment-attestation-bridge.cjs');
const {
  validateRevocationState,
  digestSignalScope,
  isTrustedRevocationState,
} = require('./revocation-state.cjs');

const DECISION_SCHEMA = 'TIGER_SCAE_DECISION_V1';
const REQUEST_KEYS = Object.freeze([
  'profile_id',
  'subject_ref',
  'resource_ref',
  'purpose',
  'country_code',
]);
const TRUSTED_CONTEXT_KEYS = Object.freeze([
  'now_ms',
  'trust_dna',
  'current_epochs',
  'trust_pulse',
  'proofs',
  'revocation_state',
  'market_state',
  'replay_binding_sha256',
]);
const TRUSTED_CONTEXT_WITHOUT_REVOCATION_KEYS = Object.freeze(
  TRUSTED_CONTEXT_KEYS.filter((key) => key !== 'revocation_state'),
);
const MARKET_STATE_KEYS = Object.freeze([
  'whole_vehicle_ad',
  'transaction_authority_enabled',
  'source_durable',
  'deployed_durable_verified',
  'release_evidence_schema',
]);
const PROOF_KEYS = Object.freeze(['status', 'digest_sha256']);
const SHA256 = /^[0-9a-f]{64}$/;
const COUNTRY = /^[A-Z]{2}$/;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function boundedString(value, max = 256) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= max
    && value.trim() === value;
}

function safeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function freezeDecision(value) {
  Object.freeze(value.reason_codes);
  return Object.freeze(value);
}

function safeRequestFields(request) {
  const value = isPlainObject(request) ? request : {};
  return {
    profile_id: boundedString(value.profile_id, 128) ? value.profile_id : null,
    subject_ref: boundedString(value.subject_ref) ? value.subject_ref : null,
    resource_ref: boundedString(value.resource_ref) ? value.resource_ref : null,
    purpose: boundedString(value.purpose, 128) ? value.purpose : null,
    country_code: typeof value.country_code === 'string' && COUNTRY.test(value.country_code)
      ? value.country_code
      : null,
  };
}

function blockedDecision({ request, trustedContext, reasonCodes, profile = null, geometry = null, digests = {} }) {
  const safe = safeRequestFields(request);
  const reasons = [...new Set(reasonCodes)].sort();
  return freezeDecision({
    schema: DECISION_SCHEMA,
    decision: 'BLOCKED',
    reason_codes: reasons,
    profile_id: safe.profile_id,
    profile_version: profile?.profile_version ?? null,
    subject_ref: safe.subject_ref,
    resource_ref: safe.resource_ref,
    purpose: safe.purpose,
    country_code: safe.country_code,
    trust_dna_sha256: digests.trustDna ?? null,
    epoch_vector_sha256: digests.epochs ?? null,
    trust_pulse_sha256: digests.pulse ?? null,
    proof_geometry_sha256: geometry?.geometry_sha256 ?? null,
    evidence_set_sha256: digests.evidenceSet ?? null,
    issued_at_ms: safeInt(trustedContext?.now_ms) ? trustedContext.now_ms : null,
  });
}

function requestIsValid(request) {
  return hasExactKeys(request, REQUEST_KEYS)
    && boundedString(request.profile_id, 128)
    && boundedString(request.subject_ref)
    && boundedString(request.resource_ref)
    && boundedString(request.purpose, 128)
    && COUNTRY.test(request.country_code);
}

function proofEntryIsValid(value) {
  return hasExactKeys(value, PROOF_KEYS)
    && (value.status === 'PASS' || value.status === 'BLOCKED')
    && SHA256.test(value.digest_sha256);
}

function marketStateShapeIsValid(value) {
  return hasExactKeys(value, MARKET_STATE_KEYS)
    && typeof value.whole_vehicle_ad === 'boolean'
    && typeof value.transaction_authority_enabled === 'boolean'
    && typeof value.source_durable === 'boolean'
    && typeof value.deployed_durable_verified === 'boolean'
    && boundedString(value.release_evidence_schema, 128);
}

function trustedContextShapeIsValid(value) {
  return hasExactKeys(value, TRUSTED_CONTEXT_KEYS)
    && safeInt(value.now_ms)
    && isPlainObject(value.proofs)
    && SHA256.test(value.replay_binding_sha256);
}

function trustedContextOnlyMissingRevocation(value) {
  return hasExactKeys(value, TRUSTED_CONTEXT_WITHOUT_REVOCATION_KEYS)
    && safeInt(value.now_ms)
    && isPlainObject(value.proofs)
    && SHA256.test(value.replay_binding_sha256);
}

function getCountryEpoch(epochVector, countryCode) {
  return epochVector.country_epochs.find((entry) => entry.country_code === countryCode) ?? null;
}

function expectedRevocationScope(request, trustDnaDigest) {
  return Object.freeze({
    subject_ref_sha256: sha256Hex(request.subject_ref),
    resource_ref_sha256: sha256Hex(request.resource_ref),
    action_profile_ref_sha256: sha256Hex(request.profile_id),
    country_ref_sha256: sha256Hex(request.country_code),
    release_dna_sha256: trustDnaDigest,
  });
}

function evaluateSovereignAction({ request, trustedContext } = {}) {
  if (!requestIsValid(request)) {
    return blockedDecision({ request, trustedContext, reasonCodes: ['TRUST_REQUEST_INVALID'] });
  }

  let profile;
  let geometry;
  try {
    profile = getActionProfile(request.profile_id);
    geometry = compileProofGeometry(request.profile_id);
  } catch (error) {
    if (error instanceof TrustContractError && error.code === 'TRUST_ACTION_PROFILE_UNKNOWN') {
      return blockedDecision({ request, trustedContext, reasonCodes: ['TRUST_ACTION_PROFILE_UNKNOWN'] });
    }
    throw error;
  }

  if (trustedContextOnlyMissingRevocation(trustedContext)) {
    return blockedDecision({
      request,
      trustedContext,
      profile,
      geometry,
      reasonCodes: ['TRUST_SIGNAL_MISSING'],
    });
  }

  if (!trustedContextShapeIsValid(trustedContext)) {
    return blockedDecision({
      request,
      trustedContext,
      profile,
      geometry,
      reasonCodes: ['TRUST_EVIDENCE_MISSING'],
    });
  }

  let trustedDna;
  let currentEpochs;
  let trustPulse;
  try {
    trustedDna = validateTrustDna(trustedContext.trust_dna);
    currentEpochs = validateEpochVector(trustedContext.current_epochs);
    trustPulse = validateTrustPulse(trustedContext.trust_pulse);
  } catch (error) {
    const code = error?.code === 'TRUST_DNA_INVALID'
      ? 'TRUST_DNA_INVALID'
      : error?.code === 'TRUST_EPOCH_VECTOR_INVALID'
        ? 'TRUST_EPOCH_MISMATCH'
        : 'TRUST_PULSE_MISSING';
    return blockedDecision({
      request,
      trustedContext,
      profile,
      geometry,
      reasonCodes: [code],
    });
  }

  if (trustPulse.schema === TRUST_SCHEMAS.TRUST_PULSE_V2
    && !isTrustedTrustPulseV2(trustedContext.trust_pulse)) {
    return blockedDecision({
      request,
      trustedContext,
      profile,
      geometry,
      reasonCodes: ['TRUST_PULSE_UNTRUSTED'],
    });
  }

  const trustDnaDigest = digestValidated(trustedDna, validateTrustDna);
  const epochDigest = digestValidated(currentEpochs, validateEpochVector);
  const pulseDigest = digestValidated(trustPulse, validateTrustPulse);
  const digests = {
    trustDna: trustDnaDigest,
    epochs: epochDigest,
    pulse: pulseDigest,
    evidenceSet: null,
  };
  const reasons = [];

  if (trustPulse.release_dna_sha256 !== trustDnaDigest) {
    reasons.push('TRUST_DNA_RELEASE_MISMATCH');
  }
  if (trustPulse.epoch_vector_sha256 !== epochDigest || !getCountryEpoch(currentEpochs, request.country_code)) {
    reasons.push('TRUST_EPOCH_MISMATCH');
  }
  if (trustedContext.now_ms < trustPulse.issued_at_ms || trustedContext.now_ms >= trustPulse.fresh_until_ms) {
    reasons.push('TRUST_PULSE_STALE');
  }

  const evidenceRecords = [];
  let geometrySatisfied = true;
  for (const dimension of geometry.required_dimensions) {
    const proof = trustedContext.proofs[dimension];
    if (!proofEntryIsValid(proof) || proof.status !== 'PASS') {
      geometrySatisfied = false;
      continue;
    }
    evidenceRecords.push({ dimension, digest_sha256: proof.digest_sha256 });
  }
  for (const key of Object.keys(trustedContext.proofs)) {
    if (!TRUST_DIMENSIONS.includes(key) || !proofEntryIsValid(trustedContext.proofs[key])) {
      geometrySatisfied = false;
    }
  }
  if (!geometrySatisfied) {
    reasons.push('TRUST_PROOF_GEOMETRY_UNSATISFIED');
  } else {
    digests.evidenceSet = sha256Hex(canonicalJson(evidenceRecords));
  }

  if (!isTrustedRevocationState(trustedContext.revocation_state)) {
    reasons.push('TRUST_SIGNAL_UNTRUSTED');
  } else {
    let revocationState;
    try {
      revocationState = validateRevocationState(
        trustedContext.revocation_state,
        { nowMs: trustedContext.now_ms },
      );
    } catch (error) {
      if (error?.code === 'TRUST_SIGNAL_STALE' || error?.code === 'TRUST_SIGNAL_FRESHNESS_INVALID') {
        reasons.push('TRUST_SIGNAL_STALE');
      } else {
        reasons.push('TRUST_SIGNAL_UNTRUSTED');
      }
    }

    if (revocationState) {
      const scope = expectedRevocationScope(request, trustDnaDigest);
      if (revocationState.scope_digest_sha256 !== digestSignalScope(scope)
        || revocationState.release_dna_sha256 !== trustDnaDigest) {
        reasons.push('TRUST_SIGNAL_SCOPE_MISMATCH');
      }
      if (revocationState.effective_status === 'REVOKED') {
        reasons.push('TRUST_SIGNAL_REVOKED');
      }
    }
  }

  if (!marketStateShapeIsValid(trustedContext.market_state)) {
    reasons.push('TRUST_POLICY_BLOCKED');
  } else {
    const market = trustedContext.market_state;
    if (profile.constraints.whole_vehicle_forbidden && market.whole_vehicle_ad) {
      reasons.push('TRUST_MARKET_WHOLE_VEHICLE_FORBIDDEN');
    }
    if (profile.constraints.transaction_authority_forbidden && market.transaction_authority_enabled) {
      reasons.push('TRUST_MARKET_TRANSACTION_AUTHORITY_FORBIDDEN');
    }
    if (profile.constraints.source_durable_required && !market.source_durable) {
      reasons.push('TRUST_MARKET_SOURCE_DURABLE_UNPROVEN');
    }
    if (profile.constraints.deployed_durable_verified_required && !market.deployed_durable_verified) {
      reasons.push('TRUST_MARKET_DEPLOYED_DURABLE_UNPROVEN');
    }
    if (market.release_evidence_schema !== profile.constraints.release_evidence_schema) {
      reasons.push('TRUST_MARKET_RELEASE_EVIDENCE_INVALID');
    }
  }

  if (reasons.length > 0) {
    return blockedDecision({ request, trustedContext, profile, geometry, reasonCodes: reasons, digests });
  }

  return freezeDecision({
    schema: DECISION_SCHEMA,
    decision: 'ALLOW',
    reason_codes: [],
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    subject_ref: request.subject_ref,
    resource_ref: request.resource_ref,
    purpose: request.purpose,
    country_code: request.country_code,
    trust_dna_sha256: trustDnaDigest,
    epoch_vector_sha256: epochDigest,
    trust_pulse_sha256: pulseDigest,
    proof_geometry_sha256: geometry.geometry_sha256,
    evidence_set_sha256: digests.evidenceSet,
    issued_at_ms: trustedContext.now_ms,
  });
}

function validateScaeDecision(value) {
  const keys = [
    'schema', 'decision', 'reason_codes', 'profile_id', 'profile_version',
    'subject_ref', 'resource_ref', 'purpose', 'country_code',
    'trust_dna_sha256', 'epoch_vector_sha256', 'trust_pulse_sha256',
    'proof_geometry_sha256', 'evidence_set_sha256', 'issued_at_ms',
  ];
  if (!hasExactKeys(value, keys)
    || value.schema !== DECISION_SCHEMA
    || !['ALLOW', 'BLOCKED'].includes(value.decision)
    || !Array.isArray(value.reason_codes)
    || !value.reason_codes.every((code) => boundedString(code, 128))
    || !(value.profile_version === null || (Number.isSafeInteger(value.profile_version) && value.profile_version > 0))
    || !(value.issued_at_ms === null || safeInt(value.issued_at_ms))) {
    throw new TrustContractError('TRUST_DECISION_INVALID');
  }
  if (value.decision === 'ALLOW') {
    if (value.reason_codes.length !== 0
      || !boundedString(value.profile_id, 128)
      || !boundedString(value.subject_ref)
      || !boundedString(value.resource_ref)
      || !boundedString(value.purpose, 128)
      || !COUNTRY.test(value.country_code)
      || !SHA256.test(value.trust_dna_sha256)
      || !SHA256.test(value.epoch_vector_sha256)
      || !SHA256.test(value.trust_pulse_sha256)
      || !SHA256.test(value.proof_geometry_sha256)
      || !SHA256.test(value.evidence_set_sha256)
      || !safeInt(value.issued_at_ms)) {
      throw new TrustContractError('TRUST_DECISION_INVALID');
    }
  }
  return value;
}

module.exports = {
  DECISION_SCHEMA,
  evaluateSovereignAction,
  validateScaeDecision,
};
