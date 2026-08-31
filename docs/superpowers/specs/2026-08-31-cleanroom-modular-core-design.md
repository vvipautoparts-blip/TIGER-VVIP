# TIGER Clean-Room Modular Core — Approved Design

**Date:** 2026-08-31  
**Design path:** Architectural  
**Owner choice:** Approach A — Clean-Room Modular Core  
**Status:** DESIGN APPROVED IN CHAT / WRITTEN SPEC FOR OWNER REVIEW  
**Implementation:** NOT STARTED  
**Production mutation:** NONE

## 1. Authority and precedence

This design implements the owner decisions captured on 2026-08-30 and 2026-08-31 under the governing rule that the latest explicit owner decision wins within overlapping scope. Older code, documents, schema, tests, UI, or runtime behavior that conflicts with these decisions is historical evidence only and must not govern the new baseline.

The design does not authorize Production deployment, real payment capture, money movement, destructive legacy deletion, user identity merging, provider replacement, or merging into `main`.

## 2. Goal

Build a clean, global, low-cost-to-start platform core that can scale with demand while preserving a familiar Facebook-style social interaction model and enforcing the current paid visibility, finance, identity, sector, role, reporting, and video rules server-side.

Guiding principle:

> Global from architecture, small from cost, scale from demand.

## 3. Architectural choice

Use a **modular monolith** with strong internal boundaries and server-authoritative contracts. Each module owns one business responsibility and communicates through explicit interfaces/events. The design deliberately avoids premature microservices, duplicated runtimes, and legacy compatibility paths.

The initial modules are:

1. Identity
2. Sectors & Taxonomy
3. Social
4. Visibility Card
5. Verified Impressions
6. Sales Attribution
7. Financial Ledger
8. Roles & Capabilities
9. Video Entitlement
10. Reporting & Audit

These are logical boundaries first. They may share one deployable application/database initially while remaining separable later.

## 4. Identity boundary

TIGER is not a password authority.

Required behavior:

- no TIGER password field;
- no password confirmation field;
- no TIGER password reset/recovery flow;
- no local email+password product path;
- TIGER consumes only verified identity/session results from an approved external identity mechanism;
- external credential recovery stays with the external identity provider;
- provider selection remains a separate architecture decision;
- legacy password hashes or credential state must not be copied into the clean product identity model.

The platform stores a stable internal `user_id` plus one or more verified external subject mappings. Authorization always resolves through the internal identity.

## 5. Sector and naming model

The current working top-level structure contains exactly ten sectors:

- `SEC-001` — قطع غيار المركبات
- `SEC-002` — خدمات المركبات والخدمات المرتبطة بها
- `SEC-003` — المواد والتموين
- `SEC-004` — العقارات
- `SEC-005` — المقاولات والبناء
- `SEC-006` — الخدمات والمهن والحرف
- `SEC-007` — المعدات والآليات
- `SEC-008` — التجارة والأعمال والتوريد
- `SEC-009` — الهندسة والاستشارات
- `SEC-010` — التصميم

`SEC-003` remains one top-level sector with categories/subcategories beneath it.

Technical rules:

- immutable internal IDs are relational keys;
- display labels are localized/configurable metadata;
- rename/hide/reorder/merge/split/add/retire operations must not break posts, payments, permissions, analytics, subscriptions, or references;
- brand/product labels must not be embedded as relational identities;
- current TIGER/VVIP/Pulse naming is working vocabulary, not an immutable architecture key.

## 6. Social core

The social product targets complete Facebook-style functional and interaction familiarity where applicable, while using original branding, assets, code, and identity.

Required capability families:

- Home/feed;
- profile;
- post composition and reading;
- reactions;
- comments/replies;
- authorized sharing/reposting;
- search/discovery;
- relationships/friends/follow where applicable;
- messages;
- notifications;
- responsive desktop/mobile navigation and states.

A placeholder, static mock, dead button, or unpersisted demo does not count as a completed feature.

