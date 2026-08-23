'use strict';

const ARTIFACT_CLASSIFICATIONS = Object.freeze([
  'PUBLIC',
  'USER_OWN',
  'INTERNAL',
  'CONFIDENTIAL',
  'OWNER_ONLY',
]);

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
  };
}

function createDisclosureRequest(input) {
  return freeze(validateDisclosureRequest(input));
}

function persistentAuthorityRequired() {
  throw new TypeError('persistent disclosure runtime authority is required; in-memory issue/consume state is not authoritative');
}

function approveDisclosure() {
  return persistentAuthorityRequired();
}

function consumeDisclosureLease() {
  return persistentAuthorityRequired();
}

module.exports = {
  ARTIFACT_CLASSIFICATIONS,
  classifyArtifact,
  createDisclosureRequest,
  approveDisclosure,
  consumeDisclosureLease,
};
