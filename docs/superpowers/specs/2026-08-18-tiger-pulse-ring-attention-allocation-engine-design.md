# TIGER PULSE RING 2026 — Verified Attention Allocation Engine

**Status:** OWNER APPROVED / CURRENT DESIGN INPUT / NOT IMPLEMENTED  
**Date:** 2026-08-18  
**Branch:** `feat/tiger-one-living-surface-spec-20260818`  
**Owner authority:** `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`  
**Living Surface authority:** `docs/superpowers/specs/2026-08-18-tiger-one-living-surface-design.md`

---

## 0. Decision

TIGER monetization for ordinary listings is simplified to one paid product concept:

> **Verified eligible visibility.**

Publishing is free for listings that pass the platform's ordinary eligibility, content, identity, sector/country, safety, anti-abuse, and legal rules.

TIGER does not sell publishing subscriptions, paid posting quotas, listing lifetime, calendar duration, absolute first position, or ranking dominance.

The only Pulse Ring reference prices are:

- `SPARK / شرارة` — **3 JOD**;
- `PULSE / نبض` — **10 JOD**;
- `SURGE / اندفاع` — **20 JOD**.

There is no fourth tier. The maximum TIGER reference price for a single platform charge authorization under this authority is 20 JOD.

---

## 1. Why this architecture

Three monetization architectures were considered:

1. fixed price + fixed global impression count;
2. fixed price + server-quoted impression count based on active-market economics;
3. abstract internal Pulse units with no direct impression commitment.

**Chosen:** option 2.

Reasoning:

- prices remain extremely simple and memorable;
- user sees exactly how many verified impressions the purchase grants before payment;
- TIGER can operate across markets with different delivery cost, fraud rate, provider fee, and inventory conditions;
- no hidden time expiry is needed;
- platform-loss protection can live in server-side quote economics instead of user-visible formulas;
- the product promise remains concrete: a locked quantity of verified eligible impressions.

The UI never exposes the internal economics formula as a requirement for understanding the product.

---

## 2. Product language

Canonical product name:

**TIGER PULSE RING**

Canonical commercial concept:

**Verified Attention Allocation Engine**

Canonical user promise:

> **Pay for verified visibility, not time.**

Arabic product principle:

> **أنت لا تشتري أياماً ولا مركزاً أول؛ أنت تشتري ظهوراً مؤهلاً موثقاً.**

Prohibited current language:

- publishing subscription;
- subscription month;
- publishing entitlement card;
- posting quota purchase;
- publishing slot purchase;
- VIP tier above Pulse Ring;
- 45 JOD Pulse level;
- 120 JOD Pulse level;
- guaranteed top position;
- absolute dominance;
- guaranteed sale/lead/contact.

---

## 3. Pulse Ring tiers

### SPARK / شرارة — 3 JOD

Purpose: light re-entry into qualified active discovery.

Delivery behavior:

- lowest paid delivery intensity;
- eligible sponsored opportunities only;
- may appear in relevant feed/search/related inventory according to eligibility;
- never bypasses relevance, quality, trust, or policy.

### PULSE / نبض — 10 JOD

Purpose: broader balanced qualified visibility.

Delivery behavior:

- medium delivery intensity;
- more eligible opportunities than SPARK;
- SMART rhythm is the default pacing mode;
- no guaranteed placement or first result.

### SURGE / اندفاع — 20 JOD

Purpose: maximum paid delivery intensity permitted by TIGER.

Delivery behavior:

- highest allowed eligible-opportunity intensity;
- still gated by relevance, quality, trust, and policy;
- never becomes a monopoly, top-pin guarantee, or organic-rank override;
- cannot be stacked into a stronger effective tier.

---

## 4. Dynamic verified-impression quote

The user selects a tier. The server creates a quote before any payment authorization.

Required quote fields:

```text
quote_id
listing_id
account_id
active_market_country
active_market_region (optional)
tier = SPARK | PULSE | SURGE
reference_price_jod_minor = 300 | 1000 | 2000
verified_impressions_granted
quote_expires_at
quote_policy_version
market_cost_version
eligible_payment_methods
provider_session_reference (when created)
```

### Quote TTL

