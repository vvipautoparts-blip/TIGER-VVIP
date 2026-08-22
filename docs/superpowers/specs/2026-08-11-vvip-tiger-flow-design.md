# VVIP TIGER 2026 — TIGER FLOW Product & Platform Design

Status: OWNER APPROVED DESIGN — **commerce scope amended by Issue #312**.

## Current commerce-authority amendment

Issue #312 and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` control any conflict in this older design.

For advertised goods/services, TIGER performs:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

External user-to-user/user-to-provider negotiation, agreement, purchase, payment, escrow, payout, settlement, fulfillment and deal completion occur outside TIGER. Transaction-value commission is `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED` with `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`.

Financial flows in this document are active only when they are `KEEP_PLATFORM_FINANCE`: platform-owned advertising, ad credits/packages, boosts/paid visibility, approved platform-owned advertising services, and their own refunds/adjustments/taxes/treasury/accounting. No generic term such as purchase, payment, transaction or settlement authorizes external-deal execution.

## 1. Product Constitution

VVIP TIGER shall be simple outside and powerful inside.

The user-facing product must feel immediate, familiar, calm, premium and self-explanatory. Engineering, security, platform-owned finance, authorization, audit and resilience remain mostly invisible unless the current user needs them.

Primary rule: the platform should surface the next useful action at the right moment rather than expose every possible action at once.

This operating philosophy is named **TIGER FLOW**.

## 2. Visual Identity — Binding

The approved VVIP TIGER visual language applies platform-wide, not only to authentication:

- luminous sky/cyan/royal-blue gradients;
- premium celestial depth where appropriate without harming readability or performance;
- restrained glassmorphism with translucent surfaces;
- luminous white borders and subtle glow;
- large soft radii;
- clean spacing and low visual congestion;
- compact icon-led controls rather than oversized buttons;
- responsive desktop/mobile behavior;
- Arabic RTL and English support;
- public/commercial brand labels remain presentation metadata and must not become canonical core IDs;
- no copied third-party brand assets;
- copyright year 2026 where a fixed year is rendered.

## 3. Interaction Model

Facebook is a UX familiarity reference only: familiar hierarchy, feed behavior, profile structure, navigation expectations, composer flow, compact actions and mobile navigation. VVIP TIGER must not copy Facebook branding or visual identity.

Required connected journeys:

- Feed
- Profile
- Search
- Messages
- Notifications
- Settings
- Listing/post creation
- Dashboard/operations where authorized
- Return/resume paths without user disorientation

The user should understand controls without explanation. Where text is unnecessary, use a compact familiar icon. Where ambiguity exists, combine a small icon with a short label.

## 4. TIGER FLOW Rule

For every meaningful journey, the platform must determine the most likely next useful action and surface it contextually.

Examples:

- after publishing a post, surface optional platform-owned promotion;
- after selecting a purchasable promotion, surface its advertising-service price/payment;
- after purchasing an allowed TIGER advertising service, surface its platform-service state/result;
- for an external advertised good/service, surface contact handoff rather than checkout;
- in profile, surface the highest-value account action relevant to that user;
- in management, surface decisions requiring that manager's authority before secondary information.

TIGER FLOW must never expose ten future steps at once. The interface stays progressive and contextual.

## 5. Social Post Creation — Binding

Ordinary social post creation must be content-first and frictionless:

1. open composer;
2. enter text and optional permitted media/context;
3. choose audience where applicable;
4. publish.

The ordinary social-post path must NOT require:

- commercial registration;
- business-registration evidence;
- default human/admin pre-approval;
- default manual preview before publication;
- mandatory payment before publication.

Automated platform safeguards remain permitted and required where necessary for security, abuse prevention, malware/file validation, platform integrity and mandatory legal obligations. They should run in the background and must not be converted into blanket paperwork for ordinary users.

## 6. Post-Publish Promotion

Successful publication completes before promotion is offered.

After publication, TIGER FLOW may surface a compact, optional **Promote / Boost** panel with advertising package/visibility choices and platform-service payment flow.

Promotion must never retroactively become a prerequisite for ordinary publication. Paid delivery must remain structurally separate from organic relevance/fit.

## 7. Platform-Owned Purchase & Payment Identity

This section applies only to `KEEP_PLATFORM_FINANCE` flows owned by TIGER: advertising, ad credits/packages, promotions/boosts, listing visibility and approved platform-owned advertising services.

Every allowed platform-owned purchase, promotion, subscription-like advertising service, or paid visibility action must resolve a trusted platform identity server-side.

Canonical relationship:

`Clerk user.id ↔ trusted profile/accountId ↔ authorized platform-service subject`

Rules:

- browser-supplied account IDs or Clerk IDs are not trusted as proof by themselves;
- where Clerk identity is available it should be derived automatically rather than repeatedly typed by the user;
- the server resolves and verifies the internal account relationship;
- no anonymous financial mutation;
- every allowed platform financial mutation receives an auditable correlation/idempotency reference;
- authorization is checked against the exact platform-service subject and scope;
- no buyer/seller/provider payment for an advertised good/service is created by this flow.

For external commerce, TIGER stops at contact handoff.

## 8. Worker / Staff Role Identity Binding

Every new operational role assignment must have a trusted identity binding before activation.

Permitted binding reference types are constrained by the authorization contract, currently `ACCOUNT_ID` or `CLERK_USER_ID`, with server-side resolution/verification before active role assignment.

The UI may collect/select a reference, but client input is not sufficient proof.

Historical assignments and immutable audit facts must remain readable even if a role is later retired.

