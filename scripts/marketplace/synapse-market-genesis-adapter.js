'use strict';

const crypto = require('node:crypto');
const { validateMarketGenesisRequest } = require('./private-market-contracts.js');

const REQUIRED_AUTHORITY_FIELDS = Object.freeze([
  'actorSubject',
  'intentRevision',
  'sectorId',
  'sectorPhysicsVersion',
  'policyVersion',
  'country',
  'maxResultBound',
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertCompleteAuthority(authority) {
  if (!authority || typeof authority !== 'object' || Array.isArray(authority)) {
    fail('MARKET_AUTHORITY_INCOMPLETE', 'trusted Market Genesis authority is required');
  }

  for (const field of REQUIRED_AUTHORITY_FIELDS) {
    if (authority[field] == null || authority[field] === '') {
      fail('MARKET_AUTHORITY_INCOMPLETE', `trusted Market Genesis authority is missing ${field}`);
    }
  }

  if (!isNonEmptyString(authority.actorSubject)
    || !isNonEmptyString(authority.sectorId)
    || !isNonEmptyString(authority.sectorPhysicsVersion)
    || !isNonEmptyString(authority.policyVersion)
    || !isNonEmptyString(authority.country)
    || !Number.isInteger(authority.intentRevision)
    || authority.intentRevision < 0
    || !Number.isInteger(authority.maxResultBound)
    || authority.maxResultBound < 1) {
    fail('MARKET_AUTHORITY_INCOMPLETE', 'trusted Market Genesis authority contains invalid values');
  }
}

function assertConfirmedPersistedIntent(intent, authority) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent) || intent.status !== 'CONFIRMED') {
    fail('INTENT_NOT_MARKET_ELIGIBLE', 'only a confirmed persisted SYNAPSE intent may enter Market Genesis');
  }
  if (!isNonEmptyString(intent.intentId)) {
    fail('INTENT_NOT_MARKET_ELIGIBLE', 'persisted SYNAPSE intent id is required');
  }
  if (intent.activationMode !== 'LIVE_NETWORK') {
    fail('INTENT_NOT_MARKET_ELIGIBLE', 'Market Genesis requires LIVE_NETWORK intent activation');
  }
  if (intent.actorSubject !== authority.actorSubject) {
    fail('ACTOR_AUTHORITY_MISMATCH', 'persisted intent actor does not match trusted server authority');
  }
  if (intent.revision !== authority.intentRevision) {
    fail('STALE_INTENT_REVISION', 'persisted intent revision does not match trusted server authority');
  }
  if (intent.policyVersion !== authority.policyVersion) {
    fail('POLICY_VERSION_MISMATCH', 'persisted intent policy version does not match trusted server authority');
  }
  if (intent.sector !== authority.sectorId) {
    fail('SECTOR_AUTHORITY_MISMATCH', 'persisted intent sector does not match trusted server authority');
  }
}

function buildMarketGenesisRequest(intent, authority, { requestIdFactory, now }) {
  const requestedResultBound = authority.requestedResultBound == null
    ? authority.maxResultBound
    : authority.requestedResultBound;

  if (!Number.isInteger(requestedResultBound)
    || requestedResultBound < 1
    || requestedResultBound > authority.maxResultBound) {
    fail('MARKET_AUTHORITY_INCOMPLETE', 'trusted requested result bound must be within the server maximum');
  }

  const purpose = authority.purpose || 'DISCOVERY';
  const request = {
    request_id: String(requestIdFactory()),
    actor_subject: authority.actorSubject,
    intent_id: intent.intentId,
    intent_revision: authority.intentRevision,
    intent_direction: intent.direction,
    sector_id: authority.sectorId,
    sector_physics_version: authority.sectorPhysicsVersion,
    market_scope: { country: authority.country },
    purpose,
    visibility_context: { visibility: intent.visibilityClass },
    policy_context: { policy_version: authority.policyVersion },
    requested_result_bound: requestedResultBound,
    request_time: now().toISOString(),
  };

  const validation = validateMarketGenesisRequest(request, authority);
  if (!validation.ok) {
    const error = new Error(`Market Genesis request rejected: ${validation.errors.join('; ')}`);
    error.code = validation.reason_codes[0] || 'MARKET_GENESIS_REQUEST_INVALID';
    error.validation = validation;
    throw error;
  }

  return request;
}

function createSynapseMarketGenesisAdapter({
  dispatch,
  requestIdFactory = crypto.randomUUID,
  now = () => new Date(),
} = {}) {
  if (typeof dispatch !== 'function') {
    throw new TypeError('Market Genesis dispatch function is required');
  }
  if (typeof requestIdFactory !== 'function') {
    throw new TypeError('Market Genesis request id factory must be a function');
  }
  if (typeof now !== 'function') {
    throw new TypeError('Market Genesis clock must be a function');
  }

  return Object.freeze({
    async dispatchConfirmedIntent(intent, authority) {
      assertCompleteAuthority(authority);
      assertConfirmedPersistedIntent(intent, authority);
      const request = buildMarketGenesisRequest(intent, authority, { requestIdFactory, now });
      return dispatch(request);
    },
  });
}

module.exports = {
  createSynapseMarketGenesisAdapter,
};