A purchase quote is valid for **300 seconds (5 minutes)**.

This short quote validity exists only to prevent stale market/payment economics. It is **not** an expiration of purchased Pulse credit.

If the quote expires before payment authorization, the UI requests a fresh quote and displays the new verified-impression quantity before the user can pay.

### Internal quote economics

The server computes the grant from a current effective delivery-cost model that includes, at minimum:

- active-market qualified inventory cost;
- payment-provider cost allocation;
- infrastructure/serving cost allocation;
- fraud/invalid-traffic reserve;
- required platform operating margin/reserve;
- market capacity and eligible inventory pressure.

Reference form:

```text
verified_impressions_granted =
  floor((reference_price_jod × 1000 × distributable_ratio)
        / effective_cost_per_1000_verified_impressions)
```

The exact cost model is server/config authority, versioned and auditable. No client may choose or override it.

The quote engine must fail closed rather than issue a grant known to violate configured platform-loss safeguards.

---

## 5. Payment experience — direct and contextual

Entry point on an eligible listing:

**`⚡ نبّض`**

The action opens a Living Surface sheet/ring, not a separate packages store.

Default visual order:

1. circular/arc Pulse Ring selector: `3 → 10 → 20`;
2. selected tier name;
3. exact server-quoted verified impressions;
4. current market activity label;
5. delivery rhythm label;
6. explainable high-opportunity contexts where safe;
7. payment methods actually available in the current provider session;
8. one primary payment action.

Example:

```text
نبض — 10 JOD
4,380 ظهور موثق
نشاط السوق: مرتفع
الإيقاع: ذكي
أفضل الفرص الحالية: Feed + بحث السيارات في عمّان

[actual eligible payment methods]

ابدأ النبض — 10 JOD
```

### Payment-method truth

The UI may show Visa, Mastercard, Apple Pay, Google Pay, or another method only when the active provider/session confirms it is available for the current market, device, browser/app, currency, and account state.

Design mocks may label hypothetical methods as preview-only. Production UI may not fake availability.

### Platform boundary

This payment is for TIGER visibility service only.

It must not create:

- buyer/seller item checkout;
- escrow;
- marketplace settlement;
- shipping/delivery payment;
- transaction commission;
- warranty payment;
- seller proceeds wallet.

---

## 6. Purchased grant lifecycle

After successful provider-authoritative payment confirmation, TIGER creates a Pulse grant.

Canonical grant state:

```text
ACTIVE
AUTO_PAUSED_LOW_DEMAND
MANUALLY_PAUSED (future capability only if separately approved)
EXHAUSTED
VOIDED
REFUNDED
POLICY_BLOCKED
```

Core grant fields:

```text
grant_id
listing_id
account_id
purchase_id
tier
verified_impressions_total
verified_impressions_consumed
verified_impressions_reserved
verified_impressions_remaining (derived)
rhythm = CALM | SMART | FAST
state
state_reason_code
created_at
updated_at
```

No `duration_days` or purchased-credit `expires_at` controls exhaustion.

The grant is exhausted only when verified eligible impressions are consumed, unless it is voided/refunded or the listing becomes permanently ineligible under binding policy/legal action.

---

## 7. No tier stacking

A listing may receive a later top-up while an earlier grant still has remaining impressions.

Top-up adds **fuel**, not stronger instantaneous rank power.

Rules:

- multiple grant balances may coexist for accounting provenance;
- consumption order is deterministic (oldest eligible active grant first unless refund/reconciliation rules require otherwise);
- the scheduler computes one effective listing-level Pulse intensity;
- effective intensity is capped at `SURGE`;
- two SURGE grants do not become `2 × SURGE`;
- 10 + 20 does not become a 30 JOD tier;
- repeated 20 JOD purchases may extend total remaining verified impressions, but may not create a stronger-than-SURGE delivery class.

This prevents circumvention of the 20 JOD cap through parallel active purchases.

---

## 8. Eligibility before paid delivery

Before Pulse weight is considered, the listing must pass:

1. **Relevance** — appropriate relationship to the current query/context;
2. **Quality** — sufficient current listing quality/completeness for the placement;
3. **Trust** — account/listing trust requirements without exposing hidden fraud scores;
4. **Policy Eligibility** — safety, moderation, sector, country, legal and availability rules.

