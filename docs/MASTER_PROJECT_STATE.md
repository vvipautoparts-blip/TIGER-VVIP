# VVIP TIGER — MASTER PROJECT STATE

> **GitHub/current refs are implementation truth. This file is the current execution-state authority.**
> Binding owner decisions: `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`
> Current discovery/commerce authority: Issue #312 + `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`
> Prior state preserved: `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md`

**Checkpoint:** 2026-08-12 with 2026-08-22 commerce-authority correction
**Repository:** `vvipautoparts-blip/TIGER-VVIP`
**Checkpoint product/runtime base before PR #192 documentation merge:** `756dc5f7f2769e6405c98f156ba9a2484df25352`

> PR #192 carries this ledger. Merging PR #192 necessarily creates a newer `main` SHA. Therefore the SHA above is the exact product/runtime base incorporated into this checkpoint, **not** a claim that it remains the post-#192 `main`. Every continuation must resolve current `main` from GitHub before using this ledger.

> **Issue #312 correction:** For external user-to-user/user-to-provider advertised goods/services, current architecture is discovery → relevance → explanation → contact handoff, then TIGER stops. Historical transaction-value commission policy below is `HISTORICAL_EVIDENCE_ONLY`, `SUPERSEDED`, with `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`. Active finance is `KEEP_PLATFORM_FINANCE` only for platform-owned advertising, ad credits/packages, approved platform-owned services and their own refunds/adjustments/taxes/treasury/accounting. No current state in this ledger authorizes external-deal order creation, checkout, payment, payout, escrow, negotiation, settlement, fulfillment or commission.

## 1. Continuation protocol

Required operating sequence:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

Source precedence:

1. repository bytes/current refs;
2. exact-head CI/security evidence;
3. current PR/commit metadata;
4. Issue #312 / `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` for discovery-commerce authority;
5. this state ledger;
6. historical chat/prose.

Do not reuse stale authorization, fabricate human approval, bypass protected reviews, infer Production mutation/deployment, or treat a design document as runtime evidence.

## 2. Repository checkpoint cursor

At the moment this checkpoint was prepared, the exact `main` product/runtime base was:

`756dc5f7f2769e6405c98f156ba9a2484df25352`

PR #192 is a documentation/governance carrier layered on top of that base. After PR #192 merges, the actual `main` must be read from GitHub and will be newer than `756dc5f7...`.

The following material slices are already merged into the checkpoint base:

- PR #190 — guest-first public marketplace with step-up authentication for protected actions.
- PR #193 — complete removal/prohibition of commercial-register/business-registration product/data surface, with regression guard coverage.
- PR #191 — historical central all-sector commission policy, retired-role cleanup, and trusted role identity binding. Its role/identity hardening remains relevant; its transaction-value commission semantics are superseded by Issue #312 and retained only as historical evidence.
- PR #189 — VVIP TIGER experience convergence, content-first creation, seven-sector surface, modern card/FAB UX, guest-safe runtime behavior, step-up protected actions, and fail-closed publication/payment preparation.

PR #187 was closed as superseded documentation after newer verified state evidence and the owner-state ledger replaced its old post-PR186 checkpoint purpose.

## 3. Exact pre-merge verification evidence

### PR #193

Repository contract removal for commercial register/business registration was strengthened and verified before merge. The final reviewed head passed the required protected quality/security workflows before PR #193 merged into `main`.

### PR #191

Final reviewed head before merge:

`ce12f529b0b02e4f86bc3aee2635775cc81c7d52`

Protected checks on that reconciled head were GREEN:

- VVIP Quality Gate;
- V14 Release Candidate;
- CodeQL;
- TIGER CleanGuard;
- Dependency Review;
- Project Control Integrity.

Human protected review was obtained from a reviewer with write access. PR #191 then merged through the protected repository gate as merge commit:

`f3c94c1cdf9482c09731d122def8748c94164128`

Its historical commission design is no longer current business authority after Issue #312; exact historical values remain preserved for audit/provenance only.

### PR #189

Final reconciled head before merge:

`c9ff14bfaceac3ee5a22a4a93f53b2481b54e42d`

This head was built as a real two-parent merge over the post-#191 `main`, without force-push history rewriting. Direct comparison against then-current `main` proved exactly nine intended UX/Marketplace files differed.

All six required protected workflows passed on this exact head:

- VVIP Quality Gate run #754 — PASS;
- V14 Release Candidate run #212 — PASS;
- CodeQL run #641 — PASS;
- TIGER CleanGuard run #276 — PASS;
- Dependency Review run #560 — PASS;
- Project Control Integrity run #713 — PASS.

All five Copilot review threads on the UX/publication flow were resolved after code/test fixes. Human protected approval remained present. PR #189 then merged successfully as checkpoint-base commit:

