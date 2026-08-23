'use strict';

/**
 * TIGER PRIVATE MARKET GENESIS — M1 contract primitives.
 *
 * This module is intentionally narrow: it validates the authority/version
 * envelopes for Market Genesis, the non-transactional Ad Genome boundary,
 * and immutable Sector Physics activation/resolution. It does not implement
 * ranking, checkout, payments, settlement, delivery, or deal execution.
 */

const CONTACT_STATES = Object.freeze({
  CONTACT_PUBLIC: 'CONTACT_PUBLIC',
  CONTACT_REQUIRES_REVEAL: 'CONTACT_REQUIRES_REVEAL',
  CONTACT_BLOCKED: 'CONTACT_BLOCKED',
});

const FORBIDDEN_TRANSACTION_FIELDS = Object.freeze([
  'cart',
  'checkout',
  'order',
  'transaction',
  'payment_intent',
  'buyer_payment',
  'seller_payout',
  'escrow',
  'settlement',
  'transaction_commission',
  'ownership_transfer',
  'delivery_order',
  'deal_status',
]);

const REQUIRED_GENESIS_REQUEST_FIELDS = Object.freeze([
  'request_id',
  'actor_subject',
  'intent_id',
  'intent_revision',
  'intent_direction',
  'sector_id',
  'sector_physics_version',
  'market_scope',
  'purpose',
  'visibility_context',
  'policy_context',
  'requested_result_bound',
  'request_time',
]);

const REQUIRED_GENESIS_RESPONSE_FIELDS = Object.freeze([
  'generation_id',
  'intent_revision_used',
  'sector_id',
  'sector_physics_version',
  'results',
  'policy_version_digest',
  'generated_at',
  'expires_at',
]);

const PROTECTED_COUNTRY_OVERLAY_FIELDS = Object.freeze(new Set([
  'hard_invariants',
  'allowed_entity_types',
  'forbidden_entity_types',
  'category_firewall',
  'publication_validators',
  'discovery_validators',
  'sponsored_admission_validators',
]));

function result(reasonCodes, errors) {
  return {
    ok: reasonCodes.length === 0,
    reason_codes: reasonCodes,
    errors,
  };
}

function pushFailure(reasonCodes, errors, code, message) {
  if (!reasonCodes.includes(code)) reasonCodes.push(code);
  errors.push(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  if (!isNonEmptyString(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function requireFields(object, fields, reasonCodes, errors, prefix) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(object, field) || object[field] == null) {
      pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', `${prefix}.${field} is required`);
    }
  }
}

function validateMarketGenesisRequest(request, authority = {}) {
  const reasonCodes = [];
  const errors = [];

  if (!isPlainObject(request)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'Market Genesis request must be an object');
    return result(reasonCodes, errors);
  }

  requireFields(request, REQUIRED_GENESIS_REQUEST_FIELDS, reasonCodes, errors, 'request');

  if (!isNonEmptyString(request.request_id) || !isNonEmptyString(request.intent_id) || !isNonEmptyString(request.sector_id)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request identifiers must be non-empty strings');
  }
  if (!Number.isInteger(request.intent_revision) || request.intent_revision < 0) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.intent_revision must be a non-negative integer');
  }
  if (!Number.isInteger(request.requested_result_bound) || request.requested_result_bound < 1) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.requested_result_bound must be a positive integer');
  }
  if (!isValidDate(request.request_time)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.request_time must be an ISO-compatible timestamp');
  }
  if (!['NEED', 'OFFER'].includes(request.intent_direction)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.intent_direction must be NEED or OFFER');
  }
  if (!['DISCOVERY', 'ADVERTISEMENT', 'CONTACT'].includes(request.purpose)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.purpose is outside the Private Market Genesis boundary');
  }
  if (!isPlainObject(request.market_scope) || !isNonEmptyString(request.market_scope.country)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.market_scope.country is required');
  }
  if (!isPlainObject(request.visibility_context) || !isNonEmptyString(request.visibility_context.visibility)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.visibility_context.visibility is required');
  }
  if (!isPlainObject(request.policy_context) || !isNonEmptyString(request.policy_context.policy_version)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'request.policy_context.policy_version is required');
  }

  if (authority.actorSubject != null && request.actor_subject !== authority.actorSubject) {
    pushFailure(reasonCodes, errors, 'ACTOR_AUTHORITY_MISMATCH', 'actor_subject does not match server authority');
  }
  if (authority.intentRevision != null && request.intent_revision !== authority.intentRevision) {
    pushFailure(reasonCodes, errors, 'STALE_INTENT_REVISION', 'intent_revision does not match the active server revision');
  }
  if (authority.sectorPhysicsVersion != null && request.sector_physics_version !== authority.sectorPhysicsVersion) {
    pushFailure(reasonCodes, errors, 'STALE_SECTOR_PHYSICS_VERSION', 'sector_physics_version does not match the active registry version');
  }
  if (authority.policyVersion != null && request.policy_context?.policy_version !== authority.policyVersion) {
    pushFailure(reasonCodes, errors, 'POLICY_VERSION_MISMATCH', 'policy_context.policy_version does not match server policy authority');
  }
  if (authority.maxResultBound != null && request.requested_result_bound > authority.maxResultBound) {
    pushFailure(reasonCodes, errors, 'RESULT_BOUND_EXCEEDED', 'requested_result_bound exceeds the server maximum');
  }

  return result(reasonCodes, errors);
}

