'use strict';

const {
  TrustContractError,
  canonicalJson,
  sha256Hex,
} = require('./contracts.cjs');
const {
  getActionProfile,
} = require('./action-profiles.cjs');
const {
  evaluateSovereignAction,
  validateScaeDecision,
} = require('./scae.cjs');

const PCAL_SCHEMA = 'TIGER_PCAL_V1';
const PCAL_MODE = 'TEST_ONLY_SOURCE_CONTRACT';
const SHA256 = /^[0-9a-f]{64}$/;
const PCAL_KEYS = Object.freeze([
  'schema',
  'candidate_mode',
  'profile_id',
  'profile_version',
  'action',
  'subject_ref',
  'resource_ref',
  'purpose',
  'country_code',
  'trust_dna_sha256',
  'epoch_vector_sha256',
  'trust_pulse_sha256',
  'decision_sha256',
  'evidence_set_sha256',
  'proof_geometry_sha256',
  'replay_binding_sha256',
  'proof_of_possession_sha256',
  'issued_at_ms',
  'expires_at_ms',
  'max_uses',
  'audit_correlation_sha256',
  'candidate_id_sha256',
]);
const CONSUME_KEYS = Object.freeze(['uses', 'replayed', 'revoked']);

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

function fail(code) {
  throw new TrustContractError(code);
}

function verdict(ok, code) {
  return Object.freeze({ ok, code });
}

function decisionDigest(decision) {
  return sha256Hex(canonicalJson(decision));
}

function auditDigest(decisionSha256, profileId, resourceRef) {
  return sha256Hex(canonicalJson({
    domain: 'TIGER_PCAL_AUDIT_V1',
    decision_sha256: decisionSha256,
    profile_id: profileId,
    resource_ref: resourceRef,
  }));
}

function candidateDigest(decisionSha256, replayBindingSha256, issuedAtMs, expiresAtMs) {
  return sha256Hex(canonicalJson({
    domain: 'TIGER_PCAL_CANDIDATE_V1',
    decision_sha256: decisionSha256,
    replay_binding_sha256: replayBindingSha256,
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
  }));
}

function createPcalCandidate({ decision, request, trustedContext } = {}) {
  try {
    validateScaeDecision(decision);
  } catch {
    fail('TRUST_DECISION_INVALID');
  }
  if (decision.decision !== 'ALLOW') fail('TRUST_DECISION_INVALID');

  const expectedDecision = evaluateSovereignAction({ request, trustedContext });
  if (expectedDecision.decision !== 'ALLOW'
    || canonicalJson(expectedDecision) !== canonicalJson(decision)) {
    fail('TRUST_DECISION_MISMATCH');
  }

  const profile = getActionProfile(decision.profile_id);
  const issuedAtMs = decision.issued_at_ms;
  const expiresAtMs = issuedAtMs + profile.lease_policy.ttl_ms;
  if (!Number.isSafeInteger(expiresAtMs)) fail('TRUST_DECISION_INVALID');
  if (!trustedContext || !SHA256.test(trustedContext.replay_binding_sha256)) {
    fail('TRUST_DECISION_INVALID');
  }

  const decisionSha256 = decisionDigest(decision);
  const auditCorrelationSha256 = auditDigest(
    decisionSha256,
    decision.profile_id,
    decision.resource_ref,
  );
  const candidateIdSha256 = candidateDigest(
    decisionSha256,
    trustedContext.replay_binding_sha256,
    issuedAtMs,
    expiresAtMs,
  );

  return Object.freeze({
    schema: PCAL_SCHEMA,
    candidate_mode: PCAL_MODE,
    profile_id: decision.profile_id,
    profile_version: decision.profile_version,
    action: decision.profile_id,
    subject_ref: decision.subject_ref,
    resource_ref: decision.resource_ref,
    purpose: decision.purpose,
    country_code: decision.country_code,
    trust_dna_sha256: decision.trust_dna_sha256,
    epoch_vector_sha256: decision.epoch_vector_sha256,
    trust_pulse_sha256: decision.trust_pulse_sha256,
    decision_sha256: decisionSha256,
    evidence_set_sha256: decision.evidence_set_sha256,
    proof_geometry_sha256: decision.proof_geometry_sha256,
    replay_binding_sha256: trustedContext.replay_binding_sha256,
    proof_of_possession_sha256: null,
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
    max_uses: profile.lease_policy.max_uses,
    audit_correlation_sha256: auditCorrelationSha256,
    candidate_id_sha256: candidateIdSha256,
  });
}

