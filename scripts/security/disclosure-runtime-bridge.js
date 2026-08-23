'use strict';

const disclosure = require('./owner-sealed-disclosure.js');

const OWNER_SEALED_CLASSIFICATIONS = new Set(['CONFIDENTIAL', 'OWNER_ONLY']);
const SECRET_KEY_PATTERN = /(approval[_-]?code|secret|password|otp|authorization[_-]?header|bearer[_-]?token)/i;
const ISSUE_FAILURE_CODES = new Set([
  'DISCLOSURE_REQUEST_INVALID',
  'DISCLOSURE_CLASSIFICATION_NOT_OWNER_SEALED',
  'DISCLOSURE_REQUEST_CONFLICT',
  'DISCLOSURE_OWNER_AUTHORIZATION_DENIED',
  'DISCLOSURE_OWNER_AUTHORIZATION_EXPIRED',
  'DISCLOSURE_OWNER_AUTHORIZATION_REPLAY_OR_CONFLICT',
  'DISCLOSURE_LEASE_ALREADY_ISSUED',
]);
const CONSUME_FAILURE_CODES = new Set([
  'DISCLOSURE_LEASE_NOT_FOUND',
  'DISCLOSURE_LEASE_REPLAY_OR_CONFLICT',
  'DISCLOSURE_LEASE_BINDING_MISMATCH',
  'DISCLOSURE_LEASE_NOT_YET_VALID',
  'DISCLOSURE_LEASE_EXPIRED',
]);

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
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function rejectRawReusableSecrets(value, path = 'input') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new TypeError(`raw reusable secret or credential is forbidden at ${path}.${key}`);
    }
    if (child && typeof child === 'object') {
      rejectRawReusableSecrets(child, `${path}.${key}`);
    }
  }
}

function validateOwnerReference(request, evidence) {
  requireObject(evidence, 'owner step-up evidence');
  rejectRawReusableSecrets(evidence, 'owner_step_up_evidence');

  const authorizationId = requireString(evidence.authorization_id, 'authorization_id');
  const ownerSubject = requireString(evidence.owner_subject, 'owner_subject');
  const action = requireString(evidence.action, 'action');
  const assurance = requireString(evidence.assurance, 'assurance');
  const challengeDigest = requireString(evidence.challenge_digest, 'challenge_digest');
  const scopeDigest = requireString(evidence.scope_digest, 'scope_digest');

  if (ownerSubject !== 'owner:root') {
    throw new TypeError('owner step-up subject mismatch');
  }
  if (action !== 'APPROVE_DISCLOSURE') {
    throw new TypeError('owner step-up action mismatch');
  }
  if (assurance !== 'PHISHING_RESISTANT') {
    throw new TypeError('owner step-up assurance is insufficient');
  }
  if (challengeDigest !== request.challenge_digest) {
    throw new TypeError('owner step-up challenge binding mismatch');
  }
  if (scopeDigest !== request.artifact_scope_digest) {
    throw new TypeError('owner step-up scope binding mismatch');
  }
  if (Object.hasOwn(evidence, 'nonce_digest')) {
    const nonceDigest = requireString(evidence.nonce_digest, 'nonce_digest');
    if (nonceDigest !== request.nonce_digest) {
      throw new TypeError('owner step-up nonce binding mismatch');
    }
  }

  return authorizationId;
}

function validatePort(fn, field) {
  if (typeof fn !== 'function') {
    throw new TypeError(`${field} persistent authority port is required`);
  }
  return fn;
}

function normalizeFailure(response, allowedCodes) {
  const reasonCode = response && typeof response.reason_code === 'string'
    ? response.reason_code
    : '';
  if (!allowedCodes.has(reasonCode)) {
    return freeze({
      ok: false,
      reason_code: 'DISCLOSURE_AUTHORITY_DENIED',
      lease_id: null,
    });
  }
  return freeze({
    ok: false,
    reason_code: reasonCode,
    lease_id: typeof response.lease_id === 'string' ? response.lease_id : null,
  });
}

