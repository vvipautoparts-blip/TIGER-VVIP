'use strict';

const ARTIFACT_CLASSIFICATIONS = Object.freeze([
  'PUBLIC',
  'USER_OWN',
  'INTERNAL',
  'CONFIDENTIAL',
  'OWNER_ONLY',
]);

const OWNER_SEALED_CLASSIFICATIONS = new Set(['CONFIDENTIAL', 'OWNER_ONLY']);
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function freeze(value) {
  return Object.freeze(value);
}

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} is a required non-empty field`);
  }
  return value;
}

function requireDigest(value, field) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a 64-character lowercase hex digest`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return timestamp;
}

function classifyArtifact(artifact) {
  requireObject(artifact, 'artifact');
  const classification = requireString(artifact.classification, 'classification');
  if (!ARTIFACT_CLASSIFICATIONS.includes(classification)) {
    throw new TypeError('classification must be one of the canonical artifact classifications');
  }
  return classification;
}

function validateDisclosureRequest(input) {
  requireObject(input, 'disclosure request');

  const id = requireString(input.id, 'id');
  const requester = requireString(input.requester, 'requester');
  const artifactId = requireString(input.artifact_id, 'artifact_id');
  const classification = classifyArtifact(input);
  const artifactScopeDigest = requireDigest(input.artifact_scope_digest, 'artifact_scope_digest');
  const purpose = requireString(input.purpose, 'purpose');
  const nonceDigest = requireDigest(input.nonce_digest, 'nonce_digest');
  const challengeDigest = requireDigest(input.challenge_digest, 'challenge_digest');
  const issuedAtMs = parseTimestamp(input.issued_at, 'issued_at');
  const expiresAtMs = parseTimestamp(input.expires_at, 'expires_at');

  if (expiresAtMs <= issuedAtMs) {
    throw new TypeError('expires_at must be later than issued_at');
  }

  return {
    id,
    requester,
    artifact_id: artifactId,
    classification,
    artifact_scope_digest: artifactScopeDigest,
    purpose,
    nonce_digest: nonceDigest,
    challenge_digest: challengeDigest,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
    issuedAtMs,
    expiresAtMs,
  };
}

function createDisclosureRequest(input) {
  const request = validateDisclosureRequest(input);
  return freeze({
    id: request.id,
    requester: request.requester,
    artifact_id: request.artifact_id,
    classification: request.classification,
    artifact_scope_digest: request.artifact_scope_digest,
    purpose: request.purpose,
    nonce_digest: request.nonce_digest,
    challenge_digest: request.challenge_digest,
    issued_at: request.issued_at,
    expires_at: request.expires_at,
  });
}

function rejectRawReusableSecrets(evidence) {
  for (const key of Object.keys(evidence)) {
    if (/(approval[_-]?code|secret|password|otp)/i.test(key)) {
      throw new TypeError('raw reusable approval code or secret is forbidden in disclosure approval evidence');
    }
  }
}

function validateOwnerEvidence(request, evidence, nowMs) {
  requireObject(evidence, 'owner step-up evidence');
  rejectRawReusableSecrets(evidence);

  const authorizationId = requireString(evidence.authorization_id, 'authorization_id');
  const ownerSubject = requireString(evidence.owner_subject, 'owner_subject');
  const action = requireString(evidence.action, 'action');
  const assurance = requireString(evidence.assurance, 'assurance');
  const status = requireString(evidence.status, 'status');
  const challengeDigest = requireDigest(evidence.challenge_digest, 'challenge_digest');
  const scopeDigest = requireDigest(evidence.scope_digest, 'scope_digest');
  const verifiedAtMs = parseTimestamp(evidence.verified_at, 'verified_at');
  const notBeforeMs = parseTimestamp(evidence.not_before, 'not_before');
  const expiresAtMs = parseTimestamp(evidence.expires_at, 'expires_at');

  if (ownerSubject !== 'owner:root') {
    throw new TypeError('owner subject mismatch');
  }
  if (action !== 'APPROVE_DISCLOSURE') {
    throw new TypeError('owner step-up action mismatch');
  }
  if (assurance !== 'PHISHING_RESISTANT') {
    throw new TypeError('owner step-up assurance is insufficient');
  }
  if (status !== 'VERIFIED' || evidence.consumed_at !== null) {
    throw new TypeError('owner evidence status is not active');
  }
  if (challengeDigest !== request.challenge_digest) {
    throw new TypeError('owner evidence challenge binding mismatch');
  }
  if (scopeDigest !== request.artifact_scope_digest) {
    throw new TypeError('owner evidence scope binding mismatch');
  }
  if (verifiedAtMs < request.issuedAtMs || verifiedAtMs > nowMs) {
    throw new TypeError('owner evidence is not fresh for this disclosure request');
  }
  if (notBeforeMs > nowMs || expiresAtMs <= nowMs || expiresAtMs <= notBeforeMs) {
    throw new TypeError('owner evidence is not active or fresh');
  }

  return {
    authorizationId,
    expiresAtMs,
    expires_at: evidence.expires_at,
  };
}

