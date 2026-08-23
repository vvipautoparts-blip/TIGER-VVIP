'use strict';

const { randomUUID } = require('node:crypto');
const { createContactHandoffConvergence } = require('./contact-handoff.js');
const { createDurableReplayAuthority } = require('./durable-replay-authority.js');
const { FORBIDDEN_TRANSACTION_FIELDS } = require('./private-market-contracts.js');

const PRIVATE_OR_MESSAGING_FIELDS = Object.freeze([
  'raw_intent',
  'intent_text',
  'private_intent',
  'intent_embedding',
  'email',
  'phone',
  'phone_number',
  'contact_value',
  'message_body',
  'message_content',
  'conversation_content',
  'group_id',
  'room_id',
  'broadcast_id',
  'payment_intent',
]);

const FORBIDDEN_INPUT_FIELDS = new Set([
  ...FORBIDDEN_TRANSACTION_FIELDS,
  ...PRIVATE_OR_MESSAGING_FIELDS,
]);

const ONE_TO_ONE_CHANNELS = new Set(['SOCIAL_MESSAGE']);
const DEFAULT_MAX_CAPABILITY_TTL_MS = 5 * 60 * 1000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasForbiddenField(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenField);
  if (!isPlainObject(value)) return false;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_INPUT_FIELDS.has(key)) return true;
    if (hasForbiddenField(child)) return true;
  }
  return false;
}

function addReason(reasonCodes, errors, code, message) {
  if (!reasonCodes.includes(code)) reasonCodes.push(code);
  errors.push(message);
}

function denied(reasonCodes, errors, state = 'CONTACT_REQUESTED') {
  return Object.freeze({
    ok: false,
    state,
    reason_codes: Object.freeze([...reasonCodes]),
    errors: Object.freeze([...errors]),
  });
}

function durableDenied(reasonCode, state) {
  return denied(
    [reasonCode],
    ['durable replay authority denied the operation'],
    state,
  );
}

function createDurableContactHandoff(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const configuredTtl = Number.isFinite(options.maxCapabilityTtlMs)
    ? options.maxCapabilityTtlMs
    : DEFAULT_MAX_CAPABILITY_TTL_MS;
  const maxCapabilityTtlMs = Math.max(1, Math.min(configuredTtl, DEFAULT_MAX_CAPABILITY_TTL_MS));
  const durableReplay = createDurableReplayAuthority({ store: options.store });

  function createAdmissionValidator() {
    return createContactHandoffConvergence({ now, maxCapabilityTtlMs });
  }

  async function authorizeContact(input = {}) {
    // The synchronous validator is intentionally request-scoped here. Its
    // process-local replay collections are discarded immediately and are never
    // a durable-path authority or fallback. PostgreSQL-backed replay authority
    // is the only cross-request/cross-instance source of truth for this path.
    const validation = createAdmissionValidator().authorizeContact(input);
    if (!validation.ok) return validation;

    const replayVerdict = await durableReplay.issueAuthorization({
      nonce: input.request?.nonce,
      capability: validation.capability,
    });
    if (!replayVerdict.ok) {
      return durableDenied(replayVerdict.reason_code, 'CONTACT_REQUESTED');
    }

    return validation;
  }

  async function emitHandoff(input = {}) {
    const reasonCodes = [];
    const errors = [];
    const capability = isPlainObject(input.capability) ? input.capability : {};

    if (!isPlainObject(input) || !isPlainObject(input.capability)) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'handoff input and capability are required objects');
      return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');
    }

    if (hasForbiddenField(input)) {
      addReason(
        reasonCodes,
        errors,
        'PRIVATE_OR_TRANSACTION_PAYLOAD_FORBIDDEN',
        'handoff accepts opaque references only, never private content, direct PII, group state, message content, or transaction payloads',
      );
    }

    if (typeof capability.capability_id !== 'string' || capability.capability_id.length === 0) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'capability.capability_id is required');
    }

    if (input.actor_subject !== capability.requester_subject) {
      addReason(reasonCodes, errors, 'ACTOR_AUTHORITY_MISMATCH', 'handoff actor does not match the authorized requester');
    }

    if (!ONE_TO_ONE_CHANNELS.has(capability.channel)) {
      addReason(reasonCodes, errors, 'CHANNEL_NOT_ALLOWED', 'handoff channel is not an authorized one-to-one channel');
    }

    const emittedAt = now();
    const emittedAtMs = Date.parse(emittedAt);
    const issuedAtMs = Date.parse(capability.issued_at);
    const expiresAtMs = Date.parse(capability.expires_at);
    if (!Number.isFinite(emittedAtMs) || !Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'handoff timestamps must be valid');
    } else if (expiresAtMs <= issuedAtMs || expiresAtMs - issuedAtMs > maxCapabilityTtlMs) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'contact capability lifetime is invalid');
    } else if (emittedAtMs >= expiresAtMs) {
      addReason(reasonCodes, errors, 'CAPABILITY_EXPIRED', 'contact capability has expired');
    }

    if (reasonCodes.length > 0) return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');

    const replayVerdict = await durableReplay.consumeHandoff({
      capability,
      actor_subject: input.actor_subject,
    });
    if (!replayVerdict.ok) {
      return durableDenied(replayVerdict.reason_code, 'CONTACT_AUTHORIZED');
    }

    const receipt = Object.freeze({
      handoff_id: `handoff_${randomUUID()}`,
      capability_id: capability.capability_id,
      ad_id: capability.ad_id,
      requester_subject: capability.requester_subject,
      owner_subject_ref: capability.owner_subject_ref,
      sector_id: capability.sector_id,
      country: capability.country,
      channel: capability.channel,
      policy_version: capability.policy_version,
      physics_version: capability.physics_version,
      emitted_at: new Date(emittedAtMs).toISOString(),
      state: 'HANDOFF_EMITTED',
      terminal_state: 'TIGER_MARKET_ROLE_ENDED',
    });

    return Object.freeze({
      ok: true,
      state: 'HANDOFF_EMITTED',
      terminal_state: 'TIGER_MARKET_ROLE_ENDED',
      reason_codes: Object.freeze([]),
      errors: Object.freeze([]),
      receipt,
    });
  }

  return Object.freeze({ authorizeContact, emitHandoff });
}

module.exports = {
  createDurableContactHandoff,
};
