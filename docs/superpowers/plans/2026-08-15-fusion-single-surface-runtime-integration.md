# VVIP TIGER FUSION 2026 Single Surface Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated `/` route the real VVIP TIGER FUSION 2026 Single Surface while preserving Clerk authentication, F04 Search Fabric, PR36/F05 media security, server-confirmed capabilities, and the owner advertising/direct-contact-only boundary.

**Architecture:** Use a Strangler integration. Keep the proven Clerk, listing, PR36/F05, resilience, F04 and F03 modules behind bounded browser adapters, move the FUSION presentation contract into the authoritative `index.html`, and retain legacy pages only as migration bridges until F15. No framework migration is introduced.

**Tech Stack:** Static Web/PWA HTML/CSS/JavaScript, Node.js `node:test`, Clerk browser auth, Supabase-backed listing runtime, F04 Search Fabric, PR36 media controller, F05 HEIC/HEIF Worker/WASM, GitHub Actions, AWS Amplify DEVELOPMENT Preview.

## Global Constraints

- Work only on `feat/fusion-single-surface-integration-20260815` until exact-head review authorizes promotion.
- Do not write directly to `main`, do not mutate Production, and do not weaken protected branch/review gates.
- Clerk remains the browser authentication gate; no browser flag, legacy `admin`, or `super_admin` implies sovereign OWNER.
- VVIP TIGER remains advertising, discovery, commercial presentation, and direct contact only; no checkout, escrow, delivery operation, marketplace settlement, marketplace commission/payout, warranty execution, compensation execution, or platform-run underlying-party disputes.
- F04 is the authoritative search path; no raw substring fallback may become search authority.
- F05 binding rule is `Privacy on Client + Authority on Server`; original HEIC/HEIF bytes never use server conversion fallback.
- PR36 remains the canonical seven-still-image crop/encode/session contract.
- Dynamic sectors are registry-driven; the authoritative surface must not hard-code a permanent three-sector or seven-sector product model.
- Arabic and English share one runtime/data model with RTL/LTR support.
- The approved login visual/token scope remains isolated from marketplace/FUSION styling.
- `GLOBAL_LAUNCH_ELIGIBLE = TRUE` remains forbidden until the separate F16 Launch Passport gates are satisfied.

---

## File Structure

- `index.html` — authoritative authenticated FUSION shell and hosts only; no business/security authority.
- `styles/fusion/f02-single-surface.css` — existing FUSION layout/token layer, extended only for authoritative shell states.
- `scripts/fusion/f06-runtime-adapters.js` — bounded adapter registry for auth-independent presentation dependencies; despite the filename sequence this is an integration adapter, not F06 Global Money Fabric, so the module will instead be named `scripts/fusion/runtime-adapters.js` to avoid roadmap collision.
- `scripts/fusion/runtime-adapters.js` — creates frozen adapters for listing reads/drafts, F04 search, PR36/F05 media, capability snapshots, local draft state and network status; missing dependencies fail closed.
- `scripts/fusion/single-surface-controller.js` — orchestrates authenticated shell initialization and presenter state without owning persistence or authority.
- `scripts/fusion/f02-feed.js` — existing feed presenter; adapt it to consume injected listing/search adapters rather than relying on preview-only data or unsafe globals.
- `scripts/fusion/f03-capability-menu.js` — existing capability presenter; wire it only to validated immutable capability views.
- `scripts/fusion/f04-search-fabric.js` — existing authoritative search engine; do not duplicate its ranking logic.
- `scripts/vvip-pr31-create-listing-shell.js` — existing listing/composer runtime; reuse its valid draft/publish boundaries through the integration adapter.
- `scripts/media/pr36-controller.js` plus F05 media modules — existing canonical media path; preserve seven-photo, cancellation, Worker/WASM and sanitized-derivative contracts.
- `fusion-home-f02.html` — keep as non-authoritative migration/verification page during this phase.
- `sw-vvip-static.js` — update cache list only after authoritative runtime files exist and tests prove no duplicate/obsolete entrypoint authority.
- `tests/fusion-authoritative-entrypoint.test.cjs` — new entrypoint/auth/surface contract.
- `tests/fusion-runtime-adapters.test.cjs` — new fail-closed adapter contracts.
- `tests/fusion-composer-integration.test.cjs` — new operational composer + PR36/F05 boundary contracts.
- `tests/fusion-auth-isolation.test.cjs` — new protected-auth and theme isolation contract.
- Existing F02/F03/F04/F05 tests remain regression authority.

