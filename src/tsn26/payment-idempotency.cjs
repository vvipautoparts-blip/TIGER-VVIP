'use strict';

const crypto = require('node:crypto');

const PAYMENT_EVENTS = Object.freeze([
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CHARGEBACK',
  'REVERSED',
]);
const PAYMENT_EVENT_SET = new Set(PAYMENT_EVENTS);

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function instant(value) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error('TSN26_INVALID_PAYMENT_EVENT_TIME');
  return new Date(ms).toISOString();
}

function canonicalizePaymentEvent(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_PAYMENT_EVENT_REQUIRED');
  if (typeof input.amountMicro !== 'bigint' || input.amountMicro <= 0n) {
    throw new Error('TSN26_INVALID_PAYMENT_AMOUNT');
  }

  const eventType = nonEmpty(input.eventType, 'TSN26_PAYMENT_EVENT_TYPE_REQUIRED').toUpperCase();
  if (!PAYMENT_EVENT_SET.has(eventType)) {
    throw new Error(`TSN26_UNSUPPORTED_PAYMENT_EVENT:${eventType}`);
  }

  return Object.freeze({
    provider: nonEmpty(input.provider, 'TSN26_PAYMENT_PROVIDER_REQUIRED').toUpperCase(),
    providerEventId: nonEmpty(input.providerEventId, 'TSN26_PROVIDER_EVENT_ID_REQUIRED'),
    paymentId: nonEmpty(input.paymentId, 'TSN26_PAYMENT_ID_REQUIRED'),
    orderId: nonEmpty(input.orderId, 'TSN26_ORDER_ID_REQUIRED'),
    eventType,
    amountMicro: input.amountMicro,
    currency: nonEmpty(input.currency, 'TSN26_PAYMENT_CURRENCY_REQUIRED').toUpperCase(),
    occurredAt: instant(input.occurredAt),
  });
}

function serializeCanonical(event) {
  const normalized = canonicalizePaymentEvent(event);
  return JSON.stringify({
    provider: normalized.provider,
    providerEventId: normalized.providerEventId,
    paymentId: normalized.paymentId,
    orderId: normalized.orderId,
    eventType: normalized.eventType,
    amountMicro: normalized.amountMicro.toString(),
    currency: normalized.currency,
    occurredAt: normalized.occurredAt,
  });
}

function paymentEventFingerprint(event) {
  return crypto.createHash('sha256').update(serializeCanonical(event), 'utf8').digest('hex');
}

function eventIdentity(event) {
  return `${event.provider}:${event.providerEventId}`;
}

function createPaymentReplayGuard() {
  // This in-memory guard expresses the TSN-26 invariant and is suitable for deterministic unit tests.
  // Production persistence MUST additionally enforce UNIQUE(provider, provider_event_id) and a unique
  // initial CAPTURED settlement per payment_id in the transactional database.
  const byProviderEvent = new Map();
  const capturedPaymentIds = new Map();

  return Object.freeze({
    register(input) {
      const event = canonicalizePaymentEvent(input);
      const fingerprint = paymentEventFingerprint(event);
      const identity = eventIdentity(event);
      const existing = byProviderEvent.get(identity);

      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new Error(`TSN26_PAYMENT_EVENT_COLLISION:${identity}`);
        }
        return Object.freeze({ status: 'DUPLICATE', fingerprint, event: existing.event });
      }

      if (event.eventType === 'CAPTURED') {
        const priorCapture = capturedPaymentIds.get(event.paymentId);
        if (priorCapture) {
          throw new Error(`TSN26_DUPLICATE_CAPTURE_FOR_PAYMENT:${event.paymentId}`);
        }
      }

      byProviderEvent.set(identity, { fingerprint, event });
      if (event.eventType === 'CAPTURED') {
        capturedPaymentIds.set(event.paymentId, identity);
      }

      return Object.freeze({ status: 'ACCEPTED', fingerprint, event });
    },
  });
}

function assertInitialSettlementTrigger(input) {
  const event = canonicalizePaymentEvent(input);
  if (event.eventType !== 'CAPTURED') {
    throw new Error(`TSN26_PAYMENT_EVENT_NOT_SETTLEMENT_TRIGGER:${event.eventType}`);
  }
  return true;
}

module.exports = {
  PAYMENT_EVENTS,
  canonicalizePaymentEvent,
  paymentEventFingerprint,
  createPaymentReplayGuard,
  assertInitialSettlementTrigger,
};
