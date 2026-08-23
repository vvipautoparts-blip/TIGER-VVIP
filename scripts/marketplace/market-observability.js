'use strict';

const { FORBIDDEN_TRANSACTION_FIELDS } = require('./private-market-contracts.js');

const ALLOWED_EVENT_TYPES = Object.freeze([
  'market_genesis.requested',
  'market_genesis.compiled',
  'market_genesis.policy_denied',
  'ad_genome.created',
  'ad_genome.validated',
  'ad_genome.published',
  'ad_genome.rejected',
  'ad_genome.expired',
  'sector_physics.activated',
  'contact.requested',
  'contact.authorized',
  'handoff.emitted',
  'automotive.whole_vehicle_rejected',
]);

const ALLOWED_FIELDS = Object.freeze([
  'event_type',
  'request_id',
  'generation_id',
  'ad_id',
  'sector_id',
  'country',
  'policy_version',
  'physics_version',
  'compiler_version',
  'placement_class',
  'sponsored',
  'candidate_count',
  'result_count',
  'latency_ms',
  'reason_codes',
  'state',
  'terminal_state',
]);

const STRING_FIELDS = Object.freeze([
  'request_id',
  'generation_id',
  'ad_id',
  'sector_id',
  'country',
  'policy_version',
  'physics_version',
  'compiler_version',
  'state',
  'terminal_state',
]);

const COUNT_FIELDS = Object.freeze([
  'candidate_count',
  'result_count',
  'latency_ms',
]);

const PRIVATE_OR_SECURITY_FIELDS = Object.freeze([
  'raw_intent',
  'private_intent',
  'intent_text',
  'intent_payload',
  'intent_trace',
  'intent_embedding',
  'private_embedding',
  'embedding',
  'email',
  'phone',
  'phone_number',
  'address',
  'contact_value',
  'contact_details',
  'message',
  'message_body',
  'message_content',
  'conversation',
  'conversation_id',
  'conversation_content',
  'thread_id',
  'room_id',
  'group_id',
  'broadcast_id',
  'contact_token',
  'capability_token',
  'auth_token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'client_secret',
  'api_key',
  'credential',
  'credentials',
]);

const allowedEventTypes = new Set(ALLOWED_EVENT_TYPES);
const allowedFields = new Set(ALLOWED_FIELDS);
const stringFields = new Set(STRING_FIELDS);
const countFields = new Set(COUNT_FIELDS);
const forbiddenFields = new Set([
  ...FORBIDDEN_TRANSACTION_FIELDS,
  ...PRIVATE_OR_SECURITY_FIELDS,
].map(normalizeFieldName));

function normalizeFieldName(value) {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function freezeArray(values) {
  return Object.freeze([...values]);
}

function denial(code, message) {
  return Object.freeze({
    ok: false,
    reason_codes: freezeArray([code]),
    errors: freezeArray([message]),
    event: null,
  });
}

function findForbiddenField(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenField(value[index], path.concat(String(index)));
      if (found) return found;
    }
    return null;
  }

  if (!isPlainObject(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    const nextPath = path.concat(key);
    if (forbiddenFields.has(normalizeFieldName(key))) {
      return nextPath.join('.');
    }
    const found = findForbiddenField(child, nextPath);
    if (found) return found;
  }

  return null;
}

function validateAllowedValue(field, value) {
  if (stringFields.has(field)) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  if (countFields.has(field)) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  if (field === 'sponsored') return typeof value === 'boolean';

  if (field === 'placement_class') {
    return ['ORGANIC', 'SPONSORED', 'BLENDED'].includes(value);
  }

  if (field === 'reason_codes') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
  }

  return true;
}

function projectEvent(input, occurredAt) {
  const event = { event_type: input.event_type, occurred_at: occurredAt };

  for (const field of ALLOWED_FIELDS) {
    if (field === 'event_type' || !Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = input[field];
    event[field] = field === 'reason_codes' ? freezeArray(value) : value;
  }

  return Object.freeze(event);
}

function createMarketObservabilityAuthority(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const eventsByType = Object.create(null);
  let eventsTotal = 0;
  let policyDenials = 0;
  let wholeVehicleRejections = 0;
  let handoffs = 0;
  let latencyMsTotal = 0;
  let latencySamples = 0;

  function record(input) {
    if (!isPlainObject(input) || typeof input.event_type !== 'string' || input.event_type.trim().length === 0) {
      return denial('OBSERVABILITY_SCHEMA_INVALID', 'telemetry input and event_type are required');
    }

    if (!allowedEventTypes.has(input.event_type)) {
      return denial('OBSERVABILITY_EVENT_TYPE_FORBIDDEN', `event type is outside the Market Genesis audit vocabulary: ${input.event_type}`);
    }

    const forbiddenPath = findForbiddenField(input);
    if (forbiddenPath) {
      return denial(
        'OBSERVABILITY_PRIVATE_OR_TRANSACTION_FIELD_FORBIDDEN',
        `private, security, or transaction field is forbidden in telemetry: ${forbiddenPath}`,
      );
    }

    for (const field of Object.keys(input)) {
      if (!allowedFields.has(field)) {
        return denial('OBSERVABILITY_FIELD_NOT_ALLOWLISTED', `telemetry field is not allowlisted: ${field}`);
      }
      if (!validateAllowedValue(field, input[field])) {
        return denial('OBSERVABILITY_SCHEMA_INVALID', `telemetry field has an invalid value: ${field}`);
      }
    }

    const occurredAt = now();
    if (typeof occurredAt !== 'string' || !Number.isFinite(Date.parse(occurredAt))) {
      return denial('OBSERVABILITY_CLOCK_INVALID', 'authoritative telemetry clock must return a valid timestamp');
    }

    const event = projectEvent(input, occurredAt);
    eventsTotal += 1;
    eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;

    if (event.event_type === 'market_genesis.policy_denied') policyDenials += 1;
    if (event.event_type === 'automotive.whole_vehicle_rejected') wholeVehicleRejections += 1;
    if (event.event_type === 'handoff.emitted') handoffs += 1;
    if (typeof event.latency_ms === 'number') {
      latencyMsTotal += event.latency_ms;
      latencySamples += 1;
    }

    return Object.freeze({ ok: true, event });
  }

  function snapshotMetrics() {
    const safeEventsByType = {};
    for (const [eventType, count] of Object.entries(eventsByType)) {
      safeEventsByType[eventType] = count;
    }

    return Object.freeze({
      events_total: eventsTotal,
      events_by_type: Object.freeze(safeEventsByType),
      policy_denials: policyDenials,
      whole_vehicle_rejections: wholeVehicleRejections,
      handoffs,
      latency_ms_total: latencyMsTotal,
      latency_samples: latencySamples,
    });
  }

  return Object.freeze({ record, snapshotMetrics });
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  createMarketObservabilityAuthority,
};
