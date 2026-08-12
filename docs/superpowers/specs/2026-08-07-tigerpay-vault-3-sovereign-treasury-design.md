# TigerPay Vault 3.0 — Sovereign Treasury & Trust Fabric

Status: **APPROVED DESIGN BASELINE — IMPLEMENTATION GATED**
Date: **2026-08-07**
Project: **VVIP TIGER (`vviptiger`)**
Branch: **`feat/tigerpay-v3-sovereign-spec-20260807`**
Owner authority label: **`OWNER_VIP_TIGER`**

---

## 1. Executive Definition

TigerPay Vault 3.0 is not a payment button, wallet imitation, or cosmetic financial dashboard. It is the financial operating, treasury-control, settlement, accounting, evidence, risk, and transparency fabric for VVIP TIGER.

The architecture separates six concepts that MUST NOT be collapsed into one component:

```text
MONEY ≠ SETTLEMENT ≠ ACCOUNTING ≠ AUTHORIZATION ≠ AUDIT ≠ AI
```

The core operating principle is:

> Funds may move only through an approved payment rail; authority may be granted only by deterministic server-side policy; every material financial consequence must be reconstructable from immutable evidence.

TigerPay begins as an orchestration and governance layer over licensed banks/payment-service providers and is designed so that VVIP TIGER does not unintentionally become an unlicensed custodian, issuer, bank, or money-transfer operator.

---

## 2. Relationship to Existing P18

The existing repository artifact `docs/owner-control/P18_PAYMENT_GATEWAY.md` records a repository-level design-and-review package with no production execution. It contains no production payment runtime, treasury ledger, settlement engine, sovereign approval verifier, or immutable financial evidence system.

TigerPay Vault 3.0 therefore **supersedes the architectural intent of P18** while preserving its safety boundary:

- no ad hoc payment changes,
- no direct production mutation during design closure,
- no secret values in tracked browser code,
- no SQL apply during architecture freeze,
- no production payment execution until explicit implementation gates pass.

The legacy phase identifier `P18 — Payment Gateway` may remain for roadmap compatibility, but its implementation contract becomes TigerPay Vault 3.0.

No legacy P18 artifact is to be deleted merely because this document exists. Historical evidence remains historical evidence.

---

## 3. Scope

### 3.1 In Scope

TigerPay Vault 3.0 governs:

1. owner sovereign financial identity,
2. payment-provider orchestration,
3. inbound payment lifecycle,
4. outbound payout lifecycle,
5. refunds and chargebacks,
6. treasury destinations,
7. double-entry accounting,
8. provider settlement reconciliation,
9. immutable evidence and signed reports,
10. partner financial transparency,
11. fraud/risk controls,
12. kill switches and incident isolation,
13. owner recovery ceremony,
14. voice/AI read and analysis surfaces,
15. country-by-country payment activation,
16. TigerPay Sovereign Command Center dashboard,
17. BLACKBOX integration for financial AI and L4 actions.

### 3.2 Explicitly Out of Scope for Initial Runtime

The first production version MUST NOT:

- store raw card PAN or CVV in VVIP TIGER,
- create an unlicensed stored-value wallet,
- pool or custody customer funds outside approved financial-provider arrangements,
- allow AI to move money,
- allow browser JavaScript to approve L4 financial actions,
- allow a partner to change treasury settings,
- allow silent camera activation for suspected users,
- use IP geolocation as proof of human identity,
- allow production transfers through personal or undocumented banking automation,
- execute direct autonomous production database migrations,
- treat a QR code alone as cryptographic proof,
- treat SHA-256 alone as a digital signature.

---

## 4. Non-Negotiable Constitutional Rules

The following rules are permanent system invariants unless superseded by a formally approved architecture decision and legal/security review:

1. **No AI money movement.**
2. **No AI treasury-destination mutation.**
3. **No AI owner-permission mutation.**
4. **No partner write access to treasury or settlement controls.**
5. **No client-side L4 authorization.**
6. **No raw card secret storage in TIGER browser/runtime.**
7. **No financial mutation without idempotency and replay protection.**
8. **No L2/L3 financial write without deterministic rollback or compensating action.**
9. **No L4 execution without trusted owner authorization.**
10. **No new country payment activation without a certified Country Payment Package.**
11. **No provider callback may be trusted solely because the payload says it is successful.** Provider authenticity and event uniqueness must be verified.
12. **No historical accounting entry is edited in place.** Corrections use reversing/adjusting entries.
13. **No immutable evidence row is updated or deleted by the ordinary application role.**
14. **No financial incident recovery may expand privileges.**
15. **Freeze is intentionally easier than unfreeze.**
16. **Core marketplace functionality must degrade safely if TigerPay AI is unavailable.**
17. **A payment provider failure must not corrupt accounting state.**
18. **A dashboard failure must not authorize or execute money movement.**

---

## 5. High-Level Architecture

```text
                         VVIP TIGER
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     User / Merchant Flow              Owner / Partner Flow
            │                                 │
            ▼                                 ▼
    Payment Orchestration              Sovereign Access Gate
            │                                 │
      Licensed PSP/Bank                Identity + Step-Up
            │                                 │
            ├───────────────┐           Policy Kernel
            │               │                 │
            ▼               ▼                 ▼
     Provider Events   Settlement Feed    Action Escrow
            │               │                 │
            └───────┬───────┘                 │
                    ▼                         ▼
             Financial Event Bus       Capability Broker
                    │                         │
       ┌────────────┼────────────┐            ▼
       ▼            ▼            ▼      Provider Executor
 Accounting     Settlement     Evidence       │
  Ledger          Ledger        Ledger        │
       │            │            │            │
       └────────────┼────────────┴─────┬──────┘
                    ▼                  ▼
            Reconciliation        Verification
                    │                  │
                    ├─────► Risk & Monitoring
                    ├─────► Partner Transparency
                    └─────► Sovereign Command Center

 BLACKBOX overlays Identity, Policy, AI, Approval, Evidence, Risk and Audit.
```

---

## 6. The Ten Architectural Planes

### 6.1 Plane A — Sovereign Identity & Access

Purpose: prove who is requesting a sensitive financial action and at what authentication assurance level.

Required concepts:

- owner identity is resolved server-side,
- partner identity is independent from owner authority,
- staff/service identities are distinct,
- session risk and authentication age are tracked,
- high-risk actions trigger step-up authentication,
- credential registration and revocation are audited,
- lost-device recovery is not the same operation as normal authentication.