---

### Task 1: Authoritative Entrypoint Contract

**Files:**
- Create: `tests/fusion-authoritative-entrypoint.test.cjs`
- Modify later after RED proof: `index.html`
- Modify later after RED proof: `fusion-home-f02.html`

**Interfaces:**
- Consumes: existing Clerk gate markers (`data-vvip-auth-gate`, `#clerk-main-auth`) and FUSION shell markers from `fusion-home-f02.html`.
- Produces: an authoritative HTML contract requiring `data-vvip-fusion-authoritative`, dynamic sector host, search rescue host, composer host, capability host and exact primary actions.

- [ ] **Step 1: Write the failing contract test** that reads `index.html` and asserts all of the following:

```js
assert.match(index, /data-vvip-fusion-authoritative/);
assert.match(index, /data-vvip-auth-gate/);
assert.match(index, /id="clerk-main-auth"/);
assert.match(index, /data-fusion-composer/);
assert.match(index, /data-vvip-sector-filters/);
assert.match(index, /data-search-rescue/);
assert.match(index, /data-fusion-capability-menu/);
assert.match(index, /scripts\/fusion\/single-surface-controller\.js/);
assert.match(index, /scripts\/fusion\/runtime-adapters\.js/);
assert.doesNotMatch(index, /data-sector-filter="automotive"/);
assert.doesNotMatch(index, /data-sector-filter="materials"/);
assert.doesNotMatch(index, /data-sector-filter="real-estate"/);
assert.match(fusionPreview, /data-vvip-fusion-migration-preview/);
```

- [ ] **Step 2: Run RED proof** with `node --test tests/fusion-authoritative-entrypoint.test.cjs`; expected failure is missing authoritative FUSION markers/adapters in current `index.html`.
- [ ] **Step 3: Commit RED only** with message `test(fusion): require authoritative single-surface entrypoint`.
- [ ] **Step 4: Do not implement until Task 1 RED evidence is visible in CI/local execution.**

### Task 2: Bounded Runtime Adapter Registry

**Files:**
- Create: `tests/fusion-runtime-adapters.test.cjs`
- Create: `scripts/fusion/runtime-adapters.js`

**Interfaces:**
- Produces `window.VVIPFusionRuntime.createRuntimeAdapters(deps)` returning a deeply frozen object with methods:
  - `listings.readEligible(query)`
  - `listings.openComposer()`
  - `search.run(query, candidates, options)`
  - `media.openSession(options)`
  - `capabilities.getPresentationView()`
  - `drafts.readLocal()`
  - `network.snapshot()`
- Any unavailable privileged/search/media dependency returns a typed fail-closed result such as `{ ok:false, code:'FUSION_DEPENDENCY_UNAVAILABLE' }`; it must never fall back to a less secure authority path.

- [ ] **Step 1: Write failing tests** proving the module is absent and requiring frozen adapters, dependency validation, no mutation of injected dependencies, and no global Supabase session authority.
- [ ] **Step 2: Run** `node --test tests/fusion-runtime-adapters.test.cjs`; expected RED is missing module.
- [ ] **Step 3: Implement the minimal adapter registry** as an IIFE exposing only `createRuntimeAdapters`, with explicit function checks and `Object.freeze` at each public layer.
- [ ] **Step 4: Run focused tests** and require PASS.
- [ ] **Step 5: Commit** `feat(fusion): add fail-closed runtime adapters`.

### Task 3: Authenticated Single Surface Shell

**Files:**
- Modify: `index.html`
- Create: `scripts/fusion/single-surface-controller.js`
- Modify: `styles/fusion/f02-single-surface.css`
- Test: `tests/fusion-authoritative-entrypoint.test.cjs`
- Create: `tests/fusion-auth-isolation.test.cjs`

**Interfaces:**
- Controller exposes `window.VVIPFusionSurface.createController({ root, adapters })` and `startAuthenticated()`.
- It does not decide whether authentication is valid; it is invoked only after the existing Clerk gate exposes the authenticated application shell.
- The shell contains a hidden authenticated root `data-vvip-fusion-authoritative` that remains hidden until auth success.