function authorityUnavailable() {
  return freeze({
    ok: false,
    reason_code: 'DISCLOSURE_AUTHORITY_UNAVAILABLE',
    lease_id: null,
  });
}

function createDisclosureRuntimeBridge(options) {
  requireObject(options, 'runtime bridge options');
  const issuePersistentDisclosureLease = validatePort(
    options.issuePersistentDisclosureLease,
    'issuePersistentDisclosureLease',
  );
  const consumePersistentDisclosureLease = validatePort(
    options.consumePersistentDisclosureLease,
    'consumePersistentDisclosureLease',
  );

  async function issueDisclosureLease(input) {
    requireObject(input, 'issue disclosure input');
    const request = disclosure.createDisclosureRequest(input.request);
    if (!OWNER_SEALED_CLASSIFICATIONS.has(request.classification)) {
      throw new TypeError('persistent owner-sealed runtime only accepts CONFIDENTIAL or OWNER_ONLY requests');
    }

    const ownerAuthorizationId = validateOwnerReference(request, input.owner_step_up_evidence);
    const auditEvidenceRef = requireString(input.audit_evidence_ref, 'audit_evidence_ref');

    const persistentInput = {
      request_id: request.id,
      requester: request.requester,
      artifact_id: request.artifact_id,
      classification: request.classification,
      artifact_scope_digest: request.artifact_scope_digest,
      purpose: request.purpose,
      nonce_digest: request.nonce_digest,
      challenge_digest: request.challenge_digest,
      owner_authorization_id: ownerAuthorizationId,
      request_expires_at: request.expires_at,
      audit_evidence_ref: auditEvidenceRef,
    };

    let response;
    try {
      response = await issuePersistentDisclosureLease(persistentInput);
    } catch {
      return authorityUnavailable();
    }

    if (!response || response.ok !== true) {
      return normalizeFailure(response, ISSUE_FAILURE_CODES);
    }
    if (response.reason_code !== 'DISCLOSURE_LEASE_ISSUED') {
      return freeze({ ok: false, reason_code: 'DISCLOSURE_AUTHORITY_DENIED', lease_id: null });
    }

    const leaseId = requireString(response.lease_id, 'persistent lease_id');
    const output = {
      ok: true,
      reason_code: 'DISCLOSURE_LEASE_ISSUED',
      lease_id: leaseId,
    };
    if (typeof response.request_id === 'string') output.request_id = response.request_id;
    if (typeof response.expires_at === 'string') output.expires_at = response.expires_at;
    return freeze(output);
  }

  async function consumeDisclosureLease(input) {
    requireObject(input, 'consume disclosure input');
    requireObject(input.lease, 'disclosure lease reference');
    const request = disclosure.createDisclosureRequest(input.request);
    const leaseId = requireString(input.lease.id || input.lease.lease_id, 'lease_id');

    const persistentInput = {
      lease_id: leaseId,
      request_id: request.id,
      requester: request.requester,
      artifact_id: request.artifact_id,
      classification: request.classification,
      artifact_scope_digest: request.artifact_scope_digest,
      purpose: request.purpose,
      nonce_digest: request.nonce_digest,
      challenge_digest: request.challenge_digest,
    };

    let response;
    try {
      response = await consumePersistentDisclosureLease(persistentInput);
    } catch {
      return authorityUnavailable();
    }

    if (!response || response.ok !== true) {
      return normalizeFailure(response, CONSUME_FAILURE_CODES);
    }
    if (response.reason_code !== 'DISCLOSURE_LEASE_CONSUMED') {
      return freeze({ ok: false, reason_code: 'DISCLOSURE_AUTHORITY_DENIED', lease_id: null });
    }

    return freeze({
      ok: true,
      reason_code: 'DISCLOSURE_LEASE_CONSUMED',
      lease_id: requireString(response.lease_id, 'persistent lease_id'),
    });
  }

  return freeze({
    issueDisclosureLease,
    consumeDisclosureLease,
  });
}

module.exports = {
  createDisclosureRuntimeBridge,
};