`OWNER_VIP_TIGER` is a trusted application authorization result, not a browser role string.

### 6.2 Plane B — Treasury Control

Purpose: define approved destinations to which platform-controlled outbound funds may be routed.

Treasury destinations include:

- bank IBAN,
- approved CliQ addressing data where supported through provider/acquirer integration,
- provider settlement account identifiers,
- future country-specific payout destinations.

No arbitrary destination may be entered and immediately activated.

### 6.3 Plane C — Payment Orchestration

Purpose: route inbound customer payments to licensed/accredited providers using hosted/tokenized patterns.

Responsibilities:

- create payment intents,
- select provider under approved routing policy,
- attach order/listing/subscription context,
- validate amount/currency/country,
- persist provider reference safely,
- verify callbacks/webhooks,
- enforce duplicate-event protection,
- normalize provider-specific states into TigerPay canonical states.

### 6.4 Plane D — Payout & Disbursement Control

Purpose: prepare and execute outbound approved payments without allowing browser or AI authority to directly transfer funds.

Responsibilities:

- beneficiary verification,
- payout request validation,
- owner approval requirements,
- risk scoring,
- Action Escrow,
- capability issuance,
- idempotent provider submission,
- settlement confirmation,
- reconciliation,
- compensation/return workflows.

### 6.5 Plane E — Accounting

Purpose: maintain a double-entry financial truth independent of payment-provider UI state.

Core characteristics:

- every journal is balanced,
- amount stored in minor units or exact decimal representation,
- currency is explicit on every financial amount,
- immutable posted journal entries,
- corrections use reversal and replacement,
- revenue recognition is distinct from payment collection,
- liabilities remain liabilities until earned/paid according to accounting policy,
- provider fees are separate entries rather than silently netted.

### 6.6 Plane F — Settlement & Reconciliation

Purpose: reconcile TigerPay expectations against bank/PSP settlement reality.

Responsibilities:

- provider receivable tracking,
- settlement batches,
- fees,
- net/gross matching,
- delayed settlement,
- partial settlement,
- missing transaction detection,
- duplicate provider events,
- refund/chargeback impact,
- bank/PSP statement import through controlled adapters,
- mismatch escalation.

### 6.7 Plane G — Evidence & Cryptographic Trust

Purpose: prove who did what, to which object, under which policy, with what result.

Responsibilities:

- Action Passports,
- approval receipts,
- provider callback evidence,
- reconciliation evidence,
- report signatures,
- ledger integrity checkpoints,
- signed export verification.

### 6.8 Plane H — Risk, Fraud & Incident Isolation

Purpose: detect abnormal activity and reduce loss without delegating sovereign authority to AI.

Responsibilities:

- deterministic rules,
- velocity controls,
- device/session risk,
- country mismatch,
- suspicious payout patterns,
- refund abuse,
- beneficiary changes,
- abnormal destination churn,
- provider anomaly detection,
- risk escalation,
- auto-freeze where policy permits,
- manual unfreeze under stronger controls.

### 6.9 Plane I — Partner Transparency

Purpose: provide shareholders/partners with verifiable financial visibility without treasury authority.

Partner view is strictly read-only and masks sensitive identifiers.

### 6.10 Plane J — Command, Observability & AI

Purpose: provide the Sovereign Command Center, operational alerts, reports, voice read-queries, financial AI analysis, and BLACKBOX-controlled recommendations.

---

## 7. Sovereign Authentication Model

### 7.1 Authentication Components

Sensitive financial administration SHOULD use phishing-resistant public-key authentication.

Approved target pattern:

```text
Trusted Owner Session
      │
      ├── Platform WebAuthn / Passkey
      ├── Hardware Security Key for high-risk operations
      ├── session risk evaluation
      └── step-up freshness requirement
```

Biometric activation such as FaceID is performed locally by the device/authenticator. TigerPay does not require collection of raw facial images for ordinary authentication.

### 7.2 Financial Assurance Classes

- `FAL0_VIEW`: basic owner/partner read access after normal authenticated session.
- `FAL1_SENSITIVE_READ`: step-up for unmasked financial details or sensitive exports.
- `FAL2_CONFIG_CHANGE`: phishing-resistant step-up for treasury/configuration proposals.
- `FAL3_MONEY_AUTHORIZATION`: strongest owner ceremony for high-value/irreversible payout or unfreeze.

These Financial Assurance Levels are TigerPay application levels and are not claims of external certification.

### 7.3 Step-Up Freshness

Sensitive approval must include an authentication timestamp and maximum age. An old owner session cannot silently approve a new L4 action.

---

## 8. Treasury Destination Model

Canonical state machine:

```text
DRAFT
  ↓
FORMAT_VALIDATED
  ↓
BENEFICIARY_VALIDATION_PENDING
  ↓
BENEFICIARY_VERIFIED
  ↓
RISK_REVIEW
  ↓
OWNER_STEP_UP_REQUIRED
  ↓
COOLING_PERIOD
  ↓
OWNER_FINAL_CONFIRMATION
  ↓
ACTIVE
```

Alternative terminal/interruption states:

```text
REJECTED
FROZEN
SUPERSEDED
REVOKED
EXPIRED
```

Required fields include:

- `destination_id`
- `destination_type`
- `country_code`
- `currency`
- `provider_id`
- `masked_identifier`
- `encrypted_identifier_ref`
- `beneficiary_name_normalized`
- `beneficiary_verification_status`
- `verification_source`
- `version`
- `previous_version_id`
- `risk_score`
- `risk_reasons`
- `cooling_period_started_at`
- `cooling_period_ends_at`
- `activation_approval_id`
- `status`
- `created_at`
- `activated_at`
- `revoked_at`

Raw IBAN/CliQ destination values MUST NOT be written to logs, analytics events, browser telemetry, or partner reports.

---

## 9. Cooling Period Policy

A treasury destination change is a high-risk event.

Default behavior:

1. owner proposes destination,
2. format and provider validation run,
3. beneficiary is verified where the rail/provider supports it,
4. destination enters cooling period,
5. all current owner security channels receive notification,
6. old destination remains unchanged until final activation,
7. owner performs fresh FAL2/FAL3 step-up after the cooling period,
8. destination becomes active only after final confirmation.

Emergency policy may extend the cooling period automatically when risk is elevated.

No code path may shorten the cooling period solely because AI says the change is safe.

---

## 10. Payment Provider Boundary