Only then can the Pulse scheduler consider paid delivery intensity.

Conceptually:

```text
if !eligible(listing, context, viewer):
    do_not_serve_paid
else:
    consider_pulse_opportunity(listing, context, viewer, rhythm, remaining_balance)
```

Pulse never converts an ineligible listing into an eligible listing.

---

## 9. Verified impression qualification

A Pulse impression is billable only after qualification.

Required conditions:

1. qualifying sponsored/listing surface reaches **≥50% viewport coverage**;
2. coverage is continuous for **≥2,000 ms**;
3. page/app is foreground-active during the qualifying interval;
4. listing and placement remain eligible;
5. viewer/session is not rejected as bot/automation/invalid traffic;
6. event is not suppressed by duplicate protection;
7. server reservation exists and reconciles to an active grant;
8. event has not already been consumed through idempotent replay.

Zero consumption for:

- fast scrolling that fails 2 seconds;
- background-tab exposure;
- hidden/inactive app state;
- known/rejected bots;
- invalid/cancelled placement;
- refresh-loop abuse;
- duplicate exposure inside the active deduplication window;
- telemetry replay.

### Deduplication default

Default charged-impression duplicate window:

**30 minutes per listing + privacy-safe viewer/session identity.**

This value is a versioned fraud/delivery policy parameter, not user-adjustable UI. Changing it requires evidence and policy-version traceability.

---

## 10. Reservation-before-serve

High concurrency must not overspend the last remaining impression.

Delivery uses a reservation protocol:

1. scheduler verifies listing eligibility and effective Pulse intensity;
2. server atomically reserves one available impression unit from an eligible grant;
3. placement is served with a short-lived reservation token;
4. visibility telemetry is evaluated;
5. qualified event converts reservation → consumed exactly once;
6. failed/unqualified/expired delivery releases reservation back to available balance.

A reservation TTL is a technical concurrency mechanism and does not expire purchased credit.

Required properties:

- atomic reservation;
- idempotent consume;
- idempotent release;
- no negative balance;
- no double consumption;
- reconciliation after worker/process failure.

---

## 11. Privacy-safe deduplication and invalid-traffic protection

Do not use raw IP as a durable billing identity.

Preferred privacy boundary:

```text
purpose-bounded viewer/session signals
  → server-side rotating keyed derivation/HMAC
  → short-retention dedupe identifier
```

Raw network/security data may be processed only under the separate security/privacy policy and must not become a general Pulse user-tracking profile.

Invalid-traffic controls include:

- bot/automation classification;
- repeated refresh pattern detection;
- background visibility rejection;
- impossible interaction/scroll patterns where evidence is sufficient;
- datacenter/automation signals where law/policy permits;
- replay detection;
- duplicate suppression.

Uncertain traffic may be quarantined from billing until reconciled. TIGER should prefer **not charging** an impression when qualification cannot be established reliably.

---

## 12. Pulse Rhythm

Every active grant exposes three free pacing modes:

### CALM / هادئ

- conservative opportunity acceptance;
- prioritizes higher-confidence contexts;
- slower expected consumption;
- no price premium.

### SMART / ذكي — default

- balances quality, eligible opportunity rate, and consumption pace;
- adapts to current market activity;
- no promise of a calendar completion date.

### FAST / سريع

- accepts more eligible opportunities up to the tier's legal/product intensity ceiling;
- consumes balance faster when demand exists;
- does not weaken eligibility or viewability requirements;
- does not become a higher paid tier.

Rhythm changes pacing, not purchased impression count, payment amount, or ranking eligibility.

---

## 13. Pulse Pause Intelligence

Pulse consumption must stop when the delivery policy says qualified demand is insufficient or the listing temporarily cannot be served safely.

Contract:

```text
if demand_policy.delivery_allowed == false:
    create_no_new_reservation()
    consume_zero_impressions()
    preserve_balance()
    expose_safe_reason_state()
```

User-facing example:

> **النبض محفوظ — الطلب المناسب منخفض الآن.**

Automatic resume occurs when the current scheduler policy again reports qualified delivery opportunities and the listing remains eligible.

