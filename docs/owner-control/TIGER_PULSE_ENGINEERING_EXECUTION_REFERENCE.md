# VVIP TIGER — TIGER PULSE ENGINEERING & EXECUTION REFERENCE

**Status:** OWNER-APPROVED ENGINEERING REFERENCE
**Effective checkpoint:** 2026-08-12
**Scope:** Global / all current and future sectors
**Relationship:** This document is governed by `OWNER_BINDING_DECISIONS_2026-08-12.md` and must be implemented through isolated, test-driven PRs. It is not itself evidence that Production money movement or country activation is live.

---

## 1. Executive definition

**TIGER PULSE** is VVIP TIGER's contextual market-intelligence and governed visibility engine. It is not a banner-ad strip, not a mandatory publishing gate, and not a replacement for ordinary Marketplace/search.

The complete system has three inseparable layers:

1. **Enterprise & Cross-Border Legal Architecture** — the governing envelope that decides where, by whom, under which jurisdiction/policy/version, and with which legal/financial/security constraints an operation may execute.
2. **Hybrid Search Ranking Constitution** — the deterministic, versioned search/ranking policy that protects relevance, quality, fairness and anti-monopoly behavior while allowing tightly capped paid influence.
3. **TIGER PULSE Execution Engine** — the market-wave, participation, verified-exposure, financial, reconciliation, audit and operator engine that runs inside the first two layers.

Core invariant:

> **No commercial signal, paid influence, local operator, legal configuration, or campaign may bypass identity, authority, scope, eligibility, ranking quality gates, financial reconciliation, or audit.**

Product invariant:

> **The ordinary Marketplace remains usable if TIGER PULSE, paid visibility, wave automation, or financial capture is disabled.**

---

## 2. Constitutional relationship to VVIP TIGER

TIGER PULSE inherits the platform constitution:

> **Simple Surface — Private Core — Minimum Truth**

Therefore:

- internal complexity stays behind the product surface;
- users see only contextually useful actions;
- sensitive truth is projected server-side only when required;
- authority is capability/scope-bound;
- financial state is explicit and reconciled;
- legal/jurisdiction rules are policy-driven rather than scattered conditionals;
- no feature may reintroduce a commercial-register/business-registration product field, placeholder, schema reservation, or publication gate under any alias.

---

# PART A — ENTERPRISE & CROSS-BORDER LEGAL ARCHITECTURE

## 3. Sovereignty model

The enterprise model separates three planes:

### 3.1 Global Core Plane

Controls platform-global assets and authority:

- source repositories;
- deployment credentials;
- platform root policy;
- encryption/key-management authority;
- global financial/risk policy definitions;
- global kill-switch authority;
- canonical audit/evidence standards;
- global ranking constitution;
- global data taxonomy.

A local operator does **not** receive these powers merely by operating a country/sector.

### 3.2 Jurisdiction Operating Plane

Represents a country/region-specific operating context and contains only locally scoped capabilities such as:

- country/region activation status;
- allowed sectors/features;
- local legal/policy pack;
- supported currencies/taxes/providers;
- local disclosure/terms versions;
- local operational roles and scopes;
- data-location/routing requirements where applicable;
- local complaint/dispute routing;
- local content/brand restrictions where applicable.

### 3.3 Market Experience Plane

The user-facing Marketplace/search/Pulse experience. It consumes approved server projections from the global and jurisdiction planes and must not expose internal policy internals merely for convenience.

---

## 4. Jurisdiction Policy Pack

Every activated jurisdiction uses a versioned policy object. No country-specific rule is hard-coded into random UI branches.

Conceptual contract:

```text
JurisdictionPolicyPack {
  policyId
  version
  jurisdictionCode
  effectiveFrom
  effectiveUntil?
  status
  approvedBy
  checksum

  operatingEntityRef
  supportedLocales[]
  supportedCurrencies[]
  enabledSectors[]
  enabledCapabilities[]

  dataPolicyRef
  privacyPolicyRef
  retentionPolicyRef
  taxPolicyRef
  paymentPolicyRef
  consumerPolicyRef
  ipBrandPolicyRef
  disputePolicyRef
  sanctionsPolicyRef?
  financialPromotionPolicyRef?

  legalReviewEvidenceRef?
  activationGateRef
}
```