TigerPay must integrate through documented bank/PSP/merchant-acquirer channels.

### 10.1 Hosted/Tokenized Checkout

Preferred card architecture:

```text
TIGER Order
   ↓
TigerPay Payment Intent
   ↓
Hosted PSP Checkout / Provider Tokenization
   ↓
Provider Authentication / Card Processing
   ↓
Signed Provider Callback
   ↓
TigerPay Verification
   ↓
Canonical Payment Event
```

TigerPay stores provider references and transaction metadata, not raw card secrets.

### 10.2 CliQ Jordan Boundary

For Jordan:

- CliQ is treated as a local payment rail/provider capability, not a hard-coded browser transfer function.
- Merchant acceptance/integration must use the supported bank/merchant-acquirer path.
- The country package must encode the rail's supported currency and provider limits.
- Beneficiary confirmation must be used when the selected provider exposes it.
- Limits are provider/rail policy data and may not be hard-coded as permanent global constants.

---

## 11. Canonical Inbound Payment State Machine

```text
CREATED
  ↓
PROVIDER_SESSION_CREATED
  ↓
CUSTOMER_ACTION_REQUIRED
  ↓
PROVIDER_PENDING
  ↓
PAYMENT_CONFIRMED
  ↓
ACCOUNTING_PENDING
  ↓
ACCOUNTED
  ↓
SETTLEMENT_PENDING
  ↓
SETTLED
  ↓
RECONCILED
```

Allowed terminal/branch states:

- `FAILED`
- `EXPIRED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `CHARGEBACK_OPEN`
- `CHARGEBACK_WON`
- `CHARGEBACK_LOST`
- `RECONCILIATION_EXCEPTION`

State transitions are validated server-side.

Provider webhooks may request a transition but cannot write arbitrary final states directly.

---

## 12. Canonical Outbound Payout State Machine

```text
DRAFT
  ↓
POLICY_CHECK
  ↓
BENEFICIARY_VALIDATION
  ↓
RISK_ASSESSMENT
  ↓
ACTION_ESCROW
  ↓
PENDING_OWNER_APPROVAL
  ↓
OWNER_APPROVED
  ↓
CAPABILITY_ISSUED
  ↓
SUBMISSION_CLAIMED
  ↓
SUBMITTED_TO_PROVIDER
  ↓
PROVIDER_ACCEPTED
  ↓
SETTLEMENT_PENDING
  ↓
PAID
  ↓
ACCOUNTED
  ↓
RECONCILED
```

Failure/interruption states:

- `REJECTED`
- `EXPIRED`
- `REVOKED`
- `PROVIDER_REJECTED`
- `FAILED_RETRYABLE`
- `FAILED_FINAL`
- `RETURN_PENDING`
- `RETURNED`
- `COMPENSATING`
- `COMPENSATED`
- `EMERGENCY_FROZEN`

No payout may be represented as paid merely because an API request returned HTTP 200. Provider result and settlement evidence are separate facts.

---

## 13. Action Escrow for Financial L4

Each high-impact action enters an escrow record containing:

- `escrow_id`
- action type
- actor
- requested beneficiary/destination
- amount/currency
- before state
- proposed state
- semantic diff
- affected accounts
- provider
- country
- policy version
- risk class
- risk score/reasons
- simulation result if applicable
- idempotency key
- expiration
- rollback/compensation plan
- approval requirements
- canonical action digest

A changed amount, destination, provider, currency, policy version, beneficiary, country, or payload digest invalidates the existing approval.

---

## 14. Short-Lived Financial Capability Lease

A valid human approval does not call the provider directly.

Flow:

```text
APPROVAL
   ↓
BLACKBOX/POLICY VERIFICATION
   ↓
SHORT-LIVED CAPABILITY
   ↓
EXECUTION CLAIM
   ↓
PROVIDER ADAPTER
```

Financial capability fields:

- capability ID
- approval ID
- action digest
- owner identity
- beneficiary/destination digest
- maximum amount
- exact currency
- provider ID
- country
- allowed operation
- not-before time
- expiry
- maximum execution count = 1
- idempotency key
- policy version
- executor identity

Rule:

```text
NO VALID CAPABILITY = NO OUTBOUND EXECUTION
```

---

## 15. Triple Ledger Architecture

TigerPay uses three distinct ledgers.

### 15.1 Accounting Ledger

Purpose: financial truth.

Use double-entry accounting.

Every posted journal has:

- journal ID
- posting time
- economic event time
- source event ID
- currency
- debit account
- credit account
- exact amount
- description code
- business reference
- reversal reference where applicable
- accounting policy version

Example logical accounts:

- cash/settlement receivable
- provider clearing
- platform revenue
- customer liability
- partner payable
- worker/vendor payable
- tax payable
- refund liability
- chargeback reserve
- provider fee expense

### 15.2 Settlement Ledger

Purpose: provider/bank operational truth.

Tracks:

- provider transaction
- expected gross amount
- expected fees
- expected net
- actual settlement
- settlement batch
- settlement date
- provider fee line items
- mismatch status
- reconciliation result

### 15.3 Evidence Ledger

Purpose: authorization and forensic truth.

Tracks:

- identity
- request
- policy
- risk
- approval
- capability
- provider call
- callback
- accounting posting
- reconciliation
- report generation
- incident action

RLS alone is not accepted as immutability. Layered controls are required:

1. restrictive grants,
2. no UPDATE/DELETE for ordinary writer role,
3. database immutability guards,
4. separate evidence writer identity,
5. signed external checkpoints/integrity roots,
6. backup/restore verification.

---

## 16. Reconciliation Engine

Reconciliation runs at transaction and batch levels.

Canonical statuses:

- `MATCHED`
- `MATCHED_WITH_TIMING_DIFFERENCE`
- `AMOUNT_MISMATCH`
- `FEE_MISMATCH`
- `MISSING_INTERNAL`
- `MISSING_PROVIDER`
- `DUPLICATE_PROVIDER_EVENT`
- `CURRENCY_MISMATCH`
- `UNRESOLVED`
- `RESOLVED_ADJUSTMENT_POSTED`

No mismatch is deleted from history after resolution.

A resolution creates a new evidence event and any accounting correction required.

---

## 17. Provider Webhook Security

Every callback/webhook processing path must implement where supported:

- provider signature verification,
- timestamp/freshness validation,
- replay prevention,
- event ID uniqueness,
- provider/account binding,
- allowed-event schema validation,
- raw-body integrity verification when required by provider signature scheme,
- canonical mapping to TigerPay event type,
- idempotent processing,
- quarantine of malformed events,
- audit receipt.

Unknown events fail closed into quarantine/review rather than inventing a financial state.

---

## 18. Trust Trinity 3.0

### 18.1 TigerMonitor

Hybrid deterministic + analytical monitoring.

May:

- calculate risk,
- detect anomalies,
- recommend freeze,
- invoke policy-defined automatic freeze,
- explain risk evidence.

May NOT:

- approve payout,
- activate treasury destination,
- unfreeze a sovereign lock,
- grant itself permissions.

### 18.2 Royal Scribe

Evidence authority responsible for:

- action passport creation,
- audit digesting,
- ledger checkpointing,
- report signing,
- verification receipts,
- key-version references.

### 18.3 Progress Tracker

Workflow/SLA engine responsible for:

- pending approvals,
- callback timeouts,
- provider delays,
- settlement delays,
- reconciliation exceptions,
- escalation schedules,
- expiration,
- retry windows,
- incident queues.

---

## 19. Cryptographic Evidence Model

SHA-256 or another approved secure digest may be used for content hashing, but a digest alone is not an identity signature.

Signed report flow:

```text
Canonical Report Data
      ↓
