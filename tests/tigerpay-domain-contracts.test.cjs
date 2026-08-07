#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const modulePath = path.resolve(
  __dirname,
  '..',
  'scripts',
  'payments',
  'tigerpay-domain-contracts.js'
);

function loadContracts() {
  try {
    delete require.cache[modulePath];
    return require(modulePath);
  } catch (error) {
    assert.fail(
      `TP-01 domain contract module must load before this behavior can pass: ${error.code || error.message}`
    );
  }
}

const EXPECTED_PAYMENT_STATES = Object.freeze([
  'CREATED',
  'PROVIDER_SESSION_CREATED',
  'CUSTOMER_ACTION_REQUIRED',
  'PROVIDER_PENDING',
  'PAYMENT_CONFIRMED',
  'ACCOUNTING_PENDING',
  'ACCOUNTED',
  'SETTLEMENT_PENDING',
  'SETTLED',
  'RECONCILED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'CHARGEBACK_OPEN',
  'CHARGEBACK_WON',
  'CHARGEBACK_LOST',
  'RECONCILIATION_EXCEPTION',
]);

const EXPECTED_PAYOUT_STATES = Object.freeze([
  'DRAFT',
  'POLICY_CHECK',
  'BENEFICIARY_VALIDATION',
  'RISK_ASSESSMENT',
  'ACTION_ESCROW',
  'PENDING_OWNER_APPROVAL',
  'OWNER_APPROVED',
  'CAPABILITY_ISSUED',
  'SUBMISSION_CLAIMED',
  'SUBMITTED_TO_PROVIDER',
  'PROVIDER_ACCEPTED',
  'SETTLEMENT_PENDING',
  'PAID',
  'ACCOUNTED',
  'RECONCILED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
  'PROVIDER_REJECTED',
  'FAILED_RETRYABLE',
  'FAILED_FINAL',
  'RETURN_PENDING',
  'RETURNED',
  'COMPENSATING',
  'COMPENSATED',
  'EMERGENCY_FROZEN',
]);

const EXPECTED_TREASURY_STATES = Object.freeze([
  'DRAFT',
  'FORMAT_VALIDATED',
  'BENEFICIARY_VALIDATION_PENDING',
  'BENEFICIARY_VERIFIED',
  'RISK_REVIEW',
  'OWNER_STEP_UP_REQUIRED',
  'COOLING_PERIOD',
  'OWNER_FINAL_CONFIRMATION',
  'ACTIVE',
  'REJECTED',
  'FROZEN',
  'SUPERSEDED',
  'REVOKED',
  'EXPIRED',
]);

const EXPECTED_CONTINUITY_MODES = Object.freeze([
  'NORMAL',
  'DEGRADED_PROVIDER',
  'READ_ONLY_FINANCE',
  'OUTBOUND_FROZEN',
  'COUNTRY_FROZEN',
  'AI_DISABLED',
  'FULL_FINANCIAL_ISOLATION',
]);

const EXPECTED_DATA_CLASSES = Object.freeze([
  'F-PUBLIC',
  'F-INTERNAL',
  'F-CONFIDENTIAL',
  'F-RESTRICTED',
  'F-SOVEREIGN',
]);

function assertTigerPayError(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.equal(error && error.code, expectedCode);
    return true;
  });
}

test('exports the TP-01 public contract surface', () => {
  const contracts = loadContracts();
  const expectedExports = [
    'PAYMENT_STATES',
    'PAYOUT_STATES',
    'TREASURY_DESTINATION_STATES',
    'BUSINESS_CONTINUITY_MODES',
    'FINANCIAL_DATA_CLASSES',
    'TIGERPAY_ACTION_DECISIONS',
    'createMoney',
    'createTigerPayId',
    'createIdempotencyKey',
    'normalizeProviderEvent',
    'isKnownPaymentState',
    'isKnownPayoutState',
  ];

  for (const name of expectedExports) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(contracts, name),
      `missing TP-01 export: ${name}`
    );
  }
});