### 4.1 Activation rule

A country/region cannot become operational merely because UI configuration exists.

The activation chain is:

```text
Product Readiness
  -> Security Readiness
  -> Legal/Jurisdiction Readiness
  -> Finance/Tax/Provider Readiness
  -> Data/Privacy Readiness
  -> Operational Readiness
  -> Owner/Authorized Activation Gate
  -> ACTIVE
```

Missing required evidence means `JURISDICTION_NOT_READY`, not silent fallback to a different country's policy.

### 4.2 No hidden reintroduction of prohibited data

A jurisdiction pack may require compliance controls that are genuinely applicable, but it must **not** silently reintroduce the abolished VVIP TIGER commercial-register/business-registration product field under another label.

If a future mandatory legal requirement appears to conflict with this owner decision, implementation must stop at a documented legal/product decision gate rather than silently collecting the data.

---

## 5. Cross-border legal decision routing

Every legally material operation derives an **Applicable Policy Context** before execution:

```text
identity/account
+ user residence/declared market context where legitimately needed
+ listing/resource market
+ operating jurisdiction
+ transaction/settlement context
+ sector
+ operation type
+ policy effective timestamp
= ApplicablePolicyContext
```

The context is server-computed. Client-supplied country/market values are evidence/input, not ultimate authority.

For each sensitive decision, audit stores:

- jurisdiction code;
- policy ID/version;
- effective timestamp;
- sector;
- operation;
- decision result/reason code;
- correlation ID;
- actor/subject scope;
- relevant evidence references;
- no secrets/tokens/raw unnecessary private data.

---

## 6. Legal Definition Layer for TIGER PULSE

The engine must distinguish these concepts explicitly:

### 6.1 External Campaign

A market signal/campaign originating outside VVIP TIGER. Its detection does **not** imply endorsement, agency, partnership, distributorship, sponsorship, or official affiliation.

### 6.2 VVIP Wave

A VVIP TIGER contextual market wave created from verified external signals, internal market behavior, operator/manual intelligence, or a combination thereof.

### 6.3 Independent Listing

A seller/advertiser listing that remains independently owned by its publisher. Participation in a Wave does not automatically create an official brand relationship.

### 6.4 Verified Exposure

A server-accepted, policy-qualified display event that satisfies the required visibility, deduplication, eligibility, fraud/risk and identity/account conditions. It is the only exposure class that may feed billable exposure logic.

### 6.5 Brand/official-relationship claim

Claims such as `official`, `authorized distributor`, `exclusive agent`, `original brand representative`, or materially equivalent claims are separate from ordinary publication and may trigger targeted verification under the applicable jurisdiction/IP policy.

Ordinary listings are not forced into a blanket manual-review queue.

---

## 7. Cross-border policy domains

Jurisdiction packs may contain adapters for the following domains when applicable:

- privacy rights and lawful processing purpose;
- retention/deletion/legal-hold rules;
- data residency/localization/routing;
- consumer disclosure/cancellation/refund rules;
- tax/VAT/GST/withholding/invoicing treatment;
- currency/payment-provider/settlement limitations;
- marketplace/intermediary obligations;
- sector-specific promotion restrictions;
- intellectual-property/trademark/brand claims;
- sanctions/export/trade restrictions where applicable;
- financial-promotion/securities restrictions for investment/equity sectors where applicable;
- health/medical advertising restrictions where applicable;
- complaint/dispute/escalation routing;
- age/eligibility constraints where genuinely required.

These are **policy adapter domains**, not claims that one global rule satisfies every jurisdiction. Country launch requires current jurisdiction-specific review/evidence before activation.

---

# PART B — HYBRID SEARCH RANKING CONSTITUTION

## 8. Ranking objective

Search must maximize useful relevance and trustworthy market fit while resisting pay-to-win distortion, spam, monopoly concentration and opaque manual manipulation.

Paid visibility is an input with a strict cap; it is never an eligibility bypass.

---

## 9. Hybrid ranking formula

The owner-approved ranking formula is:

```text
HybridRankScore =
    0.35 * R
  + 0.20 * W
  + 0.15 * Q
  + 0.10 * L
  + 0.08 * F
  + 0.07 * T
  + 0.05 * P
```

Where every component is normalized to `0..100`:

- `R` = query/listing relevance;
- `W` = Wave/context alignment;
- `Q` = listing/account quality and trust;
- `L` = legitimate geographic/location fit;
- `F` = freshness/recency quality;
- `T` = current trend/market signal alignment;
- `P` = paid visibility contribution.

### 9.1 Mandatory eligibility gates

Before weighted scoring:

```text
R >= 60
Q >= 55
listing ACTIVE
jurisdiction ACTIVE
sector enabled
viewer/listing visibility policy allows result
no blocking risk/legal state
```

Failure means the listing is excluded or handled by the relevant non-public state. Paid input cannot overcome these gates.

### 9.2 Paid influence cap

`P` contributes a maximum of **5% of the final formula weight**.

No paid package may:

- turn an ineligible listing into an eligible one;
- bypass `R` or `Q` thresholds;
- override a legal/risk hold;
- create false official status;
- buy deterministic first place indefinitely;
- suppress all non-paying competitors.

### 9.3 Anti-monopoly controls

Ranking implementation must support policy-versioned controls such as:

- maximum consecutive results from one account/business where enough alternatives exist;
- bounded sector/category domination;
- bounded paid-slot density;
- diversity-aware tie handling;
- repeat-impression fatigue controls;
- abuse/collusion detection;
- deterministic, explainable policy rather than undisclosed operator favoritism.

Anti-monopoly controls must not deliberately make results less relevant when no meaningful alternative exists.

---

## 10. Ranking Policy Version

Every search result batch records the ranking-policy version used for explainability/replay:

```text
RankingDecision {
  requestCorrelationId
  rankingPolicyId
  rankingPolicyVersion
  jurisdictionPolicyVersion
  queryFingerprint
  candidateSetFingerprint
  appliedEligibilityGates
  appliedDiversityControls
  resultIds[]
  generatedAt
}
```

Do not store raw sensitive query/private data where a bounded fingerprint or purpose-limited representation is sufficient.

A future formula change is prospective/versioned. Historical decisions are not silently reinterpreted under a newer formula.

---

## 11. Search execution pipeline

```text
Query normalization
  -> jurisdiction / locale / sector context
  -> candidate retrieval
  -> hard visibility + legal + risk eligibility
  -> relevance model R
  -> quality model Q
  -> Wave context W
  -> geo fit L
  -> freshness F
  -> trend T
  -> bounded paid input P
  -> hybrid score
  -> anti-monopoly/diversity policy
  -> deterministic tie policy
  -> final server projection
  -> ranking decision audit/metrics
```

Client code may render results but does not decide authoritative ranking inputs or paid eligibility.

---

# PART C — TIGER PULSE MARKET INTELLIGENCE ENGINE

## 12. PulseScore

A Wave's market-intelligence score is separate from execution/financial risk.

Owner-approved formula:

```text
PulseScore =
  25% Trend Strength
+ 20% Source Reliability
+ 20% Geographic Match
+ 15% Listing/Sector Relevance
+ 10% Freshness
+ 10% Interaction Quality
```

Normalized score: `0..100`.

Thresholds:

- `>= 55`: SUGGEST;
- `>= 70`: ALERT;
- `>= 85`: eligible for ACTIVATE evaluation.

`PulseScore >= 85` never directly activates money or overrides identity/legal/risk checks. It only means the commercial/context signal is strong enough to enter the activation decision path.

---

## 13. Pulse Risk Kernel

Risk is deliberately separate from PulseScore.

Inputs may include:

- identity/account confidence;
- authorization/scope;
- listing status/quality;
- brand/official-claim state;
- jurisdiction restrictions;
- financial-account state;
- exposure anomaly/fraud signals;
- velocity/replay patterns;
- dispute state;
- dependency/provider health;
- reconciliation health.

A high commercial score cannot compensate for an unsafe risk state.

Possible decisions:

```text
ALLOW
ALLOW_SHADOW_ONLY
REQUIRE_STEP_UP
BRAND_REVIEW_REQUIRED
JURISDICTION_REVIEW_REQUIRED
FINANCIAL_HOLD
RECONCILIATION_HOLD
DENY
```

---

## 14. Core Pulse Control Plane

Every sensitive Pulse command follows:

```text
Identity
  -> Authority
  -> Scope
  -> Jurisdiction Policy
  -> Product/Ranking Policy
  -> Risk
  -> Idempotency
  -> Transaction
  -> Audit
  -> Receipt
```