Digest
      ↓
Digital Signature using protected signing key
      ↓
Verification Record
      ↓
QR/Verification URL
```

Verification states:

- `VALID`
- `INVALID_SIGNATURE`
- `SUPERSEDED`
- `REVOKED`
- `UNKNOWN_REPORT`

QR contains a verifier-safe report reference and integrity data, not sensitive account numbers.

The private signing key must not exist in browser code or ordinary application configuration.

---

## 20. Key Hierarchy

Logical key classes:

1. authentication credentials — WebAuthn/public-key identities,
2. data-encryption keys — sensitive treasury identifiers,
3. signing keys — reports/checkpoints,
4. provider credential secrets — API/webhook credentials,
5. backup/recovery key material.

Key rotation must preserve the ability to verify historical signatures using key version/public verification records.

HSM/KMS-backed non-exportable keys are preferred for high-value signing and secret-protection roles.

---

## 21. Kill-Switch Architecture

TigerPay implements independent emergency controls.

### `OUTBOUND_FREEZE`

Stops payouts, high-risk refunds, treasury withdrawals, and outbound provider calls.

### `TREASURY_CONFIG_FREEZE`

Stops IBAN/CliQ/provider-destination mutation and activation.

### `PROVIDER_ISOLATION`

Disables one provider/rail while other approved providers may continue.

### `COUNTRY_PAYMENT_FREEZE`

Freezes payment operations for one country package.

### `FULL_FINANCIAL_ISOLATION`

Stops both inbound and outbound financial execution where continuing inbound acceptance itself is unsafe.

### `AI_FINANCIAL_DISABLE`

Disables financial AI analysis/voice assistance while preserving deterministic financial runtime.

Freeze actions require rapid authenticated authorization. Unfreeze requires stronger review and freshness.

---

## 22. Red Alert Mode

Default incident mode:

```text
NORMAL
  ↓
ELEVATED
  ↓
RED_ALERT
  ↓
OUTBOUND_FROZEN
  ↓
RECOVERY_REVIEW
  ↓
CONTROLLED_UNFREEZE
  ↓
NORMAL
```

RED_ALERT should normally preserve legitimate inbound payments where the inbound provider path is not compromised, while freezing high-risk outbound/configuration actions.

The incident commander may escalate to `FULL_FINANCIAL_ISOLATION` if inbound processing is unsafe.

---

## 23. Risk Economy

Risk is multidimensional.

Each action evaluates:

- financial value,
- irreversibility,
- destination novelty,
- beneficiary novelty,
- provider health,
- country risk,
- user/session risk,
- device risk,
- velocity,
- historical anomaly,
- refund/chargeback exposure,
- settlement exposure,
- data sensitivity,
- blast radius.

Risk output is a deterministic policy input, not a permission by itself.

---

## 24. Partner Transparency Chamber

Partners receive a read-only projection optimized for transparency.

Allowed examples:

- gross collections,
- recognized revenue,
- provider fees,
- commissions,
- pending partner amounts,
- paid partner amounts,
- refund totals,
- chargeback totals,
- reserve totals,
- settlement status,
- reconciliation exceptions summary,
- report verification status.

Forbidden partner capabilities:

- modify IBAN/CliQ,
- change pricing,
- approve payout,
- unfreeze vault,
- edit ledger,
- change provider credentials,
- see raw secrets,
- see full sensitive account identifiers.

Masking standard example:

```text
IBAN: JO•• •••• •••• •••• 1234
CliQ alias: n••••••@•••
```

Masking must occur server-side in the partner projection, not only via CSS/JavaScript.

---

## 25. Secure Report Export Engine

Supported report formats may include PDF, XLSX/CSV, and machine-readable JSON for controlled integrations.

Each report package includes:

- report ID,
- report version,
- generated by,
- generated at with timezone,
- data cutoff timestamp,
- currency basis,
- filter/scope summary,
- partner/owner watermark where required,
- digest,
- signature key version,
- verification QR/reference,
- superseded/revoked status.

Exports containing sensitive information require `FAL1_SENSITIVE_READ` or stronger.

---

## 26. TigerPay Sovereign Command Center

The dashboard is a first-class operational control plane, not a decorative admin page.

### 26.1 Persistent Sovereign Status Bar

Always displays:

- Vault state,
- owner assurance/session state,
- risk posture,
- current country context,
- base display currency,
- provider health summary,
- latest reconciliation timestamp,
- latest evidence checkpoint,
- outstanding critical approvals,
- emergency freeze state.

### 26.2 Financial Pulse

Cards/metrics:

- gross collected,
- settled,
- recognized revenue,
- provider receivable,
- pending refunds,
- refunds completed,
- chargeback exposure,
- payout liabilities,
- partner liabilities,
- tax liabilities,
- provider fees,
- reserve balance,
- reconciliation exceptions.

Every metric has an explicit time range and currency basis.

### 26.3 Payment Command Queue

Priority queue for actions that require human attention:

- payout approvals,
- destination activations,
- refund exceptions,
- chargeback deadlines,
- reconciliation mismatches,
- provider incidents,
- risk freezes,
- expiring approvals,
- recovery actions.

Every item displays:

- financial impact,
- reason,
- evidence summary,
- risk,
- affected scope,
- time remaining,
- allowed actions,
- whether owner step-up is required.

### 26.4 Golden Artery Timeline

The Golden Artery is a real financial event timeline showing canonical state transitions, not an animation disconnected from backend state.

Events include:

- payment created,
- provider accepted,
- payment confirmed,
- accounting posted,
- settlement received,
- reconciliation matched,
- payout submitted,
- payout paid,
- risk freeze,
- owner approval,
- report issued.

### 26.5 Trust Radar

Displays:

- owner sessions,
- trusted devices/authenticators,
- failed step-up attempts,
- country/network anomalies,
- provider webhook failures,
- payout anomaly trends,
- freeze events,
- evidence integrity status.

### 26.6 Threat Map

The map is informational and uses approximate network origin only.

It must not imply exact human geolocation unless an independently reliable, consented source provides it.

Map events show confidence and source type.

### 26.7 Treasury Panel

Shows:

- active destination,
- masked identifier,
- provider/bank,
- verification state,
- version,
- last activation,
- pending destination proposal,
- cooling-period timer,
- freeze state.

### 26.8 Provider Health Panel

Shows:

- availability,
- webhook latency,
- payment success rate,
- settlement delay,
- reconciliation health,
- failure/error trend,
- circuit-breaker status.

### 26.9 Partner Transparency Tab

Owner sees partner-level views and export history; partners receive their independent read-only surface.

### 26.10 Audit & Evidence Tab

Searchable by:

- correlation ID,
- payment ID,
- payout ID,
- approval ID,
- report ID,
- provider transaction,
- journal ID,
- settlement batch,
- incident ID.

---

## 27. Dashboard Navigation Information Architecture

Primary sections:

```text
Overview
Payments
Payouts
Treasury
Settlement
Reconciliation
Accounting
Partners
Reports
Risk & Security
Providers
Audit & Evidence
Country Activation
Settings
Emergency
```

Mobile layout may collapse these sections but cannot remove emergency status visibility.

---

## 28. Voice AI Financial Assistant

Initial mode is **READ + ANALYZE + DRAFT ONLY**.

Allowed voice requests:

- show pending payouts,
- summarize settlement exceptions,
- compare provider fees,
- explain revenue movement,
- list expiring approvals,
- prepare a payout-review draft,
- prepare a report filter.

Disallowed direct voice actions:

- send money,
- approve payout,
- change IBAN/CliQ,
- unfreeze vault,
- change owner permissions,
- rotate provider secrets.

Voice identity is not accepted as the sovereign approval factor.

---

## 29. BLACKBOX Integration

TigerPay is a protected domain inside BLACKBOX Trust Fabric.

Financial flow:

```text
Intent
  ↓