Fine-grained social rules whose latest 2026-08-30/31 source text has not yet been recovered — including exact like/comment/message visibility, fixed post-card geometry/image crop wording, and exact intent-switching search wording — remain **SOURCE-RECOVERY-LOCKED**. The implementation must not infer those policies from legacy defaults.

## 7. Post and paid Visibility Card lifecycle

There is no free publishing and no free visibility bypass.

A post lifecycle is:

`DRAFT -> READY_FOR_CARD -> CARD_PAID_AND_VERIFIED -> ACTIVE -> CARD_QUOTA_EXHAUSTED -> CARD_ENDED -> +24 HOURS -> EXPIRED`

Rules:

- a prepared post cannot enter active platform visibility without a valid paid Visibility Card;
- payment/card entitlement is verified server-side;
- client state cannot create or bypass entitlement;
- current approved card prices are exactly `2 / 10 / 20 / 45 JOD`;
- there is no day-based card lifetime;
- the card ends only when its purchased verified-impression quota is fully exhausted;
- invalid, failed, duplicate, fraudulent, or otherwise unqualified delivery does not burn purchased quota;
- the card end transition is idempotent and occurs once;
- `POST_EXPIRES_AT = VISIBILITY_CARD_END + 24 HOURS`;
- after that timestamp the post is removed from active publication according to the product retention policy without erasing financial/audit history.

Legacy free-post, optional-only Pulse, non-expiring visibility, and `25 JOD` product semantics are excluded from the active baseline.

## 8. Visibility targeting and pace

After the post is fully prepared, the paid Visibility Card flow supports:

- exactly one active sector or all eligible sectors;
- supported geography including neighborhood, area, governorate, district/liwa, and country;
- no day count shown or sold;
- user-facing pace labels exactly `بطيء / جيد / سريع`.

The pace label is an internal delivery-control abstraction. It must not imply a calendar expiration date.

Legacy `NOW / SMART / PRECISE` user-facing Pulse vocabulary is not the approved product contract. Reusable scheduling primitives may be retained behind the new pace abstraction if they pass the Migration Firewall.

## 9. Verified impression engine

Verified-impression accounting is server-authoritative and evidence-based.

Each candidate delivery must pass a qualification pipeline before quota consumption. The system must prevent:

- duplicate burn;
- replay burn;
- client-forged burn;
- failed-delivery burn;
- unqualified-delivery burn;
- race-condition over-consumption.

Reusable ProofView / ZERO-BURN / reservation / idempotency primitives from the legacy branch may be salvaged only after removing stale product semantics.

The quota counter and card-end transition must be atomic.

## 10. Sales attribution

Current commission-bearing sales roles are independent:

- `GENERAL_MANAGER` — 7%
- `SECTOR_MANAGER` — 7%
- `MARKETER` — 7%

`SALES_ADMINISTRATION = 21%`, but one purchase has exactly one winning sales role and therefore at most one 7% sales commission.

Required properties:

- every eligible role holder has a stable internal identity;
- every purchase gets exactly one server-authoritative attribution result or `NO_CLAIMANT`;
- no hierarchical parent-child commission chain is required;
- concurrent/replayed requests cannot create duplicate winners or duplicate commission;
- attribution is auditable and immutable for the captured transaction;
- non-winning/transaction-absent role shares route to OWNER (or an explicitly owner-authorized financial destination) with immutable reason codes.

The model must scale to very large independent populations of each role.

## 11. Self-service discount

If a paid Visibility Card purchase has no valid attributed `GENERAL_MANAGER`, `SECTOR_MANAGER`, or `MARKETER`:

- the user receives an immediate visible 7% self-service/active-user discount before payment;
- checkout shows original amount, discount, and final amount;
- no sales role earns commission;
- discount activity is recorded in a dedicated immutable discount ledger view;
- transaction-absent sales shares route according to the current owner routing rules with reason codes.

If a valid sales claimant exists, the 7% self-service discount does not apply.

## 12. Financial ledger

The financial engine is ledger-first, atomic, idempotent, and auditable.

Current beneficiary allocations:

- OWNER — 5%
- PARTNER_1 — 5%
- PARTNER_2 — 5%
- PARTNER_3 — 5%
- ACTUAL_OPERATIONS — 43%
- SALES_ADMINISTRATION — 21%