No user is charged merely because TIGER wants to finish the grant quickly.

---

## 14. Pulse Halo — in-situ performance state

The ordinary advertiser should not need a giant recharge dashboard.

On the advertiser's own listing, active Pulse is represented by a compact Halo such as:

`⚡ 3.2K`

Opening it reveals a compact detail surface with:

- verified impressions remaining;
- verified impressions delivered;
- qualified delivery rate for the recent hour;
- current rhythm;
- current state (`ACTIVE`, paused, exhausted, policy blocked);
- safe market activity descriptor;
- top-up action if eligible.

Metrics are derived server-side. Raw security/fraud signals and raw viewer identifiers are never exposed.

Public viewers see only an appropriate transparent sponsored/promoted label where required; they do not see the advertiser's purchase price or private balance.

---

## 15. Data architecture

Do not model Pulse as a general money wallet.

Recommended bounded units:

### `pulse_quotes`

Purpose: immutable server-issued purchase offer snapshot.

Important properties:

- exact price and grant quantity;
- 5-minute TTL;
- policy/cost version;
- active-market binding;
- quote cannot be client-mutated.

### `pulse_purchases`

Purpose: payment-provider reconciliation record.

Stores:

- quote reference;
- provider/payment reference;
- authoritative payment state;
- reference JOD price;
- collected amount/currency from provider;
- idempotency/replay evidence;
- refund/void state.

### `pulse_grants`

Purpose: purchased verified-impression entitlement.

Not transferable monetary value.

### `pulse_delivery_reservations`

Purpose: concurrency-safe temporary reservation before serve.

### `pulse_impression_events`

Purpose: append-only qualified-consumption evidence.

Minimum evidence includes:

- grant/listing/placement references;
- reservation reference;
- policy version;
- privacy-safe dedupe key reference/hash;
- coverage/dwell qualification result;
- served/qualified timestamps;
- idempotency key;
- invalidation/reconciliation metadata when required.

### `pulse_balance_snapshots`

Purpose: fast read model for remaining/consumed/reserved totals.

Snapshot is derived/cache state, not the sole financial entitlement truth.

---

## 16. Authorization and RLS boundary

Advertiser UI may read only Pulse state for listings/accounts it is authorized to manage.

Client code cannot:

- grant impressions;
- change a quote price;
- change quoted impression count;
- mark payment successful;
- mark an impression qualified;
- alter consumed balance;
- increase delivery tier;
- bypass pause/policy state.

All mutations are server-authoritative and audited.

RLS/server policy must prevent IDOR between advertisers and must not expose another advertiser's private financial/Performance data.

Privileged operations remain SCG/SOA capability controlled.

---

## 17. Payment integrity

Current design requires:

- server-created payment session from a valid unexpired quote;
- exact amount binding;
- provider result verification;
- signed webhook/event verification where provider supports it;
- idempotency keys;
- replay protection;
- duplicate webhook safety;
- grant created only once after authoritative paid state;
- cancellation/failure creates no grant;
- refund/void produces deterministic grant reconciliation;
- no secrets in browser bundles or telemetry.

No payment provider is considered active merely because its logo appears in a mock.

---

## 18. Deprecation audit — mandatory purge

The migration must inventory and retire all CURRENT occurrences of the following meanings, not only exact names.

### A. Paid publishing model

Retire:

- `subscription_tiers` when used for publishing monetization;
- `posting_quotas` when purchased/renewed as publishing entitlement;
- publishing subscription states;
- monthly paid posting quotas;
- paid listing slots;
- `Publishing Access` paid product surfaces;
- 10/35/80/120 JOD publishing-card catalogs;
- renewal/expiry jobs whose purpose is paid publishing access;
- payment webhooks whose sole current purpose is publishing-subscription entitlement.

Ordinary anti-spam/rate-limit/policy controls are not paid quotas and remain allowed.

### B. High-price Pulse authority

Retire:

- 45 JOD Pulse tier;
- 120 JOD Pulse tier;
- `ASSET`/`WAVE` or equivalent current tier meanings when they represent levels above 20 JOD;
- absolute dominance/top-pin guarantee language;
- any effective stacked intensity above SURGE.