Identity
  ↓
Financial Policy
  ↓
Risk
  ↓
Simulation / Escrow where required
  ↓
Human Approval for L4
  ↓
Short-Lived Capability
  ↓
Provider Tool
  ↓
Verification
  ↓
Accounting
  ↓
Settlement/Reconciliation
  ↓
Evidence Receipt
```

The Financial & Analytics AI Manager has:

```text
READ + ANALYZE + RECOMMEND
```

It has no treasury execution capability.

The General Manager may summarize financial state but cannot inherit the Financial Manager's data or action permissions automatically.

---

## 30. Financial Action Passport

Every L3/L4 financial action uses a Financial Action Passport containing:

- passport ID,
- correlation ID,
- actor,
- owner/session assurance,
- agent if involved,
- action,
- business intent,
- amount/currency,
- beneficiary/destination digest,
- country,
- provider,
- payment/payout references,
- risk result,
- policy version,
- approval ID,
- capability ID,
- idempotency key,
- canonical payload digest,
- before state,
- proposed state,
- execution result,
- accounting result,
- settlement result,
- verification result,
- evidence checkpoint.

---

## 31. Owner Sovereign Recovery Ceremony

Recovery exists because exclusive owner control must not become a permanent lockout risk.

State machine:

```text
RECOVERY_REQUESTED
  ↓
FINANCIAL_LOCK
  ↓
IDENTITY_REESTABLISHMENT
  ↓
OLD_SESSION_REVOCATION
  ↓
OLD_AUTHENTICATOR_REVIEW
  ↓
NEW_AUTHENTICATOR_ENROLLMENT
  ↓
RECOVERY_COOLING_PERIOD
  ↓
OWNER_REACTIVATION
  ↓