Known beneficiary allocation total = 84%.

The former `TAX_RESERVE = 16%` is cancelled. It must not exist as an active tax beneficiary. The unresolved 16% is carried as non-beneficiary `PENDING_OWNER_REALLOCATION` suspense so each captured transaction balances mathematically to 100% without inventing a beneficiary.

`ACTUAL_OPERATIONS = 43%` exactly:

- Risk 8%
- Maintenance 8%
- Development 8%
- Technical Support 8%
- Advertising 8%
- CSR 3%

No component may execute a beneficiary distribution for the pending 16% until an explicit later owner decision assigns it.

Successful capture posts the accounting entries immediately. Immutable transaction/history rows are never erased by later settlement.

## 13. Payout settlement

For commission-bearing roles:

- payout destination is requested when the role is granted;
- valid destination must be supplied within 12 hours;
- absent/invalid destination suspends the relevant payout eligibility/role entitlement under the approved policy;
- OWNER may explicitly extend the grace period;
- eligible payout settlement runs every 14 days;
- settlement may zero the current payable bucket after successful payout while preserving immutable earned/transaction history;
- suspension, extension, reroute, zero-commission outcome, settlement, and payout events are recorded.

No real payout is activated by this design document.

## 14. Roles and capabilities

Use the existing fail-closed `صلاحياتي` capability-passport concept as a reusable UI/security primitive, but rebuild the live role registry around the current owner model.

Rules:

- server is the authority for role/capability state;
- missing or invalid capability state yields no permission;
- OWNER has full platform authority as defined by current policy;
- owner-authorized delegates receive explicit bounded scopes;
- PARTNER/reporting scopes are explicit, not inferred;
- sales roles are commission-attribution roles, not implicit global admin roles;
- all grants, revocations, delegations, suspensions, and scope changes are auditable.

## 15. Video entitlement

Video is a real product capability but is disabled by default for every ordinary user.

Required authorization:

- default `video_enabled = false`;
- only OWNER can grant or revoke video for a specific user;
- no self-activation;
- server-authoritative enforcement;
- UI hiding alone is insufficient;
- API, alternate routes, stale clients, or client tampering cannot bypass entitlement;
- authorization fails closed if entitlement state is missing or invalid.

## 16. Reporting and audit

The platform must provide detailed and aggregate reporting for:

- purchases;
- financial ledger movements;
- 7% self-service discounts;
- sales attribution;
- winning/non-winning/absent roles;
- commissions;
- payout eligibility;
- suspensions/extensions;
- settlements/payouts;
- pending-owner 16% suspense;
- visibility-card quota and verified-impression consumption;
- relevant authorization/audit events.

OWNER receives full reporting authority. Delegates and PARTNER roles receive only explicitly authorized scopes.

Reports are projections over immutable source events/ledger entries; reporting must not become a second source of financial truth.

## 17. Transaction boundaries and idempotency

The critical paid-purchase operation must behave as one idempotent business transaction:

1. validate identity/session;
2. validate prepared post and sector/targeting;
3. resolve sales attribution exactly once;
4. calculate optional 7% self-service discount;
5. confirm/capture payment through the future approved payment adapter;
6. create Visibility Card entitlement;
7. post balanced ledger entries including pending-owner suspense;
8. activate the post;
9. emit immutable audit events.

A replay with the same idempotency key returns the prior result and must not create another payment, card, post activation, commission, or ledger posting.

## 18. Error handling / fail-closed rules

The system must reject or hold safely when:

- identity cannot be verified;
- sector is inactive/invalid;
- payment status is unverified;
- card entitlement is missing;
- attribution is ambiguous;
- ledger cannot balance to 100%;
- a requested beneficiary would consume the pending 16%;
- impression qualification cannot be proven;
- video entitlement cannot be proven;
- role/capability state is invalid;
- replay/idempotency guarantees cannot be established.

User-visible failures must not silently create partial money/entitlement state.

## 19. Migration Firewall

