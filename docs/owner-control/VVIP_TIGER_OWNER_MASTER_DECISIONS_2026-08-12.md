# VVIP TIGER — Owner Master Decisions

**Authority:** OWNER APPROVED
**Effective date:** 2026-08-12
**Purpose:** Permanent owner reference for the currently approved product, UX, identity, finance, authorization, privacy and security direction. This document records decisions; implementation status is tracked separately in `MASTER_PROJECT_STATE.md`.

## 1. Governing product principle

VVIP TIGER is governed by:

> **Simple Outside. Powerful Inside.**

Visible complexity must be minimized. Security, finance, audit, reconciliation, authorization and risk controls work behind the interface. Innovation is judged by fewer steps, clearer actions, stronger invisible controls and lower operational error—not by adding user-facing engines, names or dashboards.

### TIGER FLOW

Every surface should present the next useful action at the right moment without flooding the user with options. The system may contain many capabilities internally, but each user sees only what is relevant to the current context and authority.

## 2. Visual identity and UX

The approved visual reference is a premium celestial/royal-blue VVIP identity:

- luminous sky/royal-blue gradients;
- depth and soft light;
- transparent Glassmorphism cards;
- luminous white borders;
- royal-blue gradient primary actions;
- large soft corners, controlled glow and clean spacing;
- responsive desktop/mobile;
- Arabic RTL and English LTR;
- VVIP TIGER brand only; no Facebook trademarks, logos or proprietary assets.

Facebook is a familiarity reference for **UX / flow / hierarchy / interaction**, not a brand reference. Required familiarity includes fixed top navigation, composer at the top, horizontal stories/content, vertical feed cards, direct card actions, predictable Home/Profile/Search/Notifications/Messages/Settings navigation, profile cover/avatar/actions/tabs, and a fixed mobile bottom navigation.

Buttons must be compact, visually understandable and proportionate. Avoid oversized or noisy controls.

## 3. Login and authentication

The published guest-first behavior from PR #190 is protected and must not regress.

- Public marketplace/content remains browsable without forcing login.
- Clerk remains the identity authority.
- Supabase remains the application data/RLS layer.
- Authentication is stepped up only for protected actions.
- Login uses the approved celestial-blue/glass VVIP TIGER design.
- Protected intent may resume safely after authentication.
- Auth failure must not hide the public marketplace.

## 4. Social post creation

Ordinary social posting follows familiar Facebook-like simplicity:

`compose -> optional media -> audience/context as applicable -> publish`

Binding rules:

- no commercial-registration document is required for an ordinary social post;
- no default human/administrator pre-publication approval;
- no default manual preview queue before publishing;
- payment is not required before an ordinary social post becomes visible;
- normal automated security, abuse, malware, file and legally mandatory controls may run in the background without turning the ordinary flow into a paperwork workflow;
- ordinary post UX must remain short, direct and mobile-first.

## 5. Funding after publication

After a post is successfully published, the next contextual action may be a compact optional card such as **Fund / Boost this post**.

- funding is offered after successful publication, not as a condition to publish;
- the user chooses package/visibility and payment in the follow-up flow;
- social post publication remains distinct from paid exposure;
- paid visibility must never silently rewrite the original post.

Commercial marketplace listings likewise complete their content first; any paid exposure/visibility step follows the completed listing flow according to the approved commercial policy.

## 6. Purchase, payment and account identity

Any purchase, funding, subscription or payment initiated by a signed-in VVIP TIGER user must be bound server-side to:

`Clerk user.id <-> canonical VVIP accountId/profile`

Rules:

- browser-entered account identifiers are references, not proof;
- the server resolves the canonical identity/account relation;
- anonymous or mismatched protected financial operations fail closed;
- do not invent a parallel account-number authority if the canonical `accountId` already exists;
- identity evidence and financial evidence must remain traceable through correlation/idempotency/audit identifiers.

## 7. Worker/staff role identity binding

Every new operational/staff role assignment must contain exactly one trusted reference:

`ACCOUNT_ID` or `CLERK_USER_ID`.

