# VVIP TIGER — MASTER PROJECT STATE

> **GitHub/current refs are implementation truth. This file is the current execution-state authority.**
> Binding owner decisions: `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`
> Prior state preserved: `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md`

**Checkpoint:** 2026-08-19 — Dynamic Yield V2 feature-branch checkpoint
**Repository:** `vvipautoparts-blip/TIGER-VVIP`
**Current implementation branch:** `feat/dynamic-yield-ledger-v2-20260819`
**Current branch base:** `923eb43dcaec6876ec7bacfae3932313145ac3fa`
**Checkpoint product/runtime base before PR #192 documentation merge:** `756dc5f7f2769e6405c98f156ba9a2484df25352`

> The 2026-08-19 checkpoint records repository implementation on the named feature branch only. It does not claim merge, Production deployment, database apply, provider activation, payout readiness, or real-money execution.

> PR #192 carries this ledger. Merging PR #192 necessarily creates a newer `main` SHA. Therefore the SHA above is the exact product/runtime base incorporated into this checkpoint, **not** a claim that it remains the post-#192 `main`. Every continuation must resolve current `main` from GitHub before using this ledger.

## 1. Continuation protocol

Required operating sequence:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

Source precedence:

1. repository bytes/current refs;
2. exact-head CI/security evidence;
3. current PR/commit metadata;
4. this state ledger;
5. historical chat/prose.

Do not reuse stale authorization, fabricate human approval, bypass protected reviews, infer Production mutation/deployment, or treat a design document as runtime evidence.

## 2. Repository checkpoint cursor

At the moment this checkpoint was prepared, the exact `main` product/runtime base was:

`756dc5f7f2769e6405c98f156ba9a2484df25352`

PR #192 is a documentation/governance carrier layered on top of that base. After PR #192 merges, the actual `main` must be read from GitHub and will be newer than `756dc5f7...`.

The following material slices are already merged into the checkpoint base:

- PR #190 — guest-first public marketplace with step-up authentication for protected actions.
- PR #193 — complete removal/prohibition of commercial-register/business-registration product/data surface, with regression guard coverage.
- PR #191 — central all-sector commission policy, retired-role cleanup, and trusted role identity binding.
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

A selected visibility plan is not evidence of payment entitlement. Browser-supplied receipts are not sufficient to publish. Real paid-publication transport remains a separate trusted server/Production implementation and activation gate.

## 6. Commercial register — abolished from active product/data surface

Binding decision: VVIP TIGER must not request, collect, reserve, infer, require, display, validate, store, transmit, analyze, report, or create a future placeholder specifically for commercial register/business registration as a platform field.

This prohibition covers active registration/onboarding, profile/account flows, listing/post creation, TIGER PULSE, payment/boosting, admin/operations controls, schema/API/validation, analytics/report/filter fields, hidden/reserved product fields, and tests/fixtures that present it as an active requirement.

Historical provenance may remain only when explicitly non-operative/superseded.

The active prohibition/regression guard is merged through PR #193.

## 7. Finance / commission / worker identity state

One central policy applies to all current and future sectors unless a later owner decision explicitly changes it.

Retired from new active operational/financial assignment paths:

- `SECONDARY_MARKETER`;
- `SUPERVISOR`;
- `AREA_MANAGER`.

Geographic `area` remains a valid location/scope concept. Historical retired-role facts remain readable and are not rewritten as if they never existed.

Historical V1 commission policy:

- decision `COMMISSION-ROLE-POLICY-2026-08-11` remains immutable historical evidence;
- historical V1 transactions are not recalculated or rewritten;
- the historical 4.30% primary-marketer and 10.93% redistribution rules are not the active source for new V2 sales.

Owner-approved V2 policy for new sales effective 2026-08-19:

- all percentages apply to trusted `NET_RECOGNIZED_REVENUE` in integer minor units;
- one legal owner receives a 5% management commission allocation, which is not an equity dividend;
- three operating partners receive 5% commission each and are not equity owners;
- referred sales allocate 5% to the general manager, 5% to the bound sector manager, 5% to the winning primary marketer, 1.5% to technical/content, 1.5% to base customer service, and 62% to platform retained revenue;
- direct platform sales allocate no marketer or sector-manager commission;
- the direct 10% unassigned sales share is allocated as 5% customer-service performance, 3% growth/acquisition reserve, and 2% risk/chargeback reserve;
- both channel policies total exactly 10,000 basis points;
- allocation uses exact integer arithmetic and deterministic transaction-bound largest remainder with zero residual.

