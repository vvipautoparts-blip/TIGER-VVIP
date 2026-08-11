# VVIP TIGER — OWNER BINDING DECISIONS

**Effective date:** 2026-08-12  
**Authority:** Platform Owner  
**Status:** BINDING / OWNER-CANONICAL  
**Purpose:** Preserve the owner's latest approved product, security, financial, identity, UX, TIGER PULSE, and governance decisions as repository truth. If an older design, chat note, mockup, source document, or historical requirement conflicts with this file, this file controls unless a later owner decision explicitly supersedes it.

## 1. Product constitution

VVIP TIGER follows one governing product principle:

> **Simple Surface — Private Core — Minimum Truth**

The platform may be technically sophisticated internally, but the user must experience a simple, fast, familiar, premium product. Internal security, finance, audit, authorization, risk, masking, reconciliation, and policy mechanisms must not create visible UI clutter.

Four binding rules:

1. **Minimum screen:** show only what is useful at the current step.
2. **Minimum data:** request and retain only data required for a real product purpose.
3. **Minimum authority:** grant only the capability/scope required for the exact operation.
4. **Minimum truth exposure:** deliver sensitive truth to a device only when the current user and action require it.

## 2. UX / TIGER FLOW

- Preserve Facebook-level familiarity in navigation, hierarchy, posting flow, feed cards, profile structure, notifications, messages, settings, and mobile bottom navigation, without copying Facebook branding, assets, logo, or trademark identity.
- VVIP TIGER visual identity remains independent: premium celestial/royal blue, restrained glass, clear hierarchy, low clutter, 2026 polish.
- Ordinary creation is content-first and fast: compose -> media -> publish.
- Pricing/paid visibility appears only after the listing/post is complete.
- The next logical action may be surfaced contextually, e.g. **Activate Pulse**, contact, save, request quote, or continue an incomplete task.
- Do not expose internal architecture names as product UI. Internal mechanisms such as capability tokens, masking, reconciliation, proof, or risk controls stay invisible unless an owner/admin audit view genuinely requires them.

## 3. Commercial register / business-registration prohibition — ABSOLUTE

VVIP TIGER must **not request, collect, reserve, infer, require, display, validate, store, transmit, or create a placeholder for a commercial register / business-registration record as a platform field**.

This prohibition covers all current and future:

- registration flows;
- account/profile forms;
- seller or advertiser onboarding;
- listing/post creation;
- TIGER PULSE participation;
- pricing/boosting/payment flows;
- staff/admin consoles;
- database columns/tables/views/RPCs;
- API request/response schemas;
- validation code;
- hidden fields;
- feature flags;
- placeholder UI;
- analytics events;
- export/report filters;
- tests/fixtures that imply it is an active product requirement;
- future reserved schema capacity created specifically for that information.

Terms to treat as equivalent when used as a platform data requirement include: **سجل تجاري، السجل التجاري، commercial registration, commercial register, business registration, company registration number, trade-license identifier**, and materially equivalent fields.

Historical documents may retain quoted historical wording only when provenance/audit requires immutable history. Such wording is **NON-OPERATIVE / SUPERSEDED** and must never reactivate a field or gate.

This prohibition does not prevent VVIP TIGER's own corporate/legal entities from maintaining legally required corporate records outside the user-product data model.

## 4. Ordinary publication and brand material

- No blanket human-review gate for ordinary posts/listings.
- No commercial-register gate.
- No mandatory pre-publication document upload for ordinary publication.
- No mandatory pre-publication proof-of-brand-rights field in the ordinary publishing flow.
- The platform must not encourage impersonation, fraud, or unlawful use of third-party rights. Abuse/impersonation/complaint signals may trigger targeted protective action after or around a real risk signal, without converting the ordinary posting flow into a paperwork gate.

## 5. Identity and worker role binding

- Clerk remains the external identity authority; Supabase remains the data/RLS layer.
- VVIP TIGER does not create a parallel first-party password authority.
- Every new operational/staff role assignment requires exactly one trusted identity reference: `ACCOUNT_ID` or `CLERK_USER_ID`.
- Browser-supplied identity values are never sufficient proof by themselves.
- Server-side resolution must prove that the identity binding belongs to the intended `subjectId/person` before activation/persistence.
- Missing, malformed, unverified, or mismatched binding fails closed.
- Existing historical role facts remain immutable/readable for audit.