No sensitive UI action writes directly to authoritative financial/campaign state without the server control plane.

---

## 15. Trusted Identity Graph

For operational and financial actions:

```text
Clerk User ID
  <-> VVIP accountId
  <-> verified identity binding
  <-> role assignment
  <-> capability/permission
  <-> scope
  <-> business/listing/financial account
```

Browser-supplied IDs are not sufficient proof. The server resolves and validates intended subject/resource relationships before persistence or activation.

---

## 16. Core data model

The implementation should use explicit entities rather than overloading listing rows.

Core conceptual entities:

```text
campaign_waves
campaign_wave_sources
campaign_wave_sector_weights
listing_wave_links
wave_participation_requests
verified_exposures
verified_exposure_daily_caps
pulse_policies
ranking_policies
jurisdiction_policy_packs
pulse_risk_decisions
financial_accounts
financial_reservations
financial_journals
financial_journal_entries
financial_receipts
pulse_disputes
pulse_reconciliation_runs
pulse_outbox_events
pulse_audit_events
```

Every financial/jurisdiction/ranking-sensitive row carries the applicable version/correlation metadata needed for replay/audit.

---

## 17. Generic Waves — all sectors

The Wave model is generic and must not be hard-coded only for automotive.

Initial sector families:

1. automotive vehicles;
2. real estate;
3. investments/equities;
4. food/beverage;
5. medical/health;
6. sports/fitness;
7. automotive parts/services.

Future sectors inherit the same central Wave and policy contracts unless a versioned, approved sector adapter adds genuinely necessary rules.

A Wave may originate from:

- verified external marketing/campaign signals;
- public market/event signals where lawful to process;
- first-party aggregate behavioral signals;
- manual/operator intelligence;
- combined sources.

Absence of an external campaign does not prevent a legitimate manual/behavioral VVIP Wave.

---

## 18. Source ingestion and reliability

Each source record should capture:

- source type;
- source reference/URL/hash as appropriate;
- observed timestamp;
- geographic/sector context;
- reliability score/evidence;
- licensing/usage constraints if relevant;
- parser/extractor version;
- normalized signal fingerprint;
- ingestion correlation ID.

External content must not be copied or presented in a way that creates an untrue official relationship. Rights-sensitive logos/images/assets require an applicable rights basis or are omitted/replaced with neutral VVIP representation.

---

## 19. Wave state machine

No arbitrary status mutation.

Conceptual legal transitions:

```text
DRAFT
 -> OBSERVING
 -> SUGGESTED
 -> ALERTED
 -> ACTIVATION_ELIGIBLE
 -> ACTIVE
 -> PAUSED
 -> EXPIRED
```

Exceptional paths:

```text
ANY_NONFINAL -> HELD_RISK
ANY_NONFINAL -> HELD_LEGAL
ANY_FINANCIAL -> RECONCILIATION_HOLD
ACTIVE/PAUSED -> TERMINATED
```

Transition authorization, required evidence, and allowed prior states are policy-as-code.

---

## 20. Listing-wave participation

A listing may link to a Wave only after:

- listing is active/eligible;
- jurisdiction/sector permits the feature;
- identity/account linkage is valid for sensitive/paid actions;
- no blocking risk/legal state;
- participation policy permits the relation;
- idempotency key is accepted.

Possible participation modes:

```text
ORGANIC_CONTEXT
OWNER_ACCEPTED_SUGGESTION
PAID_VISIBILITY
OPERATOR_CURATED
```

Paid participation is explicitly labeled in internal decision/audit state and cannot masquerade as organic relevance.

---

# PART D — VERIFIED EXPOSURE PROOF GRAPH

## 21. Exposure eligibility

A potentially billable card impression must satisfy at minimum:

- generated within search/results context approved by policy;
- listing/Wave is eligible and active;
- card is at least **60% visible**;
- visibility is continuous for at least **1000 ms**;
- viewer/listing/Wave tuple is not already billable within the **24-hour deduplication window**;
- identity/account linkage required for the relevant billing model is valid;
- fraud/risk rules pass;
- applicable policy version is recorded.

Browser visibility signals are evidence only. The browser does not authoritatively set `is_billable=true`.