`756dc5f7f2769e6405c98f156ba9a2484df25352`

## 4. Authentication invariant

The repository must preserve PR #190 behavior:

- public Marketplace browsing is guest-first;
- authentication failure must not hide public Marketplace content;
- Clerk remains the external identity authority;
- Supabase remains the application data/RLS layer;
- protected operations use step-up authentication and bounded intent resume;
- browser identifiers are not trusted as authority by themselves.

Current #189 Marketplace behavior was explicitly reconciled against this invariant. Public reads remain guest-safe, while create listing, favorite/account actions, and publication preparation use protected/step-up paths where applicable.

## 5. Product / UX state in the checkpoint base

Repository implementation includes the approved experience-convergence direction:

- premium VVIP TIGER celestial/royal-blue identity;
- low-clutter card-based Marketplace surface;
- seven approved sectors;
- content-first listing creation;
- preview before visibility/payment selection;
- visibility/pricing selection only after listing content is complete;
- modern card contact/save/share actions;
- floating create action;
- mobile-responsive behavior and reduced-motion support;
- ordinary publication does not use a blanket human-review paperwork gate;
- unavailable payment/publication transport fails closed instead of claiming false success.

A selected visibility plan is not evidence of payment entitlement. Browser-supplied receipts are not sufficient to publish. Real paid-publication transport remains a separate trusted server/Production implementation and activation gate for platform-owned advertising/services only.

## 6. Commercial register — abolished from active product/data surface

Binding decision: VVIP TIGER must not request, collect, reserve, infer, require, display, validate, store, transmit, analyze, report, or create a future placeholder specifically for commercial register/business registration as a platform field.

This prohibition covers active registration/onboarding, profile/account flows, listing/post creation, TIGER PULSE, payment/boosting, admin/operations controls, schema/API/validation, analytics/report/filter fields, hidden/reserved product fields, and tests/fixtures that present it as an active requirement.

Historical provenance may remain only when explicitly non-operative/superseded.

The active prohibition/regression guard is merged through PR #193.

## 7. Finance / historical commission / worker identity state

### Current finance authority

`KEEP_PLATFORM_FINANCE` applies only to TIGER-owned monetization and obligations: advertising, ad credits/packages, boosts/listing visibility, approved platform-owned services, and their own refunds/adjustments/taxes/treasury/accounting/provider settlement. Paid delivery remains separate from organic relevance.

For external user-to-user/user-to-provider advertised goods/services, the current platform boundary is discovery → relevance → explanation → contact handoff. TIGER does not create the external deal order, run checkout, take buyer/seller payment, hold escrow, negotiate, close, fulfill, settle, or take a percentage of deal value.

### Historical commission evidence

**Classification:** `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED_BY_ISSUE_312`
**Current effect:** `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`

The historical PR #191 commission values are retained for provenance only:

- historical `PRIMARY_MARKETER`: 4.30%;
- historical removed total share: 10.93%;
- historical redistribution to `SECTOR_MANAGER`, `COUNTRY_EXECUTIVE_COMMISSIONER`, and `MARKETING`.

Those values cannot authorize current/future transaction-value commission, payout, brokerage, or percentage-of-external-deal behavior. Exact arithmetic/reconciliation concepts may be reused only for independently allowed platform-owned finance.

Retired from new active operational/financial assignment paths:

- `SECONDARY_MARKETER`;
- `SUPERVISOR`;
- `AREA_MANAGER`.

Geographic `area` remains a valid location/scope concept. Historical retired-role facts remain readable and are not rewritten as if they never existed.

Every new operational/staff role assignment requires exactly one trusted identity reference: `ACCOUNT_ID` or `CLERK_USER_ID`.

The browser may submit a reference but cannot prove the mapping. Trusted server resolution must verify the identity/account relationship for the intended subject before persistence/activation. Missing, malformed, unresolved, ambiguous, or mismatched identity fails closed.

No part of the historical commission evidence authorizes a Production DB migration, real payout, real-money movement, or external-deal financial execution.

## 8. TIGER PULSE state

TIGER PULSE remains an owner-approved engineering direction and optional contextual intelligence/visibility layer.

Binding boundaries:

- ordinary Marketplace/search must remain available without Pulse;
- Pulse is not a mandatory publication gate;
- paid influence cannot buy truth or bypass relevance/eligibility/risk/legal gates;
- billable exposure requires trusted server evidence, de-duplication, policy versioning, identity/account linkage, audit, and financial reconciliation;
- browser-side `is_billable=true` or equivalent is never financial authority;
- Pulse/financial kill switches must not take down ordinary public browsing/search;
- Pulse finance is platform-owned advertising/service finance only, never external buyer/seller transaction execution.

Detailed engineering reference:

`docs/owner-control/TIGER_PULSE_ENGINEERING_EXECUTION_REFERENCE.md`

