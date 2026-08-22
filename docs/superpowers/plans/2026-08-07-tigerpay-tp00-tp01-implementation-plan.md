# TigerPay TP-00 + TP-01 Implementation Plan

> **CURRENT AUTHORITY — SUPERSEDED by Issue #312 for advertised-goods/services commerce:** this 2026-08-07 implementation plan is retained as historical design evidence only where it describes customer/provider, marketplace, order/listing, user-to-user, user-to-provider, brokerage, escrow, payout, or settlement flows for third-party goods/services. It MUST NOT authorize those flows. Current TigerPay money scope is limited to **platform-owned advertising and platform-owned services**. For advertised third-party goods/services the authoritative path is **DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**; negotiation, agreement, delivery, sale, payment, settlement, and completion occur outside TIGER.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze TigerPay's permanent financial constitution and expose deterministic, testable domain contracts for canonical financial states, money values, identifiers, idempotency, and provider-event normalization without any live provider or production financial execution.

**Architecture:** TP-00 is documentation/policy only and produces the immutable domain boundary consumed by later TigerPay slices. TP-01 adds a small dependency-free CommonJS contract module plus Node tests, following the repository's plain JavaScript/static-app conventions; it contains no network calls, credentials, persistence, SQL, UI, provider SDK, or production executor.

**Tech Stack:** Markdown, plain JavaScript (CommonJS for Node contract tests), Node.js built-in `node:test` and `node:assert/strict`, existing repository shell/CI gates.

## Global Constraints

- `MONEY ≠ SETTLEMENT ≠ ACCOUNTING ≠ AUTHORIZATION ≠ AUDIT ≠ AI`.
- No AI money movement.
- No AI treasury-destination mutation.
- No AI owner-permission mutation.
- No partner write access to treasury or settlement controls.
- No client-side L4 authorization.
- No raw card PAN/CVV storage or handling in the TigerPay contract module.
- No production provider, bank, PSP, CliQ, webhook endpoint, credential, SQL migration, or production mutation in TP-00/TP-01.
- Financial mutations require idempotency/replay protection in future execution slices; TP-01 defines the canonical idempotency contract only.
- Provider callbacks/events may request canonical transitions later but never gain authorization authority through normalization.
- Historical accounting entries are never edited in place in later slices; TP-01 must not blur accounting state with payment/provider state.
- Repository remains plain HTML/CSS/JavaScript; do not introduce a framework, bundler, or package-based build step.
- PR work remains isolated from `main`; merge/production action requires later explicit owner approval and applicable security gates.

---

## File Structure

- `docs/payments/TIGERPAY_TP00_CONSTITUTION.md` — normative TP-00 boundary, terminology, permanent denies, custody/provider boundary, and P18 migration map.
- `scripts/payments/tigerpay-domain-contracts.js` — dependency-free canonical TP-01 constants and pure validators/normalizers.
- `tests/tigerpay-domain-contracts.test.cjs` — focused TDD contract tests for every exported TP-01 behavior.
- `docs/payments/TIGERPAY_TP01_DOMAIN_CONTRACTS.md` — human-readable contract reference that maps exported code contracts back to the master architecture.

### Task 1: TP-00 Constitution & Boundary Freeze

**Files:**
- Create: `docs/payments/TIGERPAY_TP00_CONSTITUTION.md`

**Interfaces:**
- Consumes: approved TigerPay Vault 3.0 master spec and legacy `docs/owner-control/P18_PAYMENT_GATEWAY.md`.
- Produces: normative terminology and deny/boundary contract consumed by TP-01 and all later TP slices.

- [ ] **Step 1: Write the TP-00 constitution**

The document must explicitly freeze:

```text
OWNER_VIP_TIGER = trusted server-side authorization result, never a browser role string
PAYMENT = customer/provider economic payment lifecycle
PAYOUT = outbound platform-controlled disbursement lifecycle
SETTLEMENT = provider/bank realization of expected money movement
ACCOUNTING = independent double-entry financial truth
EVIDENCE = reconstructable proof of actor/policy/result
AUTHORIZATION = deterministic permission decision
AI = read/analyze/recommend only for financial domain
```

It must enumerate the permanent deny rules from the master spec and state that TP-00 creates no runtime behavior.

- [ ] **Step 2: Add provider/custody boundary**

Freeze the initial model:

```text
TigerPay = orchestration + governance + accounting/settlement/evidence control
Licensed bank/PSP/acquirer = payment rail / actual regulated money movement
TigerPay initial runtime != unlicensed wallet/custodian/bank/money-transfer operator
```

- [ ] **Step 3: Add P18 migration mapping**