- [ ] **Step 1: Extend RED tests** to require login scope isolation, hidden authenticated root by default, semantic TIGER/FUSION CSS link, and absence of privileged controls when capability view is unavailable.
- [ ] **Step 2: Run RED tests** with `node --test tests/fusion-authoritative-entrypoint.test.cjs tests/fusion-auth-isolation.test.cjs`.
- [ ] **Step 3: Replace only the authenticated marketplace body of `index.html`** with the FUSION shell while preserving the existing Clerk scripts, publishable key placement, auth gate host, resilience script and required PR36/F05 scripts.
- [ ] **Step 4: Add `single-surface-controller.js`** to initialize presenters after auth and render explicit `loading|ready|empty|degraded|error` state attributes.
- [ ] **Step 5: Extend FUSION CSS** for authoritative shell responsive geometry, visible focus and reduced-motion without modifying login selectors/tokens.
- [ ] **Step 6: Run focused tests** and all existing auth/F02/F03/F04/F05 tests touched by the entrypoint.
- [ ] **Step 7: Commit** `feat(fusion): make authenticated index the single surface`.

### Task 4: Feed + F04 Search Integration

**Files:**
- Modify: `scripts/fusion/f02-feed.js`
- Modify if necessary only at its adapter boundary: `scripts/fusion/f04-search-fabric.js`
- Create: `tests/fusion-feed-runtime-integration.test.cjs`
- Existing regression: `tests/f04-single-surface-search-integration.test.cjs`

**Interfaces:**
- Feed initialization consumes `{ listingSource, searchAdapter, sectorRegistry }`.
- Search calls only the F04 adapter and never implements a local substring-ranking fallback.
- Sector controls render from trusted registry entries where `enabled === true`.

- [ ] **Step 1: Write RED tests** that reject preview synthetic data on normal HTTPS/non-localhost entrypoint, reject fixed-sector button arrays, and require calls through F04.
- [ ] **Step 2: Run RED focused suite**.
- [ ] **Step 3: Refactor feed presenter minimally** to inject listing/search/sector dependencies while retaining localhost-only synthetic Preview support behind an explicit preview condition.
- [ ] **Step 4: Preserve F04 160 ms bounded UI debounce and rescue host behavior**; do not duplicate normalization/ranking.
- [ ] **Step 5: Run existing F02/F04 suites plus new integration test**.
- [ ] **Step 6: Commit** `feat(fusion): bind feed to F04 and dynamic sectors`.

### Task 5: Operational Progressive Composer + PR36/F05

**Files:**
- Create: `tests/fusion-composer-integration.test.cjs`
- Modify: `index.html`
- Modify: `scripts/fusion/single-surface-controller.js`
- Reuse: `scripts/vvip-pr31-create-listing-shell.js`
- Reuse: `scripts/media/pr36-controller.js`
- Reuse F05: `scripts/media/f05-heif-preflight.js`, `f05-pr36-media-bridge.js`, `f05-heif-adapter.js`, `f05-heif-worker-client.js`

**Interfaces:**
- Composer entry is enabled only for an authenticated ordinary-user listing capability supplied by the existing listing boundary; it is not an OWNER privilege.
- Initial fields are exactly photos, title, sector/category, price type/price and location; sector fields are progressive.
- Media selection always enters PR36/F05 and never directly uploads HEIC originals.

- [ ] **Step 1: Write RED tests** requiring the composer trigger to be operational (not permanently `disabled`), requiring the five initial field groups, max seven still images, F05 scripts, and absence of any server HEIC conversion function/copy in the integration controller.
- [ ] **Step 2: Run RED suite**.
- [ ] **Step 3: Wire composer trigger** to the existing create-listing shell through `runtime-adapters.js`; do not duplicate persistence or publish logic.
- [ ] **Step 4: Wire media session** to PR36/F05 and surface cancel/retry/error states. HEIC timeout/OOM/trap remains local failure with a fresh Worker on next attempt.
- [ ] **Step 5: Run new composer test plus all PR36/F05 focused tests**, especially controller, Worker, privacy derivative, real fixtures, production readiness and supply-chain records.
- [ ] **Step 6: Commit** `feat(fusion): activate progressive composer with sovereign media`.

### Task 6: Unified Profile / Settings / Capability Presentation

**Files:**
- Modify: `index.html`
- Modify: `scripts/fusion/f03-capability-menu.js`
- Create: `tests/fusion-unified-account-surface.test.cjs`
- Keep: `private-profile-p03.html` as MIGRATION_BRIDGE only.

