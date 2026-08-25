'use strict';

function invariant(id, domain, rule) {
  return Object.freeze({
    id,
    domain,
    severity: 'CRITICAL',
    enforcement: 'FAIL_CLOSED',
    rule,
  });
}

const INVARIANTS = Object.freeze({
  settlementBalance: invariant(
    'FIN-001',
    'FINANCE',
    'Every settlement must conserve value exactly: collected equals allocated plus held/reserved amounts.',
  ),
  singleEconomicActor: invariant(
    'FIN-002',
    'FINANCE',
    'At most one paid sales actor may receive the active 7% seller allocation for a transaction.',
  ),
  integerMoney: invariant(
    'FIN-003',
    'FINANCE',
    'Financial calculations must use integer micro-units or exact integer/rational arithmetic; binary floating point is forbidden.',
  ),
  verifiedPayoutDestination: invariant(
    'FIN-004',
    'FINANCE',
    'No external payout may execute without a verified and eligible payout destination.',
  ),
  selfServiceDiscountOrder: invariant(
    'FIN-005',
    'FINANCE',
    'The 7% self-service incentive is applied before the 100% financial allocation is calculated.',
  ),
  constitutionTotals100: invariant(
    'FIN-006',
    'FINANCE',
    'The active financial constitution must total exactly 100% before it can be activated.',
  ),
  rootQuorum: invariant(
    'AUTH-001',
    'AUTHORITY',
    'Root financial/security actions require sovereign quorum or equivalent dual-control; a single session must not bypass it.',
  ),
  appendOnlyFinancialHistory: invariant(
    'AUD-001',
    'AUDIT',
    'Committed financial history is append-only; corrections use reversal and compensating entries rather than destructive mutation.',
  ),
  paymentReplaySafety: invariant(
    'PAY-001',
    'PAYMENT',
    'A replayed or duplicated payment event must never create a second settlement, commission, or payout entitlement.',
  ),
  verifiedExposureOnly: invariant(
    'EXP-001',
    'EXPOSURE',
    'Unverified exposure events must not consume paid verified-exposure entitlement.',
  ),
  aiNoLedgerAuthority: invariant(
    'AI-001',
    'AI',
    'AI may analyze, recommend, forecast, or flag risk but must not directly mutate the sovereign financial ledger or decide entitlement authority.',
  ),
  noLegacyFinancialFallback: invariant(
    'LEGACY-001',
    'LEGACY',
    'Legacy, parallel, hidden, compatibility, or fallback financial allocation logic is forbidden after TSN-26 cutover.',
  ),
});

const BY_ID = new Map(Object.values(INVARIANTS).map((entry) => [entry.id, entry]));

function getInvariant(id) {
  const entry = BY_ID.get(id);
  if (!entry) {
    throw new Error(`TSN26_UNKNOWN_INVARIANT:${String(id)}`);
  }
  return entry;
}

function assertInvariantRegistryIntegrity() {
  const entries = Object.values(INVARIANTS);
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('TSN26_DUPLICATE_INVARIANT_ID');
  }
  for (const entry of entries) {
    if (!entry.id || !entry.domain || !entry.rule) {
      throw new Error('TSN26_MALFORMED_INVARIANT');
    }
    if (entry.severity !== 'CRITICAL' || entry.enforcement !== 'FAIL_CLOSED') {
      throw new Error(`TSN26_NON_FAIL_CLOSED_INVARIANT:${entry.id}`);
    }
  }
  for (const required of [
    'FIN-001', 'FIN-002', 'FIN-003', 'FIN-004', 'FIN-005', 'FIN-006',
    'AUTH-001', 'AUD-001', 'PAY-001', 'EXP-001', 'AI-001', 'LEGACY-001',
  ]) {
    getInvariant(required);
  }
  return true;
}

assertInvariantRegistryIntegrity();

module.exports = {
  INVARIANTS,
  getInvariant,
  assertInvariantRegistryIntegrity,
};
