'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STATES,
  createSettlement,
  transitionSettlement,
  deriveEpochId,
  assertPayoutSchedulable,
} = require('../src/tsn26/settlement-lifecycle.cjs');

function settlement(overrides = {}) {
  return createSettlement({
    settlementId: 'settlement-001',
    transactionId: 'tx-001',
    beneficiaryUid: 'seller-001',
    amountMicro: 3_150_000n,
    currency: 'JOD',
    allocatedAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  });
}

test('settlement is allocated immediately into a deterministic 14-day epoch', () => {
  const item = settlement();
  assert.equal(item.state, STATES.PENDING);
  assert.equal(item.epochId, deriveEpochId('2026-08-26T00:00:00.000Z'));
  assert.equal(item.amountMicro, 3_150_000n);
});

test('normal lifecycle reaches payable then scheduled then paid', () => {
  let item = settlement();
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'VEST', at: '2026-08-26T00:02:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'MAKE_PAYABLE', at: '2026-09-09T00:00:00.000Z', actorUid: 'settlement-engine' });
  assert.equal(assertPayoutSchedulable(item), true);
  item = transitionSettlement(item, { event: 'SCHEDULE_PAYOUT', at: '2026-09-09T00:01:00.000Z', actorUid: 'payout-orchestrator', payoutId: 'payout-001' });
  item = transitionSettlement(item, { event: 'MARK_PAID', at: '2026-09-09T00:02:00.000Z', actorUid: 'payout-orchestrator', providerReference: 'bank-ref-001' });
  assert.equal(item.state, STATES.PAID);
  assert.equal(item.payoutId, 'payout-001');
  assert.equal(item.providerReference, 'bank-ref-001');
});

test('make-payable before 14-day vesting boundary fails closed', () => {
  let item = settlement();
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'VEST', at: '2026-08-26T00:02:00.000Z', actorUid: 'settlement-engine' });
  assert.throws(
    () => transitionSettlement(item, { event: 'MAKE_PAYABLE', at: '2026-09-08T23:59:59.999Z', actorUid: 'settlement-engine' }),
    /TSN26_SETTLEMENT_NOT_MATURE/,
  );
});

test('hold and compliance review block scheduling until explicitly released', () => {
  let item = settlement();
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'HOLD', at: '2026-08-26T00:02:00.000Z', actorUid: 'risk-engine', reason: 'chargeback-risk' });
  assert.equal(item.state, STATES.HELD);
  assert.throws(() => assertPayoutSchedulable(item), /TSN26_SETTLEMENT_NOT_PAYABLE/);
  item = transitionSettlement(item, { event: 'COMPLIANCE_REVIEW', at: '2026-08-26T00:03:00.000Z', actorUid: 'compliance-engine', reason: 'beneficiary-review' });
  assert.equal(item.state, STATES.COMPLIANCE_REVIEW);
});

test('reversal is append-only and terminal, never destructive mutation', () => {
  let item = settlement();
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'REVERSE', at: '2026-08-26T00:02:00.000Z', actorUid: 'settlement-engine', reason: 'payment-reversed', reversalId: 'rev-001' });
  assert.equal(item.state, STATES.REVERSED);
  assert.equal(item.history.at(-1).reversalId, 'rev-001');
  assert.throws(
    () => transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:03:00.000Z', actorUid: 'settlement-engine' }),
    /TSN26_TERMINAL_SETTLEMENT_STATE/,
  );
});

test('clawback after payout preserves original payout proof', () => {
  let item = settlement();
  item = transitionSettlement(item, { event: 'VALIDATE', at: '2026-08-26T00:01:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'VEST', at: '2026-08-26T00:02:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'MAKE_PAYABLE', at: '2026-09-09T00:00:00.000Z', actorUid: 'settlement-engine' });
  item = transitionSettlement(item, { event: 'SCHEDULE_PAYOUT', at: '2026-09-09T00:01:00.000Z', actorUid: 'payout-orchestrator', payoutId: 'payout-001' });
  item = transitionSettlement(item, { event: 'MARK_PAID', at: '2026-09-09T00:02:00.000Z', actorUid: 'payout-orchestrator', providerReference: 'bank-ref-001' });
  item = transitionSettlement(item, { event: 'CLAWBACK', at: '2026-09-10T00:00:00.000Z', actorUid: 'risk-engine', reason: 'chargeback', clawbackId: 'clawback-001' });
  assert.equal(item.state, STATES.CLAWED_BACK);
  assert.equal(item.providerReference, 'bank-ref-001');
  assert.equal(item.history.at(-1).clawbackId, 'clawback-001');
});
