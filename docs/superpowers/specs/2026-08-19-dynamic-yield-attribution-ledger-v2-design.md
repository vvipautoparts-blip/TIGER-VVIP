# VVIP TIGER Dynamic Yield Attribution & Ledger V2 Design

**Status:** OWNER APPROVED — 2026-08-19

**Effective policy date:** 2026-08-19

**Supersedes for new sales:** `VVIP_COMMISSION_2026_08_12_V1`

**Historical preservation:** V1 decisions, allocations, and audit facts remain immutable historical evidence.

## Purpose

This specification freezes the owner-approved V2 commission policy, referral-attribution priority, and deterministic distribution-journal contract for VVIP TIGER. It replaces the active V1 commission percentages for sales whose economic event occurs on or after the effective policy date. It does not rewrite historical V1 transactions.

The first implementation slice is a dependency-free domain core that can be tested in the repository's existing Node runtime. It performs no provider call, payout, Production database mutation, notification, or real-money movement.

## Binding ownership and operating-partner decision

VVIP TIGER has one legal owner. The three named partners are operating partners paid commissions; they are not equity owners.

- `OWNER_MANAGEMENT` is a 5% management commission allocation. It is not a dividend or proof of an equity distribution.
- `OPERATING_PARTNER_1`, `OPERATING_PARTNER_2`, and `OPERATING_PARTNER_3` each receive a 5% operating commission allocation.
- Any equity profit distribution remains outside the per-sale commission policy and follows accounting close and legal approval.

## Calculation base

All V2 percentages apply to `NET_RECOGNIZED_REVENUE` in integer minor units.

`NET_RECOGNIZED_REVENUE` is supplied by a trusted accounting/revenue-recognition boundary after applicable tax exclusion and recognized refund, chargeback, provider-fee, and foreign-exchange adjustments. This slice validates and allocates that trusted amount; it does not calculate tax, recognize ad delivery, or query a payment provider.

Binary floating-point money arithmetic is forbidden. Inputs and outputs use safe integer minor units. Internal multiplication uses exact integer arithmetic.

## V2.0 central commission policies

Every current and future sector inherits one central policy. Sector-local percentage overrides are forbidden.

### Referred sale

`REFERRED_SALE` requires a valid locked attribution snapshot with a marketer, manager assignment, and sector.

| Recipient | Basis points | Percent |
| --- | ---: | ---: |
| `OWNER_MANAGEMENT` | 500 | 5% |
| `OPERATING_PARTNER_1` | 500 | 5% |
| `OPERATING_PARTNER_2` | 500 | 5% |
| `OPERATING_PARTNER_3` | 500 | 5% |
| `GENERAL_MANAGER` | 500 | 5% |
| `SECTOR_MANAGER` | 500 | 5% |
| `PRIMARY_MARKETER` | 500 | 5% |
| `TECH_CONTENT` | 150 | 1.5% |
| `CUSTOMER_SERVICE_BASE` | 150 | 1.5% |
| `PLATFORM_RETAINED` | 6200 | 62% |
| **Total** | **10000** | **100%** |

### Direct platform sale

`DIRECT_PLATFORM` has no marketer or sector-manager commission allocation.

| Recipient | Basis points | Percent |
| --- | ---: | ---: |
| `OWNER_MANAGEMENT` | 500 | 5% |
| `OPERATING_PARTNER_1` | 500 | 5% |
| `OPERATING_PARTNER_2` | 500 | 5% |
| `OPERATING_PARTNER_3` | 500 | 5% |
| `GENERAL_MANAGER` | 500 | 5% |
| `TECH_CONTENT` | 150 | 1.5% |
| `CUSTOMER_SERVICE_BASE` | 150 | 1.5% |
| `CUSTOMER_SERVICE_PERFORMANCE` | 500 | 5% |
| `GROWTH_ACQUISITION_RESERVE` | 300 | 3% |
| `RISK_CHARGEBACK_RESERVE` | 200 | 2% |
| `PLATFORM_RETAINED` | 6200 | 62% |
| **Total** | **10000** | **100%** |

