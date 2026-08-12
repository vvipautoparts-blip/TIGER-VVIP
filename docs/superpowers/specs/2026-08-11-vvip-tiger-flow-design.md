# VVIP TIGER 2026 — TIGER FLOW Product & Platform Design

Status: OWNER APPROVED DESIGN — written specification pending owner written-spec review before new feature implementation.

## 1. Product Constitution

VVIP TIGER shall be simple outside and powerful inside.

The user-facing product must feel immediate, familiar, calm, premium and self-explanatory. Engineering, security, finance, authorization, audit and resilience remain mostly invisible unless the current user needs them.

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
- official VVIP TIGER identity only; no placeholder branding;
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

- after publishing a post, surface optional promotion;
- after selecting a purchasable promotion, surface price/payment;
- after purchase, surface transaction state/result;
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

After publication, TIGER FLOW may surface a compact, optional **Promote / Boost** panel with package/visibility choices and payment flow.

Promotion must never retroactively become a prerequisite for ordinary publication.

## 7. Purchase & Payment Identity

Every purchase, promotion, subscription, paid visibility or other financial transaction must resolve a trusted platform identity server-side.

Canonical relationship:

`Clerk user.id ↔ trusted profile/accountId ↔ authorized transaction subject`

Rules:

- browser-supplied account IDs or Clerk IDs are not trusted as proof by themselves;
- where Clerk identity is available it should be derived automatically rather than repeatedly typed by the user;
- the server resolves and verifies the internal account relationship;
- no anonymous financial mutation;
- every financial mutation receives an auditable correlation/idempotency reference;
- authorization is checked against the transaction subject and scope.

## 8. Worker / Staff Role Identity Binding

Every new operational role assignment must have a trusted identity binding before activation.

Permitted binding reference types are constrained by the authorization contract, currently `ACCOUNT_ID` or `CLERK_USER_ID`, with server-side resolution/verification before active role assignment.

The UI may collect/select a reference, but client input is not sufficient proof.

Historical assignments and immutable audit/financial facts must remain readable even if a role is later retired.

## 9. All-Sector Central Commission Policy

Commission policy applies centrally to every current and future sector; it must not be manually duplicated per sector.

Retired from new operational/commission paths:

- `SECONDARY_MARKETER`
- `SUPERVISOR`
- `AREA_MANAGER`

The removed total is 10.93% and is redistributed completely among:

- `SECTOR_MANAGER`
- `COUNTRY_EXECUTIVE_COMMISSIONER`
- `MARKETING`

`PRIMARY_MARKETER` remains 4.30%.

The money engine must use deterministic exact-sum handling so rounding cannot create unallocated or duplicated value. Presentation percentages may be rounded for display; money settlement must preserve the exact total.

## 10. Financial Engineering Principles

The financial implementation must remain hidden from ordinary UX while enforcing strict invariants:

- double-entry accounting for ledger-impacting flows where applicable;
- idempotent financial commands;
- no double charge on retry/reconnect;
- no revenue recognition before entitlement/delivery according to the applicable product rule;
- auditable receipts/correlation IDs;
- deterministic rounding in the smallest supported money unit or exact decimal representation;
- reconciliation between wallet/reservation/delivery/ledger/refund states;
- fail-closed behavior for inconsistent financial state;
- no silent money creation, loss or duplication.

Financial controls are engineering mechanisms, not user-facing product names.

## 11. Five-Million Financial/Operational Chaos Simulation

Before a materially sensitive financial release is considered production-ready, the simulation program targets at least **5,000,000 virtual operations** across varied scenarios, not five million identical happy-path requests.

Scenario classes include:

- normal purchase;
- duplicate submission;
- concurrent submission;
- retries;
- timeout and reconnect;
- insufficient balance;
- reserve/release;
- refund;
- cancellation;
- chargeback/adjustment where supported;
- role/authorization changes during a flow;
- account-binding mismatch;
- duplicated exposure/billing evidence;
- partial service failure;
- recovery/reconciliation.

The run is acceptable only if the defined financial invariants remain true, including no unbalanced ledger movement, no duplicate charge, no duplicate commission and no untraceable financial movement.

The exact performance/load environment and production capacity targets are separate from this logical simulation requirement.

## 12. Brand/Logo Handling

Ordinary publication must not require prior legal-document upload merely because a post/listing contains a third-party brand, logo or material.

The platform should instead use proportionate background integrity controls for concrete signals such as impersonation, fraud, materially deceptive claims, valid complaints or mandatory legal requests.

This rule does not grant users rights they do not possess and does not make the platform endorse infringement. It removes blanket pre-publication paperwork from the ordinary flow while preserving responsive integrity controls.

## 13. Administration — One System, Progressive Detail

Management should feel like one coherent control surface rather than a collection of disconnected admin pages.

Authorized users see only what their role/scope needs. Top-level views prioritize:

- money/financial health;
- users/accounts;
- roles and assignments;
- sectors/scopes;
- posts/listings;
- promotion/payment state;
- risk/exceptions;
- reports and audit evidence.

Detailed evidence is reached through drill-down. The manager should not need ten screens to understand one transaction.

## 14. Security & Reliability Boundaries

Mandatory principles:

- Clerk remains the identity authority unless a separately approved architecture decision changes it;
- Supabase/data policies remain governed by server/database authorization controls;
- authorization is server-enforced, never client-trusted;
- audit records must not expose secrets/tokens;
- financial and authorization commands are idempotent where replay is possible;
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
7. financial invariants/reconciliation checks where relevant;
8. same-head CI checks green;
9. protected human review/approval where repository policy requires it;
10. exact-SHA deployment verification when production deployment is separately authorized.

## 16. Scope Separation

Do not collapse unrelated work into one giant pull request.

- PR #189 remains the primary experience-convergence track: login visual language, feed/profile/navigation/composer/listing UX and TIGER FLOW presentation.
- PR #191 remains the finance/authorization track: central all-sector commission policy, retired roles, trusted identity binding and related authorization invariants.
- broader payment/promotion/financial-engine changes should be isolated into follow-on PRs after their dependencies are green.

A later PR may integrate across these boundaries only when the contracts are already proven independently.

## 17. Acceptance Standard

The desired product outcome is:

**Facebook-level familiarity + VVIP TIGER luxury + invisible enterprise-grade intelligence.**

The user should perceive simplicity, speed and polish. The platform should enforce financial, identity, authorization and audit rigor without making ordinary users operate the internal machinery.

No new feature is justified merely by novelty. A feature must make the journey shorter, safer, clearer, more valuable or more controllable.