test('freezes the exact canonical financial state contracts from the master spec', () => {
  const contracts = loadContracts();

  assert.deepEqual(contracts.PAYMENT_STATES, EXPECTED_PAYMENT_STATES);
  assert.deepEqual(contracts.PAYOUT_STATES, EXPECTED_PAYOUT_STATES);
  assert.deepEqual(
    contracts.TREASURY_DESTINATION_STATES,
    EXPECTED_TREASURY_STATES
  );
  assert.deepEqual(
    contracts.BUSINESS_CONTINUITY_MODES,
    EXPECTED_CONTINUITY_MODES
  );
  assert.deepEqual(contracts.FINANCIAL_DATA_CLASSES, EXPECTED_DATA_CLASSES);

  for (const value of [
    contracts.PAYMENT_STATES,
    contracts.PAYOUT_STATES,
    contracts.TREASURY_DESTINATION_STATES,
    contracts.BUSINESS_CONTINUITY_MODES,
    contracts.FINANCIAL_DATA_CLASSES,
    contracts.TIGERPAY_ACTION_DECISIONS,
  ]) {
    assert.ok(Object.isFrozen(value), 'canonical contract values must be frozen');
  }

  assert.deepEqual(contracts.TIGERPAY_ACTION_DECISIONS, {
    ALLOW_READ: 'ALLOW_READ',
    ALLOW_DRAFT: 'ALLOW_DRAFT',
    REQUIRE_OWNER_APPROVAL: 'REQUIRE_OWNER_APPROVAL',
    DENY: 'DENY',
  });
});

test('recognizes only canonical payment and payout states', () => {
  const contracts = loadContracts();

  for (const state of EXPECTED_PAYMENT_STATES) {
    assert.equal(contracts.isKnownPaymentState(state), true);
  }
  for (const state of EXPECTED_PAYOUT_STATES) {
    assert.equal(contracts.isKnownPayoutState(state), true);
  }

  assert.equal(contracts.isKnownPaymentState('paid'), false);
  assert.equal(contracts.isKnownPaymentState('OWNER_APPROVED'), false);
  assert.equal(contracts.isKnownPayoutState('PAYMENT_CONFIRMED'), false);
  assert.equal(contracts.isKnownPayoutState(''), false);
});

test('creates frozen money values using safe integer minor units and uppercase ISO-style currency codes', () => {
  const { createMoney } = loadContracts();

  const money = createMoney({ amountMinor: 1250, currency: 'jod' });

  assert.deepEqual(money, { amountMinor: 1250, currency: 'JOD' });
  assert.ok(Object.isFrozen(money));
});

test('rejects unsafe, negative, fractional, or non-number money amounts', () => {
  const { createMoney } = loadContracts();

  for (const amountMinor of [
    -1,
    12.5,
    Number.MAX_SAFE_INTEGER + 1,
    NaN,
    Infinity,
    '100',
    null,
  ]) {
    assertTigerPayError(
      () => createMoney({ amountMinor, currency: 'JOD' }),
      'TIGERPAY_INVALID_MONEY'
    );
  }
});

test('rejects invalid currency syntax', () => {
  const { createMoney } = loadContracts();

  for (const currency of ['JO', 'JODD', 'J0D', '', null, undefined]) {
    assertTigerPayError(
      () => createMoney({ amountMinor: 100, currency }),
      'TIGERPAY_INVALID_CURRENCY'
    );
  }
});

test('creates canonical TigerPay IDs only for allowlisted domain kinds', () => {
  const { createTigerPayId } = loadContracts();

  assert.equal(
    createTigerPayId('payment', '01HZX7K1'),
    'tp_payment_01HZX7K1'
  );
  assert.equal(
    createTigerPayId('provider-event', 'evt_123'),
    'tp_provider_event_evt_123'
  );

  assertTigerPayError(
    () => createTigerPayId('unknown', '01HZX7K1'),
    'TIGERPAY_INVALID_ID_KIND'
  );
  assertTigerPayError(
    () => createTigerPayId('payment', '../secret'),
    'TIGERPAY_INVALID_RAW_ID'
  );
});

test('creates deterministic scoped idempotency keys without random or provider-secret material', () => {
  const { createIdempotencyKey } = loadContracts();

  const input = {
    scope: 'payout-submit',
    intentId: 'tp_payout_abc',
    attempt: 1,
  };

  const first = createIdempotencyKey(input);
  const second = createIdempotencyKey({ ...input });

  assert.equal(first, 'tp-idem:payout-submit:tp_payout_abc:1');
  assert.equal(first, second);
  assert.equal(
    createIdempotencyKey({
      scope: 'PAYOUT-SUBMIT',
      intentId: 'tp_payout_abc',
    }),
    'tp-idem:payout-submit:tp_payout_abc:1'
  );
  assert.equal(first.includes('secret'), false);
});