## Exact allocation and remainder rule

For a source amount `A` and recipient basis points `b`:

```text
exact numerator = BigInt(A) * BigInt(b)
floor amount = exact numerator / 10000
fractional remainder = exact numerator % 10000
```

The engine allocates all floor amounts first. Any remaining minor units use a deterministic largest-remainder method:

1. higher fractional remainder ranks first;
2. equal fractional remainders are ordered by a transaction-bound SHA-256 rotation derived from policy version and transaction key;
3. no recipient can receive more than one remainder unit in a single 100%-policy allocation;
4. the result must reconcile exactly to the source amount;
5. residual minor units must equal zero.

This rule prevents silent loss and avoids permanently favoring one beneficiary for equal fractions.

## V2.1 attribution priority

Attribution evidence is evaluated in this order:

| Priority | Evidence type | Maximum age | Commission authority |
| ---: | --- | ---: | --- |
| 1 | `CHECKOUT_CODE` | current order | eligible |
| 2 | `VERIFIED_LEAD` | 60 days | eligible |
| 3 | `VERIFIED_ORDER_START` | 30 days | eligible |
| 4 | `CONSENTED_FIRST_PARTY_COOKIE` | 7 days | eligible |
| 5 | `DEVICE_RISK_SIGNAL` | none | never eligible |
| 5 | `PAYMENT_RISK_SIGNAL` | none | never eligible |

Rules:

- one transaction has at most one winning marketer attribution;
- a valid higher-priority claim wins over lower-priority claims;
- an expired, malformed, or incomplete claim is ineligible;
- eligible claims require `marketerId`, `managerAssignmentId`, `sectorId`, `capturedAt`, and `evidenceId`;
- the manager assignment is the effective-dated assignment bound to the winning evidence;
- a moved marketer receives a new referral passport/assignment for future claims; historical locked evidence is not rewritten;
- a trusted fraud signal yields `ATTRIBUTION_REVIEW`, not an automatic direct sale;
- no eligible claim yields `DIRECT_PLATFORM`;
- the resolution result is immutable and contains the policy version and evidence ID;
- device, IP, behavior, and payment-method signals are fraud inputs only and never grant commission.

## Referral-passport boundary

The public referral code is an opaque pointer. It must not encode phone, payment, account, manager, or marketer personally identifiable information. The trusted resolver maps the public code to an active effective-dated passport record and returns the normalized evidence fields required above.

Public-code generation, storage, rate limiting, and HMAC verification are deferred to a server/persistence slice. The V2.1 domain resolver accepts only already-validated evidence; it never treats a browser string as proof.

## Distribution journal contract

The initial V2.2 journal is an immutable, balanced distribution journal, not a bank settlement and not a payout confirmation.

Input:

```js
createDistributionJournal({
  journalId,
  sourceEventId,
  idempotencyKey,
  occurredAt,
  amountMinor,
  currency,
  transactionKey,
  attribution
})
```

Output:

```js
{
  journalId,
  sourceEventId,
  idempotencyKey,
  policyVersion,
  occurredAt,
  currency,
  saleChannel,
  source: {
    account: "NET_RECOGNIZED_REVENUE_CLEARING",
    direction: "DEBIT",
    amountMinor
  },
  destinations: [
    {
      recipient,
      beneficiaryReference,
      account,
      direction: "CREDIT",
      basisPoints,
      amountMinor,
      roundingAdjustmentMinor
    }
  ],
  debitTotalMinor,
  creditTotalMinor,
  residualMinor,
  status: "POSTED"
}
```

Invariants:

- `debitTotalMinor === creditTotalMinor === amountMinor`;
- `residualMinor === 0`;
- referred journals bind `PRIMARY_MARKETER` to the winning `marketerId` and `SECTOR_MANAGER` to the winning `managerAssignmentId`;
- direct journals contain neither `PRIMARY_MARKETER` nor `SECTOR_MANAGER`;
- fixed recipients use canonical account references and never browser-supplied destinations;
- the journal includes a semantic idempotency key but persistence-level duplicate rejection is deferred to the server/database layer;
- replaying the same exact input produces the same journal;
- changing the source event, amount, currency, channel, policy version, or attribution changes the semantic intent and must not reuse the same persistence claim;
- posted journal facts are reversed by a future compensating journal, never edited in place.