That document is an approved engineering reference, not proof that real-money Pulse execution is live and not authority for external-deal payment execution.

## 9. Security / privacy constitution

Core owner direction remains:

> **Simple Surface — Private Core — Minimum Truth**

Required properties include minimum screen, minimum data, minimum authority, minimum truth exposure, server-side projection/masking rather than CSS-only hiding, RLS plus server authorization where applicable, bounded capabilities/scopes for sensitive actions, no secrets/service-role credentials in public browser bundles, and purpose-bounded AI projections/capabilities.

Native sensitive views use supported capture/capture-state protections without false universal screenshot/camera immunity claims. No repository status may be described as mathematically 100%/1000% unhackable.

Security objective: no ordinary single compromise should yield unrestricted ownership of platform, all private data, all financial authority, and owner-level control.

## 10. Scale and financial acceptance targets

The 12,000,000-user figure is an engineering scale target/model, not a verified capacity claim. Registered population, DAU, concurrency, requests/second, chat/websocket concurrency, jobs, database throughput, and provider limits are separate dimensions and must be measured separately.

No release may claim support for 12 million users without reproducible representative infrastructure evidence including throughput, error rate, p50/p95/p99 latency, saturation/limits, recovery behavior, and workload mix.

Before real-money activation for platform-owned advertising/services, financial acceptance must include at least 5,000,000 varied simulated movements covering concurrency, retries, duplicates, timeout, insufficient balance, reservation/capture/release/refund, disputes, policy/role change, exposure de-duplication, dependency failure, and reconciliation.

Acceptance requires no unexplained money creation/loss, no duplicate replay charge, balanced journals where applicable, authorized recipients only, and deterministic reconciliation. Historical duplicate-commission checks may remain as regression evidence but do not imply an active commission system.

## 11. Production / deployment truth boundary

Repository implementation status and Production runtime status are separate truths.

This checkpoint does **not** claim or authorize a new Production deployment of PR #193, #191, #189, or #192.

Historical verified Production runtime evidence remains preserved in the state archive and merged PR #188. Any newer Production deployment/runtime claim must be established from fresh exact-SHA deployment, live runtime, Clerk/Supabase dependency, smoke, and protected-environment evidence.

The following remain separate protected operations unless fresh repository/environment authority proves otherwise:

- Production DB mutation/migration apply;
- real-money activation or payout;
- country activation;
- owner seeding;
- provider-secret changes;
- Clerk Production configuration changes;
- DNS/custom-domain mutation;
- protected Production deployment.

Do not infer authorization for any of these from ordinary feature implementation/merge approval.

## 12. Owner/state documentation — PR #192

PR #192 is the repository-backed owner-reference/current-state carrier.

Canonical files:

- `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` — current precedence for Issue #312 discovery/commerce authority;
- `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md` — binding owner decisions except where later explicitly superseded;
- `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md` — detailed permanent owner reference except where later explicitly superseded;
- `project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json` — machine-readable owner-decision contract with local supersession markers;
- `docs/MASTER_PROJECT_STATE.md` — current execution-state authority;
- `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md` — preserved prior state.

There must be only one active `MASTER_PROJECT_STATE.md` source. The prior duplicate root-level state file was removed from PR #192 before finalization.

Owner Control UI must eventually consume protected server-side projections of owner/state records. Raw restricted governance material must not become an unauthenticated public artifact merely because it exists in the repository.

## 13. Legacy/open PR backlog handling

Do not mass-close old PRs by age or naming alone.

Each older PR must be classified by current-main comparison and unique-content evidence before closure. Close only when it is proven merged, duplicated, superseded, or intentionally abandoned with no unique required implementation/evidence lost.

PR #187 is already proven superseded and closed. Older AI, TigerPay, identity, cost, security, staging-evidence, and related stacked PRs require individual evidence-based reconciliation; their open state does not automatically mean they should be merged or deleted.

## 14. Immediate continuation after this checkpoint

1. Resolve live `main` from GitHub after PR #192 merge; never assume the checkpoint-base SHA is still current.
2. Continue legacy/open-PR reconciliation one evidence-backed chain at a time.
3. Keep Production/country/real-money/provider mutations separately gated and explicitly evidenced.
4. Preserve Issue #312 discovery-only / zero-brokerage precedence in every new code/doc/data contract.
5. Return to deferred real-browser/manual evidence such as the PR36 real-image upload path only as a distinct manual-evidence task; do not mislabel its historical automated PASS as manual completion.
6. Checkpoint this ledger again only after a material repository/Production state transition.

## 15. Human-gate handling

When a protected human-only step is reached:

`HUMAN_GATE_PENDING`

Record the gate precisely and continue independent safe repository work where possible. Never bypass or fabricate a protected reviewer, owner approval, Production environment approval, or external provider action.