---

## 22. VVIP Proof Graph

```text
Client visibility evidence
  -> server evidence validation
  -> listing/Wave/jurisdiction eligibility
  -> 24h dedupe
  -> fraud/risk evaluation
  -> verified exposure receipt
  -> billable event eligibility
  -> financial reservation/capture policy
  -> double-entry journal
  -> financial receipt
  -> immutable audit linkage
```

Required correlation:

```text
searchRequestId
rankingDecisionId
waveId
listingId
viewerDedupeKey
exposureEvidenceId
verifiedExposureId
billingEventId
journalId
receiptId
policy versions
```

Raw identity should be minimized/tokenized in analytics where possible.

---

## 23. Exposure replay and deduplication

Deduplication key is conceptually bound to:

```text
viewer + listing + wave + policy window
```

It must resist easy client replay and use authoritative server timestamps/buckets. Retries with the same idempotency/correlation identity return/reconcile the existing result rather than creating duplicate charges.

---

# PART E — FINANCIAL COMMAND CENTER

## 24. Accounting principle

User top-up/prepayment is not recognized as earned revenue merely because funds arrived. It begins as a customer liability/deferred performance state until the applicable billable service is delivered/captured under policy.

Financial states:

```text
FUNDED
 -> AVAILABLE
 -> RESERVED
 -> DELIVERED
 -> CAPTURED
 -> REVENUE_RECOGNIZED
```

Alternative transitions:

```text
RESERVED -> RELEASED
AVAILABLE/RESERVED/CAPTURED -> FROZEN (policy-dependent)
eligible state -> REFUNDED
eligible state -> CHARGEBACK
ANY sensitive mismatch -> RECONCILIATION_HOLD
```

No UI-only balance mutation.

---

## 25. Double-entry invariant

Every financial event posts a balanced journal before it is considered committed:

```text
sum(debits) == sum(credits)
```

Money uses integer minor units or a deliberately selected exact decimal representation. JavaScript floating-point values are not authoritative money arithmetic.

No journal entry is silently changed after posting. Corrections use explicit reversing/adjusting entries with audit linkage.

---

## 26. No Silent Money rules

1. no debit without a reason/proof reference;
2. no earned revenue without delivered service evidence;
3. no billable exposure without verified exposure;
4. no sensitive exposure without correlation/policy identity;
5. no financial journal without balanced entries;
6. no financial mutation without idempotency;
7. no unexplained residual;
8. no missing recipient silently redirected;
9. no manual adjustment without actor/reason/audit;
10. no Production real-money activation merely because code tests pass.

---

## 27. Separation of financial products

Keep distinct accounting/event types for:

- wallet/top-up funding;
- billable exposure;
- subscriptions;
- agency/service fees where applicable;
- refunds;
- disputes/freezes;
- promotional credits where applicable.

Do not collapse them into one ambiguous `balance change` type.

---

## 28. Transactional Outbox

Authoritative state change and durable event publication must avoid partial success.

Pattern:

```text
DB transaction:
  mutate authoritative state
  write balanced journal if financial
  write audit event
  write outbox event
COMMIT

async publisher:
  read unprocessed outbox
  publish with event idempotency
  mark delivery state
```

A downstream notification/analytics failure must not duplicate financial capture on retry.

---

## 29. Reconciliation Patrol

Scheduled/triggered reconciliation compares:

- wallet/account balances;
- reservations;
- verified exposures;
- billing events;
- journal entries;
- recognized revenue;
- refunds/chargebacks;
- receipts;
- outbox delivery state.

Mismatch result:

```text
RECONCILIATION_HOLD
```

Do not auto-correct unexplained money silently. Generate evidence and route to authorized finance/audit handling.

---

## 30. Disputes

A dispute creates an explicit case/state and may freeze relevant available/reserved/captured balances according to policy. A frozen amount remains represented once; it is not deducted a second time merely because the UI labels it frozen.

---

# PART F — POLICY, SECURITY, GOVERNANCE & OPERATIONS

## 31. Policy-as-Code

All material policy records support:

```text
policyId
version
effectiveFrom
effectiveUntil?
status
scope
approvedBy
checksum
changeReason
```

Each decision/event stores the policy version actually applied.

No policy edit silently rewrites historical events.

---

## 32. Idempotency everywhere