function approveDisclosure(requestInput, ownerStepUpEvidence, now) {
  const request = validateDisclosureRequest(requestInput);
  const nowMs = parseTimestamp(now, 'now');

  if (nowMs < request.issuedAtMs || nowMs >= request.expiresAtMs) {
    throw new TypeError('disclosure request is not active');
  }

  const ownerSealed = OWNER_SEALED_CLASSIFICATIONS.has(request.classification);
  let ownerAuthorizationId = null;
  let leaseExpiresAt = request.expires_at;

  if (ownerSealed) {
    if (!ownerStepUpEvidence) {
      throw new TypeError('fresh owner step-up evidence is required');
    }
    const evidence = validateOwnerEvidence(request, ownerStepUpEvidence, nowMs);
    ownerAuthorizationId = evidence.authorizationId;
    if (evidence.expiresAtMs < request.expiresAtMs) {
      leaseExpiresAt = evidence.expires_at;
    }
  } else if (ownerStepUpEvidence) {
    requireObject(ownerStepUpEvidence, 'owner step-up evidence');
    rejectRawReusableSecrets(ownerStepUpEvidence);
  }

  return freeze({
    id: `disclosure-lease:${request.id}`,
    request_id: request.id,
    requester: request.requester,
    artifact_id: request.artifact_id,
    classification: request.classification,
    artifact_scope_digest: request.artifact_scope_digest,
    purpose: request.purpose,
    nonce_digest: request.nonce_digest,
    challenge_digest: request.challenge_digest,
    owner_authorization_id: ownerAuthorizationId,
    status: 'ISSUED',
    issued_at: now,
    not_before: now,
    expires_at: leaseExpiresAt,
    consumed_at: null,
    revoked_at: null,
  });
}

function leaseBindingsMatch(lease, request) {
  return lease.request_id === request.id
    && lease.requester === request.requester
    && lease.artifact_id === request.artifact_id
    && lease.classification === request.classification
    && lease.artifact_scope_digest === request.artifact_scope_digest
    && lease.purpose === request.purpose
    && lease.nonce_digest === request.nonce_digest
    && lease.challenge_digest === request.challenge_digest;
}

function result(ok, reasonCode, lease) {
  return freeze({ ok, reason_code: reasonCode, lease });
}

function consumeDisclosureLease(leaseInput, requestInput, now) {
  requireObject(leaseInput, 'disclosure lease');
  const request = validateDisclosureRequest(requestInput);
  const nowMs = parseTimestamp(now, 'now');

  if (leaseInput.status !== 'ISSUED') {
    return result(false, 'DISCLOSURE_LEASE_NOT_ACTIVE', leaseInput);
  }

  if (!leaseBindingsMatch(leaseInput, request)) {
    return result(false, 'DISCLOSURE_LEASE_BINDING_MISMATCH', leaseInput);
  }

  const notBeforeMs = parseTimestamp(leaseInput.not_before, 'lease.not_before');
  const expiresAtMs = parseTimestamp(leaseInput.expires_at, 'lease.expires_at');

  if (nowMs < notBeforeMs) {
    return result(false, 'DISCLOSURE_LEASE_NOT_YET_VALID', leaseInput);
  }

  if (nowMs >= expiresAtMs) {
    const expiredLease = freeze({
      ...leaseInput,
      status: 'EXPIRED',
    });
    return result(false, 'DISCLOSURE_LEASE_EXPIRED', expiredLease);
  }

  const consumedLease = freeze({
    ...leaseInput,
    status: 'CONSUMED',
    consumed_at: now,
  });

  return result(true, 'DISCLOSURE_LEASE_CONSUMED', consumedLease);
}

module.exports = {
  ARTIFACT_CLASSIFICATIONS,
  classifyArtifact,
  createDisclosureRequest,
  approveDisclosure,
  consumeDisclosureLease,
};