## 9. Historical All-Sector Commission Policy — Superseded

**Classification:** `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED_BY_ISSUE_312`
**Current effect:** `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`

The prior commission design is retained only for provenance and regression history. It must not be used for a current or future user-to-user/user-to-provider deal.

Historical records included retired roles `SECONDARY_MARKETER`, `SUPERVISOR`, and `AREA_MANAGER`, removed-share values, redistribution targets, and historical `PRIMARY_MARKETER` percentage values. Those values are not current payout or revenue authority.

Role-retirement and exact-arithmetic lessons may remain independently reusable where compatible with current authorization or platform-owned finance. Geographic `area` remains a scope concept even though `AREA_MANAGER` is retired.

## 10. Platform Financial Engineering Principles

For allowed `KEEP_PLATFORM_FINANCE` flows, financial implementation must remain hidden from ordinary UX while enforcing strict invariants:

- double-entry accounting for ledger-impacting platform flows where applicable;
- idempotent financial commands;
- no double charge on retry/reconnect;
- no revenue recognition before advertising/service entitlement/delivery according to the applicable product rule;
- auditable receipts/correlation IDs;
- deterministic rounding in the smallest supported money unit or exact decimal representation;
- reconciliation between ad-credit/reservation/delivery/ledger/refund states;
- fail-closed behavior for inconsistent financial state;
- no silent money creation, loss or duplication.

Financial controls are engineering mechanisms, not user-facing product names and not authority for external deal execution.

## 11. Five-Million Platform-Finance/Operational Chaos Simulation

Before a materially sensitive platform-owned financial release is considered production-ready, the simulation program targets at least **5,000,000 virtual operations** across varied scenarios, not five million identical happy-path requests.

Scenario classes may include:

- platform advertising-service purchase;
- duplicate submission;
- concurrent submission;
- retries;
- timeout and reconnect;
- insufficient platform credit where applicable;
- reserve/release;
- advertising-service refund/adjustment;
- cancellation;
- chargeback where supported for TIGER-owned services;
- role/authorization changes during a flow;
- account-binding mismatch;
- duplicated exposure/billing evidence;
- partial service failure;
- recovery/reconciliation.

The run is acceptable only if defined financial invariants remain true, including no unbalanced ledger movement, no duplicate charge and no untraceable financial movement. Historical duplicate-commission assertions may remain as regression evidence but do not imply an active commission feature.

The exact performance/load environment and production capacity targets are separate from this logical simulation requirement.

## 12. Brand/Logo Handling

Ordinary publication must not require prior legal-document upload merely because a post/listing contains a third-party brand, logo or material.

The platform should instead use proportionate background integrity controls for concrete signals such as impersonation, fraud, materially deceptive claims, valid complaints or mandatory legal requests.

This rule does not grant users rights they do not possess and does not make the platform endorse infringement. It removes blanket pre-publication paperwork from the ordinary flow while preserving responsive integrity controls.

## 13. Administration — One System, Progressive Detail

Management should feel like one coherent control surface rather than a collection of disconnected admin pages.

Authorized users see only what their role/scope needs. Top-level views prioritize:

- platform-owned money/financial health;
- users/accounts;
- roles and assignments;
- sectors/scopes;
- posts/listings;
- promotion/advertising-service payment state;
- risk/exceptions;
- reports and audit evidence.

Detailed evidence is reached through drill-down. Historical external-deal commission records may be visible for audit only; they are not active operational controls.

## 14. Security & Reliability Boundaries

Mandatory principles:

- Clerk remains the identity authority unless a separately approved architecture decision changes it;
- Supabase/data policies remain governed by server/database authorization controls;
- authorization is server-enforced, never client-trusted;
- audit records must not expose secrets/tokens;
- platform-finance and authorization commands are idempotent where replay is possible;
- failures should be isolated so a paid/promotion subsystem fault does not hide the public marketplace;
- sensitive production configuration, secrets, DNS, country activation, owner seeding and production data mutation remain separately protected operations.

## 15. Release Constitution

No implementation is considered complete because code was written or a local test passed.

For the applicable scope, completion requires:

1. traceability from owner requirement to code/test;
2. RED test where behavior is changed;
3. minimal GREEN implementation;
4. focused regression tests;
5. diff/self-review;
6. authorization/security checks where relevant;
7. platform-finance invariants/reconciliation checks where relevant;
8. same-head CI checks green;
9. protected human review/approval where repository policy requires it;
10. exact-SHA deployment verification when production deployment is separately authorized.

## 16. Scope Separation

Do not collapse unrelated work into one giant pull request.

- Historical PR #189 remains experience-convergence evidence.
- Historical PR #191 role/identity hardening may remain relevant, but its transaction-value commission semantics are superseded by Issue #312.
- broader platform-owned advertising/payment-engine changes must be isolated into follow-on PRs after their dependencies are green and scoped explicitly to TIGER-owned services.
- no follow-on PR may revive buyer/seller/provider deal execution through generic financial terminology.

A later PR may integrate across these boundaries only when contracts are already proven independently and the current owner authority is preserved.

## 17. Acceptance Standard

The desired product outcome is:

**Facebook-level familiarity + premium TIGER experience + invisible enterprise-grade intelligence.**

The user should perceive simplicity, speed and polish. The platform should enforce identity, authorization, audit and allowed platform-finance rigor without making ordinary users operate internal machinery.

For external commerce, discovery remains useful and powerful but ends at contact handoff. No new feature is justified merely by novelty; it must make the journey shorter, safer, clearer, more valuable or more controllable.
