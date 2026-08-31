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

## Regression guards

Current-tree deletion is protected by repository tests including:

- `tests/nexus/nexus-no-conflicting-legacy.test.cjs`
- `tests/nexus/nexus-single-object-creation-path.test.cjs`
- `tests/nexus/nexus-current-authority.test.cjs`
- `tests/owner-latest-decision-governance.test.cjs`
- `tests/final-owner-convergence.test.cjs`
- `tests/nexus-2026-contract.test.cjs`

These guards are intended to block restoration of parallel current-product surfaces, stale authority values, retired Pulse prices/durations, paid ordinary-publication gates, deleted standalone client Pulse authority, fixed-count sector artifacts, or archive/trash/legacy preservation of conflicting behavior.

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
