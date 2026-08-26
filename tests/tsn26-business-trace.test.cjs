'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createBusinessTrace,
  appendTraceEvent,
  verifyTraceChain,
  toOpenTelemetryAttributes,
} = require('../scripts/tsn26/observability/business-trace.cjs');

const TRACE_ID = '7f6a0b4e6ec14c57a565da0be56b9a4f';

function event(eventType, overrides = {}) {
  return {
    event_type: eventType,
    occurred_at: '2026-08-26T05:30:00.000Z',
    actor_type: 'DETERMINISTIC_SERVICE',
    subject_ref: 'service://tsn26/settlement',
    status: 'VERIFIED',
    refs: {
      order_id: 'order-1',
      payment_id: 'payment-1',
      claim_id: 'claim-1',
      settlement_id: 'settlement-1',
      ledger_batch_id: 'ledger-1',
      payout_id: null,
      exposure_contract_id: 'exposure-1',
      rule_version: 'TIGER_FINANCIAL_CONSTITUTION_V1',
      country_policy_version: 'JO-2026.08.001',
    },
    evidence_refs: ['proof://payment/capture-1'],
    details: { decision: 'CAPTURED' },
    ...overrides,
  };
}

test('business trace is immutable, append-only and hash chained across financial lifecycle', () => {
  const base = createBusinessTrace({ traceId: TRACE_ID, createdAt: '2026-08-26T05:29:00.000Z' });
  const payment = appendTraceEvent(base, event('PAYMENT_CAPTURED'));
  const settlement = appendTraceEvent(payment, event('SETTLEMENT_COMMITTED', {
    occurred_at: '2026-08-26T05:31:00.000Z',
    evidence_refs: ['proof://settlement/1'],
  }));
  const payout = appendTraceEvent(settlement, event('PAYOUT_AUTHORIZED', {
    occurred_at: '2026-08-26T05:32:00.000Z',
    refs: { ...event('x').refs, payout_id: 'payout-1' },
    evidence_refs: ['proof://payout/1'],
  }));

  assert.equal(base.events.length, 0);
  assert.equal(payment.events.length, 1);
  assert.equal(payout.events.length, 3);
  assert.equal(payout.authority, 'OBSERVATIONAL_ONLY');
  assert.equal(payout.financial_authority, false);
  assert.equal(verifyTraceChain(payout), true);
  assert.equal(payout.events[1].previous_event_hash, payout.events[0].event_hash);
});

test('tampering with any committed trace event breaks chain verification', () => {
  const trace = appendTraceEvent(createBusinessTrace({ traceId: TRACE_ID }), event('PAYMENT_CAPTURED'));
  const tampered = JSON.parse(JSON.stringify(trace));
  tampered.events[0].status = 'REWRITTEN';
  assert.equal(verifyTraceChain(tampered), false);
});

test('raw details and PII are never persisted; only a canonical digest is retained', () => {
  const trace = appendTraceEvent(createBusinessTrace({ traceId: TRACE_ID }), event('POLICY_DECISION', {
    details: { email: 'person@example.com', phone: '+962000000000', decision: 'ALLOW' },
  }));
  const serialized = JSON.stringify(trace);
  assert.doesNotMatch(serialized, /person@example\.com|\+962000000000/);
  assert.match(trace.events[0].details_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(trace.events[0], 'details'), false);
});

test('OpenTelemetry projection is vendor-neutral and explicitly non-authoritative for money', () => {
  const trace = appendTraceEvent(createBusinessTrace({ traceId: TRACE_ID }), event('SETTLEMENT_COMMITTED'));
  const attributes = toOpenTelemetryAttributes(trace.events[0]);
  assert.equal(attributes['tiger.trace_id'], TRACE_ID);
  assert.equal(attributes['tiger.event_type'], 'SETTLEMENT_COMMITTED');
  assert.equal(attributes['tiger.financial_authority'], false);
  assert.equal(attributes['tiger.authority'], 'OBSERVATIONAL_ONLY');
  assert.equal(attributes['tiger.payment_id'], 'payment-1');
  assert.equal(Object.values(attributes).includes('person@example.com'), false);
});