Map legacy `P18 — Payment Gateway` to TigerPay milestones while preserving P18 as historical evidence and without marking it implemented.

- [ ] **Step 4: Static review**

Verify the TP-00 document contains no `TODO`, `TBD`, live credential, live endpoint, SQL apply instruction, or claim that production payments are enabled.

- [ ] **Step 5: Commit**

```bash
git add docs/payments/TIGERPAY_TP00_CONSTITUTION.md
git commit -m "docs(tigerpay): freeze TP-00 financial constitution"
```

### Task 2: TP-01 Failing Domain Contract Tests

**Files:**
- Create: `tests/tigerpay-domain-contracts.test.cjs`
- Create later in Task 3: `scripts/payments/tigerpay-domain-contracts.js`

**Interfaces:**
- Consumes: TP-00 terminology and master-spec canonical states.
- Produces test contract for exports defined in Task 3.

- [ ] **Step 1: Write failing tests**

Tests must require the following exact exports:

```js
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

Required assertions:

```js
createMoney({ amountMinor: 1250, currency: 'jod' })
// => frozen { amountMinor: 1250, currency: 'JOD' }

createMoney({ amountMinor: 12.5, currency: 'JOD' })
// throws TIGERPAY_INVALID_MONEY

createMoney({ amountMinor: 100, currency: 'JO' })
// throws TIGERPAY_INVALID_CURRENCY

createTigerPayId('payment', '01HZX7K1')
// => 'tp_payment_01HZX7K1'

createTigerPayId('unknown', '01HZX7K1')
// throws TIGERPAY_INVALID_ID_KIND

createIdempotencyKey({ scope: 'payout-submit', intentId: 'tp_payout_abc', attempt: 1 })
// deterministic, lower-case scope, no secret/random provider data

normalizeProviderEvent({
  providerId: 'sandbox-a',
  providerEventId: 'evt_123',
  providerState: 'paid',
  canonicalState: 'PAYMENT_CONFIRMED',
  occurredAt: '2026-08-07T09:00:00.000Z',
  amount: { amountMinor: 1000, currency: 'JOD' },
})
// => frozen normalized event with canonical state + money and no authorization field
```

Tests must also assert:

- all master-spec inbound payment states are represented;
- all master-spec outbound payout states are represented;
- all treasury destination states are represented;
- normalized provider events reject unknown canonical payment states;
- normalized provider events reject missing provider event IDs;
- provider event normalization never returns `approved`, `authorized`, `ownerApproved`, `capability`, or `executionAllowed` fields;
- state arrays/objects are frozen.

- [ ] **Step 2: Run focused test and record RED**

Run:

```bash
node --test tests/tigerpay-domain-contracts.test.cjs
```

Expected: FAIL because `scripts/payments/tigerpay-domain-contracts.js` does not exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/tigerpay-domain-contracts.test.cjs
git commit -m "test(tigerpay): define TP-01 domain contract expectations"
```

### Task 3: TP-01 Minimal Domain Contract Implementation

**Files:**
- Create: `scripts/payments/tigerpay-domain-contracts.js`
- Test: `tests/tigerpay-domain-contracts.test.cjs`

**Interfaces:**
- Produces:

```js
createMoney({ amountMinor: number, currency: string }) -> Readonly<{amountMinor:number,currency:string}>
createTigerPayId(kind: string, rawId: string) -> string
createIdempotencyKey({ scope: string, intentId: string, attempt?: number }) -> string
normalizeProviderEvent(input) -> Readonly<NormalizedProviderEvent>
isKnownPaymentState(state: string) -> boolean
isKnownPayoutState(state: string) -> boolean
```

`NormalizedProviderEvent` exact public fields:

```js
{
  providerId: string,
  providerEventId: string,
  providerState: string,
  canonicalState: string,
  occurredAt: string,
  amount: Readonly<{ amountMinor: number, currency: string }> | null,
  providerReference: string | null,
}
```

- [ ] **Step 1: Implement canonical frozen states**

Payment states:

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

Payout states:

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

Treasury destination states:

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

Business continuity modes:

```text
NORMAL
DEGRADED_PROVIDER
READ_ONLY_FINANCE
OUTBOUND_FROZEN
COUNTRY_FROZEN
AI_DISABLED
FULL_FINANCIAL_ISOLATION
```

Data classes:

```text
F-PUBLIC
F-INTERNAL
F-CONFIDENTIAL
F-RESTRICTED
F-SOVEREIGN
```

Action decisions:

```text
ALLOW_READ
ALLOW_DRAFT
REQUIRE_OWNER_APPROVAL
DENY
```

