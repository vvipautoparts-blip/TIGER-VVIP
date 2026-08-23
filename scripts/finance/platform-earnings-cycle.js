'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MS = 14 * DAY_MS;

const ALLOWED_EARNING_SOURCES = Object.freeze([
  'ADVERTISING',
  'CAMPAIGN',
  'AD_CREDIT_PACKAGE',
  'PAID_VISIBILITY',
  'APPROVED_PLATFORM_SERVICE',
]);

const ENTRY_TYPES = Object.freeze(['EARNING', 'REVERSAL', 'ADJUSTMENT']);

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function requireCurrency(value, field = 'currency') {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new TypeError(`${field} must be a three-letter uppercase currency code`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireNonEmptyString(value, field);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return timestamp;
}

function parseInteger(value, field) {
  if (typeof value === 'bigint') return value;

  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }

  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return BigInt(value);
  }

  throw new TypeError(`${field} must use precision-safe integer representation`);
}

function freeze(value) {
  return Object.freeze(value);
}

function cycleFor(timestamp, anchor) {
  const timestampMs = parseTimestamp(timestamp, 'timestamp');
  const anchorMs = parseTimestamp(anchor, 'anchor');
  const index = Math.floor((timestampMs - anchorMs) / CYCLE_MS);
  const startMs = anchorMs + (index * CYCLE_MS);
  const endMs = startMs + CYCLE_MS;

  return freeze({
    index,
    start: new Date(startMs).toISOString(),
    end_exclusive: new Date(endMs).toISOString(),
  });
}

function recordEntry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('entry must be an object');
  }

  const id = requireNonEmptyString(input.id, 'id');
  const source = requireNonEmptyString(input.source, 'source');
  if (!ALLOWED_EARNING_SOURCES.includes(source)) {
    throw new TypeError('source must be a platform-owned earning source; external-deal commission is forbidden');
  }

  const amountMinor = parseInteger(input.amount_minor, 'amount_minor');
  const currency = requireCurrency(input.currency);
  parseTimestamp(input.occurred_at, 'occurred_at');
  const description = requireNonEmptyString(input.description, 'description');
  const entryType = requireNonEmptyString(input.entry_type, 'entry_type');

  if (!ENTRY_TYPES.includes(entryType)) {
    throw new TypeError('entry_type must be EARNING, REVERSAL, or ADJUSTMENT');
  }

  const originalEntryId = input.original_entry_id === undefined
    ? null
    : input.original_entry_id;

  if (entryType === 'EARNING') {
    if (originalEntryId !== null) {
      throw new TypeError('ordinary earning entries cannot reference an original entry');
    }
    if (amountMinor < 0n) {
      throw new TypeError('ordinary earning amount_minor cannot be negative');
    }
  } else {
    requireNonEmptyString(originalEntryId, 'original_entry_id');
    if (entryType === 'REVERSAL' && amountMinor >= 0n) {
      throw new TypeError('reversal amount_minor must be negative');
    }
  }

  return freeze({
    id,
    source,
    amount_minor: amountMinor,
    currency,
    occurred_at: input.occurred_at,
    description,
    entry_type: entryType,
    original_entry_id: originalEntryId,
  });
}

function validateCycle(cycle) {
  if (!cycle || typeof cycle !== 'object' || Array.isArray(cycle)) {
    throw new TypeError('cycle must be an object');
  }
  if (!Number.isInteger(cycle.index)) {
    throw new TypeError('cycle.index must be an integer');
  }
  const startMs = parseTimestamp(cycle.start, 'cycle.start');
  const endMs = parseTimestamp(cycle.end_exclusive, 'cycle.end_exclusive');
  if (endMs - startMs !== CYCLE_MS) {
    throw new TypeError('cycle must span exactly 14 days');
  }
  return { startMs, endMs };
}

function closeCycle(entries, cycle) {
  if (!Array.isArray(entries)) {
    throw new TypeError('entries must be an array');
  }

  const { startMs, endMs } = validateCycle(cycle);
  const validatedEntries = entries.map((entry) => recordEntry(entry));
  const included = validatedEntries.filter((entry) => {
    const occurredAt = parseTimestamp(entry.occurred_at, 'entry.occurred_at');
    return occurredAt >= startMs && occurredAt < endMs;
  });

  const currencies = new Set(included.map((entry) => entry.currency));
  if (currencies.size > 1) {
    throw new TypeError('one authoritative cycle total cannot mix currency codes');
  }

  let totalMinor = 0n;
  for (const entry of included) {
    totalMinor += entry.amount_minor;
  }

  return freeze({
    cycle,
    currency: currencies.size === 1 ? [...currencies][0] : null,
    total_minor: totalMinor,
    entry_count: included.length,
    entry_ids: freeze(included.map((entry) => entry.id)),
  });
}

function roundHalfUpPositive(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return (remainder * 2n) >= denominator ? quotient + 1n : quotient;
}

function createConversionStatement(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('conversion statement input must be an object');
  }

  const id = requireNonEmptyString(input.id, 'id');
  const sourceCurrency = requireCurrency(input.source_currency, 'source_currency');
  const destinationCurrency = requireCurrency(input.destination_currency, 'destination_currency');
  const sourceAmountMinor = parseInteger(input.source_amount_minor, 'source_amount_minor');
  const rateNumerator = parseInteger(input.rate_numerator, 'rate_numerator');
  const rateDenominator = parseInteger(input.rate_denominator, 'rate_denominator');
  const rateSource = requireNonEmptyString(input.rate_source, 'rate_source');
  const quotedAt = parseTimestamp(input.quoted_at, 'quoted_at');
  const quoteExpiresAt = parseTimestamp(input.quote_expires_at, 'quote_expires_at');

  if (!Object.prototype.hasOwnProperty.call(input, 'fees_minor')) {
    throw new TypeError('fees_minor is required; hidden fees are forbidden');
  }
  const feesMinor = parseInteger(input.fees_minor, 'fees_minor');
  const roundingMode = requireNonEmptyString(input.rounding_mode, 'rounding_mode');

  if (sourceAmountMinor < 0n) {
    throw new TypeError('source_amount_minor cannot be negative');
  }
  if (rateNumerator <= 0n || rateDenominator <= 0n) {
    throw new TypeError('rate must use positive integer numerator and denominator');
  }
  if (feesMinor < 0n) {
    throw new TypeError('fees_minor cannot be negative');
  }
  if (quoteExpiresAt <= quotedAt) {
    throw new TypeError('quote_expires_at must be later than quoted_at');
  }
  if (roundingMode !== 'HALF_UP') {
    throw new TypeError('rounding_mode must be HALF_UP');
  }

  const grossDestinationAmountMinor = roundHalfUpPositive(
    sourceAmountMinor * rateNumerator,
    rateDenominator,
  );

  if (feesMinor > grossDestinationAmountMinor) {
    throw new TypeError('fees_minor cannot exceed gross destination amount');
  }

  return freeze({
    id,
    source_currency: sourceCurrency,
    destination_currency: destinationCurrency,
    source_amount_minor: sourceAmountMinor,
    rate_numerator: rateNumerator,
    rate_denominator: rateDenominator,
    rate_source: rateSource,
    quoted_at: input.quoted_at,
    quote_expires_at: input.quote_expires_at,
    fees_minor: feesMinor,
    rounding_mode: roundingMode,
    gross_destination_amount_minor: grossDestinationAmountMinor,
    destination_amount_minor: grossDestinationAmountMinor - feesMinor,
  });
}

module.exports = {
  ALLOWED_EARNING_SOURCES,
  cycleFor,
  recordEntry,
  closeCycle,
  createConversionStatement,
};
