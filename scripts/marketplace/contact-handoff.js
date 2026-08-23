'use strict';

/**
 * TIGER PRIVATE MARKET GENESIS — M4 Contact/Handoff Convergence.
 *
 * This boundary authorizes an opaque, short-lived one-to-one contact
 * capability and emits a terminal handoff receipt. It deliberately does not
 * create conversations, store message content, expose direct contact values /
 * private intent, or model any buyer ↔ seller transaction state.
 */

const { randomUUID } = require('node:crypto');
const {
  CONTACT_STATES,
  FORBIDDEN_TRANSACTION_FIELDS,
  validateAdGenome,
} = require('./private-market-contracts.js');

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
const CAPABILITY_BINDING_FIELDS = Object.freeze([
  'capability_id',
  'request_id',
  'requester_subject',
  'owner_subject_ref',
  'ad_id',
  'sector_id',
  'country',
  'channel',
  'policy_version',
  'physics_version',
  'reveal_policy_ref',
  'reveal_authorized',
  'issued_at',
  'expires_at',
]);

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

function capabilityMatches(stored, supplied) {
  return CAPABILITY_BINDING_FIELDS.every((field) => stored[field] === supplied[field]);
}

function createContactHandoffConvergence(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const configuredTtl = Number.isFinite(options.maxCapabilityTtlMs)
    ? options.maxCapabilityTtlMs
    : DEFAULT_MAX_CAPABILITY_TTL_MS;
  const maxCapabilityTtlMs = Math.max(1, Math.min(configuredTtl, DEFAULT_MAX_CAPABILITY_TTL_MS));
  const consumedAuthorizationNonces = new Set();
  const issuedCapabilities = new Map();
  const consumedHandoffCapabilities = new Set();

  function authorizeContact(input = {}) {
    const reasonCodes = [];
    const errors = [];
    const request = isPlainObject(input.request) ? input.request : {};
    const genome = isPlainObject(input.genome) ? input.genome : {};
    const physics = isPlainObject(input.physics) ? input.physics : {};
    const authority = isPlainObject(input.authority) ? input.authority : {};

    if (!isPlainObject(input.request) || !isPlainObject(input.genome) || !isPlainObject(input.physics) || !isPlainObject(input.authority)) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'request, genome, physics, and authority are required objects');
      return denied(reasonCodes, errors);
    }

    if (hasForbiddenField(request)) {
      addReason(
        reasonCodes,
        errors,
        'PRIVATE_OR_TRANSACTION_PAYLOAD_FORBIDDEN',
        'contact authorization accepts opaque references only, never private content, direct PII, group state, or transaction payloads',
      );
    }

    if (typeof request.nonce !== 'string' || request.nonce.length === 0) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'request.nonce is required');
    } else if (consumedAuthorizationNonces.has(request.nonce)) {
      addReason(reasonCodes, errors, 'REPLAY_DETECTED', 'contact authorization nonce has already been consumed');
    }

    if (request.actor_subject !== authority.actor_subject) {
      addReason(reasonCodes, errors, 'ACTOR_AUTHORITY_MISMATCH', 'request actor does not match server-derived authority');
    }

    if (request.ad_id !== genome.identity?.ad_id) {
      addReason(reasonCodes, errors, 'AD_AUTHORITY_MISMATCH', 'request ad does not match the authoritative Ad Genome');
    }

    if (authority.country !== genome.identity?.country) {
      addReason(reasonCodes, errors, 'COUNTRY_AUTHORITY_MISMATCH', 'country authority does not match the Ad Genome country');
    }

    if (authority.policy_version !== genome.identity?.policy_version) {
      addReason(reasonCodes, errors, 'POLICY_VERSION_MISMATCH', 'policy authority does not match the Ad Genome policy version');
    }

    if (physics.sector_id !== genome.taxonomy?.sector_id) {
      addReason(reasonCodes, errors, 'SECTOR_AUTHORITY_MISMATCH', 'resolved Sector Physics does not match the Ad Genome sector');
    }

    const issuedAt = now();
    const genomeValidation = validateAdGenome(genome, { now: issuedAt });
    for (let index = 0; index < genomeValidation.reason_codes.length; index += 1) {
      addReason(
        reasonCodes,
        errors,
        genomeValidation.reason_codes[index],
        genomeValidation.errors[index] || genomeValidation.reason_codes[index],
      );
    }

    const entityType = genome.taxonomy?.entity_type;
    const allowedEntityTypes = Array.isArray(physics.allowed_entity_types) ? physics.allowed_entity_types : [];
    const forbiddenEntityTypes = Array.isArray(physics.forbidden_entity_types) ? physics.forbidden_entity_types : [];

    if (!allowedEntityTypes.includes(entityType) || forbiddenEntityTypes.includes(entityType)) {
      addReason(reasonCodes, errors, 'ENTITY_NOT_ALLOWED', 'entity type is not eligible under the resolved Sector Physics');
    }

    if (
      entityType === 'WHOLE_VEHICLE'
      || (physics.hard_invariants?.whole_vehicle_ads_forbidden === true && entityType === 'WHOLE_VEHICLE')
    ) {
      addReason(reasonCodes, errors, 'WHOLE_VEHICLE_FORBIDDEN', 'complete vehicle subjects are forbidden at pre-contact authorization');
    }

    const contact = genome.contact || {};
    if (contact.blocked_by_policy === true || contact.contact_capability_class === CONTACT_STATES.CONTACT_BLOCKED) {
      addReason(reasonCodes, errors, 'CONTACT_BLOCKED', 'contact is blocked by authoritative policy');
    }

    const genomeChannels = Array.isArray(contact.allowed_handoff_channels) ? contact.allowed_handoff_channels : [];
    const physicsChannels = Array.isArray(physics.contact_modes) ? physics.contact_modes : [];
    if (
      !ONE_TO_ONE_CHANNELS.has(request.channel)
      || !genomeChannels.includes(request.channel)
      || !physicsChannels.includes(request.channel)
    ) {
      addReason(reasonCodes, errors, 'CHANNEL_NOT_ALLOWED', 'requested contact channel is not an authorized one-to-one channel');
    }

    let revealAuthorized = contact.contact_capability_class === CONTACT_STATES.CONTACT_PUBLIC;
    if (contact.contact_capability_class === CONTACT_STATES.CONTACT_REQUIRES_REVEAL) {
      if (authority.reveal_policy_ref !== contact.reveal_policy_ref) {
        addReason(reasonCodes, errors, 'REVEAL_POLICY_MISMATCH', 'server reveal policy does not match the Ad Genome reveal policy');
      }
      if (authority.reveal_allowed !== true) {
        addReason(reasonCodes, errors, 'REVEAL_NOT_AUTHORIZED', 'server authority did not authorize contact reveal');
      }
      revealAuthorized = authority.reveal_allowed === true && authority.reveal_policy_ref === contact.reveal_policy_ref;
    }

    if (reasonCodes.length > 0) return denied(reasonCodes, errors);

    const issuedAtMs = Date.parse(issuedAt);
    const genomeExpiresAtMs = Date.parse(genome.discovery.expires_at);
    if (!Number.isFinite(issuedAtMs) || !Number.isFinite(genomeExpiresAtMs)) {
      return denied(['SCHEMA_INVALID'], ['authorization timestamps must be valid']);
    }

    const expiresAtMs = Math.min(issuedAtMs + maxCapabilityTtlMs, genomeExpiresAtMs);
    if (expiresAtMs <= issuedAtMs) {
      return denied(['OBJECT_EXPIRED'], ['Ad Genome expires before a contact capability can be issued']);
    }

    consumedAuthorizationNonces.add(request.nonce);

    const capability = Object.freeze({
      capability_id: `contact_cap_${randomUUID()}`,
      request_id: request.request_id,
      requester_subject: authority.actor_subject,
      owner_subject_ref: genome.identity.owner_subject,
      ad_id: genome.identity.ad_id,
      sector_id: genome.taxonomy.sector_id,
      country: genome.identity.country,
      channel: request.channel,
      policy_version: genome.identity.policy_version,
      physics_version: physics.version,
      reveal_policy_ref: contact.reveal_policy_ref || null,
      reveal_authorized: revealAuthorized,
      issued_at: new Date(issuedAtMs).toISOString(),
      expires_at: new Date(expiresAtMs).toISOString(),
    });

    issuedCapabilities.set(capability.capability_id, capability);

    return Object.freeze({
      ok: true,
      state: 'CONTACT_AUTHORIZED',
      reason_codes: Object.freeze([]),
      errors: Object.freeze([]),
      capability,
    });
  }

  function emitHandoff(input = {}) {
    const reasonCodes = [];
    const errors = [];
    const suppliedCapability = isPlainObject(input.capability) ? input.capability : {};

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

    const capabilityId = suppliedCapability.capability_id;
    if (typeof capabilityId !== 'string' || capabilityId.length === 0) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'capability.capability_id is required');
      return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');
    }

    if (consumedHandoffCapabilities.has(capabilityId)) {
      addReason(reasonCodes, errors, 'HANDOFF_REPLAY_DETECTED', 'contact capability has already emitted a terminal handoff');
      return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');
    }

    const storedCapability = issuedCapabilities.get(capabilityId);
    if (!storedCapability) {
      addReason(reasonCodes, errors, 'CAPABILITY_NOT_ISSUED', 'contact capability was not issued by this authority instance');
      return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');
    }

    if (!capabilityMatches(storedCapability, suppliedCapability)) {
      addReason(reasonCodes, errors, 'CAPABILITY_BINDING_MISMATCH', 'contact capability binding does not match the issued authority record');
    }

    if (input.actor_subject !== storedCapability.requester_subject) {
      addReason(reasonCodes, errors, 'ACTOR_AUTHORITY_MISMATCH', 'handoff actor does not match the authorized requester');
    }

    if (!ONE_TO_ONE_CHANNELS.has(storedCapability.channel)) {
      addReason(reasonCodes, errors, 'CHANNEL_NOT_ALLOWED', 'handoff channel is not an authorized one-to-one channel');
    }

    const emittedAt = now();
    const emittedAtMs = Date.parse(emittedAt);
    const expiresAtMs = Date.parse(storedCapability.expires_at);
    if (!Number.isFinite(emittedAtMs) || !Number.isFinite(expiresAtMs)) {
      addReason(reasonCodes, errors, 'SCHEMA_INVALID', 'handoff timestamps must be valid');
    } else if (emittedAtMs >= expiresAtMs) {
      addReason(reasonCodes, errors, 'CAPABILITY_EXPIRED', 'contact capability has expired');
    }

    if (reasonCodes.length > 0) return denied(reasonCodes, errors, 'CONTACT_AUTHORIZED');

    consumedHandoffCapabilities.add(capabilityId);

    const receipt = Object.freeze({
      handoff_id: `handoff_${randomUUID()}`,
      capability_id: storedCapability.capability_id,
      ad_id: storedCapability.ad_id,
      requester_subject: storedCapability.requester_subject,
      owner_subject_ref: storedCapability.owner_subject_ref,
      sector_id: storedCapability.sector_id,
      country: storedCapability.country,
      channel: storedCapability.channel,
      policy_version: storedCapability.policy_version,
      physics_version: storedCapability.physics_version,
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
  createContactHandoffConvergence,
};
