'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const earnings = require('../scripts/finance/platform-earnings-cycle.js');

const ANCHOR = '2026-08-01T00:00:00.000Z';

function earningInput(overrides = {}) {
  return {
    id: 'earning:001',
    source: 'ADVERTISING',
    amount_minor: '1250',
    currency: 'USD',
    occurred_at: '2026-08-01T12:00:00.000Z',
    description: 'platform advertising revenue',
    entry_type: 'EARNING',
    original_entry_id: null,
    ...overrides,
  };
}

test('only platform-owned earning sources are allowed and external-deal economics are rejected', () => {
  assert.deepEqual(earnings.ALLOWED_EARNING_SOURCES, [
    'ADVERTISING',
    'CAMPAIGN',
    'AD_CREDIT_PACKAGE',
    'PAID_VISIBILITY',
    'APPROVED_PLATFORM_SERVICE',
  ]);

  for (const source of earnings.ALLOWED_EARNING_SOURCES) {
    assert.doesNotThrow(() => earnings.recordEntry(earningInput({ source })));
  }

  for (const source of [
    'EXTERNAL_DEAL_VALUE',
    'EXTERNAL_DEAL_SUCCESS',
    'BUYER_SELLER_COMMISSION',
  ]) {
    assert.throws(
      () => earnings.recordEntry(earningInput({ source })),
      /source|external|commission/i,
    );
  }
});

test('authoritative money uses integer minor units and ISO-style currencies', () => {
  const entry = earnings.recordEntry(earningInput({ amount_minor: '900719925474099312345' }));
  assert.equal(entry.amount_minor, 900719925474099312345n);
  assert.equal(Object.isFrozen(entry), true);

  for (const invalid of ['12.50', 12.5, Number.MAX_SAFE_INTEGER + 100]) {
    assert.throws(
      () => earnings.recordEntry(earningInput({ amount_minor: invalid })),
      /minor|integer|precision/i,
    );
  }

  for (const currency of ['usd', 'US', 'USDD', '12A']) {
    assert.throws(
      () => earnings.recordEntry(earningInput({ currency })),
      /currency/i,
    );
  }
});

test('cycleFor maps exact UTC boundaries into deterministic non-overlapping 14-day cycles', () => {
  const first = earnings.cycleFor('2026-08-01T00:00:00.000Z', ANCHOR);
  const lastInsideFirst = earnings.cycleFor('2026-08-14T23:59:59.999Z', ANCHOR);
  const second = earnings.cycleFor('2026-08-15T00:00:00.000Z', ANCHOR);

  assert.deepEqual(first, {
    index: 0,
    start: '2026-08-01T00:00:00.000Z',
    end_exclusive: '2026-08-15T00:00:00.000Z',
  });
  assert.deepEqual(lastInsideFirst, first);
  assert.deepEqual(second, {
    index: 1,
    start: '2026-08-15T00:00:00.000Z',
    end_exclusive: '2026-08-29T00:00:00.000Z',
  });
  assert.equal(first.end_exclusive, second.start);
});

test('cycleFor also maps timestamps before the anchor without overlap', () => {
  assert.deepEqual(
    earnings.cycleFor('2026-07-31T23:59:59.999Z', ANCHOR),
    {
      index: -1,
      start: '2026-07-18T00:00:00.000Z',
      end_exclusive: '2026-08-01T00:00:00.000Z',
    },
  );
});

test('closeCycle totals only entries inside that cycle and the next cycle starts from zero', () => {
  const cycle0 = earnings.cycleFor('2026-08-02T00:00:00.000Z', ANCHOR);
  const cycle1 = earnings.cycleFor('2026-08-16T00:00:00.000Z', ANCHOR);
  const entries = [
    earnings.recordEntry(earningInput({ id: 'e1', amount_minor: '100' })),
    earnings.recordEntry(earningInput({
      id: 'e2',
      source: 'CAMPAIGN',
      amount_minor: '250',
      occurred_at: '2026-08-14T23:59:59.999Z',
    })),
  ];

  const closed0 = earnings.closeCycle(entries, cycle0);
  const closed1 = earnings.closeCycle(entries, cycle1);

  assert.equal(closed0.total_minor, 350n);
  assert.equal(closed0.entry_count, 2);
  assert.equal(closed1.total_minor, 0n);
  assert.equal(closed1.entry_count, 0);
  assert.equal(Object.isFrozen(closed0), true);
});