Before activation the server must prove that the reference resolves to the same canonical subject/account. Missing, malformed, ambiguous, unresolved or mismatched identity fails closed. The browser cannot self-assert authority.

## 8. Global commission policy — every sector

The commission decision applies centrally to **every current and future sector**. Sector-local copies/overrides of the retired role distribution are not allowed.

Retired financial/operational roles:

- `SECONDARY_MARKETER` — old 4.30%;
- `SUPERVISOR` — old 3.12%;
- `AREA_MANAGER` — old 3.51%.

Removed total: **10.93%**.

It is redistributed equally and exactly among:

- `SECTOR_MANAGER`: nominal `7.943333...%`, display `7.94%`;
- `COUNTRY_EXECUTIVE_COMMISSIONER`: nominal `9.113333...%`, display `9.11%`;
- `MARKETING`: nominal `11.013333...%`, display `11.01%`.

`PRIMARY_MARKETER` remains **4.30%**.

Financial calculation must use exact rational/fixed-point/integer minor-unit logic, not rounded display percentages or binary floating-point money arithmetic. Any indivisible remainder is resolved deterministically with no silent loss and no systematic fixed beneficiary bias. Historical financial facts are not rewritten.

`area_manager` is retired as an active role; geographic `area` may remain a valid location/scope concept.

## 9. TIGER PULSE

TIGER PULSE remains an internal contextual market-intelligence/visibility capability, not a reason to complicate the normal user experience.

- organic relevance/quality remains dominant;
- paid visibility cannot purchase truth or override core eligibility;
- the base marketplace must continue operating if paid Pulse functions are disabled;
- financial delivery requires verifiable evidence before billing/recognition;
- launch of real-money Pulse remains separately gated.

## 10. Security architecture — TIGER SEAL

The approved security direction is **TIGER SEAL**, not TIGER CITADEL.

Core invariant:

> **One sensitive action -> one bounded authority seal.**

A sensitive action is authorized from trusted server context using the smallest necessary combination of identity, canonical account, role/capability, scope, exact resource, exact action, purpose, policy version, freshness/expiry, nonce/idempotency and any relevant financial limit. Ambient `admin=true` style authority is not sufficient.

Additional governing security properties:

- no single browser/session/employee/service compromise should own the whole platform;
- no self-elevation;
- least privilege and purpose-bound access;
- split knowledge: no ordinary component should receive the complete private picture of a user unless strictly required;
- private truth should not travel unnecessarily;
- secrets/tokens must not enter client bundles, normal logs or AI contexts;
- sensitive operations must remain auditable and bounded;
- suspicious access should be containable at the smallest capability/session/account boundary rather than requiring a whole-platform shutdown.

## 11. TIGER MIRAGE — privacy projection inside TIGER SEAL

MIRAGE is a security/privacy behavior inside TIGER SEAL, not a separate user-facing product.

### Truth separation

Private canonical truth remains server-side where possible. Clients receive a minimum projection suitable for the current purpose:

- masked values;
- short-lived aliases/tokens;
- field-level withholding;
- aggregated values where raw detail is unnecessary.

Do **not** rely on CSS-hidden raw values. If the client does not need a private value, the server must not send it.

### Ephemeral reveal

Where a sensitive value must be shown, reveal should be field/action scoped, short-lived and re-authorized when risk requires it. A prior reveal must not create an indefinite right to read all related data.

### No fake financial truth

MIRAGE must not show fabricated money, balances, payout status or transaction facts to the legitimate user. Protection uses masking, tokenization, aliasing and withholding—not deceptive financial values.

## 12. Screenshot, screen recording and visual extraction

For sensitive views, VVIP TIGER must use platform-supported screenshot/screen-capture protections in native applications where available, plus capture-state response, masking and watermarking where appropriate.

However, no engineering claim may state that screenshots or photography can be prevented with mathematical 100% certainty on every device. An external camera can always photograph a displayed value. Therefore the primary control is **not delivering unnecessary private truth to the display**.

Critical views may be classified **native-secure-only** and unavailable in full form on ordinary web clients. When screen recording/capture/mirroring is detected on supported platforms, the safe behavior is to switch sensitive fields to a protected/MIRAGE projection and require a new reveal afterward.