function validateMarketGenesisResponse(response, authority = {}) {
  const reasonCodes = [];
  const errors = [];

  if (!isPlainObject(response)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'Market Genesis response must be an object');
    return result(reasonCodes, errors);
  }

  requireFields(response, REQUIRED_GENESIS_RESPONSE_FIELDS, reasonCodes, errors, 'response');

  if (!Array.isArray(response.results)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'response.results must be an array');
  }
  if (!isValidDate(response.generated_at) || !isValidDate(response.expires_at)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'response timestamps must be ISO-compatible');
  } else if (Date.parse(response.expires_at) <= Date.parse(response.generated_at)) {
    pushFailure(reasonCodes, errors, 'INVALID_EXPIRY', 'response.expires_at must be later than generated_at');
  }

  if (authority.intentRevision != null && response.intent_revision_used !== authority.intentRevision) {
    pushFailure(reasonCodes, errors, 'STALE_INTENT_REVISION', 'response used a stale intent revision');
  }
  if (authority.sectorPhysicsVersion != null && response.sector_physics_version !== authority.sectorPhysicsVersion) {
    pushFailure(reasonCodes, errors, 'STALE_SECTOR_PHYSICS_VERSION', 'response used a stale Sector Physics version');
  }
  if (authority.maxResultBound != null && Array.isArray(response.results) && response.results.length > authority.maxResultBound) {
    pushFailure(reasonCodes, errors, 'RESULT_BOUND_EXCEEDED', 'response results exceed the authoritative bound');
  }

  return result(reasonCodes, errors);
}

function walkObject(value, visit, path = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObject(item, visit, path.concat(String(index))));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, path.concat(key));
    walkObject(child, visit, path.concat(key));
  }
}