## Money and currency contract

- `amountMinor` is a non-negative JavaScript safe integer;
- `currency` is exactly three ASCII letters and is normalized to uppercase;
- zero-value journals are valid and reconcile to zero;
- the domain core does not assume every currency has two decimal places;
- exponent lookup and provider-specific currency rules remain outside this slice.

## Error contract

Validation fails closed with stable codes:

- `VVIP_INVALID_MONEY`
- `VVIP_INVALID_CURRENCY`
- `VVIP_INVALID_TRANSACTION_KEY`
- `VVIP_INVALID_SALE_CHANNEL`
- `VVIP_INVALID_ATTRIBUTION_EVIDENCE`
- `VVIP_INVALID_ATTRIBUTION_TIME`
- `VVIP_INVALID_JOURNAL`
- `VVIP_DISTRIBUTION_RECONCILIATION_FAILED`

## Historical compatibility

- V1 policy files and owner decisions remain historical evidence.
- The active runtime policy module is upgraded to V2 for new sales.
- Retired roles `SECONDARY_MARKETER`, `SUPERVISOR`, and `AREA_MANAGER` remain prohibited.
- No V1 transaction is recalculated under V2.
- A future persistence migration must store `policyVersion` on every attribution and journal so V1/V2 historical reads remain unambiguous.

## Security and privacy boundaries

- browser claims are not financial authority;
- no raw card, phone, device fingerprint, IP, or provider secret enters the journal;
- attribution evidence is a trusted normalized projection, not raw tracking telemetry;
- fixed beneficiary accounts cannot be replaced through transaction input;
- unknown recipients, channels, evidence types, and extra authority-like fields are rejected or omitted through allowlisted construction;
- this slice performs no outbound provider call.

## Implementation files

- Modify `scripts/finance/vvip-commission-policy.js` — active V2 policies and exact allocator.
- Create `scripts/finance/vvip-attribution-policy.js` — V2.1 evidence validation and deterministic resolution.
- Create `scripts/finance/vvip-distribution-journal.js` — V2.2 immutable balanced journal construction.
- Modify `tests/vvip-commission-policy.test.cjs` — V2 policy and exact allocation contracts.
- Create `tests/vvip-attribution-policy.test.cjs` — priority, expiry, review, and direct-sale contracts.
- Create `tests/vvip-distribution-journal.test.cjs` — balance, beneficiary, replay, and fail-closed contracts.
- Create `project-control/commission-policy/v2/owner-decision.json` — machine-readable owner decision.
- Update `docs/MASTER_PROJECT_STATE.md` — active execution cursor and V2 policy truth.

## Acceptance criteria

1. Both channel policies total exactly 10,000 basis points.
2. Allocations reconcile for zero, small, large, and remainder-producing amounts.
3. The same input produces byte-equivalent allocation/journal values.
4. No direct journal contains marketer or sector-manager commission.
5. Every referred journal contains the locked marketer and manager assignment references.
6. Attribution priority and 7/30/60-day windows are enforced at exact boundaries.
7. Risk-only evidence cannot award commission.
8. Fraud review cannot silently become a direct sale.
9. Retired recipients cannot appear in any V2 policy or new journal.
10. Focused tests, smoke checks, and the full repository quality gate pass on the exact branch state before completion is claimed.

## Explicitly deferred scope

- Production database tables, RLS, migrations, and apply actions;
- payment-provider webhooks or network adapters;
- ad-impression revenue-recognition input generation;
- persisted idempotency claims and transactional outbox;
- referral-passport issuance/storage;
- customer-service score calculation and monthly payout batching;
- real wallets, payouts, settlement, reconciliation, notifications, and leaderboards;
- Production deployment or real-money activation.