CONTROLLED_UNFREEZE
```

Recovery automatically freezes outbound/configuration operations.

Recovery does not silently preserve previously pending approvals; high-risk approvals must be invalidated/reissued under the recovered identity state.

---

## 32. Data Classification

Minimum classes:

- `F-PUBLIC`: non-sensitive public financial metadata.
- `F-INTERNAL`: operational metrics.
- `F-CONFIDENTIAL`: partner revenue, payout details, settlement exceptions.
- `F-RESTRICTED`: masked treasury configuration, sensitive accounting context.
- `F-SOVEREIGN`: raw treasury destination references, provider secrets, signing-key references, owner recovery records.

Browser responses receive the minimum class required for the view.

Financial AI never receives `F-SOVEREIGN` raw secrets.

---

## 33. Storage & Database Boundary

The detailed physical schema will be designed in a separate implementation slice, but the logical domains are frozen here:

- `payments`
- `payment_events`
- `payouts`
- `payout_events`
- `refunds`
- `chargebacks`
- `treasury_destinations`
- `treasury_destination_versions`
- `financial_approvals`
- `financial_capabilities`
- `accounting_accounts`
- `accounting_journals`
- `accounting_entries`
- `provider_transactions`
- `settlement_batches`
- `settlement_lines`
- `reconciliation_cases`
- `financial_evidence`
- `financial_checkpoints`
- `partner_financial_projection`
- `financial_reports`
- `provider_registry`
- `country_payment_packages`
- `financial_incidents`

No migration is authorized by this design document.

---

## 34. RLS and Database Authorization Principles

Future Postgres/Supabase implementation must account for the fact that RLS is not equivalent to absolute immutability.

Required defense in depth:

- user-facing roles have no direct financial-table mutation unless explicitly mediated,
- partner role is read-only to approved projection/view/API,
- owner browser role does not receive unrestricted service credentials,
- service roles are split by responsibility,
- evidence writer cannot modify historical evidence,
- payout executor cannot edit owner identity,
- accounting poster cannot edit provider credentials,
- provider webhook processor cannot authorize payouts,
- `FORCE ROW LEVEL SECURITY` is evaluated for relevant tables,
- table-owner/BYPASSRLS behavior is included in threat tests,
- destructive privileges are explicitly revoked from ordinary runtimes.

---

## 35. Concurrency & Idempotency

Financial systems must be correct under concurrency.

Required invariants:

- provider event ID processed once,
- idempotency key unique per execution intent,
- approval consumed at most once,
- capability claimed at most once,
- journal source event posted at most once,
- payout provider submission not duplicated during timeout/retry,
- destination activation uses version/precondition checks,
- reconciliation resolution cannot double-post adjustments.

Database transactions and uniqueness constraints are preferred over process-memory locks.

---

## 36. Failure Semantics

A network timeout means `UNKNOWN_PROVIDER_RESULT`, not automatically `FAILED` and not automatically `SUCCESS`.

Recovery procedure:

1. preserve execution ID,
2. query provider using idempotency/reference,
3. reconcile actual provider state,
4. only then advance TigerPay state.

Retries reuse the same financial intent and idempotency contract rather than creating a fresh economic action.

---

## 37. Business Continuity

Operational modes:

```text
NORMAL
DEGRADED_PROVIDER
READ_ONLY_FINANCE
OUTBOUND_FROZEN
COUNTRY_FROZEN
AI_DISABLED
FULL_FINANCIAL_ISOLATION
```

Core marketplace browsing/listing behavior must not depend on financial AI availability.

Paid-feature availability may degrade according to entitlement policy when provider confirmation is unavailable, but must not fabricate payment success.

---

## 38. Country Payment Package

Every activated country receives an explicit package with:

- legal/regulatory review status,
- merchant/entity setup,
- settlement currency/currencies,
- approved PSPs/acquirers/banks,
- supported payment methods,
- supported payout methods,
- card-data boundary,
- refund rules,
- chargeback rules,
- tax configuration source,
- data-residency/privacy requirements,
- treasury destinations,
- fraud rules,
- transaction/provider limits,
- user disclosures,
- partner disclosures,
- incident contacts,
- reconciliation process,
- disaster recovery requirements,
- country kill switch,
- launch owner approval.

Country state:

```text
DRAFT
  ↓
TECHNICALLY_READY
  ↓
COMPLIANCE_REVIEWED
  ↓
SECURITY_CERTIFIED
  ↓
OWNER_APPROVED
  ↓
ACTIVE
  ↓
SUSPENDED / REVOKED
```

---

## 39. Jordan Activation Baseline

Jordan is treated as a country-specific package, not as permanent global defaults.

Baseline assumptions verified from official public sources on 2026-08-07:

- the Central Bank of Jordan publishes a licensing guideline for electronic payments and money-transfer activities and related payment-system regulatory material;
- JoPACC operates CliQ and describes merchant acceptance integration through merchant acquirers;
- CliQ supports local instant payment addressing including aliases and IBAN through participating institutions;
- provider/service availability and limits can vary and therefore belong in provider/country configuration rather than hard-coded product logic;
- card processing must be designed to minimize VVIP TIGER's cardholder-data exposure and follow the applicable PCI DSS scope for the chosen integration.

This document is an engineering architecture, not a legal opinion. Production activation requires current legal/compliance confirmation for the exact commercial/payment model.

Official reference families:

- Central Bank of Jordan — Payment Systems Legislations / Guidelines and Frameworks.
- JoPACC — CliQ Services, Features, FAQs, IBAN Confirmation.
- PCI Security Standards Council — PCI DSS v4.0.1.
- NIST SP 800-63B — phishing-resistant public-key authentication/WebAuthn guidance.

---

## 40. PCI/Card Boundary

Current target architecture minimizes cardholder data scope:

- use hosted PSP checkout or equivalent provider-controlled secure component,
- do not log card data,
- do not store CVV,
- do not expose provider secrets to browser code,
- use token/reference values for internal linkage,
- document the exact PCI responsibility split with each provider,
- maintain CSP/security headers appropriate to hosted components,
- monitor checkout-script integrity requirements applicable to the selected integration.

PCI compliance responsibility cannot be declared complete until a specific provider integration and scope assessment exist.

---

## 41. Privacy Boundary

TigerPay must not secretly activate user cameras for suspected access attempts.

Risk collection uses lawful/appropriate signals such as:

- session identity,
- device/authenticator metadata,
- IP/network reputation,
- request velocity,
- login history,
- provider events,
- transaction behavior.

Approximate geolocation is a risk signal, not identity proof.

Sensitive financial and biometric-related processing must be included in the country privacy package.

---

## 42. AI Security Boundary

Financial prompts, provider messages, bank descriptions, uploaded statements, reconciliation files, invoices, and partner notes are untrusted data.

Prompt injection from financial documents must never:

- expand data scope,
- activate tools,
- approve payout,
- change treasury destination,
- reveal provider credentials,
- weaken risk policy,
- disable audit,
- unfreeze the system.

The acceptance objective is authority containment, not a claim of blocking all malicious text.

---

## 43. Financial AI Evaluation

Evaluation suites include:

- numerical accuracy,
- currency correctness,
- accounting classification,
- grounding/citation,
- settlement explanation,
- reconciliation explanation,
- refusal of money movement,
- refusal of owner-role escalation,
- prompt-injection resistance,
- cross-partner isolation,
- cross-country isolation,
- Arabic financial terminology,
- voice intent classification,
- hallucinated-provider rejection.

AI output may support decision readiness but does not become authorization evidence.

---

## 44. Observability

End-to-end correlation path:

```text
Browser / Owner Console
  → TigerPay Gateway
  → Identity
  → Policy
  → Risk
  → Escrow/Approval
  → Capability
  → Provider Adapter
  → Provider Event
  → Accounting
  → Settlement
  → Reconciliation
  → Evidence
```

Metrics include:

- payment success rate,
- payout success rate,
- provider latency,
- webhook verification failures,
- duplicate-event attempts,
- settlement delay,
- reconciliation mismatch rate,
- refund rate,
- chargeback rate,
- approval age,
- capability expiry/denial,
- freeze counts,
- risk escalations,
- report verification failures.

Sensitive values are redacted before telemetry emission.

---

## 45. Alerts & Escalation

Severity classes:

- `F0_INFO`
- `F1_ATTENTION`
- `F2_OWNER_ACTION`
- `F3_HIGH_RISK`
- `F4_CRITICAL_FINANCIAL`

Example escalation:

```text
In-App / Push
  → SMS or approved secondary channel
  → emergency owner contact procedure
