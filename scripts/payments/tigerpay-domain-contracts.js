'use strict';

const PAYMENT_STATES = Object.freeze([
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

const PAYOUT_STATES = Object.freeze([
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

const TREASURY_DESTINATION_STATES = Object.freeze([
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

const BUSINESS_CONTINUITY_MODES = Object.freeze([
  'NORMAL',
  'DEGRADED_PROVIDER',
  'READ_ONLY_FINANCE',
  'OUTBOUND_FROZEN',
  'COUNTRY_FROZEN',
  'AI_DISABLED',
  'FULL_FINANCIAL_ISOLATION',
]);

const FINANCIAL_DATA_CLASSES = Object.freeze([
  'F-PUBLIC',
  'F-INTERNAL',
  'F-CONFIDENTIAL',
  'F-RESTRICTED',
  'F-SOVEREIGN',
]);

const TIGERPAY_ACTION_DECISIONS = Object.freeze({
  ALLOW_READ: 'ALLOW_READ',
  ALLOW_DRAFT: 'ALLOW_DRAFT',
  REQUIRE_OWNER_APPROVAL: 'REQUIRE_OWNER_APPROVAL',
  DENY: 'DENY',
});

const ALLOWED_ID_KINDS = new Set([
  'payment',
  'payout',
  'refund',
  'chargeback',
  'treasury',
  'approval',
  'capability',
  'journal',
  'settlement',
  'reconciliation',
  'evidence',
  'report',
  'incident',
  'provider-event',
]);

const ISO_8601_PROVIDER_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/;

const paymentStateSet = new Set(PAYMENT_STATES);
const payoutStateSet = new Set(PAYOUT_STATES);

function tigerPayError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

function createMoney(input = {}) {
  const { amountMinor, currency } = input;

  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw tigerPayError(
      'TIGERPAY_INVALID_MONEY',
      'amountMinor must be a non-negative safe integer'
    );
  }

  if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_CURRENCY',
      'currency must contain exactly three alphabetic characters'
    );
  }

  return Object.freeze({
    amountMinor,
    currency: currency.toUpperCase(),
  });
}

function createTigerPayId(kind, rawId) {
  if (!ALLOWED_ID_KINDS.has(kind)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_ID_KIND',
      'TigerPay ID kind is not allowlisted'
    );
  }

  if (
    typeof rawId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(rawId)
  ) {
    throw tigerPayError(
      'TIGERPAY_INVALID_RAW_ID',
      'TigerPay raw ID has invalid syntax'
    );
  }

  return `tp_${kind.replace(/-/g, '_')}_${rawId}`;
}

function createIdempotencyKey(input = {}) {
  const { intentId } = input;
  const attempt = input.attempt === undefined ? 1 : input.attempt;
  const scope =
    typeof input.scope === 'string' ? input.scope.toLowerCase() : input.scope;

  if (typeof scope !== 'string' || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(scope)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_IDEMPOTENCY_SCOPE',
      'idempotency scope has invalid syntax'
    );
  }

  if (
    typeof intentId !== 'string' ||
    !/^tp_[A-Za-z0-9_][A-Za-z0-9_-]{2,159}$/.test(intentId)
  ) {
    throw tigerPayError(
      'TIGERPAY_INVALID_INTENT_ID',
      'intentId must be a canonical TigerPay ID'
    );
  }

  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw tigerPayError(
      'TIGERPAY_INVALID_IDEMPOTENCY_ATTEMPT',
      'idempotency attempt must be a safe integer greater than or equal to one'
    );
  }

  return `tp-idem:${scope}:${intentId}:${attempt}`;
}

function isKnownPaymentState(state) {
  return paymentStateSet.has(state);
}

function isKnownPayoutState(state) {
  return payoutStateSet.has(state);
}

function isPrintableBounded(value, maxLength) {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= maxLength &&
    value.trim().length >= 1 &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1] || 0;
}

function parseProviderOccurredAt(occurredAt) {
  if (typeof occurredAt !== 'string') {
    throw tigerPayError(
      'TIGERPAY_INVALID_OCCURRED_AT',
      'occurredAt must be an ISO-8601 timestamp with an explicit timezone'
    );
  }

  const match = ISO_8601_PROVIDER_TIMESTAMP.exec(occurredAt);
  if (!match) {
    throw tigerPayError(
      'TIGERPAY_INVALID_OCCURRED_AT',
      'occurredAt must be an ISO-8601 timestamp with an explicit timezone'
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezoneHour = match[10] === undefined ? 0 : Number(match[10]);
  const timezoneMinute = match[11] === undefined ? 0 : Number(match[11]);

  const validCalendar =
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59;

  const validTimezone =
    timezoneHour >= 0 &&
    timezoneHour <= 14 &&
    timezoneMinute >= 0 &&
    timezoneMinute <= 59 &&
    (timezoneHour !== 14 || timezoneMinute === 0);

  if (!validCalendar || !validTimezone) {
    throw tigerPayError(
      'TIGERPAY_INVALID_OCCURRED_AT',
      'occurredAt contains an invalid calendar, clock, or timezone value'
    );
  }

  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    throw tigerPayError(
      'TIGERPAY_INVALID_OCCURRED_AT',
      'occurredAt must be a valid ISO-8601 timestamp'
    );
  }

  return parsed.toISOString();
}

function normalizeProviderEvent(input = {}) {
  const {
    providerId,
    providerEventId,
    providerState,
    canonicalState,
    occurredAt,
  } = input;

  if (
    typeof providerId !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{1,63}$/.test(providerId)
  ) {
    throw tigerPayError(
      'TIGERPAY_INVALID_PROVIDER_ID',
      'providerId has invalid syntax'
    );
  }

  if (!isPrintableBounded(providerEventId, 160)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_PROVIDER_EVENT_ID',
      'providerEventId must be a bounded printable string'
    );
  }

  if (!isPrintableBounded(providerState, 120)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_PROVIDER_STATE',
      'providerState must be a bounded printable string'
    );
  }

  if (!isKnownPaymentState(canonicalState)) {
    throw tigerPayError(
      'TIGERPAY_INVALID_CANONICAL_PAYMENT_STATE',
      'canonicalState must be a known TigerPay payment state'
    );
  }

  const normalizedOccurredAt = parseProviderOccurredAt(occurredAt);

  let providerReference = null;
  if (input.providerReference !== undefined && input.providerReference !== null) {
    if (!isPrintableBounded(input.providerReference, 160)) {
      throw tigerPayError(
        'TIGERPAY_INVALID_PROVIDER_REFERENCE',
        'providerReference must be a bounded printable string'
      );
    }
    providerReference = input.providerReference;
  }

  const amount =
    input.amount === undefined || input.amount === null
      ? null
      : createMoney(input.amount);

  return Object.freeze({
    providerId,
    providerEventId,
    providerState,
    canonicalState,
    occurredAt: normalizedOccurredAt,
    amount,
    providerReference,
  });
}

module.exports = Object.freeze({
  PAYMENT_STATES,
  PAYOUT_STATES,
  TREASURY_DESTINATION_STATES,
  BUSINESS_CONTINUITY_MODES,
  FINANCIAL_DATA_CLASSES,
  TIGERPAY_ACTION_DECISIONS,
  createMoney,
  createTigerPayId,
  createIdempotencyKey,
  normalizeProviderEvent,
  isKnownPaymentState,
  isKnownPayoutState,
});