test('a cycle cannot mix currencies into one authoritative total', () => {
  const cycle = earnings.cycleFor('2026-08-02T00:00:00.000Z', ANCHOR);
  const entries = [
    earnings.recordEntry(earningInput({ id: 'usd', currency: 'USD' })),
    earnings.recordEntry(earningInput({ id: 'eur', currency: 'EUR' })),
  ];

  assert.throws(() => earnings.closeCycle(entries, cycle), /currency/i);
});

test('corrections are separate immutable entries that reference an original entry', () => {
  const original = earnings.recordEntry(earningInput({ id: 'original:1', amount_minor: '1000' }));
  const reversal = earnings.recordEntry(earningInput({
    id: 'reversal:1',
    amount_minor: '-1000',
    entry_type: 'REVERSAL',
    original_entry_id: original.id,
    description: 'reverse original posting',
  }));
  const adjustment = earnings.recordEntry(earningInput({
    id: 'adjustment:1',
    amount_minor: '125',
    entry_type: 'ADJUSTMENT',
    original_entry_id: original.id,
    description: 'approved correction',
  }));

  assert.equal(reversal.original_entry_id, original.id);
  assert.equal(adjustment.original_entry_id, original.id);
  assert.equal(Object.isFrozen(reversal), true);
  assert.equal('updateEntry' in earnings, false);
  assert.equal('deleteEntry' in earnings, false);

  assert.throws(
    () => earnings.recordEntry(earningInput({ entry_type: 'REVERSAL', original_entry_id: null })),
    /original/i,
  );
  assert.throws(
    () => earnings.recordEntry(earningInput({ entry_type: 'EARNING', original_entry_id: 'unexpected' })),
    /original/i,
  );
});

test('FX conversion statements expose currencies, rational rate, source, quote lifetime, fees and result', () => {
  const statement = earnings.createConversionStatement({
    id: 'fx:001',
    source_currency: 'USD',
    destination_currency: 'JOD',
    source_amount_minor: '10000',
    rate_numerator: '709',
    rate_denominator: '1000',
    rate_source: 'APPROVED_RATE_PROVIDER',
    quoted_at: '2026-08-23T00:00:00.000Z',
    quote_expires_at: '2026-08-23T00:05:00.000Z',
    fees_minor: '25',
    rounding_mode: 'HALF_UP',
  });

  assert.equal(statement.source_amount_minor, 10000n);
  assert.equal(statement.rate_numerator, 709n);
  assert.equal(statement.rate_denominator, 1000n);
  assert.equal(statement.gross_destination_amount_minor, 7090n);
  assert.equal(statement.fees_minor, 25n);
  assert.equal(statement.destination_amount_minor, 7065n);
  assert.equal(statement.rate_source, 'APPROVED_RATE_PROVIDER');
  assert.equal(statement.quote_expires_at, '2026-08-23T00:05:00.000Z');
  assert.equal(Object.isFrozen(statement), true);
});

test('FX statements fail closed on missing rate provenance, hidden fees, invalid quote windows or floats', () => {
  const base = {
    id: 'fx:002',
    source_currency: 'USD',
    destination_currency: 'JOD',
    source_amount_minor: '10001',
    rate_numerator: '709',
    rate_denominator: '1000',
    rate_source: 'APPROVED_RATE_PROVIDER',
    quoted_at: '2026-08-23T00:00:00.000Z',
    quote_expires_at: '2026-08-23T00:05:00.000Z',
    fees_minor: '0',
    rounding_mode: 'HALF_UP',
  };

  assert.equal(
    earnings.createConversionStatement(base).gross_destination_amount_minor,
    7091n,
    'HALF_UP rounding stays integer and deterministic',
  );
  assert.throws(
    () => earnings.createConversionStatement({ ...base, rate_source: '' }),
    /rate_source|rate source/i,
  );
  const missingFees = { ...base };
  delete missingFees.fees_minor;
  assert.throws(() => earnings.createConversionStatement(missingFees), /fee/i);
  assert.throws(
    () => earnings.createConversionStatement({
      ...base,
      quote_expires_at: base.quoted_at,
    }),
    /quote|expire/i,
  );
  assert.throws(
    () => earnings.createConversionStatement({ ...base, rate_numerator: 0.709 }),
    /integer|rate/i,
  );
});