### C. Time-expiring Pulse fuel

Retire as consumption authority:

- `duration_days`;
- purchased Pulse `expires_at`;
- calendar countdown expiry;
- "7 days", "30 days", or similar Pulse validity sold as product value.

Allowed technical timestamps include quote TTL, reservation TTL, audit timestamps, fraud-retention windows, and legal data-retention controls. These must never consume or expire valid purchased Pulse fuel by themselves.

### D. General recharge wallet

Retire:

- general user monetary wallet created solely to pre-fund Pulse;
- transferable Pulse money balance;
- oversized central recharge dashboard as the required ordinary purchase path.

A compact account/report view may exist for history, receipts, refunds, tax/legal records, and multi-listing management, but ordinary purchase and performance live in context on the listing.

### E. Conflicting tests/config/docs

Retire from CURRENT authority:

- tests requiring paid publishing subscription;
- fixtures that assume 35/80/120 publishing packages;
- launch gates requiring subscription readiness;
- current config that exposes a fourth Pulse tier;
- current copy that promises rank dominance or time-based validity;
- owner indexes that still point to old business-model authority as CURRENT.

Historical evidence must be labeled and isolated, not silently deleted if needed for provenance.

---

## 19. Safe schema removal

The owner requires complete product removal, but deployed database history must be changed safely.

Rules:

1. do not rewrite old migration files to pretend the old schema never existed;
2. inventory dependencies, views, functions, RLS policies, triggers, jobs, webhooks, reports, fixtures, and runtime queries;
3. add forward migrations that retire/drop conflicting live schema only after dependency proof;
4. preserve legally/audit-required historical transaction evidence in a non-operative archive shape when required;
5. prove new publishing flow does not depend on paid entitlement;
6. prove no current service can resurrect the old subscription model;
7. validate rollback/recovery strategy before Production application.

No Production database mutation is authorized by this design document.

---

## 20. Interaction design details

### Ring geometry

The selector visually represents exactly three stops.

No empty fourth segment, hidden premium stop, locked 45/120 tier, or upsell teaser may appear.

Selected tier changes:

- ring emphasis;
- price;
- server quote request;
- quoted verified impressions;
- delivery-intensity explanation.

It does not navigate to another store page.

### Compactness

The sheet must fit the decision in one mobile viewport wherever practical:

- tier selector;
- quoted impressions;
- market/rhythm summary;
- payment methods;
- primary action.

Legal/payment disclosures may expand progressively without hiding mandatory truth.

### No fake urgency

Prohibited:

- countdown timers implying Pulse credit expires;
- "only 2 left" package scarcity;
- fake market-pressure banners;
- dark-pattern preselected add-ons;
- disguised recurring billing.

---

## 21. Failure states

### Quote unavailable

Show:

- Pulse temporarily unavailable for this listing/market;
- retry when appropriate;
- no fake impression count.

### Quote expired

Request fresh quote and require the user to see the changed quantity before payment.

### Payment cancelled/failed

No grant is created. Existing grants/balances remain unchanged.

### Payment succeeded but webhook delayed

Show verified pending state, not false success. Reconcile server-side.

### Listing becomes temporarily ineligible

Pause consumption; preserve balance; explain safe high-level reason.

### Listing permanently removed for policy/legal reason

No further delivery. Refund/credit treatment follows separate approved payment/refund policy; the UI must not invent an automatic refund promise.

### Telemetry uncertain

Do not charge the impression until qualification/reconciliation succeeds.

---

## 22. Observability

Trace the following without secrets or raw long-term viewer identity:

- quote created/refreshed/expired;
- payment session created;
- payment authoritative success/failure;
- grant created;
- reservation created/released/consumed;
- impression qualified/rejected reason class;
- automatic pause/resume;
- rhythm change;
- grant exhausted;
- refund/void reconciliation.

Metrics must support:

- quote conversion;
- qualified impression delivery rate;
- invalid-traffic rejection rate;
- reservation leakage/reconciliation;
- negative-balance invariant = zero;
- duplicate consumption invariant = zero;
- payment/grant mismatch invariant = zero;
- platform-loss guard violations = zero.

---

## 23. Performance and weak-network behavior

