# VVIP TIGER COST-02 Static/CDN Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-neutral, fail-closed static browser cache lane that reduces repeat requests for safe same-origin CSS/JS/worker/icon/font/image assets without intercepting HTML, authentication, APIs, data, or mutations.

**Architecture:** Implement a testable UMD-style Service Worker with pure request/response policy functions and a resilient registration runtime. The existing shared `scripts/vvip-pr30-resilience.js` bootstraps registration once for both primary entry pages, avoiding duplicate HTML edits. Cache eligibility is same-origin, GET-only, scope-relative, allowlisted by directory and extension, rejects private/no-store/no-cache responses, uses a 60-minute cached-copy timestamp, and falls back to stale static content only when the network fails.

**Tech Stack:** Browser Service Worker API, Cache Storage API, Node.js `node:test`, static JavaScript, existing VVIP Quality Gate.

## Global Constraints

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `PRODUCTION_DEPLOY=NOT_AUTHORIZED`
- `REAL_CHARGES=NOT_AUTHORIZED`
- `PROVIDER_PURCHASES=NOT_AUTHORIZED`
- No provider credentials or secrets.
- HTML/navigation/auth/API/data/mutation traffic is never cached by COST-02.
- Security evidence overrides cost optimization.
- COST-02 must remain reversible and provider-neutral.

---

### Task 1: Exact-branch CI trigger

**Files:**
- Modify: `.github/workflows/vvip-quality-gate.yml`

**Interfaces:**
- Consumes: existing `VVIP Quality Gate` workflow.
- Produces: push verification on `feat/lean-global-static-cdn-20260808`.

- [x] Add `feat/lean-global-static-cdn-20260808` to `on.push.branches` without removing existing branches.
- [x] Commit as `ci(cost): verify COST-02 exact heads`.

### Task 2: TDD RED static-delivery contract

**Files:**
- Create: `tests/lean-static-delivery.test.cjs`

**Interfaces:**
- Consumes: Node `require()` compatibility from the future Service Worker and registration runtime.
- Produces: permanent policy contract for request eligibility, response cacheability, bounded freshness, registration lifecycle, scoped deployments, and shared bootstrap.

- [x] Write failing tests for:
  - allowed root and subpath static requests;
  - denied navigation, HTML, API, JSON, auth, scope escape, cross-origin, credentialed and mutation requests;
  - fail-closed response cacheability;
  - strict 60-minute freshness;
  - testable registration installer including already-loaded pages;
  - one shared PR30 bootstrap path for both primary entry pages.
- [x] Commit the RED contract before implementation.
- [x] Verify RED in GitHub Actions. Exact RED head `8309e03a644678800c4f82a6cb493637252941f4` failed in `VVIP Quality Gate` run `31274220009`; diagnostics show COST-02 failures because `sw-vvip-static.js` and the registration runtime did not yet exist.

### Task 3: Implement bounded Service Worker

**Files:**
- Create: `sw-vvip-static.js`

**Interfaces:**
- Produces:
  - `CACHE_NAME: string`
  - `MAX_AGE_MS: number`
  - `shouldHandleRequest(requestLike, origin, scopePath?): boolean`
  - `isResponseCacheable(responseLike): boolean`
  - `cachedAt(responseLike): number | null`
  - `isFreshCachedResponse(responseLike, now?): boolean`
  - `installRuntime(scope): boolean`

- [x] Use a UMD boundary: CommonJS exports in Node, runtime installation only in Service Worker context.
- [x] Set `CACHE_NAME = "vvip-static-v1"` and `MAX_AGE_MS = 60 * 60 * 1000`.
- [x] Allow only scope-relative `/styles/`, `/scripts/`, `/workers/`, `/icons/` requests with safe static extensions.
- [x] Reject non-GET, navigation/document, cross-origin, credentialed URLs, scope escapes, and non-static paths.
- [x] Cache only status-200 basic responses that do not declare `no-store`, `no-cache`, or `private`.
- [x] Add `X-VVIP-Static-Cached-At` only to the cached copy, never the live network response.
- [x] Serve fresh cache hits directly; refresh stale/missing entries from network; return stale static content only as a network-failure fallback.
- [x] During activation delete only obsolete caches whose names start with `vvip-static-`.

### Task 4: Add resilient shared registration

**Files:**
- Create: `scripts/runtime/vvip-static-delivery.js`
- Modify: `scripts/vvip-pr30-resilience.js`

**Interfaces:**
- Consumes: browser `navigator.serviceWorker.register` and the existing shared PR30 resilience layer.
- Produces: one non-blocking registration path for both `index.html` and `private-profile-p03.html`.

- [x] Export `installRegistration(root)` under CommonJS for Node tests and auto-install only in browser context.
- [x] If the document is already `complete`, register immediately; otherwise register once on `load`.
- [x] Register `sw-vvip-static.js` with `{ scope: "./" }`.
- [x] On failure log only `VVIP_STATIC_DELIVERY_REGISTRATION_FAILED` without URLs, tokens, credentials, or raw error objects.
- [x] Update `scripts/vvip-pr30-resilience.js` to inject `scripts/runtime/vvip-static-delivery.js` exactly once.
- [x] Keep `index.html` and `private-profile-p03.html` unchanged because both already load PR30 Resilience exactly once.

### Task 5: Full exact-head verification and Draft PR

**Files:**
- No implementation files beyond prior tasks.

**Interfaces:**
- Consumes: exact Git commit SHA and GitHub Actions.
- Produces: auditable COST-02 Draft PR stacked on COST-01.

- [ ] Compare `feat/lean-global-cost-governor-20260808...feat/lean-global-static-cdn-20260808` and confirm no Supabase migration, Production Edge Function, provider secret, billing code, or paid-resource provisioning.
- [ ] Open Draft PR with base `feat/lean-global-cost-governor-20260808` and title `COST-02: bounded static CDN delivery lane`.
- [ ] Verify actual conclusions on the exact final HEAD for `Project Control Integrity`, `VVIP Quality Gate`, and any separate workflows. Never hide or relabel a failure.
- [ ] Keep Production locked: no merge, deploy, remote migration, paid resource, or real spend authorization in COST-02.
