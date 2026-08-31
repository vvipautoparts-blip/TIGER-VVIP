# VVIP TIGER — Current Deletion & Supersession Manifest

**Status:** `CURRENT CONVERGENCE EVIDENCE / NON-AUTHORITY`
**Updated:** 2026-08-31
**Applies to:** protected PR #349, branch `feat/tiger-nexus-2026-20260829`

This manifest documents proven current-tree removals and supersessions. It is **not** an owner authority and cannot create product rules. The first mandatory authority remains:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

## Safety rule

**No blind deletion.** A current-tree path is removed only when all of the following are true:

1. a newer owner-approved rule conflicts with the older path or behavior;
2. the current replacement/authority is identified;
3. removal does not erase required immutable history or protected evidence;
4. regression coverage prevents the superseded behavior from returning;
5. Git history remains the historical provenance.

There is no `legacy/`, `archive/`, `trash/`, hidden compatibility layer, or fallback preservation for conflicting current product behavior.

Already-applied database migrations are excluded from blind source deletion. Historical migration bytes remain immutable; obsolete database effects are neutralized by forward migrations and current-schema verification.

## Current replacement authority

The replacement/current product model is **TIGER NEXUS 2026** under:

- `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- `docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`
- `config/fusion/current-authority.json`

Current invariant:

`ONE FEED • ONE OBJECT • ONE PULSE`

One Living Sector Object is created through the canonical NEXUS creation path and may appear in feed, sector discovery, search, profile, messaging context, saved surfaces, and optional Pulse visibility without becoming a second Marketplace product object.

Current Pulse levels are **2 / 10 / 20 / 45 JOD** only.

Current known financial allocations are OWNER 5%, PARTNER_1 5%, PARTNER_2 5%, PARTNER_3 5%, ACTUAL_OPERATIONS 43%, and SALES_ADMINISTRATION 21% = **84% known**. The former TAX_RESERVE 16% allocation is cancelled; that 16% remains pending an explicit owner reallocation and is not assigned by inference. Financial distribution execution remains fail-closed until that decision is made. `CSR = 3%` remains inside ACTUAL_OPERATIONS 43%; there is no separate 1% financial allocation.

## Proven superseded current-tree surfaces

| Removed path | Why it is superseded | Current replacement / safety evidence |
|---|---|---|
| `fusion-home-f02.html` | Parallel/older Fusion home surface conflicts with NEXUS single social-first product surface. | `index.html` + NEXUS/social shell; PR #349 current-tree convergence. |
| `scripts/fusion/f02-feed.js` | Parallel feed runtime conflicts with one canonical NEXUS/social feed path. | `scripts/social/feed-read-model.js`, `scripts/social/core-shell.js`, NEXUS bootstrap/current shell. |
| `scripts/fusion/marketplace-context.js` | Separate Marketplace context path conflicts with sector discovery as a view of the same Living Sector Object. | `scripts/nexus/sector-discovery.js` and Living Sector Object contract. |
| `scripts/fusion/runtime-adapters.js` | Parallel Fusion runtime adapter path conflicts with the converged current NEXUS product graph. | NEXUS/social runtime modules and sealed public release graph. |
| `scripts/runtime/vvip-marketplace-repository.js` | Separate Marketplace repository authority conflicts with one current Living Sector Object/product path. | NEXUS sector publication/runtime authority. |
| `scripts/runtime/vvip-my-listings.js` | Separate listing-management product path conflicts with unified object/account surfaces. | NEXUS/social account and same-object discovery/profile paths. |
| `scripts/vvip-pr31-create-listing-shell.js` | Legacy dedicated listing-creation shell conflicts with one canonical composer. | Canonical `ماذا تعرض أو تحتاج؟` NEXUS creation entry. |
| `scripts/vvip-pr32-draft-preview.js` | Legacy parallel draft/preview pipeline conflicts with current single publication lifecycle. | Current Living Sector Object create/complete → preview → trusted review → publish path. |
| `scripts/vvip-pr33-publish-readiness.js` | Legacy separate publish-readiness product path conflicts with NEXUS current publication contract. | Current NEXUS/server-authoritative publication eligibility. |
| `scripts/vvip-production-marketplace.js` | Separate production Marketplace runtime conflicts with `NO_PARALLEL_PRODUCT`. | NEXUS-only public release graph and sector discovery over the same object. |
| `styles/vvip-pr31-create-listing-shell.css` | Styling existed only for the superseded PR31 parallel creation shell. | NEXUS/social current styles. |
| `styles/vvip-pr32-draft-preview.css` | Styling existed only for the superseded PR32 parallel draft/preview path. | NEXUS/social current styles. |
| `styles/vvip-pr33-publish-readiness.css` | Styling existed only for the superseded PR33 path. | NEXUS/social current styles. |
| `styles/vvip-production-marketplace.css` | Styling existed only for the parallel Marketplace production surface. | NEXUS/social current styles. |
| `scripts/nexus/pulse-vault.js` | Standalone client Pulse Vault read-model runtime was superseded by the server-authoritative NEXUS Pulse runtime; retaining it would create a second client authority path. | `scripts/nexus/pulse-runtime.js`, server RPCs, `tests/nexus/pulse-runtime.test.cjs`, and current Pulse authority. |
| `tests/nexus/pulse-vault.test.cjs` | Test contract targeted the deleted standalone client Pulse Vault runtime and became invalid after convergence to the server-authoritative runtime. | `tests/nexus/pulse-runtime.test.cjs` plus `tests/nexus/pulse-vault-ui-contract.test.cjs`; root NEXUS umbrella now requires the current runtime test. |
| `docs/owner-control/P10_THREE_SECTOR_STRUCTURED_FIELDS.md` | Historical phase artifact encoded a fixed three-sector product count in the current owner-control tree, conflicting with the NEXUS rule that publication is bound to server-activated sectors without a fixed product count. | `config/fusion/current-authority.json` (`nexus.activatedSectorsOnly=true`), current NEXUS authority, and Git history as provenance. |
| `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md` | Superseded document still declared itself `BINDING / OWNER-CANONICAL` and carried old finance, Marketplace, and PR execution rules, creating a competing owner authority in the current tree. | `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md` is the sole first owner constitution; current machine authority and registry route to NEXUS/current finance. Git history preserves the 2026-08-12 provenance. |
| `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md` | Declared itself `OWNER APPROVED` / permanent owner reference and retained superseded PR #190, public Marketplace assumptions, and retired financial percentages such as PRIMARY_MARKETER 4.30%. | `TIGER_OWNER_BINDING_CURRENT.md`, current NEXUS authority, and current finance authority: 84% known + cancelled/unassigned 16% pending explicit owner decision. Git history preserves historical provenance. |
| `docs/owner-control/VVIP_TIGER_OWNER_MASTER_REFERENCE.md` | Declared itself the unified highest owner reference while encoding a fixed three-sector product and older product/account/UX rules. | `TIGER_OWNER_BINDING_CURRENT.md` is the mandatory first reference; `TIGER_OWNER_CURRENT_REFERENCE_AR.md` is the current router; activated sectors are server-driven. |
| `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md` | Retained an obsolete official execution roadmap, old P00/P01 lane, fixed three-sector P10, 4-post weekly quota, 120-day deletion and subscription/trial paths. | Current owner binding/router + PR #349 exact-head convergence plan and `docs/MASTER_PROJECT_STATE.md` as explicitly non-authoritative implementation status. |
| `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml` | Declared itself `source_of_truth`, locked execution to stale P08, required deleted P10 Three-Sector artifact and retained retired subscription/entitlement sequencing. | `project-control/authority/authority-registry.v1.json`, `config/fusion/current-authority.json`, current owner binding, and exact Git/CI evidence. |
| `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP_COMPLETION.md` | Claimed the retired roadmap/YAML were the official unified owner references and repeated fixed Three-Sector sequencing. | Current-only owner authority graph and Git history for historical roadmap provenance. |
| `docs/owner-control/VVIP_TIGER_PHASE_TRACKER.md` | Declared itself the current official daily roadmap while retaining P08 as next authorized, 4 posts/week, 120-day expiry, four-month trial and other superseded product timing/limits. | Current PR #349 convergence lane, current owner binding/router, and exact-head protected verification evidence. |
| `docs/owner-control/phase-status.json` | Machine-readable stale phase authority still locked to P08, named Three-Sector P10 and set `fallback_required=true`, conflicting with CURRENT_ONLY / NO_FALLBACK. | Current authority registry/config and protected exact-head implementation truth. |
| `docs/change-control/20260710-master-execution-roadmap.json` | Historical change-control artifact still asserted the deleted roadmap plane as the expected single official reference and `next_authorized_phase=P01`. | Git history preserves the historical PR #23 record; current tree routes execution through the current owner binding and PR #349 convergence evidence. |
| `docs/superpowers/specs/2026-08-18-tiger-pulse-ring-attention-allocation-engine-design.md` | Still declared itself `OWNER APPROVED / CURRENT DESIGN INPUT` while encoding an older incompatible Pulse tier model and explicitly rejecting parts of the current 2/10/20/45 authority. Retaining it would create a competing current design input. | Current `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`, NEXUS design/spec, `config/fusion/current-authority.json`, and regression guards. Git history preserves the old design provenance. |

## Regression guards

Current-tree deletion is protected by repository tests including:

- `tests/nexus/nexus-no-conflicting-legacy.test.cjs`
- `tests/nexus/nexus-single-object-creation-path.test.cjs`
- `tests/nexus/nexus-current-authority.test.cjs`
- `tests/owner-latest-decision-governance.test.cjs`
- `tests/final-owner-convergence.test.cjs`
- `tests/nexus-2026-contract.test.cjs`

These guards are intended to block restoration of parallel current-product surfaces, stale/competing owner authority, retired Pulse prices/durations, paid ordinary-publication gates, deleted standalone client Pulse authority, fixed-count sector artifacts, restored TAX_RESERVE allocation, invented allocation of the pending 16%, separate 1% financial allocation, or archive/trash/legacy preservation of conflicting behavior.

## What this manifest does not authorize

This document does not authorize:

- deletion of unique protected security evidence;
- rewriting already-applied migrations;
- Production or Staging mutation;
- database/provider/credential changes;
- merge of PR #349;
- bypass of CI/review gates;
- removal of code or documentation merely because it is old when it remains correct and compatible with the current authority.

The governing rule is convergence, not indiscriminate cleanup: **preserve what is correct and compatible; remove or update only what is proven stale, conflicting, duplicated, or superseded.**