Required for at least:

- participation requests;
- Wave activation/pause;
- exposure verification/billing conversion;
- wallet reservation;
- capture;
- release;
- refund;
- dispute state changes;
- reconciliation actions;
- manual high-risk admin operations.

Idempotency scope includes operation identity + subject/resource + policy version where needed.

---

## 33. Maker–Checker / Four-Eyes

Ordinary publishing remains streamlined. Four-eyes controls are reserved for material risk such as:

- high-value manual financial adjustments;
- override of reconciliation hold;
- high-impact policy changes;
- sensitive legal/brand overrides;
- privileged global activation where policy requires it.

When required:

```text
maker != checker
```

The checker must independently possess the required capability/scope.

---

## 34. Kill switches

Independent emergency controls:

```text
PAID_PULSE_ENABLED
FINANCIAL_CAPTURE_ENABLED
WAVE_AUTOMATION_ENABLED
```

Turning one off must not unnecessarily disable ordinary Marketplace/public search.

Kill switch mutation is privileged, audited, reason-coded and protected from ordinary operator roles.

---

## 35. Shadow -> Canary -> Live

### SHADOW

- compute PulseScore;
- compute ranking impact;
- evaluate exposures;
- simulate billing/accounting;
- no real paid ordering or real money capture.

### CANARY

- tightly bounded jurisdiction/sector/accounts/traffic;
- explicit budgets/limits;
- enhanced monitoring;
- rapid kill-switch path;
- reconciliation checked continuously.

### LIVE

Allowed only after required exact-head tests, migration rehearsal, legal/finance/security/readiness gates, protected deployment approval and canary acceptance.

---

## 36. Financial dry-run target

Before real-money activation, automated simulation must execute at least **5,000,000 varied virtual movements**.

The test population must include:

- concurrent operations;
- duplicate commands;
- retries;
- network timeout/unknown outcome;
- insufficient balance;
- partial dependency failure;
- reserve/capture/release;
- refund/chargeback;
- disputes/freezes;
- role/policy changes during lifecycle;
- exposure deduplication;
- transaction/outbox replay;
- reconciliation and recovery.

Acceptance for the tested model:

```text
unexplained money creation/loss = 0
unbalanced journals = 0
duplicate replay charges = 0
unauthorized recipients = 0
unexplained residual = 0
reconciliation result = deterministic
```

This is a rigorous acceptance target, not a claim that software can never fail.

---

## 37. Immutable Decision Ledger

Sensitive decisions record a purpose-bounded immutable/tamper-evident event containing:

- actor/subject/account reference;
- verified role/capability/scope;
- operation/resource;
- before/after state references;
- jurisdiction policy version;
- ranking/Pulse/financial policy version where relevant;
- reason code;
- correlation ID;
- idempotency key/fingerprint;
- receipt/evidence references;
- timestamp.

Never store passwords, provider secrets, raw bearer tokens, or unnecessary sensitive personal data in audit logs.

---

## 38. Control Tower

Owner/authorized operations UI is progressive rather than cluttered.

Role/scoped views may include:

- Owner/Root;
- Finance;
- Compliance/Legal;
- Campaign/Pulse Operations;
- Sector Management;
- Auditor;
- Support/Dispute.

Reuse repository-approved real roles/capabilities. Do not invent a permanent role solely because a dashboard section exists.

Control Tower should answer:

```text
What is happening?
Why did the engine decide it?
Which policy/version applied?
What money is available/reserved/captured/frozen?
Are there unresolved reconciliation mismatches?
Which jurisdiction/risk/brand gates are blocking an action?
What requires authorized human action?
```

---

# PART G — API / COMMAND BOUNDARIES

## 39. Command envelope

Sensitive server commands should carry a canonical envelope similar to:

```text
CommandEnvelope {
  commandId
  correlationId
  idempotencyKey
  actorSessionContext
  accountId
  operation
  resourceRef
  jurisdictionContextHint?
  payload
  clientObservedAt?
}
```

The server re-derives authoritative identity, authority, scope, resource state and applicable policy. Client hints do not grant authority.

---

## 40. Representative command families

