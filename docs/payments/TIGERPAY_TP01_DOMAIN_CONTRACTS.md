# TigerPay TP-01 — Canonical Domain Contracts

Status: **IMPLEMENTED + AUTOMATED GREEN**
Date: **2026-08-07**
Project: **VVIP TIGER (`vviptiger`)**
Parent: **TP-00 Constitution & Boundary Freeze**
Runtime class: **DEPENDENCY-FREE PURE DOMAIN CONTRACTS**
Live financial effect: **NONE**

---

## 1. Purpose

TP-01 converts the approved TigerPay Vault 3.0 financial vocabulary into deterministic, dependency-free JavaScript contracts that later milestones can consume without collapsing payment, payout, settlement, accounting, authorization, audit, or AI into one state model.

The implementation lives at:

```text
scripts/payments/tigerpay-domain-contracts.js
```

The executable contract tests live at:

```text
tests/tigerpay-domain-contracts.test.cjs
tests/tigerpay-provider-timestamp-contract.test.cjs
```

TP-01 performs no network request, no provider signature verification, no database access, no SQL migration, no authentication, no payout execution, and no live payment operation.

---

## 2. Public Contract Surface

The module exports exactly the TP-01 domain surface below:

```text
PAYMENT_STATES
PAYOUT_STATES
TREASURY_DESTINATION_STATES
BUSINESS_CONTINUITY_MODES
FINANCIAL_DATA_CLASSES
TIGERPAY_ACTION_DECISIONS
createMoney
createTigerPayId
createIdempotencyKey
normalizeProviderEvent
isKnownPaymentState
isKnownPayoutState
```

Canonical collections are frozen. Returned money values and normalized provider events are frozen.

---

## 3. Canonical Payment States

```text
CREATED
PROVIDER_SESSION_CREATED
CUSTOMER_ACTION_REQUIRED
PROVIDER_PENDING
PAYMENT_CONFIRMED
ACCOUNTING_PENDING
ACCOUNTED
SETTLEMENT_PENDING
SETTLED
RECONCILED
FAILED
EXPIRED
CANCELLED
PARTIALLY_REFUNDED
REFUNDED
CHARGEBACK_OPEN
CHARGEBACK_WON
CHARGEBACK_LOST
RECONCILIATION_EXCEPTION
```

These are **payment lifecycle facts**. Their presence does not grant owner authorization, capability issuance, payout authority, or accounting mutation authority.

TP-01 checks whether a value belongs to this catalog but does not implement allowed state-transition edges. Transition authorization is deferred.

---

## 4. Canonical Payout States

```text
DRAFT
POLICY_CHECK
BENEFICIARY_VALIDATION
RISK_ASSESSMENT
ACTION_ESCROW
PENDING_OWNER_APPROVAL
OWNER_APPROVED
CAPABILITY_ISSUED
SUBMISSION_CLAIMED
SUBMITTED_TO_PROVIDER
PROVIDER_ACCEPTED
SETTLEMENT_PENDING
PAID
ACCOUNTED
RECONCILED
REJECTED
EXPIRED
REVOKED
PROVIDER_REJECTED
FAILED_RETRYABLE
FAILED_FINAL
RETURN_PENDING
RETURNED
COMPENSATING
COMPENSATED
EMERGENCY_FROZEN
```

Important semantic boundary:

```text
OWNER_APPROVED != CAPABILITY_ISSUED
CAPABILITY_ISSUED != SUBMITTED_TO_PROVIDER
SUBMITTED_TO_PROVIDER != PROVIDER_ACCEPTED
PROVIDER_ACCEPTED != PAID
PAID != RECONCILED
```

TP-01 defines these names only. It does not issue approval, capability, execution authority, or provider commands.

---

## 5. Treasury Destination States

```text
DRAFT
FORMAT_VALIDATED
BENEFICIARY_VALIDATION_PENDING
BENEFICIARY_VERIFIED
RISK_REVIEW
OWNER_STEP_UP_REQUIRED
COOLING_PERIOD
OWNER_FINAL_CONFIRMATION
ACTIVE
REJECTED
FROZEN
SUPERSEDED
REVOKED
EXPIRED
```

TP-01 does not store IBAN, CliQ aliases, encrypted destination references, beneficiary identity, or treasury secrets. Those belong to later controlled persistence and sovereign-identity milestones.

---

## 6. Business Continuity Modes

```text
NORMAL
DEGRADED_PROVIDER
READ_ONLY_FINANCE
OUTBOUND_FROZEN
COUNTRY_FROZEN
AI_DISABLED
FULL_FINANCIAL_ISOLATION
```

These are canonical mode labels only. TP-01 does not switch runtime mode or execute a kill switch.

---

## 7. Financial Data Classes

```text
F-PUBLIC
F-INTERNAL
F-CONFIDENTIAL
F-RESTRICTED
F-SOVEREIGN
```