Every legacy artifact is classified before entry into the clean baseline.

### KEEP / SALVAGE

- ProofView / ZERO-BURN / idempotency ideas;
- dynamic sector-registry pattern;
- server-side sector revalidation pattern;
- social feed/comments/reactions/friends/messages/profile/search primitives that pass behavior/security review;
- federated identity boundary;
- fail-closed `صلاحياتي` UI pattern;
- finance V2 invariants/validator expectations.

### TRANSFORM

- post composer -> mandatory paid-card gate;
- old Pulse allocation -> current per-post card lifecycle;
- old targeting -> current card targeting contract;
- `NOW/SMART/PRECISE` -> `بطيء/جيد/سريع` user contract;
- brand-bound IDs -> neutral stable IDs;
- legacy sector model -> ten-sector registry;
- legacy identity mappings -> clean external-subject mapping.

### BUILD NEW

- current payment/checkout orchestration;
- balanced immutable ledger runtime;
- one-winner sales attribution runtime;
- discount ledger runtime;
- payout destination/grace/settlement engine;
- owner/delegated financial reporting;
- owner-only per-user video entitlement;
- missing social modules required for parity;
- current live role registry and assignment lifecycle.

### REJECT FROM ACTIVE BASELINE

- free publishing;
- free visibility bypass;
- optional-only paid visibility as the product rule;
- non-expiring card product semantics;
- `25 JOD` tier;
- active `TAX_RESERVE` beneficiary;
- hard-coded 3-sector constraints;
- fake/placeholder features represented as complete;
- password-based TIGER product paths;
- stale documents/config that can override current owner authority.

No destructive legacy deletion occurs until replacement, backup, restore test, and owner verification are complete.

## 20. Testing strategy

Implementation must be test-driven at module and integration boundaries.

Mandatory acceptance tests include:

- cannot publish without valid paid card;
- cannot create free visibility;
- card does not end by calendar time;
- card ends exactly at verified quota exhaustion;
- invalid/unqualified impression does not burn quota;
- concurrent impressions cannot over-consume quota;
- post expiry equals card end + exactly 24 hours;
- only prices 2/10/20/45 are accepted;
- 25 JOD is rejected as current product tier;
- one purchase produces at most one 7% sales winner;
- no claimant produces visible 7% discount;
- valid claimant suppresses self-service discount;
- replayed purchase cannot double-charge/post commission/ledger/card;
- transaction ledger balances to 100%;
- pending 16% has no beneficiary;
- TAX_RESERVE cannot reappear as active allocation;
- ACTUAL_OPERATIONS totals exactly 43%;
- payout cadence is 14 days;
- payout destination grace is 12 hours and OWNER extension is auditable;
- ordinary user cannot self-enable video;
- non-entitled video API call fails closed;
- TIGER has no local password/create/confirm/reset path;
- inactive/unknown sector cannot be published into;
- display-label rename does not break relational references;
- missing role/capability view yields no privilege;
- reporting projections reconcile to immutable ledger/audit sources.

## 21. Verification and release gates

No feature is marked implemented or complete because a document, commit title, test file, or UI shell exists.

Required gates:

`Exact SHA -> automated tests -> security/authorization checks -> schema verification -> working Preview -> owner acceptance -> release decision`

Production remains untouched until a later explicit release authorization.

## 22. Non-goals for this design phase

This specification does not choose:

- final public platform name;
- final identity provider vendor;
- final source-control/hosting vendor;
- final payment provider;
- final destination of the pending 16%;
- unrecovered fine-grained social privacy/card-geometry/search-wording policies.

Those items must not be invented by implementation.

## 23. Design success criteria

This design is successful when the implementation plan can decompose the work into independently testable slices without reintroducing legacy product semantics, and every slice has a direct trace from owner decision -> design contract -> code/schema -> test -> preview evidence.

The first implementation slice should establish the invariant-heavy foundation: identity boundary, neutral IDs/sector registry, paid-card state machine, verified-impression contract, transaction/idempotency envelope, finance ledger invariants, and fail-closed authorization interfaces before broad UI expansion.
