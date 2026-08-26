'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../financial/constitution-compiler.cjs');

const TRACE_VERSION = 'TIGER_SOVEREIGN_BUSINESS_TRACE_V1';
const TRACE_AUTHORITY = 'OBSERVATIONAL_ONLY';
const REF_KEYS = Object.freeze([
  'order_id',
  'payment_id',
  'claim_id',
  'settlement_id',
  'ledger_batch_id',
  'payout_id',
  'exposure_contract_id',
  'rule_version',
  'country_policy_version',
]);

function sha256(value) {
  return `sha256:${createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value), 'utf8').digest('hex')}`;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
  return value.trim();
}

function normalizeInstant(value, label) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} must be an ISO instant`);
  return date.toISOString();
}

function normalizeTraceId(traceId) {
  const value = requiredString(traceId, 'trace id').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(value) || /^0+$/.test(value)) throw new Error('trace id must be a non-zero 32-hex W3C trace identifier');
  return value;
}

function normalizeRefs(refs) {
  const source = refs && typeof refs === 'object' && !Array.isArray(refs) ? refs : {};
  for (const key of Object.keys(source)) {
    if (!REF_KEYS.includes(key)) throw new Error(`unknown business trace ref: ${key}`);
  }
  return Object.fromEntries(REF_KEYS.map((key) => {
    const value = source[key];
    if (value === null || value === undefined) return [key, null];
    return [key, requiredString(value, `trace ref ${key}`)];
  }));
}

function normalizeEvidence(evidenceRefs) {
  if (!Array.isArray(evidenceRefs)) throw new Error('business trace evidence_refs must be an array');
  const values = evidenceRefs.map((value) => requiredString(value, 'business trace evidence ref'));
  return [...new Set(values)].sort();
}

function eventId(base) {
  return sha256({ domain: 'TIGER_BUSINESS_TRACE_EVENT_ID_V1', ...base });
}

function eventHash(base, id) {
  return sha256({ domain: 'TIGER_BUSINESS_TRACE_EVENT_HASH_V1', ...base, event_id: id });
}

function createBusinessTrace({ traceId, createdAt } = {}) {
  return freezeDeep({
    trace_version: TRACE_VERSION,
    trace_id: normalizeTraceId(traceId),
    authority: TRACE_AUTHORITY,
    financial_authority: false,
    created_at: normalizeInstant(createdAt, 'trace created_at'),
    events: [],
  });
}

function buildStoredEvent(trace, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('business trace event is required');
  const sequence = trace.events.length + 1;
  const previousEventHash = sequence === 1 ? null : trace.events[sequence - 2].event_hash;
  const details = input.details === undefined ? {} : input.details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) throw new Error('business trace details must be an object');
  const base = {
    trace_id: trace.trace_id,
    sequence,
    event_type: requiredString(input.event_type, 'event type'),
    occurred_at: normalizeInstant(input.occurred_at, 'event occurred_at'),
    actor_type: requiredString(input.actor_type, 'actor type'),
    subject_ref: requiredString(input.subject_ref, 'subject ref'),
    status: requiredString(input.status, 'event status'),
    refs: normalizeRefs(input.refs),
    evidence_refs: normalizeEvidence(input.evidence_refs || []),
    details_digest: sha256(details),
    previous_event_hash: previousEventHash,
  };
  const id = eventId(base);
  return freezeDeep({ ...base, event_id: id, event_hash: eventHash(base, id) });
}

function appendTraceEvent(trace, input) {
  if (!trace || trace.trace_version !== TRACE_VERSION || trace.authority !== TRACE_AUTHORITY || trace.financial_authority !== false) {
    throw new Error('invalid sovereign business trace');
  }
  if (!verifyTraceChain(trace)) throw new Error('cannot append to an invalid or tampered business trace');
  const storedEvent = buildStoredEvent(trace, input);
  if (trace.events.length > 0) {
    const previousTime = new Date(trace.events[trace.events.length - 1].occurred_at).getTime();
    const currentTime = new Date(storedEvent.occurred_at).getTime();
    if (currentTime < previousTime) throw new Error('business trace event time cannot move backwards');
  }
  return freezeDeep({ ...trace, events: [...trace.events, storedEvent] });
}

function verifyTraceChain(trace) {
  try {
    if (!trace || trace.trace_version !== TRACE_VERSION || trace.authority !== TRACE_AUTHORITY || trace.financial_authority !== false) return false;
    normalizeTraceId(trace.trace_id);
    if (!Array.isArray(trace.events)) return false;
    let previousHash = null;
    let previousTime = null;
    for (let index = 0; index < trace.events.length; index += 1) {
      const stored = trace.events[index];
      if (!stored || stored.trace_id !== trace.trace_id || stored.sequence !== index + 1) return false;
      if (stored.previous_event_hash !== previousHash) return false;
      const occurredAt = normalizeInstant(stored.occurred_at, 'event occurred_at');
      const currentTime = new Date(occurredAt).getTime();
      if (previousTime !== null && currentTime < previousTime) return false;
      const base = {
        trace_id: stored.trace_id,
        sequence: stored.sequence,
        event_type: requiredString(stored.event_type, 'event type'),
        occurred_at: occurredAt,
        actor_type: requiredString(stored.actor_type, 'actor type'),
        subject_ref: requiredString(stored.subject_ref, 'subject ref'),
        status: requiredString(stored.status, 'event status'),
        refs: normalizeRefs(stored.refs),
        evidence_refs: normalizeEvidence(stored.evidence_refs),
        details_digest: requiredString(stored.details_digest, 'details digest'),
        previous_event_hash: stored.previous_event_hash,
      };
      const expectedId = eventId(base);
      if (stored.event_id !== expectedId) return false;
      const expectedHash = eventHash(base, expectedId);
      if (stored.event_hash !== expectedHash) return false;
      previousHash = expectedHash;
      previousTime = currentTime;
    }
    return true;
  } catch {
    return false;
  }
}

function toOpenTelemetryAttributes(event) {
  if (!event || typeof event !== 'object') throw new Error('business trace event is required');
  const attributes = {
    'tiger.trace_id': event.trace_id,
    'tiger.event_id': event.event_id,
    'tiger.event_hash': event.event_hash,
    'tiger.event_type': event.event_type,
    'tiger.event_status': event.status,
    'tiger.event_sequence': event.sequence,
    'tiger.actor_type': event.actor_type,
    'tiger.subject_ref': event.subject_ref,
    'tiger.details_digest': event.details_digest,
    'tiger.authority': TRACE_AUTHORITY,
    'tiger.financial_authority': false,
  };
  for (const [key, value] of Object.entries(normalizeRefs(event.refs))) {
    if (value !== null) attributes[`tiger.${key}`] = value;
  }
  return freezeDeep(attributes);
}

module.exports = Object.freeze({
  TRACE_VERSION,
  TRACE_AUTHORITY,
  REF_KEYS,
  createBusinessTrace,
  appendTraceEvent,
  verifyTraceChain,
  toOpenTelemetryAttributes,
});