```text
pulse.wave.observe
pulse.wave.create
pulse.wave.activate
pulse.wave.pause
pulse.participation.request
pulse.participation.accept
pulse.exposure.submitEvidence
pulse.exposure.verify
pulse.wallet.reserve
pulse.wallet.capture
pulse.wallet.release
pulse.refund.request
pulse.dispute.open
pulse.reconciliation.run
pulse.policy.read
pulse.control.killSwitch.manage
```

Each command defines:

- input schema;
- authentication requirement;
- required capability;
- required scope;
- jurisdiction/risk/policy gates;
- allowed state transitions;
- idempotency semantics;
- transactional writes;
- audit event;
- stable error codes;
- safe response projection.

---

# PART H — OBSERVABILITY & SLO ENGINEERING

## 41. Mandatory metrics

At minimum:

- Wave detection/activation counts by policy/jurisdiction/sector;
- PulseScore distribution;
- ranking latency and candidate counts;
- eligibility rejection reasons;
- paid contribution distribution;
- concentration/diversity metrics;
- exposure evidence vs verified-exposure conversion;
- dedupe rejection rate;
- suspected fraud/anomaly rate;
- reserve/capture/release/refund counts and values;
- unbalanced-journal attempts (must be rejected);
- idempotency replay rate;
- reconciliation mismatch count/value;
- outbox lag/failure;
- kill-switch state/change events;
- dependency/provider health.

Metrics avoid leaking raw private truth.

---

## 42. Failure behavior

Fail closed for privileged, financial, identity, policy or legal uncertainty.

Fail independently for optional Pulse services:

- Pulse outage -> ordinary Marketplace/search remains available where safe;
- payment/capture outage -> do not fabricate successful charge;
- ranking optional Wave input unavailable -> use explicitly approved fallback ranking policy, not an undocumented heuristic;
- policy pack unavailable -> sensitive local operation blocks rather than guessing another jurisdiction;
- audit durability failure on a required sensitive transaction -> transaction does not silently commit without required audit evidence.

---

# PART I — TEST & ACCEPTANCE MATRIX

## 43. Unit/property tests

Must cover:

- PulseScore formula/boundaries;
- ranking formula/gates/cap;
- deterministic tie/diversity behavior;
- policy-version resolution;
- state-machine legal transitions;
- idempotency replay;
- exposure threshold continuity (`>=60%` for `>=1000ms`);
- 24h dedupe boundaries;
- exact money arithmetic;
- balanced-journal invariant;
- reserve/capture/release/refund transitions;
- no silent recipient reassignment;
- jurisdiction mismatch denial;
- kill-switch behavior;
- privacy projection/masking.

---

## 44. Integration/security tests

Must prove at least:

- forged client `is_billable` cannot directly create a billable exposure;
- forged client role/scope cannot activate a Wave;
- invalid Clerk/account mapping cannot charge wallet/activate paid Pulse;
- paid `P` cannot bypass `R < 60` or `Q < 55`;
- inactive jurisdiction cannot execute locally gated actions;
- local operator cannot mutate global root policy/keys;
- repeated network retries create one financial effect;
- journal refuses imbalance;
- dispute freeze does not double deduct;
- reconciliation mismatch produces hold/evidence;
- ordinary Marketplace survives Pulse financial kill switch;
- no commercial-register/business-registration field exists or becomes required anywhere in the Pulse/jurisdiction flow.

---

## 45. Ranking acceptance properties

For every accepted result:

```text
R >= 60
Q >= 55
P weighted contribution <= 5%
eligibility = true
policy version present
```

For randomized/property tests:

- raising `P` alone cannot make an ineligible listing eligible;
- equal candidates with `P=0` remain governed by organic signals;
- diversity controls cannot invent nonexistent candidates;
- same policy + same normalized inputs + same deterministic tie context yields reproducible output;
- changing policy version does not rewrite historical ranking decisions.

---

## 46. Exposure acceptance properties

A billable exposure exists only when:

```text
search/results context valid
AND visibility >= 60%
AND continuous visibility >= 1000ms
AND 24h dedupe passes
AND listing/wave eligible
AND identity/account policy passes when required
AND risk passes
AND server issues verified exposure receipt
```

Any one missing mandatory condition means no billable event.

---

# PART J — EXECUTION PROGRAM

## 47. Isolated PR program

TIGER PULSE must not be stuffed into the active PR #191 roles/commission branch.

Recommended implementation chain:

### PULSE-A — Contracts + Policy-as-Code + schema

