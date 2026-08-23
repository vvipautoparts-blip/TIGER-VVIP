'use strict';

const crypto = require('node:crypto');

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SECRET_KEY_PATTERN = /(approval[_-]?code|secret|password|otp|authorization(?:[_-]?(?:header|token))?|bearer[_-]?token|raw[_-]?prompt|rawPrompt|token)/i;
const CLIENT_AUTHORITY_KEY_PATTERN = /^(role|roles|viewer_capabilities|grants|owner_step_up_evidence)$/i;
const RESERVED_METADATA_KEYS = new Set([
  'target',
  'action',
  'authority_refs',
  'scope_digest',
  'policy_version',
  'environment',
]);
const PRESERVED_FAILURE_CODES = new Set([
  'AUDIT_EVENT_INVALID',
  'AUDIT_PREVIOUS_HASH_MISMATCH',
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function requireString(value, field, max = 256) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) {
    throw new TypeError(`${field} must be a bounded non-empty string`);
  }
  return value;
}

function requireDigest(value, field) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a 64-character lowercase hex digest`);
  }
  return value;
}

function rejectSensitiveKeys(value, path = 'metadata') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      rejectSensitiveKeys(value[index], `${path}[${index}]`);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new TypeError(`secret or sensitive raw credential is forbidden at ${path}.${key}`);
    }
    if (CLIENT_AUTHORITY_KEY_PATTERN.test(key)) {
      throw new TypeError(`client/browser authority-shaped field is forbidden at ${path}.${key}`);
    }
    rejectSensitiveKeys(child, `${path}.${key}`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function requireAuthorityRefs(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new TypeError('authority_refs must be a bounded non-empty array');
  }
  rejectSensitiveKeys(value, 'authority_refs');
  return value.map((item) => requireString(item, 'authority_ref', 256));
}

function normalizeExtraMetadata(value) {
  if (value === undefined) return {};
  const metadata = requireObject(value, 'extra_metadata');
  rejectSensitiveKeys(metadata, 'extra_metadata');
  const output = {};
  for (const [key, child] of Object.entries(metadata)) {
    if (RESERVED_METADATA_KEYS.has(key)) {
      throw new TypeError(`extra_metadata cannot override reserved authorization audit field ${key}`);
    }
    output[key] = child;
  }
  return output;
}

function buildEvent(input) {
  const event = requireObject(input, 'authorization audit event');
  rejectSensitiveKeys(event.extra_metadata || {}, 'extra_metadata');
  rejectSensitiveKeys(event.authority_refs || [], 'authority_refs');

  const correlationId = requireString(event.correlation_id, 'correlation_id', 128);
  if (correlationId.length < 8) throw new TypeError('correlation_id must contain at least 8 characters');
  const actor = requireString(event.actor, 'actor', 256);
  const target = requireString(event.target, 'target', 256);
  const action = requireString(event.action, 'action', 128);
  const decision = requireString(event.decision, 'decision', 64);
  const reasonCode = requireString(event.reason_code, 'reason_code', 256);
  const authorityRefs = requireAuthorityRefs(event.authority_refs);
  const scopeDigest = requireDigest(event.scope_digest, 'scope_digest');
  const policyVersion = requireString(event.policy_version, 'policy_version', 128);
  const environment = requireString(event.environment, 'environment', 64);
  const releaseDigest = requireDigest(event.release_digest, 'release_digest');
  const previousHash = event.previous_hash === null || event.previous_hash === undefined
    ? null
    : requireDigest(event.previous_hash, 'previous_hash');
  const extraMetadata = normalizeExtraMetadata(event.extra_metadata);

  const metadata = {
    target,
    action,
    authority_refs: authorityRefs,
    scope_digest: scopeDigest,
    policy_version: policyVersion,
    environment,
    ...extraMetadata,
  };

  rejectSensitiveKeys(metadata, 'metadata');
  const streamKey = `authorization:${target}`;
  const agentId = 'unified-authorization-runtime-bridge';
  const hashMaterial = {
    stream_key: streamKey,
    previous_hash: previousHash,
    release_digest: releaseDigest,
    correlation_id: correlationId,
    actor_subject: actor,
    agent_id: agentId,
    decision,
    reason_code: reasonCode,
    metadata,
  };
  const eventHash = crypto.createHash('sha256').update(canonicalJson(hashMaterial)).digest('hex');

  return {
    stream_key: streamKey,
    previous_hash: previousHash,
    event_hash: eventHash,
    release_digest: releaseDigest,
    correlation_id: correlationId,
    actor_subject: actor,
    agent_id: agentId,
    decision,
    reason_code: reasonCode,
    metadata,
  };
}

function createAuthorizationAuditAdapter(options) {
  requireObject(options, 'authorization audit options');
  if (typeof options.appendAuditChainEvent !== 'function') {
    throw new TypeError('existing audit chain append port is required');
  }
  const appendAuditChainEvent = options.appendAuditChainEvent;

  async function appendAuthorizationDecision(input) {
    const event = buildEvent(input);
    let response;
    try {
      response = await appendAuditChainEvent(event);
    } catch {
      return freeze({
        ok: false,
        reason_code: 'AUTHORIZATION_AUDIT_UNAVAILABLE',
        sequence_no: null,
      });
    }

    if (response && response.ok === true && response.reason_code === 'AUDIT_APPENDED') {
      return freeze({
        ok: true,
        reason_code: 'AUDIT_APPENDED',
        sequence_no: Number.isInteger(response.sequence_no) ? response.sequence_no : null,
      });
    }

    const reasonCode = response && typeof response.reason_code === 'string'
      ? response.reason_code
      : '';
    return freeze({
      ok: false,
      reason_code: PRESERVED_FAILURE_CODES.has(reasonCode)
        ? reasonCode
        : 'AUTHORIZATION_AUDIT_REJECTED',
      sequence_no: null,
    });
  }

  return freeze({ appendAuthorizationDecision });
}

module.exports = {
  createAuthorizationAuditAdapter,
};