The catalog provides a stable classification vocabulary for later access-control, logging, export, AI-context, and masking policies. TP-01 does not itself enforce storage or disclosure policy.

---

## 8. TigerPay Action Decisions

```text
ALLOW_READ
ALLOW_DRAFT
REQUIRE_OWNER_APPROVAL
DENY
```

The decision names intentionally do not contain a generic `ALLOW_EXECUTE`. High-impact financial execution requires later sovereign approval, scoped capability issuance, claim/consumption semantics, and deterministic execution controls.

TP-01 does not calculate policy decisions; it only publishes the canonical vocabulary.

---

## 9. Money Contract

`createMoney()` accepts:

```js
{
  amountMinor: <non-negative safe integer>,
  currency: <exactly three alphabetic characters>
}
```

Example normalized output:

```js
Object.freeze({
  amountMinor: 1250,
  currency: 'JOD'
})
```

Rules:

- money is represented in integer minor units at this contract boundary;
- fractional JavaScript numbers are rejected;
- negative values are rejected;
- unsafe integers are rejected;
- non-number amounts are rejected;
- currency syntax is exactly three alphabetic characters;
- currency output is uppercase;
- output is frozen.

Stable error codes:

```text
TIGERPAY_INVALID_MONEY
TIGERPAY_INVALID_CURRENCY
```

This contract prevents floating-point decimal amounts from silently entering later payment/ledger logic. Currency-specific exponent/scale policy remains a later country/provider/accounting responsibility and is not guessed by TP-01.

---

## 10. Canonical TigerPay ID Contract

`createTigerPayId(kind, rawId)` supports these allowlisted kinds:

```text
payment
payout
refund
chargeback
treasury
approval
capability
journal
settlement
reconciliation
evidence
report
incident
provider-event
```

Canonical format:

```text
tp_<kind>_<raw-id>
```

Hyphens in the kind are converted to underscores, so:

```text
provider-event → tp_provider_event_<raw-id>
```

The raw identifier must match the bounded safe-character contract defined in code. Arbitrary paths or unbounded external identifiers are not accepted as canonical TigerPay IDs.

Stable errors:

```text
TIGERPAY_INVALID_ID_KIND
TIGERPAY_INVALID_RAW_ID
```

---

## 11. Idempotency Contract

`createIdempotencyKey()` constructs deterministic keys in this format:

```text
tp-idem:<normalized-scope>:<intent-id>:<attempt>
```

Example:

```text
tp-idem:payout-submit:tp_payout_abc:1
```

Rules:

- scope is normalized to lowercase then validated against a bounded allow-safe syntax;
- intent ID must use the `tp_` namespace;
- attempt is a safe integer greater than or equal to 1;
- default attempt is 1;
- no random provider data, password, secret, token, card data, or treasury identifier is introduced by the function.

Stable errors:

```text
TIGERPAY_INVALID_IDEMPOTENCY_SCOPE
TIGERPAY_INVALID_INTENT_ID
TIGERPAY_INVALID_IDEMPOTENCY_ATTEMPT
```

TP-01 defines idempotency **syntax**, not persistent deduplication. Atomic claim/storage/replay rejection belongs to later execution/persistence milestones.

---

## 12. Provider Event Normalization Boundary

`normalizeProviderEvent()` converts external provider payment facts into this exact allowlisted projection:

```js
{
  providerId,
  providerEventId,
  providerState,
  canonicalState,
  occurredAt,
  amount,
  providerReference,
}
```

It does not spread arbitrary provider input.

### 12.1 Accepted facts

The contract validates:

- bounded lowercase provider ID,
- bounded printable provider-event ID,
- bounded printable provider state,
- known canonical TigerPay payment state,
- strict ISO-8601 date-time string with an explicit `Z` or numeric timezone offset,
- valid calendar/clock/timezone components,
- timestamp normalization to UTC ISO format,
- optional TigerPay money value,
- optional bounded printable provider reference.

Ambiguous locale-style dates such as `08/07/2026`, date-only strings, and timestamps without an explicit timezone are rejected. This prevents host locale, runtime parser, or deployment timezone from changing the meaning of a provider financial event.

### 12.2 Authority isolation

Even if an external payload contains any of the following, TP-01 does not copy them into the normalized event:

```text
approved
authorized
ownerApproved
capability
executionAllowed
role
ownerRole
permissions
```

This implements a critical TP-00 invariant:

> Provider facts can change payment evidence after future authenticity verification; provider content can never expand TigerPay authority.

### 12.3 What normalization does not prove

A normalized event is **not** proof that:

- the webhook signature is valid,
- the provider event is unique,
- the payment transition is allowed,
- money settled,
- accounting posted,
- the owner approved anything,
- an execution capability exists.

Those proofs are intentionally separate later milestones.

---

## 13. TDD Evidence — Initial RED → GREEN

