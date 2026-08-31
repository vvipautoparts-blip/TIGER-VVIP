# AGENTS.md

## Mandatory first reference

Before **any** analysis, edit, cleanup, refactor, migration, test change, release action, or operational recommendation, read:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

This is the mandatory `CURRENT_ONLY / OWNER_BINDING / FIRST_REFERENCE` authority. The newest explicit owner-approved decision is the only operative truth in its domain. A conflicting older document, value, code path, test, configuration, fallback, archive, trash copy, legacy compatibility instruction, or generated artifact must not control current work. Git history is provenance only.

The Arabic owner router is:

`docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

Machine-readable current authority is:

- `config/fusion/current-authority.json`
- `config/finance/current-distribution.json`
- `project-control/authority/authority-registry.v1.json`

## Current protected lane

- Current implementation lane: **PR #349** on `feat/tiger-nexus-2026-20260829`.
- Current product experience: **TIGER NEXUS 2026**.
- Core invariant: `ONE FEED • ONE OBJECT • ONE PULSE`.
- Ordinary eligible sector publication is free.
- Current Pulse reference levels are exactly **2 / 10 / 20 / 45 JOD**.
- Pulse has no product-time expiry and uses `NOW / SMART / PRECISE` with server-authoritative verified delivery: `RESERVE → SERVE → VERIFY → CONSUME`.
- `TAX_RESERVE 16%` is **CANCELLED**. No replacement allocation is authorized. Known current financial allocations total 84%; the remaining 16% is pending an explicit owner decision and is not an allocation.
- `CSR = 3%` is inside `ACTUAL_OPERATIONS = 43%`; there is no separate 1% charity allocation.
- One sale has at most one winning sales role. Self-service with no sales claimant receives the current 7% discount.

## Current merge and Production boundary

PR #349 remains **Draft** while protected verification is blocked or incomplete.

Do not:

- mark the PR Ready for Review;
- merge to `main`;
- deploy or mutate Production/Staging;
- apply remote database/provider/credential changes;
- weaken, bypass, or reinterpret required gates as passed;

until **all required protected checks on the exact current head actually execute on a runner and are GREEN**, followed by the required review/protected-merge state.

A GitHub Actions job with no runner execution or no steps is infrastructure-blocked verification. It is neither a code-test failure nor GREEN evidence.

## Project scope

- This repository is primarily a static multi-page VVIP TIGER web application using plain HTML, CSS, and JavaScript.
- Do not introduce a framework, bundler, package-based application rewrite, TypeScript conversion, or new backend architecture unless an explicit newer owner decision authorizes it.
- Preserve bilingual Arabic/English and RTL/LTR behavior where currently supported.
- Prefer small, evidence-backed, reversible edits that keep current security and data invariants intact.
- No new product-development slice begins while final owner convergence remains unverified; current work is reconciliation, conflict removal, regression protection, and verification only.

## Current product map

- `index.html`: canonical NEXUS/social entry surface.
- `auth-clerk-index.js`: current external identity gate for the unified home.
- `scripts/social/core-shell.js`: social shell/controller composition.
- `scripts/social/feed-read-model.js`: current social feed read model.
- `scripts/social/feed-controller.js`: current social feed presentation.
- `scripts/social/post-composer.js`: canonical NEXUS-compatible composer.
- `scripts/nexus/living-sector-object.js`: Living Sector Object contract.
- `scripts/nexus/sector-discovery.js`: sector discovery over the same Living Sector Objects.
- `scripts/nexus/pulse-runtime.js`: server-authoritative Pulse runtime.
- `scripts/nexus/pulse-surface.js`: current Pulse user surface.
- `scripts/nexus/bootstrap.js`: NEXUS bootstrap/current registry wiring.
- `styles/nexus/nexus.css` and `styles/tiger-social/base.css`: current NEXUS/social styling surfaces.
- `scripts/runtime/vvip-runtime-loader.js`: external identity + data-layer runtime bridge where still loaded by the current tree.
- `sw-vvip-static.js` and `manifest.webmanifest`: canonical static-delivery PWA surface.

Do not recreate physically removed parallel Marketplace/Fusion/product runtimes merely because older documentation or Git history mentions them.

## Identity and security boundary

Read `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md` before changing authentication, recovery, account linking, or identity mapping.

- VVIP TIGER remains federated-identity based unless a newer explicit owner decision changes it.
- Do not add first-party password storage, local password recovery, or a parallel password authority.
- Authentication belongs to the approved external identity provider/runtime; TIGER owns authorization, roles/capabilities, account status, RLS/data policy, owner approvals, and audit evidence.
- Email/phone are attributes, not sufficient account-ownership transfer keys.
- Never expose provider secrets, signing keys, service-role credentials, tokens, or private user data in browser code, tracked files, or logs.
- Frontend visibility never grants privileged authority; server/RLS/capability enforcement remains binding.

## Database and migration safety

- Supabase is a data/storage layer, not a second password authority.
- Browser data access remains least-privilege and RLS/policy controlled.
- Already-applied historical migrations are immutable evidence and must not be rewritten to fake history.
- If an old applied migration effect conflicts with current authority, neutralize it only through a separately authorized protected **forward migration** and current-schema verification.
- Current convergence work does not authorize Production database mutation.

## Working verification commands

- Local preview: `python -m http.server 800`
- Smoke checks: `./scripts/qa-smoke.sh`
- Full repository gate: `bash scripts/quality-gate.sh`

A passing focused test proves only its contract. Do not claim full QA, release readiness, or Production readiness without the matching exact-head evidence required by the current protected workflow.

## Continuity protocol

Use this sequence:

`READ CURRENT OWNER AUTHORITY → RESOLVE EXACT PR/HEAD → IDENTIFY DOMAIN → COMPARE CURRENT TREE → WRITE/UPDATE REGRESSION CONTRACT → RECONCILE MINIMALLY → DELETE PROVEN CONFLICT → VERIFY → CHECKPOINT`

For product-rule conflicts, precedence is:

`newest explicit owner decision → TIGER_OWNER_BINDING_CURRENT.md → current domain authority → machine authority/config → current test/source implementation evidence`

For implementation-state claims, use the exact Git SHA/tree plus matching verification evidence. `docs/MASTER_PROJECT_STATE.md` is a non-authoritative status surface only.

Classify evidence honestly as `APPROVED`, `IMPLEMENTED`, `VERIFIED`, `IN_PROGRESS`, `BLOCKED`, `DEFERRED`, or `STALE`. `IMPLEMENTED` is not `VERIFIED`; an unavailable runner is not a PASS.

## Agent guidance

- Fix root causes in canonical loaded code and current authority rather than patching symptoms.
- Preserve correct compatible material; remove or update only proven stale, conflicting, duplicated, or superseded material.
- Never invent an owner decision, percentage, price, beneficiary, API, schema, test outcome, deployment state, or capacity claim.
- Do not preserve conflicting current behavior inside `legacy/`, `archive/`, `trash/`, hidden fallback, or compatibility copies.
- Do not reintroduce deleted runtimes to satisfy stale references; repair the reference or route to the current NEXUS authority.
- Keep PR #349 Draft until genuine exact-head runner-executed GREEN evidence exists for all required protected gates.