function pcalShapeValid(value) {
  return hasExactKeys(value, PCAL_KEYS)
    && value.schema === PCAL_SCHEMA
    && value.candidate_mode === PCAL_MODE
    && boundedString(value.profile_id, 128)
    && Number.isSafeInteger(value.profile_version)
    && value.profile_version > 0
    && value.action === value.profile_id
    && boundedString(value.subject_ref)
    && boundedString(value.resource_ref)
    && boundedString(value.purpose, 128)
    && typeof value.country_code === 'string'
    && /^[A-Z]{2}$/.test(value.country_code)
    && SHA256.test(value.trust_dna_sha256)
    && SHA256.test(value.epoch_vector_sha256)
    && SHA256.test(value.trust_pulse_sha256)
    && SHA256.test(value.decision_sha256)
    && SHA256.test(value.evidence_set_sha256)
    && SHA256.test(value.proof_geometry_sha256)
    && SHA256.test(value.replay_binding_sha256)
    && value.proof_of_possession_sha256 === null
    && safeInt(value.issued_at_ms)
    && safeInt(value.expires_at_ms)
    && value.expires_at_ms > value.issued_at_ms
    && Number.isSafeInteger(value.max_uses)
    && value.max_uses > 0
    && SHA256.test(value.audit_correlation_sha256)
    && SHA256.test(value.candidate_id_sha256);
}

function consumeStateValid(value) {
  return hasExactKeys(value, CONSUME_KEYS)
    && safeInt(value.uses)
    && typeof value.replayed === 'boolean'
    && typeof value.revoked === 'boolean';
}

function firstDecisionFailure(decision) {
  const preferred = [
    'TRUST_DNA_RELEASE_MISMATCH',
    'TRUST_EPOCH_MISMATCH',
    'TRUST_PULSE_STALE',
    'TRUST_SIGNAL_REVOKED',
    'TRUST_SIGNAL_UNTRUSTED',
    'TRUST_PROOF_GEOMETRY_UNSATISFIED',
    'TRUST_POLICY_BLOCKED',
  ];
  for (const code of preferred) {
    if (decision.reason_codes.includes(code)) return code;
  }
  return decision.reason_codes[0] ?? 'TRUST_POLICY_BLOCKED';
}

function sameScope(pcal, request) {
  return pcal.profile_id === request?.profile_id
    && pcal.action === request?.profile_id
    && pcal.subject_ref === request?.subject_ref
    && pcal.resource_ref === request?.resource_ref
    && pcal.purpose === request?.purpose
    && pcal.country_code === request?.country_code;
}

function verifyPcalCandidate({ pcal, request, trustedContext, consumeState } = {}) {
  if (!pcalShapeValid(pcal) || !consumeStateValid(consumeState)) {
    return verdict(false, 'TRUST_LEASE_INVALID');
  }

  const currentDecision = evaluateSovereignAction({ request, trustedContext });
  if (currentDecision.decision !== 'ALLOW') {
    return verdict(false, firstDecisionFailure(currentDecision));
  }

  if (!sameScope(pcal, request)) {
    return verdict(false, 'TRUST_LEASE_SCOPE_MISMATCH');
  }
  if (trustedContext.now_ms >= pcal.expires_at_ms) {
    return verdict(false, 'TRUST_LEASE_EXPIRED');
  }
  if (consumeState.replayed) {
    return verdict(false, 'TRUST_LEASE_REPLAYED');
  }
  if (consumeState.revoked) {
    return verdict(false, 'TRUST_SIGNAL_REVOKED');
  }
  if (consumeState.uses >= pcal.max_uses) {
    return verdict(false, 'TRUST_LEASE_USE_EXHAUSTED');
  }

  let expected;
  try {
    expected = createPcalCandidate({
      decision: currentDecision,
      request,
      trustedContext,
    });
  } catch {
    return verdict(false, 'TRUST_LEASE_INVALID');
  }

  if (pcal.epoch_vector_sha256 !== expected.epoch_vector_sha256) {
    return verdict(false, 'TRUST_EPOCH_MISMATCH');
  }
  if (pcal.trust_dna_sha256 !== expected.trust_dna_sha256) {
    return verdict(false, 'TRUST_DNA_RELEASE_MISMATCH');
  }
  if (pcal.trust_pulse_sha256 !== expected.trust_pulse_sha256) {
    return verdict(false, 'TRUST_PULSE_STALE');
  }
  if (pcal.replay_binding_sha256 !== expected.replay_binding_sha256) {
    return verdict(false, 'TRUST_LEASE_REPLAYED');
  }

  const digestBoundFields = [
    'profile_id', 'profile_version', 'action', 'subject_ref', 'resource_ref',
    'purpose', 'country_code', 'decision_sha256', 'evidence_set_sha256',
    'proof_geometry_sha256', 'proof_of_possession_sha256', 'issued_at_ms',
    'expires_at_ms', 'max_uses', 'audit_correlation_sha256', 'candidate_id_sha256',
  ];
  for (const field of digestBoundFields) {
    if (pcal[field] !== expected[field]) {
      return verdict(false, 'TRUST_EVIDENCE_DIGEST_MISMATCH');
    }
  }

  return verdict(true, 'TRUST_PCAL_VERIFIED');
}

module.exports = {
  PCAL_SCHEMA,
  createPcalCandidate,
  verifyPcalCandidate,
};