function validateAdGenome(genome, context = {}) {
  const reasonCodes = [];
  const errors = [];

  if (!isPlainObject(genome)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'Ad Genome must be an object');
    return result(reasonCodes, errors);
  }

  for (const section of ['identity', 'taxonomy', 'discovery', 'advertising', 'contact']) {
    if (!isPlainObject(genome[section])) {
      pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', `genome.${section} is required`);
    }
  }

  const forbidden = new Set(FORBIDDEN_TRANSACTION_FIELDS);
  walkObject(genome, (key, _value, path) => {
    if (forbidden.has(key)) {
      pushFailure(reasonCodes, errors, 'FORBIDDEN_TRANSACTION_FIELD', `Ad Genome transaction field is forbidden: ${path.join('.')}`);
    }
  });

  const advertising = genome.advertising || {};
  if (advertising.sponsored === true) {
    if (advertising.sponsorship_eligibility_state !== 'ELIGIBLE') {
      pushFailure(reasonCodes, errors, 'SPONSORSHIP_INELIGIBLE', 'sponsorship cannot bypass eligibility');
    }
    if (advertising.labeling_requirement !== true) {
      pushFailure(reasonCodes, errors, 'SPONSORED_LABEL_REQUIRED', 'sponsored content must require an explicit sponsored label');
    }
    if (!isNonEmptyString(advertising.pulse_campaign_ref)) {
      pushFailure(reasonCodes, errors, 'SPONSORED_CAMPAIGN_REF_REQUIRED', 'sponsored content requires a campaign reference');
    }
  }

  const now = context.now != null ? Date.parse(context.now) : Date.now();
  const expiresAt = Date.parse(genome.discovery?.expires_at);
  if (!Number.isFinite(expiresAt)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'genome.discovery.expires_at must be a valid timestamp');
  } else if (Number.isFinite(now) && expiresAt <= now) {
    pushFailure(reasonCodes, errors, 'OBJECT_EXPIRED', 'expired Ad Genome objects fail closed');
  }

  const contact = genome.contact || {};
  if (contact.contact_capability_class === CONTACT_STATES.CONTACT_REQUIRES_REVEAL && !isNonEmptyString(contact.reveal_policy_ref)) {
    pushFailure(reasonCodes, errors, 'REVEAL_POLICY_REQUIRED', 'contact reveal requires an explicit reveal policy reference');
  }
  if (!Object.values(CONTACT_STATES).includes(contact.contact_capability_class)) {
    pushFailure(reasonCodes, errors, 'SCHEMA_INVALID', 'unknown contact capability class');
  }

  return result(reasonCodes, errors);
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function assertPhysicsDefinition(physics) {
  if (!isPlainObject(physics)) throw new TypeError('Sector Physics definition must be an object');
  if (!isNonEmptyString(physics.sector_id) || !isNonEmptyString(physics.version)) {
    throw new TypeError('Sector Physics sector_id and version are required');
  }
  if (!Array.isArray(physics.allowed_entity_types) || physics.allowed_entity_types.length === 0) {
    throw new TypeError('allowed_entity_types must contain at least one entity type');
  }
  if (!Array.isArray(physics.forbidden_entity_types)) {
    throw new TypeError('forbidden_entity_types must be an array');
  }
  if (!Array.isArray(physics.required_dimensions) || physics.required_dimensions.length === 0) {
    throw new TypeError('required_dimensions must contain at least one dimension');
  }

  const forbiddenTypes = new Set(physics.forbidden_entity_types);
  const overlap = physics.allowed_entity_types.filter((entityType) => forbiddenTypes.has(entityType));
  if (overlap.length > 0) {
    throw new Error(`allowed entity types cannot also be forbidden: ${overlap.join(', ')}`);
  }

  if (!isPlainObject(physics.hard_invariants)) {
    throw new TypeError('hard_invariants are required');
  }
  if (physics.hard_invariants.transaction_features_forbidden !== true) {
    throw new Error('hard invariants require transaction_features_forbidden=true');
  }
  if (physics.hard_invariants.sponsored_cannot_bypass_eligibility !== true) {
    throw new Error('hard invariants require sponsored_cannot_bypass_eligibility=true');
  }

  if (isPlainObject(physics.country_overlays)) {
    for (const [country, overlay] of Object.entries(physics.country_overlays)) {
      if (!isPlainObject(overlay)) throw new TypeError(`country overlay ${country} must be an object`);
      for (const field of Object.keys(overlay)) {
        if (PROTECTED_COUNTRY_OVERLAY_FIELDS.has(field)) {
          throw new Error(`country overlay ${country} cannot override protected field ${field}`);
        }
      }
    }
  }
}

function mergeCountryOverlay(base, overlay) {
  if (!isPlainObject(overlay)) return base;
  const merged = deepClone(base);
  for (const [key, value] of Object.entries(overlay)) {
    if (PROTECTED_COUNTRY_OVERLAY_FIELDS.has(key)) continue;
    merged[key] = deepClone(value);
  }
  return merged;
}

function createSectorPhysicsRegistry() {
  const active = new Map();

  return Object.freeze({
    activate(physics) {
      assertPhysicsDefinition(physics);
      const key = `${physics.sector_id}@${physics.version}`;
      if (active.has(key)) {
        throw new Error(`active Sector Physics version ${key} is immutable`);
      }
      const stored = deepFreeze(deepClone(physics));
      active.set(key, stored);
      return stored;
    },

    resolve(sectorId, version, country) {
      const key = `${sectorId}@${version}`;
      const physics = active.get(key);
      if (!physics) {
        return { ok: false, reason_code: 'UNKNOWN_SECTOR' };
      }

      const overlay = isPlainObject(physics.country_overlays) ? physics.country_overlays[country] : null;
      const resolved = deepFreeze(mergeCountryOverlay(physics, overlay));
      return { ok: true, physics: resolved };
    },
  });
}

module.exports = {
  CONTACT_STATES,
  FORBIDDEN_TRANSACTION_FIELDS,
  validateMarketGenesisRequest,
  validateMarketGenesisResponse,
  validateAdGenome,
  createSectorPhysicsRegistry,
};