- enums/state machines;
- policy/version contracts;
- jurisdiction policy-pack contracts;
- ranking policy contract;
- migrations/RLS skeleton;
- audit/correlation foundations.

### PULSE-B — Identity/Risk/Authorization Control Plane

- trusted account/Clerk resolution reuse;
- command envelope;
- capability/scope enforcement;
- risk kernel;
- kill-switch policy boundary.

### PULSE-C — Wave Intelligence Engine

- sources;
- normalization;
- PulseScore;
- Wave lifecycle;
- generic all-sector model.

### PULSE-D — Hybrid Search Ranking

- eligibility gates;
- exact formula;
- paid cap;
- diversity/anti-monopoly;
- ranking policy version/evidence.

### PULSE-E — Verified Exposure Proof Graph

- visibility evidence;
- server verification;
- 24h dedupe;
- fraud/risk;
- exposure receipts.

### PULSE-F — Financial Command Center

- wallets/liability;
- reservations;
- capture/release/refund/freeze;
- double-entry;
- outbox;
- receipts;
- no real Production money initially.

### PULSE-G — Control Tower + user UX

- Pulse alerts/suggestions;
- Wave cards;
- contextual `Activate Pulse` after content completion;
- operator/legal/finance/audit views;
- user-visible receipts/dispute state where applicable.

### PULSE-H — Shadow/Canary/Observability/Reconciliation

- shadow execution;
- five-million virtual movement program;
- canary controls;
- dashboards/alerts;
- reconciliation patrol;
- backup/rollback/runbook evidence;
- final protected Production activation gate.

---

## 48. Definition of done per PR

A PR is not complete merely because code was written.

Required:

```text
requirements mapped
RED test observed where applicable
implementation complete
focused tests GREEN
full quality gate GREEN
security/dependency checks GREEN
migration rehearsal where applicable
no unexpected worktree/generated drift
exact-head evidence captured
owner-state checkpoint updated
```

A protected review/merge/environment approval remains a real human gate. If unavailable, mark `HUMAN_GATE_PENDING` and continue independent safe work; never fabricate approval.

---

## 49. Production activation boundary

Real paid Pulse/financial execution requires a separate release decision after:

- PR chain merged;
- exact Production candidate SHA fixed;
- security review/scan acceptance;
- jurisdiction-specific legal/readiness evidence for target markets;
- finance/accounting/provider readiness;
- migration rehearsal/backup/rollback evidence;
- 5,000,000-movement virtual financial acceptance;
- shadow acceptance;
- canary acceptance;
- required protected human/environment approvals;
- post-deploy same-SHA verification.

Until then:

```text
DESIGN_APPROVED = true
ENGINEERING_REFERENCE_APPROVED = true
PRODUCTION_REAL_MONEY_ACTIVE = false unless separately proven
```

---

## 50. Final engineering invariants

1. Marketplace availability is not coupled to paid Pulse health.
2. Paid influence is capped at 5% and cannot buy eligibility/truth.
3. `R >= 60` and `Q >= 55` are hard ranking eligibility gates.
4. PulseScore thresholds are 55/70/85 and do not override risk/legal/identity controls.
5. Billable exposure requires >=60% continuous visibility for >=1000ms plus 24h dedupe and server proof.
6. Client/browser never authoritatively declares billable exposure.
7. Financial journals balance before commit; money is exact, idempotent and reconciled.
8. No missing recipient is silently redirected.
9. Every legally/materially sensitive decision records applicable policy/version.
10. Local operation never implies ownership of global source/deploy/keys/root authority.
11. Ordinary listings avoid blanket paperwork/manual-review gates.
12. Cross-border controls do not reintroduce the prohibited commercial-register field.
13. AI and endpoints receive minimum necessary truth, not ambient internal access.
14. Historical decisions remain attributable to the policy/version actually used.
15. Shadow -> Canary -> Live is mandatory for high-risk financial activation.
16. No software claim may promise literal universal zero-error/zero-breach certainty; the architecture instead fails closed, reconciles, audits, limits blast radius and requires evidence before sensitive commit.

---

**Canonical interpretation:** The cross-border enterprise/legal envelope, hybrid ranking constitution and TIGER PULSE engine are one governed architecture. None is optional documentation when implementing the other two.
