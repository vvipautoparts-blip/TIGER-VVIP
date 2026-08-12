# VVIP TIGER — MASTER PROJECT STATE

> **GitHub/current refs are implementation truth. This file is the current execution-state authority.**
> Binding owner decisions: `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`
> Prior state preserved: `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md`

**Checkpoint:** 2026-08-12
**Repository:** `vvipautoparts-blip/TIGER-VVIP`

## Continuation protocol

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

Source precedence:

1. repository bytes/current refs;
2. exact-head CI/security evidence;
3. current PR/commit metadata;
4. this state ledger;
5. historical chat/prose.

Never reuse stale authorization, fabricate human approval, or claim Production mutation/deployment without exact evidence.

## Current main / shipped authentication invariant

- Current observed `main`: `31e1ca7d6879902c406f3ac93ef93005413552f3`.
- PR #190 is merged: guest-first public marketplace with step-up authentication for protected actions.
- Clerk remains external identity authority; Supabase remains the data/RLS layer.
- PR #190 behavior must not regress in later UX/security work.
- Historical Production/deployment details from the prior checkpoint are preserved in `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md`; this file does not erase that evidence.

## Active UX path — PR #189

- PR: `#189 feat(ux): VVIP TIGER experience convergence`.
- State last verified: OPEN / DRAFT / UNMERGED / mergeable.
- Last observed head: `8738b14a2ecd4ce4703d9858e21eac38b0f09f03`.
- Direction: Facebook-level familiarity of flow/hierarchy, independent premium VVIP TIGER celestial/royal-blue identity, content-first publication, direct card actions, mobile bottom nav, coherent Feed -> Profile -> Dashboard -> Details -> Settings navigation.
- Ordinary publishing does not use blanket manual review as a default gate.
- Paid visibility/Pulse appears after content completion.

## Active identity / retired roles / finance path — PR #191

- PR: `#191 feat(finance): central commission policy and role identity binding`.
- Branch: `feat/commission-policy-all-sectors-20260811`.
- State: OPEN / DRAFT / UNMERGED.
- Current observed head: `94da6e4b355dcaf13f41201ba5d66b30a6a6624a`.
- Exact-head checks observed GREEN on this head:
  - VVIP Quality Gate;
  - V14 Release Candidate;
  - CodeQL;
  - TIGER CleanGuard;
  - Dependency Review;
  - Project Control Integrity.
- Trusted role identity binding is server-verified before persistence/activation: `ACCOUNT_ID` or `CLERK_USER_ID` must map to the intended subject.
- `AREA_MANAGER` is removed from active role catalogs/assignment paths while geographic `area` remains a valid scope and the historical role identifier remains readable as non-assignable provenance.
- Remaining PR #191 implementation order:
  1. central all-sector exact-sum commission policy/allocator;
  2. remaining true retired-role/alias active-path cleanup;
  3. full same-head verification;
  4. human review/merge only if repository protection requires it.
- No Production payout execution, real-money movement, or Production DB migration is implied by repository GREEN status.

## Owner binding decisions — 2026-08-12

Canonical source: `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`.

Core constitution:

> **Simple Surface — Private Core — Minimum Truth**

Binding laws:

- minimum screen;
- minimum data;
- minimum authority;
- minimum truth exposure.

### Commercial register — abolished completely

VVIP TIGER must not request, collect, reserve, infer, require, display, validate, store, transmit, or create a product placeholder for a commercial register/business-registration field.

This applies to UI, onboarding, profile, listing creation, TIGER PULSE, payment/boosting, admin tools, database, API schemas, validation, analytics, reports/filters, hidden fields, feature flags, tests/fixtures, and future reserved product schema.

Historical source/provenance mentions may remain only when clearly classified `SUPERSEDED / NON-OPERATIVE`; they cannot reactivate functionality.

### Security/privacy direction

- Server authorization + RLS + minimum projection; do not rely on hiding full sensitive values with CSS.
- Sensitive truth should not be delivered to the endpoint unless the exact action requires it.
- Use server-side masking/tokenization/aliasing where full values are unnecessary.
- Native sensitive views should use available screen-capture protections/detection; no false claim of universal physical-camera prevention.
- AI receives purpose-bounded projections/capabilities, never unrestricted internal truth/admin/database authority.
- No architecture may claim literal 100%/1000% immunity from every attack; design for no single ordinary compromise to own the full platform/data/money/owner authority.

### TIGER PULSE

- Optional integrated context/visibility intelligence, not a mandatory publication gate.
- Marketplace/public search remains independently available.
- Paid influence is bounded and cannot purchase truth or bypass relevance/quality/eligibility.
- Billable exposure requires server-verifiable evidence, de-duplication, policy versioning, identity/account linkage, audit, and financial reconciliation.

### Finance / commissions

Retired from new active operational/financial assignment paths:

- `SECONDARY_MARKETER`;
- `SUPERVISOR`;
- `AREA_MANAGER`.

Removed share: **10.93%**, redistributed completely/equally with exact arithmetic:

- `SECTOR_MANAGER = 7.943333...%`;
- `COUNTRY_EXECUTIVE_COMMISSIONER = 9.113333...%`;
- `MARKETING = 11.013333...%`;
- `PRIMARY_MARKETER = 4.30%` unchanged.

Display rounding is not the engine source of truth. Deterministic minor-unit reconciliation must leave no unexplained residual. Missing recipient assignment fails/holds rather than silently redirecting money.

Financial pre-activation acceptance includes at least **5,000,000 varied virtual movements** covering concurrency, retry, duplicate, timeout, insufficient balance, reserve/capture/release/refund, dispute, policy/role change, exposure de-duplication, dependency failure, and reconciliation.

## Owner-reference branch

- Branch: `docs/owner-master-reference-20260812`.
- Binding owner reference committed: `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`.
- Pre-2026-08-12 state preserved at: `docs/state-archive/MASTER_PROJECT_STATE_PRE_20260812.md`.
- This file is the active continuation ledger on this branch.
- Eventual Owner Control UI must use an authenticated server-side projection of owner/state records; raw restricted governance material must not become an unauthenticated public artifact.

## Human-gate handling

Owner instruction for ongoing execution: when a protected human-only step is reached, record it as `HUMAN_GATE_PENDING` and continue other independent safe repository work. Do not bypass or fabricate protected approvals.

## Immediate next actions

1. Finish PR #191 central commission allocator with TDD.
2. Verify exact-head PR #191 checks after implementation.
3. Record any human-only merge/review gate and continue independently.
4. Add enforceable regression coverage that active product/runtime/schema paths contain no commercial-register field or placeholder; preserve clearly historical provenance separately.
5. Open/verify the owner-reference documentation PR.
6. Continue PR #189 after reconciling it with current `main`/PR #190 guest-first invariants.
7. Implement minimum-truth/security/privacy slices on isolated branches without visible product-engine clutter.
8. Checkpoint this file after each material state transition.