Owner-approved V2.1 attribution:

- priority is checkout code, verified lead (60 days), verified order start (30 days), then consented first-party cookie (7 days);
- device and payment signals are fraud inputs only and cannot award commission;
- no eligible evidence resolves to `DIRECT_PLATFORM`;
- a fraud flag resolves to `ATTRIBUTION_REVIEW` and never silently becomes direct;
- the winning marketer and effective-dated manager assignment are locked in one immutable attribution decision.

Repository implementation commits on the current feature branch:

- `c4b05b5` — V2 central commission policy and exact allocation;
- `293da3d` — V2.1 attribution resolution;
- `b5565e3` — V2.2 balanced distribution journal.

The V2.2 journal is repository domain logic only. It creates deterministic balanced debit/credit projections and canonical beneficiary accounts; persisted idempotency, SQL/RLS, provider calls, settlement, payout, notification, and Production execution remain separately gated.

Every new operational/staff role assignment requires exactly one trusted identity reference: `ACCOUNT_ID` or `CLERK_USER_ID`.

The browser may submit a reference but cannot prove the mapping. Trusted server resolution must verify the identity/account relationship for the intended subject before persistence/activation. Missing, malformed, unresolved, ambiguous, or mismatched identity fails closed.

Repository implementation of the retired-role and trusted-identity policy is merged through PR #191. Dynamic Yield V2 is implemented only on the named 2026-08-19 feature branch at this checkpoint. Neither state authorizes a Production DB migration, real payout, or real-money movement.

## 8. TIGER PULSE state

TIGER PULSE remains an owner-approved engineering direction and optional contextual intelligence/visibility layer.

Binding boundaries:

- ordinary Marketplace/search must remain available without Pulse;
- Pulse is not a mandatory publication gate;
- paid influence cannot buy truth or bypass relevance/eligibility/risk/legal gates;
- billable exposure requires trusted server evidence, de-duplication, policy versioning, identity/account linkage, audit, and financial reconciliation;
- browser-side `is_billable=true` or equivalent is never financial authority;
- Pulse/financial kill switches must not take down ordinary public browsing/search.

Detailed engineering reference:

`docs/owner-control/TIGER_PULSE_ENGINEERING_EXECUTION_REFERENCE.md`

That document is an approved engineering reference, not proof that real-money Pulse execution is live.

## 9. Security / privacy constitution

Core owner direction remains:

> **Simple Surface — Private Core — Minimum Truth**

Required properties include minimum screen, minimum data, minimum authority, minimum truth exposure, server-side projection/masking rather than CSS-only hiding, RLS plus server authorization where applicable, bounded capabilities/scopes for sensitive actions, no secrets/service-role credentials in public browser bundles, and purpose-bounded AI projections/capabilities.

Native sensitive views use supported capture/capture-state protections without false universal screenshot/camera immunity claims. No repository status may be described as mathematically 100%/1000% unhackable.

Security objective: no ordinary single compromise should yield unrestricted ownership of platform, all private data, all financial authority, and owner-level control.

## 10. Scale and financial acceptance targets

The 12,000,000-user figure is an engineering scale target/model, not a verified capacity claim. Registered population, DAU, concurrency, requests/second, chat/websocket concurrency, jobs, database throughput, and provider limits are separate dimensions and must be measured separately.

No release may claim support for 12 million users without reproducible representative infrastructure evidence including throughput, error rate, p50/p95/p99 latency, saturation/limits, recovery behavior, and workload mix.

Before real-money activation, financial acceptance must include at least 5,000,000 varied simulated movements covering concurrency, retries, duplicates, timeout, insufficient balance, reservation/capture/release/refund, disputes, policy/role change, exposure de-duplication, dependency failure, and reconciliation.

Acceptance requires no unexplained money creation/loss, no duplicate replay charge/commission, balanced journals where applicable, authorized recipients only, and deterministic reconciliation.

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

- `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md` — binding owner decision source;
- `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md` — detailed permanent owner reference;
- `project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json` — machine-readable owner-decision contract;
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
4. Return to deferred real-browser/manual evidence such as the PR36 real-image upload path only as a distinct manual-evidence task; do not mislabel its historical automated PASS as manual completion.
5. Checkpoint this ledger again only after a material repository/Production state transition.

## 15. Human-gate handling

When a protected human-only step is reached:

`HUMAN_GATE_PENDING`

Record the gate precisely and continue independent safe repository work where possible. Never bypass or fabricate a protected reviewer, owner approval, Production environment approval, or external provider action.