**Interfaces:**
- Capability presenter accepts only `getPresentationView()` output from the runtime adapter.
- Profile/settings entry remains in the same shell; temporary navigation to migration page is allowed only behind an explicit migration adapter until replacement closure.

- [ ] **Step 1: Write RED tests** proving no separate owner/admin final-state skin is linked as authority, capability absence hides privileged entries, and account/profile/settings hosts exist in the same shell.
- [ ] **Step 2: Run RED suite**.
- [ ] **Step 3: Wire capability menu** to immutable F03 view and add account/settings sheet hosts; keep migration page clearly marked as bridge rather than final architecture.
- [ ] **Step 4: Run F03 capability graph/menu tests plus new test**.
- [ ] **Step 5: Commit** `feat(fusion): unify account and capability presentation`.

### Task 7: PWA Cache / Migration Authority Cleanup

**Files:**
- Modify: `fusion-home-f02.html`
- Modify: `sw-vvip-static.js`
- Create: `tests/fusion-pwa-authority.test.cjs`

**Interfaces:**
- `/index.html` is the only authoritative Home cache entry.
- `fusion-home-f02.html` may remain cached only if explicitly marked verification/migration and cannot overwrite route authority.

- [ ] **Step 1: Write RED test** requiring explicit migration marker and new runtime assets in service-worker cache/version handling without making the migration page the navigation fallback.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Mark migration page** with `data-vvip-fusion-migration-preview` and update navigation labels/canonical messaging.
- [ ] **Step 4: Update service worker cache manifest/version** to include `runtime-adapters.js`, `single-surface-controller.js`, FUSION CSS and required F04/F05 browser assets while preserving safe navigation fallback to `index.html`.
- [ ] **Step 5: Run PWA/entrypoint tests**.
- [ ] **Step 6: Commit** `chore(fusion): align PWA cache with authoritative surface`.

### Task 8: Exact-Head Verification and Preview Candidate

**Files:**
- Modify: `docs/fusion/F05_BPLUS_STATUS.md` only if integration evidence needs a non-closure cross-reference; do not falsely mark F05 complete.
- Create: `docs/fusion/FUSION_SINGLE_SURFACE_INTEGRATION_STATUS.md`

**Interfaces:**
- Status document records exact source SHA, automated run IDs/results, remaining external gates and explicit `main/Production unchanged` statement.

- [ ] **Step 1: Run repository-wide Node quality suite and all focused F02/F03/F04/F05/integration tests**.
- [ ] **Step 2: Run `git diff --check` and repository clean/security guard scripts used by Quality Gate**.
- [ ] **Step 3: Create/update a Draft integration PR against the appropriate protected verification base without merging**.
- [ ] **Step 4: Collect exact-head GitHub Actions: Quality Gate, Release Candidate exact-source verification, CodeQL, Dependency Review, TIGER CleanGuard, Project Control Integrity and applicable F05 supply-chain/media gates.**
- [ ] **Step 5: If any check fails, diagnose the exact failing test/job and return to the owning task; never weaken a gate merely to obtain green.**
- [ ] **Step 6: Record immutable exact-head evidence** in `docs/fusion/FUSION_SINGLE_SURFACE_INTEGRATION_STATUS.md`.
- [ ] **Step 7: Only after exact-head green, move the isolated password-protected Amplify DEVELOPMENT Preview branch to this exact SHA and validate `/` on Desktop/Android/iPhone.**
- [ ] **Step 8: Record external blockers separately:** real mobile HEIC/color/orientation evidence, deployed server image-stack wiring/alerts, HEVC/LGPL legal-product clearance, later F06–F16 launch passport work.

## Plan Self-Review

- Spec coverage: authoritative `/`, auth isolation, Single Surface, F04, dynamic sectors, composer, PR36/F05, capabilities, account/settings, PWA, responsive/i18n/accessibility baseline, exact-head Staging evidence and no Production mutation are mapped to Tasks 1–8.
- Placeholder scan: no implementation step relies on `TBD`, `TODO`, or unspecified authority fallback.
- Interface consistency: `runtime-adapters.js` is the only new presentation-to-runtime boundary; `single-surface-controller.js` consumes it; F02/F03 presenters consume injected views; F04 and PR36/F05 remain existing authorities.
- Roadmap consistency: no new phase number is invented; this is an integration closure between F05 and the later F06 roadmap, and `F06` remains Global Money Fabric.