## 6. Authorization and data exposure

A login session is not ambient administrative authority. Sensitive operations must be authorized by identity + account + capability/permission + scope + resource + action, with server-side enforcement.

- RLS is mandatory where applicable, but RLS is not the only authorization boundary.
- The server must project only fields allowed for the current purpose.
- Do not send complete sensitive data to a browser and merely hide it with CSS.
- Prefer server-side masking/tokenization/aliasing when full values are unnecessary.
- Internal IDs such as Clerk subjects, security identifiers, infrastructure identifiers, and sensitive financial internals must not be exposed merely for UI convenience.
- Employees see only data necessary for their function and scope.
- Bulk extraction/export is not implied by read permission.

## 7. Screen capture / AI / external observation privacy

No engineering claim may promise perfect prevention of every physical-camera capture or universal AI extraction. Instead the architecture must minimize useful truth delivered to the endpoint.

Binding controls:

- Sensitive views in native mobile clients should use the strongest supported platform capture protections/detection available.
- On capture/recording risk, sensitive values may be masked/withheld and require a fresh reveal.
- Highly sensitive reveals should be field-scoped, short-lived, and re-authorized.
- Session-linked forensic watermarking may be used for highly sensitive owner/finance/admin reveals without exposing raw secret identifiers.
- Public data remains public; private/internal data is projected, masked, aliased, or withheld according to purpose.
- External AI, OCR, scraper, extension, or screen-sharing software should not receive raw internal truth merely because a page is rendered.
- AI systems used by VVIP TIGER receive purpose-bounded projections/capabilities, not unrestricted database/admin access.
- Honey/canary identifiers may detect abnormal enumeration; they are detection controls, not a substitute for access control.

## 8. TIGER PULSE

TIGER PULSE remains an integrated contextual market-intelligence/visibility layer, not a cluttered ad bar and not a mandatory publication gate.

- Marketplace remains usable without paid Pulse.
- Pulse activation/paid visibility occurs after content completion.
- Ranking must preserve relevance/quality/fairness; paid influence remains bounded and cannot purchase truth or bypass eligibility.
- Verified/billable exposure requires server-verifiable evidence, de-duplication, policy versioning, and audit.
- A browser must never be trusted to declare `is_billable=true` by itself.
- Financial activation requires a valid account/identity linkage.
- Pulse financial execution must remain isolated from ordinary marketplace availability so a Pulse/financial kill switch does not take down public browsing/search.

## 9. Financial constitution

- Use one central all-sector commission policy inherited by every current and future sector unless the owner explicitly changes the global policy.
- `PRIMARY_MARKETER`: remains **4.30%**.
- Retired roles from new operational/financial assignment paths: `SECONDARY_MARKETER`, `SUPERVISOR`, `AREA_MANAGER`.
- Removed share: **10.93%**, redistributed completely and equally in exact arithmetic among:
  - `SECTOR_MANAGER`: old 4.30% + 10.93/3 = **7.943333...%** (display may round to 7.94%).
  - `COUNTRY_EXECUTIVE_COMMISSIONER`: old 5.47% + 10.93/3 = **9.113333...%** (display may round to 9.11%).
  - `MARKETING`: old 7.37% + 10.93/3 = **11.013333...%** (display may round to 11.01%).
- Rounded UI values are not the source of truth.
- Money arithmetic uses exact/fixed-point/rational or adequate decimal precision plus deterministic minor-unit reconciliation.
- No residual/unassigned amount is permitted.
- Missing recipient assignment must fail/hold with an explicit state; no silent auto-redirection or automatic promotion.
- Historical payout rows are immutable; policy changes are prospective/versioned.
- Sensitive money operations require idempotency/correlation/audit and reconciliation.
- Real Production money movement remains subject to protected Production gates.

## 10. Role retirement semantics