Pulse UI must remain lightweight.

Rules:

- Ring animation is optional enhancement, never needed to purchase;
- reduced-motion renders a static selector;
- Data Saver does not load decorative campaign media for purchase UI;
- quote/payment state must remain understandable on slow networks;
- visibility measurement must not cause scroll jank;
- observers are disconnected when cards leave lifecycle scope;
- high-volume event ingestion is batched where safe without losing idempotency.

---

## 24. Accessibility

Pulse Ring requires:

- keyboard/switch navigation through all three stops;
- semantic radio/segmented-control equivalent state;
- screen-reader announcement of selected tier, price, and quoted impressions;
- no information conveyed by ring color alone;
- focus restoration on sheet close;
- 200% text scaling without clipping;
- RTL/LTR logical layout;
- reduced-motion support;
- payment method labels accessible as text, not logos only.

---

## 25. Security invariants

Must remain true:

- UI visibility is not authorization;
- quote cannot be forged client-side;
- payment cannot be underpaid by changing client amount;
- grant cannot be created twice;
- balance cannot become negative;
- one reservation cannot be consumed twice;
- bot/invalid events do not silently consume fuel;
- raw internal fraud scores are not exposed;
- secret keys never enter client code;
- advertiser cannot access another advertiser's Pulse data;
- no Pulse purchase authorizes privileged/admin capability;
- Pulse cannot bypass content/moderation/safety eligibility.

---

## 26. Acceptance criteria

The design is implemented only when all of the following are proven on exact head:

1. no current ordinary publishing flow requires paid publishing entitlement;
2. no current publishing package catalog exposes 10/35/80/120 JOD;
3. no current Pulse purchase tier exceeds 20 JOD;
4. Ring exposes exactly SPARK/PULSE/SURGE at 3/10/20 JOD;
5. repeated purchases cannot raise effective intensity above SURGE;
6. server quote locks exact verified impressions before payment;
7. expired quote cannot be paid without refresh/reconfirmation;
8. purchased Pulse fuel has no calendar expiration;
9. billable impression requires ≥50% continuous visibility for ≥2 seconds plus active surface and server eligibility;
10. fast scroll/background/bot/replay/duplicate rejection consumes zero;
11. reservation-before-serve prevents overspend under concurrency;
12. Pulse Rhythm changes pacing only;
13. Pause Intelligence preserves balance;
14. Pulse Halo shows advertiser-owned compact metrics in situ;
15. public sponsored labeling is transparent without exposing private purchase data;
16. payment methods shown are provider/session truthful;
17. payment success/grant creation is idempotent and server authoritative;
18. old subscription schema/runtime dependencies are inventoried before forward removal;
19. historical migrations/docs are not falsified or silently rewritten;
20. RLS/authorization prevents cross-advertiser access;
21. no buyer/seller marketplace checkout is introduced;
22. no current config/test/launch criterion can resurrect the old publishing-subscription or >20 JOD model;
23. accessibility/reduced-motion/RTL/LTR/weak-network tests pass;
24. exact-head CI and independent review pass before integration;
25. no Production deploy/database/provider mutation occurs without its separate authorized gate.

---

## 27. Implementation decomposition after written-spec approval

Implementation will be planned as isolated TDD slices, not one destructive rewrite:

1. current-authority/deprecation contract tests;
2. conflict inventory across docs/config/runtime/schema/tests/jobs/webhooks;
3. Pulse quote contract + 3/10/20 cap;
4. payment-session/grant idempotency contract;
5. grant ledger + reservation-before-serve;
6. verified-impression qualification + dedupe/invalid-traffic boundary;
7. scheduler intensity + no-stacking cap;
8. Rhythm + Pause Intelligence;
9. Pulse Ring UI + provider-truth payment methods;
10. Pulse Halo in-situ metrics;
11. free-publishing removal of paid-entitlement gates;
12. safe forward retirement of conflicting subscription schema/runtime paths;
13. exact-head integration/security/accessibility/performance gates;
14. independent human review before any parent integration;
15. Production changes only through separately authorized release gates.

This document authorizes design/specification only. It does not authorize Production payment activation, database mutation, deployment, provider configuration changes, or merge to `main`.
