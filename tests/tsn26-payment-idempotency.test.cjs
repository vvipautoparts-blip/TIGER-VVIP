'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYMENT_EVENTS,
  canonicalizePaymentEvent,
  paymentEventFingerprint,
  createPaymentReplayGuard,
  assertInitialSettlementTrigger,
} = require('../src/tsn26/payment-idempotency.cjs');

function captured(overrides = {}) {
  return {
    provider: 'provider-a',
    providerEventId: 'evt-001',
    paymentId: 'pay-001',
    orderId: 'order-001',
    eventType: 'CAPTURED',
    amountMicro: 45_000_000n,
    currency: 'JOD',
    occurredAt: '2026-08-26T00:10:00.000Z',
    ...overrides,
  };
}

test('payment event canonical form and fingerprint are deterministic', () => {
  const a = captured();
  const b = { ...captured(), provider: ' PROVIDER-A ', currency: 'jod' };
  assert.deepEqual(canonicalizePaymentEvent(a), canonicalizePaymentEvent(b));
  assert.equal(paymentEventFingerprint(a), paymentEventFingerprint(b));
});

test('identical replay is safe and returns DUPLICATE without creating a second effect', () => {
  const guard = createPaymentReplayGuard();
  const first = guard.register(captured());
  const replay = guard.register(captured());
  assert.equal(first.status, 'ACCEPTED');
  assert.equal(replay.status, 'DUPLICATE');
  assert.equal(replay.fingerprint, first.fingerprint);
});

test('same provider event id with conflicting payload fails closed', () => {
  const guard = createPaymentReplayGuard();
  guard.register(captured());
  assert.throws(
    () => guard.register(captured({ amountMicro: 44_000_000n })),
    /TSN26_PAYMENT_EVENT_COLLISION/,
  );
});

test('the same payment cannot create two initial captured settlements even with different event ids', () => {
  const guard = createPaymentReplayGuard();
  guard.register(captured());
  assert.throws(
    () => guard.register(captured({ providerEventId: 'evt-002' })),
    /TSN26_DUPLICATE_CAPTURE_FOR_PAYMENT/,
  );
});

test('only CAPTURED is permitted to trigger an initial financial settlement', () => {
  assert.equal(assertInitialSettlementTrigger(captured()), true);
  for (const type of PAYMENT_EVENTS.filter((type) => type !== 'CAPTURED')) {
    assert.throws(
      () => assertInitialSettlementTrigger(captured({ eventType: type })),
      /TSN26_PAYMENT_EVENT_NOT_SETTLEMENT_TRIGGER/,
    );
  }
});

test('unsupported event types and invalid amounts fail closed', () => {
  assert.throws(() => canonicalizePaymentEvent(captured({ eventType: 'SETTLED_MAGIC' })), /TSN26_UNSUPPORTED_PAYMENT_EVENT/);
  assert.throws(() => canonicalizePaymentEvent(captured({ amountMicro: 45.5 })), /TSN26_INVALID_PAYMENT_AMOUNT/);
  assert.throws(() => canonicalizePaymentEvent(captured({ amountMicro: 0n })), /TSN26_INVALID_PAYMENT_AMOUNT/);
});