TP-01 was implemented test-first.

### Initial RED

Production contract module intentionally absent.

```text
HEAD=5832a683813f9cc687a534e6af2e838d2a4baefa
VVIP_QUALITY_GATE_RUN=221
RESULT=FAIL
EXPECTED_CAUSE=MODULE_NOT_FOUND
```

The quality-gate log showed the TigerPay contract tests failing because `scripts/payments/tigerpay-domain-contracts.js` did not yet exist, while the surrounding diff, cleanroom, Python, secret, dangerous-SQL, and smoke gates were not the cause of the RED state.

### Initial GREEN

Minimal contract module added.

```text
HEAD=21257ae081ee15ebdb69e2a2f0c450e78daff3ec
VVIP_QUALITY_GATE_RUN=222
RESULT=PASS
TIGERPAY_BASE_CONTRACT_TESTS=13/13 PASS
NODE_CJS_SUITE=76/76 PASS
SECRET_FINDINGS=0
DANGEROUS_SQL_CRITICAL=0
DANGEROUS_SQL_HIGH=0
QA_SMOKE=PASS
DEPENDENCY_REVIEW_RUN=206 PASS
PROJECT_CONTROL_INTEGRITY_RUN=307 PASS
CODEQL_RUN=217 PASS
```

This proves the feature moved from the intended missing-module failure to the implemented contract behavior without using a live financial provider.

---

## 14. Review Hardening TDD — Strict Provider Timestamp

A final code review identified that JavaScript `Date` parsing can accept locale-dependent strings even though provider-event time is a financial evidence field. TP-01 therefore added a second focused TDD cycle.

### Hardening RED

```text
HEAD=dc7fb1b4860998c3f6438ed58cd8ad90bc829a2d
VVIP_QUALITY_GATE_RUN=225
RESULT=FAIL
EXPECTED_CAUSE=AMBIGUOUS_NON_ISO_TIMESTAMP_WAS_ACCEPTED
BASE_TIGERPAY_CONTRACT_TESTS=13/13 PASS
STRICT_TIMESTAMP_REJECT_TEST=FAIL
STRICT_TIMESTAMP_OFFSET_NORMALIZATION_TEST=PASS
NODE_CJS_SUITE=77/78 PASS
```

The failure was isolated to the new regression expectation that `08/07/2026` must be rejected.

### Hardening GREEN

The parser was changed to require an explicit ISO-8601 date-time and timezone, validate calendar/timezone components, and normalize accepted timestamps to UTC.

```text
HEAD=3371f97a02c973257fc90a66a206a008c6fec9c2
VVIP_QUALITY_GATE_RUN=226
RESULT=PASS
TIGERPAY_BASE_CONTRACT_TESTS=13/13 PASS
STRICT_TIMESTAMP_TESTS=2/2 PASS
TIGERPAY_TOTAL_FOCUSED_TESTS=15/15 PASS
NODE_CJS_SUITE=78/78 PASS
SECRET_FINDINGS=0
DANGEROUS_SQL_CRITICAL=0
DANGEROUS_SQL_HIGH=0
QA_SMOKE=PASS
DEPENDENCY_REVIEW_RUN=210 PASS
PROJECT_CONTROL_INTEGRITY_RUN=311 PASS
```

CodeQL for the documentation-final head is verified separately by the PR's final automated gate record; no completion claim should rely on an in-progress CodeQL run.

---

## 15. Explicitly Deferred Scope

TP-01 does **not** implement any of the following:

```text
payment-state transition authorization
payout-state transition authorization
owner authentication / WebAuthn
TFAL enforcement
sovereign approval verification or consumption
provider webhook signature verification
provider event replay storage
provider network adapters
bank / PSP / CliQ execution
accounting journal posting
settlement reconciliation
Action Escrow persistence
capability issuance / claiming / consumption
SQL schema or migrations
treasury-destination persistence
IBAN / CliQ storage
live dashboard data
partner financial projection
report signing / QR verification
kill-switch runtime
voice execution
AI financial execution
```

These are later TigerPay milestones and must not be inferred as complete from TP-01.

---

## 16. TP-01 Completion Statement

```text
TP01_CANONICAL_CONTRACTS=IMPLEMENTED
TP01_TDD=RED_TO_GREEN_PROVEN
TP01_TIMESTAMP_HARDENING=RED_TO_GREEN_PROVEN
TP01_LIVE_PROVIDER=NONE
TP01_NETWORK_EXECUTION=NONE
TP01_PRODUCTION_SQL=NONE
TP01_PRODUCTION_CREDENTIALS=NONE
TP01_MONEY_MOVEMENT=NONE
TP01_OWNER_APPROVAL_EXECUTION=NONE
TP01_UI_CHANGE=NONE
```

TP-01 is a safe, deterministic contract foundation for the next TigerPay milestone. It does not authorize production finance.