`AREA_MANAGER` is retired as an assignable active role, but geographic `area` remains a valid scope/dimension. Retiring a role must not erase geographic modeling or immutable historical records.

Retired role cleanup must include active assignment catalogs, permission hierarchy, payout eligibility, APIs, admin controls, reports/filters, tests, and true functional aliases. Historical/provenance references may remain explicitly classified as historical/non-assignable.

## 11. Financial resilience / simulation

Before real-money activation, financial logic must support a high-volume deterministic simulation target of **at least 5,000,000 virtual movements**, covering varied failure modes rather than repeating one happy path.

Scenarios include concurrent operations, duplicate requests, retry, network timeout, insufficient balance, partial dependency failure, reservation/capture/release/refund, disputes, role/policy changes, exposure de-duplication, and recovery/reconciliation.

Release acceptance must prove no unexplained money creation/loss, no duplicate charge caused by replay, no unbalanced journal, no unauthorized recipient, and deterministic reconciliation for the tested model. This is a test target, not a promise that software can never fail.

## 12. Security constitution

The owner requires maximum practical protection, but repository claims must remain technically truthful: no system may claim mathematically guaranteed 100%/1000% immunity from every attack.

Security design assumes individual components can fail or be compromised and minimizes blast radius:

- default deny/fail closed for privileged actions;
- least privilege and purpose-bounded data delivery;
- no secrets/service-role credentials in public browser bundles;
- no passwords/tokens/secrets in logs/audit;
- CSP/browser hardening and input/output validation;
- RLS plus server authorization;
- short-lived/scope-bounded sensitive authority;
- rate/abuse/extraction controls;
- immutable/tamper-evident audit strategy;
- dependency/supply-chain scanning;
- exact-SHA release verification;
- protected Production approvals;
- isolated backup/restore and measurable recovery rehearsals;
- AI execution remains capability-gated and audited.

Security success criterion: **no single ordinary compromise should grant unrestricted ownership of the platform, all private user data, all financial authority, and owner-level control.**

## 13. Global sovereignty

Preserve separation between global ownership/core infrastructure, local market operation, and user/market experience. Local operating roles do not own source repositories, deployment keys, domains, encryption keys, or global kill authority merely by being local operators.

Global legal/operational design must respect applicable mandatory law in targeted markets; technical sovereignty must not be implemented as a mechanism to evade lawful obligations.

## 14. Owner Control presentation

The owner requires an internal reference inside VVIP TIGER for all binding decisions and verified project state. The eventual Owner Control UI must consume a protected server-side projection of canonical owner documentation/decision records. Raw restricted governance material must not be shipped as an unauthenticated public static asset.

Owner Control should answer, with drill-down rather than clutter:

- What is the current verified state?
- What decisions are binding?
- What is implemented vs planned vs blocked?
- What requires owner/human action?
- What changed, by whom, when, and under which policy/version?

## 15. Superseded concepts / anti-clutter rule

The following are not separate user-facing products/menus merely because they were discussed as conceptual names: `TIGER CITADEL`, `TIGER SEAL`, `MIRAGE`, `TIGER DNA`, `Ω`, `Decision Capsule`, or similar internal naming.

Useful technical ideas from them may be implemented invisibly under ordinary architecture names. **Do not create a product/menu/engine name unless it improves real usability or operations.**

## 16. Current execution boundaries

- PR #190 guest-first authentication direction is preserved and must not regress.
- PR #189 is the isolated experience-convergence path and must preserve guest-first behavior.
- PR #191 is the isolated role-identity/retired-role/commission-policy path.
- Do not mix large TIGER PULSE/security/product rewrites into PR #191.
- Production DB changes, real-money activation, provider-secret changes, and protected Production deployment remain separate gated operations even when repository implementation is owner-approved.

## 17. Continuity rule

Repository/current refs and exact-head automated evidence are implementation truth. This Owner Binding Decisions file is the binding owner decision truth. A `MASTER_PROJECT_STATE` ledger records current execution cursor/state. Historical chat is supporting context, not the sole source of truth.

Required continuation pattern:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

At each material owner decision or completed execution slice, update the owner reference/state ledger so future sessions continue without rebuilding or losing approved requirements.