- [ ] **Step 2: Implement exact money validation**

Rules:

```text
amountMinor must be Number.isSafeInteger(amountMinor)
amountMinor must be >= 0
currency must match /^[A-Za-z]{3}$/
currency output is uppercase
return Object.freeze(...)
error.code = TIGERPAY_INVALID_MONEY or TIGERPAY_INVALID_CURRENCY
```

- [ ] **Step 3: Implement IDs and idempotency keys**

Allowed ID kinds:

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

ID rule:

```text
tp_<kind-with-dashes-converted-to-underscores>_<rawId>
```

`rawId` must match `/^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/`.

Idempotency format:

```text
tp-idem:<normalized-scope>:<intentId>:<attempt>
```

where `scope` matches `/^[a-z0-9][a-z0-9-]{2,63}$/`, `intentId` starts with `tp_`, and `attempt` is a safe integer >= 1 (default 1).

- [ ] **Step 4: Implement provider event normalization**

Validation rules:

```text
providerId: /^[a-z0-9][a-z0-9-]{1,63}$/
providerEventId: non-empty printable string <= 160 chars
providerState: non-empty printable string <= 120 chars
canonicalState: must be a known PAYMENT_STATES member in TP-01
occurredAt: valid ISO timestamp normalized with new Date(value).toISOString()
amount: null/undefined or createMoney-compatible object
providerReference: null/undefined or printable string <= 160 chars
```

The function constructs a fresh allowlisted output object; it does not spread arbitrary input, which prevents authority-like provider fields from crossing the boundary.

- [ ] **Step 5: Run focused test and record GREEN**

Run:

```bash
node --test tests/tigerpay-domain-contracts.test.cjs
```

Expected: PASS, 0 failures.

- [ ] **Step 6: Commit implementation**

```bash
git add scripts/payments/tigerpay-domain-contracts.js tests/tigerpay-domain-contracts.test.cjs
git commit -m "feat(tigerpay): add TP-01 domain contracts"
```

### Task 4: TP-01 Contract Reference & Verification

**Files:**
- Create: `docs/payments/TIGERPAY_TP01_DOMAIN_CONTRACTS.md`
- Verify: `scripts/payments/tigerpay-domain-contracts.js`
- Verify: `tests/tigerpay-domain-contracts.test.cjs`

**Interfaces:**
- Consumes: implemented TP-01 module.
- Produces: reviewer-facing mapping of code exports to TigerPay master-spec terminology and explicit deferred scope.

- [ ] **Step 1: Document contracts and deferred scope**

The document must state that TP-01 defines syntax/normalization only and explicitly does **not** implement:

```text
payment-state transition authorization
payout-state transition authorization
owner authentication/WebAuthn
TFAL enforcement
provider webhook signature verification
provider network adapters
accounting posting
settlement reconciliation
capability issuance/consumption
SQL schema/migrations
live dashboard data
```

- [ ] **Step 2: Run focused tests**

```bash
node --test tests/tigerpay-domain-contracts.test.cjs
```

Expected: PASS.

- [ ] **Step 3: Run repository smoke/quality checks**

```bash
./scripts/qa-smoke.sh
```

Expected: existing repository smoke checks pass; no live provider call is emitted.

- [ ] **Step 4: Diff safety review**

Expected changed scope for TP-00/TP-01 execution branch:

```text
docs/payments/TIGERPAY_TP00_CONSTITUTION.md
docs/payments/TIGERPAY_TP01_DOMAIN_CONTRACTS.md
docs/superpowers/plans/2026-08-07-tigerpay-tp00-tp01-implementation-plan.md
scripts/payments/tigerpay-domain-contracts.js
tests/tigerpay-domain-contracts.test.cjs
```

No `.env*`, SQL, HTML, CSS, service worker, auth runtime, production config, or provider credential file is allowed in the diff.

- [ ] **Step 5: Final commit**

```bash
git add docs/payments/TIGERPAY_TP01_DOMAIN_CONTRACTS.md
git commit -m "docs(tigerpay): document TP-01 domain contracts"
```

## Plan Self-Review

- Spec coverage for TP-00: master spec reference, terminology, permanent denies, provider/custody boundary, P18 migration mapping — covered by Task 1.
- Spec coverage for TP-01: canonical states/contracts, amount/currency types, IDs/idempotency rules, provider-event normalization — covered by Tasks 2–4.
- Explicitly deferred TP-02+ behavior remains outside this plan.
- No placeholders (`TODO`, `TBD`) are permitted in deliverables.
- Naming/types are locked in Task 2 and repeated exactly in Task 3.
- No production financial effect exists in this plan.