Sensitive reveals may carry non-secret forensic watermark evidence tied to session/account/time/device context without exposing the underlying identifiers.

## 13. AI-safe projection and anti-extraction

VVIP TIGER must not intentionally provide private canonical user, financial, operational, security or infrastructure truth to external AI systems merely because an AI tool asks for it or a user opens an AI integration.

AI-facing/integration-facing data must use a dedicated **AI-safe projection**:

- public data remains public;
- private identifiers are masked/aliased/withheld;
- Clerk IDs, secrets, tokens and infrastructure internals are never exposed;
- finance/authorization internals are aggregated or purpose-bounded unless a separately approved trusted workflow explicitly requires a narrow field;
- internal AI receives capabilities, not root/admin credentials;
- AI cannot move real money, grant high authority or deploy Production merely from model output.

The platform cannot control a third-party AI after a user deliberately photographs or manually shares a legitimately revealed value. Security therefore reduces reveal surface and duration rather than making a false absolute promise.

### Anti-extraction controls

High-value data access may use:

- account/session/resource/time-based query budgets;
- pagination and bounded export;
- anti-enumeration controls;
- anomaly/rate signals;
- short-lived signed access to private media;
- automatic step-up/quarantine for abnormal extraction patterns.

### Ghost/canary data

Non-production-truth canary identifiers may be placed only in controlled security surfaces where normal application behavior never needs them. Access to such canaries is a security signal. Canary data must never contaminate legitimate financial, user or marketplace truth.

## 14. Financial reliability and testing

Financial logic is fail-closed and auditable. Architecture should preserve double-entry/reconciliation/idempotency semantics where money movement is introduced.

Before real-money activation, the test program must include at least **5,000,000 simulated financial/operational movements** across mixed scenarios such as retries, duplicate requests, concurrency, timeouts, refunds, insufficient balance, role/account rebinding, delayed services, duplicate delivery evidence and recovery.

A large test count alone is not acceptance. Required invariants include zero double charge, zero duplicate commission, exact reconciliation, no unknown money origin/destination and deterministic replay for idempotent operations.

## 15. Production and release integrity

Production release authority remains protected even when the owner has approved implementation intent.

Required principles:

- GitHub/main is the code source of truth;
- deployed artifacts must be attributable to an exact Git SHA;
- security/quality checks apply to the same head being reviewed;
- no direct Production database mutation from a design document;
- no secret/DNS/Clerk/real-money activation without the appropriate protected production gate;
- high-impact security/financial changes require rollback/recovery evidence;
- implementation authorization does not mean bypassing branch/environment protections.

## 16. Superseded / rejected directions

The following must not be reintroduced as current product requirements unless the owner makes a new explicit decision:

- mandatory commercial-registration upload for an ordinary social post;
- default administrator/human approval before ordinary post publication;
- default manual preview queue for ordinary posting;
- a `BRAND_REVIEW_REQUIRED` precondition that blocks the ordinary publish flow merely because external branding appears;
- using a commercial-register approval as a hidden ranking requirement for ordinary users;
- `TIGER CITADEL 2026` as the chosen security architecture — rejected;
- turning internal architecture names into dozens of user-facing products/screens;
- claiming mathematically guaranteed `100%` or `1000%` unhackability or screenshot prevention.

Normal legal obligations, abuse response, fraud handling, valid complaints and mandatory platform obligations remain enforceable without converting the ordinary publishing experience into a paperwork-first workflow.

## 17. Owner reference rule

This document is the owner-approved decision baseline until superseded by a newer dated owner decision. `MASTER_PROJECT_STATE.md` records implementation truth and must distinguish clearly among:

- `APPROVED_NOT_IMPLEMENTED`;
- `IMPLEMENTING`;
- `IMPLEMENTED_NOT_PRODUCTION`;
- `PRODUCTION_VERIFIED`;
- `BLOCKED_HUMAN_GATE`.

No conversation summary, developer assumption, UI label or old historical document may silently override this owner baseline.