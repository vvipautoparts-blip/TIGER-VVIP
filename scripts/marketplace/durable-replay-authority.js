'use strict';

const { createHash } = require('node:crypto');

const REQUIRED_CAPABILITY_FIELDS = Object.freeze([
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
  'issued_at',
  'expires_at',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function verdict(ok, reasonCode) {
  return Object.freeze({ ok, reason_code: reasonCode });
}

function hashNonce(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function validCapability(capability) {
  if (!isPlainObject(capability)) return false;

  for (const field of REQUIRED_CAPABILITY_FIELDS) {
    if (typeof capability[field] !== 'string' || capability[field].length === 0) return false;
  }

  const issuedAt = Date.parse(capability.issued_at);
  const expiresAt = Date.parse(capability.expires_at);
  return Number.isFinite(issuedAt) && Number.isFinite(expiresAt) && expiresAt > issuedAt;
}

function boundedIssueRecord(nonce, capability) {
  return Object.freeze({
    authorization_nonce_hash: hashNonce(nonce),
    capability_id: capability.capability_id,
    request_id: capability.request_id,
    requester_subject: capability.requester_subject,
    owner_subject_ref: capability.owner_subject_ref,
    ad_id: capability.ad_id,
    sector_id: capability.sector_id,
    country: capability.country,
    channel: capability.channel,
    policy_version: capability.policy_version,
    physics_version: capability.physics_version,
    reveal_policy_ref:
      typeof capability.reveal_policy_ref === 'string' && capability.reveal_policy_ref.length > 0
        ? capability.reveal_policy_ref
        : null,
    reveal_authorized: capability.reveal_authorized === true,
    issued_at: capability.issued_at,
    expires_at: capability.expires_at,
  });
}

function boundedConsumeRecord(capability) {
  return Object.freeze({
    capability_id: capability.capability_id,
    request_id: capability.request_id,
    requester_subject: capability.requester_subject,
    owner_subject_ref: capability.owner_subject_ref,
    ad_id: capability.ad_id,
    sector_id: capability.sector_id,
    country: capability.country,
    channel: capability.channel,
    policy_version: capability.policy_version,
    physics_version: capability.physics_version,
  });
}

function createDurableReplayAuthority(options = {}) {
  const store = options.store;
  if (
    !store
    || typeof store.issueCapability !== 'function'
    || typeof store.consumeCapability !== 'function'
  ) {
    throw new TypeError('durable replay store with issueCapability and consumeCapability is required');
  }

  async function issueAuthorization(input = {}) {
    const nonce = input.nonce;
    const capability = input.capability;

    if (typeof nonce !== 'string' || nonce.length === 0 || !validCapability(capability)) {
      return verdict(false, 'DURABLE_REPLAY_INPUT_INVALID');
    }

    try {
      const result = await store.issueCapability(boundedIssueRecord(nonce, capability));
      if (result && result.ok === true && result.reason_code === 'CONTACT_CAPABILITY_ISSUED') {
        return verdict(true, 'CONTACT_CAPABILITY_ISSUED');
      }
      if (result && result.ok === false && result.reason_code === 'CONTACT_REPLAY_OR_CONFLICT') {
        return verdict(false, 'CONTACT_REPLAY_OR_CONFLICT');
      }
      return verdict(false, 'DURABLE_REPLAY_UNAVAILABLE');
    } catch {
      return verdict(false, 'DURABLE_REPLAY_UNAVAILABLE');
    }
  }

  async function consumeHandoff(input = {}) {
    const capability = input.capability;
    const actorSubject = input.actor_subject;

    if (!validCapability(capability) || typeof actorSubject !== 'string' || actorSubject.length === 0) {
      return verdict(false, 'DURABLE_REPLAY_INPUT_INVALID');
    }
    if (actorSubject !== capability.requester_subject) {
      return verdict(false, 'HANDOFF_REPLAY_OR_CONFLICT');
    }

    try {
      const result = await store.consumeCapability(boundedConsumeRecord(capability));
      if (result && result.ok === true && result.reason_code === 'HANDOFF_CAPABILITY_CONSUMED') {
        return verdict(true, 'HANDOFF_CAPABILITY_CONSUMED');
      }
      if (result && result.ok === false && result.reason_code === 'HANDOFF_REPLAY_OR_CONFLICT') {
        return verdict(false, 'HANDOFF_REPLAY_OR_CONFLICT');
      }
      return verdict(false, 'DURABLE_REPLAY_UNAVAILABLE');
    } catch {
      return verdict(false, 'DURABLE_REPLAY_UNAVAILABLE');
    }
  }

  return Object.freeze({ issueAuthorization, consumeHandoff });
}

module.exports = {
  createDurableReplayAuthority,
};