test('rejects malformed idempotency scopes, intent IDs, and attempts', () => {
  const { createIdempotencyKey } = loadContracts();

  assertTigerPayError(
    () => createIdempotencyKey({ scope: 'x', intentId: 'tp_payout_abc' }),
    'TIGERPAY_INVALID_IDEMPOTENCY_SCOPE'
  );
  assertTigerPayError(
    () => createIdempotencyKey({ scope: 'payout-submit', intentId: 'abc' }),
    'TIGERPAY_INVALID_INTENT_ID'
  );
  assertTigerPayError(
    () =>
      createIdempotencyKey({
        scope: 'payout-submit',
        intentId: 'tp_payout_abc',
        attempt: 0,
      }),
    'TIGERPAY_INVALID_IDEMPOTENCY_ATTEMPT'
  );
});

test('normalizes provider payment facts into a frozen allowlisted canonical event', () => {
  const { normalizeProviderEvent } = loadContracts();

  const normalized = normalizeProviderEvent({
    providerId: 'sandbox-a',
    providerEventId: 'evt_123',
    providerState: 'paid',
    canonicalState: 'PAYMENT_CONFIRMED',
    occurredAt: '2026-08-07T09:00:00.000Z',
    amount: { amountMinor: 1000, currency: 'jod' },
    providerReference: 'provider-ref-44',
  });

  assert.deepEqual(normalized, {
    providerId: 'sandbox-a',
    providerEventId: 'evt_123',
    providerState: 'paid',
    canonicalState: 'PAYMENT_CONFIRMED',
    occurredAt: '2026-08-07T09:00:00.000Z',
    amount: { amountMinor: 1000, currency: 'JOD' },
    providerReference: 'provider-ref-44',
  });
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.amount));
});

test('provider normalization never imports authority-like provider fields', () => {
  const { normalizeProviderEvent } = loadContracts();

  const normalized = normalizeProviderEvent({
    providerId: 'sandbox-a',
    providerEventId: 'evt_authority_probe',
    providerState: 'paid',
    canonicalState: 'PAYMENT_CONFIRMED',
    occurredAt: '2026-08-07T09:00:00Z',
    approved: true,
    authorized: true,
    ownerApproved: true,
    capability: 'provider-supplied-capability',
    executionAllowed: true,
    role: 'OWNER_VIP_TIGER',
    permissions: ['*'],
  });

  for (const forbiddenField of [
    'approved',
    'authorized',
    'ownerApproved',
    'capability',
    'executionAllowed',
    'role',
    'ownerRole',
    'permissions',
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(normalized, forbiddenField),
      false,
      `provider normalization leaked authority field: ${forbiddenField}`
    );
  }
});

test('provider normalization rejects unknown canonical states and missing event IDs', () => {
  const { normalizeProviderEvent } = loadContracts();
  const base = {
    providerId: 'sandbox-a',
    providerEventId: 'evt_123',
    providerState: 'paid',
    canonicalState: 'PAYMENT_CONFIRMED',
    occurredAt: '2026-08-07T09:00:00Z',
  };

  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, canonicalState: 'OWNER_APPROVED' }),
    'TIGERPAY_INVALID_CANONICAL_PAYMENT_STATE'
  );
  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, providerEventId: '' }),
    'TIGERPAY_INVALID_PROVIDER_EVENT_ID'
  );
});

test('provider normalization validates provider identity, provider state, timestamp, amount, and reference', () => {
  const { normalizeProviderEvent } = loadContracts();
  const base = {
    providerId: 'sandbox-a',
    providerEventId: 'evt_123',
    providerState: 'paid',
    canonicalState: 'PAYMENT_CONFIRMED',
    occurredAt: '2026-08-07T09:00:00Z',
  };

  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, providerId: 'UPPER CASE' }),
    'TIGERPAY_INVALID_PROVIDER_ID'
  );
  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, providerState: '' }),
    'TIGERPAY_INVALID_PROVIDER_STATE'
  );
  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, occurredAt: 'not-a-date' }),
    'TIGERPAY_INVALID_OCCURRED_AT'
  );
  assertTigerPayError(
    () =>
      normalizeProviderEvent({
        ...base,
        amount: { amountMinor: 1.25, currency: 'JOD' },
      }),
    'TIGERPAY_INVALID_MONEY'
  );
  assertTigerPayError(
    () => normalizeProviderEvent({ ...base, providerReference: '' }),
    'TIGERPAY_INVALID_PROVIDER_REFERENCE'
  );
});
