'use strict';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const STATES = Object.freeze({
  PENDING: 'PENDING',
  VALIDATED: 'VALIDATED',
  VESTED: 'VESTED',
  PAYABLE: 'PAYABLE',
  SCHEDULED: 'SCHEDULED',
  PAID: 'PAID',
  HELD: 'HELD',
  COMPLIANCE_REVIEW: 'COMPLIANCE_REVIEW',
  REVERSED: 'REVERSED',
  CLAWED_BACK: 'CLAWED_BACK',
});

const TERMINAL = new Set([STATES.REVERSED, STATES.CLAWED_BACK]);

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function instant(value, code) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return { ms, iso: new Date(ms).toISOString() };
}

function requirePositiveMicro(value) {
  if (typeof value !== 'bigint' || value <= 0n) throw new Error('TSN26_INVALID_SETTLEMENT_AMOUNT');
  return value;
}

function freezeSettlement(item) {
  return Object.freeze({
    ...item,
    history: Object.freeze(item.history.map((entry) => Object.freeze({ ...entry }))),
  });
}

function deriveEpochId(allocatedAt) {
  const t = instant(allocatedAt, 'TSN26_INVALID_ALLOCATED_AT');
  const epochNumber = Math.floor(t.ms / FOURTEEN_DAYS_MS);
  const start = new Date(epochNumber * FOURTEEN_DAYS_MS).toISOString().slice(0, 10);
  return `TIGER-EPOCH-${epochNumber}-${start}`;
}

function createSettlement({ settlementId, transactionId, beneficiaryUid, amountMicro, currency, allocatedAt }) {
  nonEmpty(settlementId, 'TSN26_SETTLEMENT_ID_REQUIRED');
  nonEmpty(transactionId, 'TSN26_TRANSACTION_ID_REQUIRED');
  nonEmpty(beneficiaryUid, 'TSN26_BENEFICIARY_REQUIRED');
  requirePositiveMicro(amountMicro);
  nonEmpty(currency, 'TSN26_CURRENCY_REQUIRED');
  const allocated = instant(allocatedAt, 'TSN26_INVALID_ALLOCATED_AT');

  return freezeSettlement({
    settlementId,
    transactionId,
    beneficiaryUid,
    amountMicro,
    currency: currency.toUpperCase(),
    allocatedAt: allocated.iso,
    maturesAt: new Date(allocated.ms + FOURTEEN_DAYS_MS).toISOString(),
    epochId: deriveEpochId(allocated.iso),
    state: STATES.PENDING,
    payoutId: null,
    providerReference: null,
    history: [{ event: 'ALLOCATED', at: allocated.iso, actorUid: 'FINANCIAL_CONSTITUTION' }],
  });
}

function eventTime(item, value) {
  const at = instant(value, 'TSN26_INVALID_SETTLEMENT_EVENT_TIME');
  const last = item.history.at(-1);
  if (last && at.ms < Date.parse(last.at)) throw new Error('TSN26_SETTLEMENT_TIME_REGRESSION');
  return at;
}

function assertAllowedState(item, allowed) {
  if (!allowed.includes(item.state)) {
    throw new Error(`TSN26_INVALID_SETTLEMENT_TRANSITION:${item.state}`);
  }
}

function append(item, state, entry, extra = {}) {
  return freezeSettlement({
    ...item,
    ...extra,
    state,
    history: [...item.history, entry],
  });
}

function transitionSettlement(item, input) {
  if (!item || typeof item !== 'object') throw new Error('TSN26_SETTLEMENT_REQUIRED');
  if (TERMINAL.has(item.state)) throw new Error('TSN26_TERMINAL_SETTLEMENT_STATE');
  const event = nonEmpty(input?.event, 'TSN26_SETTLEMENT_EVENT_REQUIRED');
  const actorUid = nonEmpty(input?.actorUid, 'TSN26_SETTLEMENT_ACTOR_REQUIRED');
  const at = eventTime(item, input?.at);
  const base = { event, at: at.iso, actorUid };

  switch (event) {
    case 'VALIDATE':
      assertAllowedState(item, [STATES.PENDING]);
      return append(item, STATES.VALIDATED, base);
    case 'VEST':
      assertAllowedState(item, [STATES.VALIDATED]);
      return append(item, STATES.VESTED, base);
    case 'MAKE_PAYABLE':
      assertAllowedState(item, [STATES.VESTED]);
      if (at.ms < Date.parse(item.maturesAt)) throw new Error('TSN26_SETTLEMENT_NOT_MATURE');
      return append(item, STATES.PAYABLE, base);
    case 'SCHEDULE_PAYOUT': { 
      assertAllowedState(item, [STATES.PAYABLE]);
      const payoutId = nonEmpty(input?.payoutId, 'TSN26_PAYOUT_ID_REQUIRED');
      return append(item, STATES.SCHEDULED, { ...base, payoutId }, { payoutId });
    }
    case 'MARK_PAID': { 
      assertAllowedState(item, [STATES.SCHEDULED]);
      const providerReference = nonEmpty(input?.providerReference, 'TSN26_PROVIDER_REFERENCE_REQUIRED');
      return append(item, STATES.PAID, { ...base, providerReference }, { providerReference });
    }
    case 'HOLD': { 
      assertAllowedState(item, [STATES.PENDING, STATES.VALIDATED, STATES.VESTED, STATES.PAYABLE]);
      const reason = nonEmpty(input?.reason, 'TSN26_HOLD_REASON_REQUIRED');
      return append(item, STATES.HELD, { ...base, reason });
    }
    case 'COMPLIANCE_REVIEW': { 
      assertAllowedState(item, [STATES.PENDING, STATES.VALIDATED, STATES.VESTED, STATES.PAYABLE, STATES.HELD]);
      const reason = nonEmpty(input?.reason, 'TSN26_COMPLIANCE_REASON_REQUIRED');
      return append(item, STATES.COMPLIANCE_REVIEW, { ...base, reason });
    }
    case 'REVERSE': { 
      assertAllowedState(item, [STATES.PENDING, STATES.VALIDATED, STATES.VESTED, STATES.PAYABLE, STATES.SCHEDULED, STATES.HELD, STATES.COMPLIANCE_REVIEW]);
      const reason = nonEmpty(input?.reason, 'TSN26_REVERSAL_REASON_REQUIRED');
      const reversalId = nonEmpty(input?.reversalId, 'TSN26_REVERSAL_ID_REQUIRED');
      return append(item, STATES.REVERSED, { ...base, reason, reversalId });
    }
    case 'CLAWBACK': { 
      assertAllowedState(item, [STATES.PAID]);
      const reason = nonEmpty(input?.reason, 'TSN26_CLAWBACK_REASON_REQUIRED');
      const clawbackId = nonEmpty(input?.clawbackId, 'TSN26_CLAWBACK_ID_REQUIRED');
      return append(item, STATES.CLAWED_BACK, { ...base, reason, clawbackId });
    }
    default:
      throw new Error(`TSN26_UNSUPPORTED_SETTLEMENT_EVENT:${event}`);
  }
}

function assertPayoutSchedulable(item) {
  if (!item || item.state !== STATES.PAYABLE) {
    throw new Error(`TSN26_SETTLEMENT_NOT_PAYABLE:${item?.state ?? 'UNKNOWN'}`);
  }
  return true;
}

module.exports = {
  FOURTEEN_DAYS_MS,
  STATES,
  createSettlement,
  transitionSettlement,
  deriveEpochId,
  assertPayoutSchedulable,
};