```

Automated phone calling is optional and provider/country dependent, not a required invariant.

Critical alerts include:

- treasury destination change,
- high-value payout approval,
- repeated failed FAL3 authentication,
- evidence integrity failure,
- provider signature failures above threshold,
- unexpected reconciliation loss,
- unauthorized partner write attempt,
- financial recovery initiation,
- unfreeze request.

---

## 46. Dashboard UX Safety Rules

1. Display money with currency and exact rounding rules.
2. Never use color alone to communicate financial state.
3. `PAID`, `SETTLED`, and `RECONCILED` are visually and semantically distinct.
4. Approval buttons show amount, destination, beneficiary, and consequence immediately before step-up.
5. Dangerous actions never use pre-checked confirmation.
6. Freeze action is visually reachable in an incident.
7. Unfreeze is intentionally separated from Freeze.
8. Partner dashboards contain no hidden edit controls awaiting CSS display; write capabilities do not exist for partner role.
9. Dashboard optimistic UI cannot claim financial completion before server-confirmed state.
10. Loading/unknown state is displayed as unknown, not success.
11. RTL Arabic is a first-class layout.
12. Critical finance status survives responsive/mobile layout.

---

## 47. Audit Questions the System Must Answer

At any time, authorized investigators must be able to answer:

- Who initiated this economic action?
- Was the actor authenticated strongly enough?
- What was the exact amount/currency?
- Which beneficiary/destination was approved?
- Did the payload change after approval?
- What policy version governed it?
- What risk signals were present?
- Which provider call was made?
- Was it submitted more than once?
- What did the provider actually report?
- What accounting journal was posted?
- What settlement was received?
- Was it reconciled?
- Were adjustments later posted?
- Which report exposed the result?
- Is that report still valid?

---

## 48. Security Threat Model Summary

Priority threats include:

1. stolen owner session,
2. phishing/social engineering,
3. malicious treasury destination replacement,
4. payout replay/double submission,
5. forged provider webhook,
6. compromised provider credential,
7. malicious partner attempting write escalation,
8. database privilege bypass,
9. evidence tampering,
10. reconciliation manipulation,
11. insider/service-role misuse,
12. refund/chargeback fraud,
13. AI prompt injection,
14. cross-country/currency confusion,
15. lost owner authenticators,
16. dashboard compromise,
17. provider outage/partial failure,
18. race condition in approval consumption,
19. duplicate accounting posting,
20. sensitive-data leakage to logs/analytics.

Each implementation slice must map its controls/tests to these threats.

---

## 49. Testing Strategy

### Unit

- state transitions,
- amount/currency validation,
- policy rules,
- risk rules,
- accounting balancing,
- masking/redaction,
- report digest/signature verification.

### Contract

- PSP API adapters,
- webhook schema/signature,
- reconciliation imports,
- Country Payment Package.

### Integration

- payment intent → callback → journal,
- payout escrow → approval → capability → provider,
- settlement → reconciliation,
- refund/chargeback → accounting,
- report → signature → verification.

### Security

- replay,
- double approval consumption,
- altered payload after approval,
- forged webhook,
- cross-partner access,
- cross-country access,
- partner write attempts,
- owner-session downgrade,
- RLS bypass-role tests,
- secret leakage,
- prompt injection.

### Chaos

- provider timeout,
- callback before API response,
- duplicate callback,
- late callback,
- provider says success then settlement missing,
- database lock,
- risk engine unavailable,
- evidence writer unavailable,
- signing service unavailable,
- AI unavailable,
- provider partial outage,
- reconciliation file malformed.

Invariant:

> Failure must never create extra authority or duplicate economic effect.

---

## 50. Definition of Done for Any Financial Slice

A TigerPay implementation slice is not DONE without all applicable evidence:

- design/spec approved,
- implementation plan approved,
- TDD red/green evidence,
- unit/contract/integration tests,
- security isolation tests,
- concurrency/replay tests,
- migration tests where applicable,
- backup/restore test where applicable,
- secret scan,
- dangerous SQL scan,
- BLACKBOX/static security review,
- P0 = 0,
- P1 = 0,
- manual browser smoke for UI changes,
- Arabic/RTL verification,
- no console errors,
- no unintended provider calls,
- rollback/compensation evidence,
- final CI green,
- explicit owner approval before merge/production action.

---

## 51. Delivery Decomposition

TigerPay Vault 3.0 is too large for one PR. It is decomposed into independently reviewable milestones.

### TP-00 — Constitution & Boundary Freeze

Deliverables:

- this master spec,
- payment-domain terminology,
- permanent deny rules,
- provider/custody boundary,
- P18 migration mapping.

No runtime change.

### TP-01 — TigerPay Domain Contracts

Deliverables:

- canonical state enums/contracts,
- amount/currency types,
- IDs/idempotency rules,
- provider event normalization contracts.

No production provider.

### TP-02 — Sovereign Identity Contract

Deliverables:

- trusted owner server contract,
- FAL states,
- WebAuthn/step-up interface contract,
- recovery contract.

No payout executor.

### TP-03 — Treasury Destination Foundation

Deliverables:

- versioned destination schema,
- verification/cooling states,
- encryption references,
- read-only dashboard projection.

No live activation until security gate.

### TP-04 — Triple Ledger Foundation

Deliverables:

- accounting model,
- settlement model,
- evidence model,
- balanced journal enforcement,
- immutability controls.

### TP-05 — Provider Registry & Sandbox Adapter

Deliverables:

- provider registry,
- sandbox/fake provider adapter,
- callback verifier interface,
- no production credentials.

### TP-06 — Inbound Payment Runtime Sandbox

Deliverables:

- payment intents,
- canonical inbound state machine,
- hosted checkout contract,
- sandbox callback processing,
- accounting integration.

### TP-07 — Reconciliation Engine

Deliverables:

- settlement imports/adapters,
- matching engine,
- exception queue,
- adjustment workflow.

### TP-08 — Outbound Action Escrow

Deliverables:

- payout drafts,
- beneficiary checks,
- owner approval request,
- no provider execution yet.

### TP-09 — Capability-Gated Payout Sandbox

Deliverables:

- approval verifier boundary,
- one-time capability,
- idempotent sandbox execution,
- compensation model.

### TP-10 — Evidence & Signed Reports

Deliverables:

- Action Passport,
- signed checkpoints,
- report signature/verification,
- QR verification endpoint contract.

### TP-11 — Partner Transparency Chamber

Deliverables:

- server-side masked projection,
- read-only partner UI,
- export permissions,
- cross-partner isolation tests.

### TP-12 — Sovereign Command Center Dashboard

Deliverables:

- persistent status bar,
- Financial Pulse,
- Command Queue,
- Golden Artery,
- Trust Radar,
- Treasury panel,
- Provider Health,
- Evidence search,
- Emergency panel,
- Arabic/RTL/mobile validation.

### TP-13 — Risk, Kill Switches & Red Alert

Deliverables:

- risk rules,
- freeze controls,
- provider/country isolation,
- controlled unfreeze,
- incident evidence.

### TP-14 — Financial AI Read-Only Integration

Deliverables:

- BLACKBOX read/analyze/recommend only,
- voice query read mode,
- financial AI evaluations,
- no money authority.

### TP-15 — Jordan Payment Package

Deliverables:

- selected licensed/acquiring provider configuration,
- sandbox certification,
- current compliance/legal confirmation,
- provider limits/configuration,
- local payment methods,
- reconciliation runbook,
- Jordan kill switch.

### TP-16 — Controlled Production Certification

Deliverables:

- staging E2E,
- DR,
- security/red-team,
- accounting/reconciliation signoff,
- operational runbooks,
- owner certification,
- controlled rollout.

---

## 52. Dependency Rules Between Milestones

- TP-01 depends on TP-00.
- TP-02 and TP-03 depend on TP-01.
- TP-04 depends on TP-01.
- TP-05 depends on TP-01 and security/provider-boundary approval.
- TP-06 depends on TP-04 + TP-05.
- TP-07 depends on TP-04 + TP-06.
- TP-08 depends on TP-02 + TP-03 + TP-04.
- TP-09 depends on TP-05 + TP-08 + BLACKBOX approval boundary.
- TP-10 depends on TP-04 and may progress alongside TP-07/TP-08.
- TP-11 depends on TP-04 + TP-10.
- TP-12 depends on stable read projections from TP-03/04/07/08/10/11.
- TP-13 depends on TP-02/03/05/08/10.
- TP-14 depends on BLACKBOX AI-01/AI-02+ security readiness and TigerPay read projections.
- TP-15 depends on TP-06/07/09/13 in certified sandbox form.
- TP-16 depends on all required prior gates.

---

## 53. Migration from P18

P18 migration mapping:

| Legacy concept | TigerPay Vault 3.0 destination |
| --- | --- |
| Payment gateway design | TP-05/TP-06 provider orchestration |
| Hosted payment flow | TP-06 hosted/tokenized checkout |
| Owner control | TP-02 + TP-12 |
| Security review | TP-10 + TP-13 + BLACKBOX |
| No production execution | Preserved until TP-16 certification |

P18 is not marked implemented merely because this master architecture is approved.

---

## 54. Repository Governance

TigerPay work follows repository rules:

- no direct `main` mutation,
- feature branch per slice,
- Draft PR first,
- TDD for behavior changes,
- repository quality gate,
- security checks,
- manual browser verification for UI,
- BLACKBOX review,
- explicit owner merge approval.

Financial migrations and provider activation receive an additional financial gate and cannot piggyback on unrelated PRs.

---

## 55. Security Acceptance Matrix

Before any live money flow, all must be true:

| Control | Required |
| --- | --- |
| Provider is approved/documented | YES |
| No raw card secret in TIGER | YES |
| Server-side financial identity | YES |
| L4 client approval impossible | YES |
| Treasury versioning/cooling | YES |
| Idempotent provider calls | YES |
| Webhook authenticity | YES |
| Double-entry ledger | YES |
| Reconciliation | YES |
| Immutable evidence controls | YES |
| Partner read-only enforcement | YES |
| Kill switches | YES |
| Recovery ceremony | YES |
| DR/backup evidence | YES |
| P0/P1 | ZERO |
| Owner certification | YES |

---

## 56. Architectural Decisions Frozen by Approval

The following decisions are considered approved by the owner for planning purposes:

1. Product name: **TigerPay Vault 3.0 — Sovereign Treasury & Trust Fabric**.
2. TigerPay is an orchestration/governance/accounting layer first, not a self-issued wallet/bank.
3. Licensed/accredited PSP/bank/acquirer integration is the initial money rail.
4. Architecture is ready for multi-provider routing later.
5. `OWNER_VIP_TIGER` is exclusive sovereign financial authority, implemented server-side.
6. Partners are transparent read-only participants.
7. Financial AI is read/analyze/recommend only.
8. Voice is read/draft only initially.
9. Dashboard is first-class and named **TigerPay Sovereign Command Center**.
10. Triple Ledger is mandatory.
11. Treasury destination changes require verification/versioning/cooling/final confirmation.
12. Financial L4 uses Action Escrow + owner approval + short-lived capability.
13. Freeze controls are independent and unfreeze is stronger.
14. Reports use verifiable digital signatures; QR is a verification transport, not the security primitive.
15. Jordan is the first country package but Jordan-specific constraints are not global constants.
16. Implementation is decomposed TP-00 through TP-16.

---

## 57. Immediate Repository State After This Spec

This spec alone authorizes **architecture freeze and implementation planning only**.

It does NOT authorize:

- database migrations,
- live PSP integration,
- bank/CliQ execution,
- payment collection,
- payouts,
- production secrets,
- production deploy,
- P18 status change to implemented.

The first implementation target after written-spec review is **TP-00/TP-01**, not the live dashboard and not live money movement.

---

## 58. Final Architecture Formula

```text
TigerPay Vault 3.0 =
  Sovereign Identity
+ Deterministic Financial Policy
+ Verified Treasury Destinations
+ Licensed Payment Rails
+ Payment Orchestration
+ Capability-Gated Payouts
+ Double-Entry Accounting
+ Settlement Reconciliation
+ Immutable Evidence
+ Partner Transparency
+ Risk & Kill Switches
+ Sovereign Recovery
+ Command Center
+ BLACKBOX-Controlled AI
+ Country Certification
```

Final safety invariant:

> **No dashboard, browser, partner, provider callback, AI model, or voice command is itself financial authority. Authority is server-side, scoped, fresh, auditable, and bound to the exact economic action.**
