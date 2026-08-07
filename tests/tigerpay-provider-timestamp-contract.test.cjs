#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeProviderEvent,
} = require('../scripts/payments/tigerpay-domain-contracts.js');

const BASE_EVENT = Object.freeze({
  providerId: 'sandbox-a',
  providerEventId: 'evt_timestamp_contract',
  providerState: 'paid',
  canonicalState: 'PAYMENT_CONFIRMED',
});

function assertTigerPayError(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.equal(error && error.code, expectedCode);
    return true;
  });
}

test('provider timestamps reject ambiguous non-ISO date strings', () => {
  assertTigerPayError(
    () =>
      normalizeProviderEvent({
        ...BASE_EVENT,
        occurredAt: '08/07/2026',
      }),
    'TIGERPAY_INVALID_OCCURRED_AT'
  );
});

test('provider timestamps accept ISO-8601 offsets and normalize to UTC', () => {
  const normalized = normalizeProviderEvent({
    ...BASE_EVENT,
    occurredAt: '2026-08-07T12:00:00+03:00',
  });

  assert.equal(normalized.occurredAt, '2026-08-07T09:00:00.000Z');
});
