# VVIP TIGER COST-02 Static/CDN Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-neutral, fail-closed static browser cache lane that reduces repeat requests for safe same-origin CSS/JS/worker/icon/font/image assets without intercepting HTML, authentication, APIs, data, or mutations.

**Architecture:** Implement a testable UMD-style service-worker module with pure request/response policy functions and a runtime installer. Add a tiny registration module to primary entry pages. The cache is same-origin, GET-only, allowlisted by directory and extension, rejects private/no-store/no-cache responses, uses a 60-minute cached-copy timestamp, and falls back to stale static content only on network failure.

**Tech Stack:** Browser Service Worker API, Cache Storage API, Node.js `node:test`, static HTML/JavaScript, existing VVIP Quality Gate.

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

- [ ] **Step 1: Add the COST-02 branch to the push trigger**

Add exactly:

```yaml
      - feat/lean-global-static-cdn-20260808
```

under `on.push.branches` without removing existing branches.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/vvip-quality-gate.yml
git commit -m "ci(cost): verify COST-02 exact heads"
```

### Task 2: TDD RED static-delivery contract

**Files:**
- Create: `tests/lean-static-delivery.test.cjs`
- Expected later implementation: `sw-vvip-static.js`
- Expected later runtime: `scripts/runtime/vvip-static-delivery.js`

**Interfaces:**
- Consumes: Node `require()` compatibility from the future service-worker module.
- Produces: permanent policy contract for request eligibility, response cacheability, bounded freshness, and HTML registration.

- [ ] **Step 1: Write the failing contract test**

The test must require `../sw-vvip-static.js` and assert exported functions/constants:

```js
const {
  CACHE_NAME,
  MAX_AGE_MS,
  shouldHandleRequest,
  isResponseCacheable,
  cachedAt,
  isFreshCachedResponse
} = require("../sw-vvip-static.js");
```

Contract cases:

```text
PASS candidates:
GET https://vvip.example/styles/app.css
GET https://vvip.example/scripts/app.js
GET https://vvip.example/workers/media.js
GET https://vvip.example/icons/icon-192.png

DENY candidates:
navigation /index.html
GET /index.html
GET /manifest.webmanifest
GET /api/listings.json
POST /scripts/app.js
GET https://accounts.example/script.js
GET https://user:pass@vvip.example/scripts/app.js
```

Response rules:

```text
200 basic + ordinary cache-control -> cacheable
200 basic + no-store -> denied
200 basic + private -> denied
200 basic + no-cache -> denied
206 -> denied
500 -> denied
opaque -> denied
```

Freshness rules:

```text
MAX_AGE_MS === 60 * 60 * 1000
cached copy at now - 1 minute -> fresh
cached copy older than MAX_AGE_MS -> stale
missing/invalid timestamp -> stale
```

HTML registration rules:

```text
index.html contains scripts/runtime/vvip-static-delivery.js
private-profile-p03.html contains scripts/runtime/vvip-static-delivery.js
```

- [ ] **Step 2: Commit RED before implementation**

```bash
git add tests/lean-static-delivery.test.cjs
git commit -m "test(cost): define COST-02 static delivery contract"
```

The GitHub Quality Gate is expected to fail because `sw-vvip-static.js` does not exist yet.

### Task 3: Implement service-worker policy and runtime

**Files:**
- Create: `sw-vvip-static.js`

**Interfaces:**
- Produces:
  - `CACHE_NAME: string`
  - `MAX_AGE_MS: number`
  - `shouldHandleRequest(requestLike, origin): boolean`
  - `isResponseCacheable(responseLike): boolean`
  - `cachedAt(responseLike): number | null`
  - `isFreshCachedResponse(responseLike, now?): boolean`
  - `installRuntime(scope): void`

- [ ] **Step 1: Implement UMD/module boundary**

Use a wrapper that exports the API under CommonJS for Node tests and calls `installRuntime(globalThis)` only in the service-worker browser path.

- [ ] **Step 2: Implement request policy**

Constants:

```js
const CACHE_PREFIX = "vvip-static-";
const CACHE_NAME = "vvip-static-v1";
const MAX_AGE_MS = 60 * 60 * 1000;
const ALLOWED_PREFIXES = ["/styles/", "/scripts/", "/workers/", "/icons/"];
const ALLOWED_EXTENSIONS = new Set([".css", ".js", ".mjs", ".svg", ".png", ".webp", ".jpg", ".jpeg", ".woff2"]);
```

`shouldHandleRequest` must reject non-GET, cross-origin, navigation/document, credentials in URL, paths outside allowlist, and extensions outside allowlist.

- [ ] **Step 3: Implement response policy and timestamping**

`isResponseCacheable` accepts only `status === 200`, `type === "basic"` or empty synthetic test type, and rejects `cache-control` containing `no-store`, `private`, or `no-cache` case-insensitively.

When caching a network response, create a cached-only clone with header:

```text
X-VVIP-Static-Cached-At: <Date.now()>
```

Return the original network response to the browser so COST-02 never mutates live response headers.

- [ ] **Step 4: Implement bounded cache-first fetch**

For eligible requests:

```text
fresh cache hit -> return cached
stale/missing -> network fetch
cacheable network response -> refresh cached copy
network failure + stale cache -> return stale cache
network failure + no cache -> throw
```

For every ineligible request, do not call `respondWith` at all.

- [ ] **Step 5: Implement activation cleanup**

Delete only cache names starting with `vvip-static-` that are not equal to `CACHE_NAME`. Do not delete unrelated caches.

- [ ] **Step 6: Commit implementation**

```bash
git add sw-vvip-static.js
git commit -m "feat(cost): add bounded static service-worker cache"
```

### Task 4: Add resilient registration boundary

**Files:**
- Create: `scripts/runtime/vvip-static-delivery.js`
- Modify: `index.html`
- Modify: `private-profile-p03.html`

**Interfaces:**
- Consumes: browser `navigator.serviceWorker.register`.
- Produces: non-blocking registration of `/sw-vvip-static.js` with `/` scope.

- [ ] **Step 1: Implement registration module**

Use an IIFE that:

```text
returns immediately when navigator.serviceWorker is unavailable;
registers only after window load;
registers "sw-vvip-static.js" with scope "./";
never blocks application startup;
on failure logs only "VVIP_STATIC_DELIVERY_REGISTRATION_FAILED".
```

No URLs, tokens, error objects, or credentials are logged.

- [ ] **Step 2: Load registration from `index.html`**

Add:

```html
<script defer src="scripts/runtime/vvip-static-delivery.js"></script>
```

before application-specific runtime scripts.

- [ ] **Step 3: Load registration from `private-profile-p03.html`**

Add the same defer script once in `<head>`.

- [ ] **Step 4: Run contract tests and expect GREEN**

```bash
node --test tests/lean-static-delivery.test.cjs
```

Expected: all COST-02 contract tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/runtime/vvip-static-delivery.js index.html private-profile-p03.html
git commit -m "feat(cost): register provider-neutral static delivery"
```

### Task 5: Full exact-head verification and Draft PR

**Files:**
- No implementation files beyond prior tasks.

**Interfaces:**
- Consumes: exact Git commit SHA and GitHub Actions.
- Produces: auditable COST-02 Draft PR stacked on COST-01.

- [ ] **Step 1: Verify branch diff**

Compare:

```text
base: feat/lean-global-cost-governor-20260808
head: feat/lean-global-static-cdn-20260808
```

Confirm no Supabase migration, Production Edge Function, provider secret, billing code, or paid-resource provisioning is present.

- [ ] **Step 2: Open Draft PR**

Base branch:

```text
feat/lean-global-cost-governor-20260808
```

Title:

```text
COST-02: bounded static CDN delivery lane
```

- [ ] **Step 3: Verify exact HEAD workflows**

Required truth reporting:

```text
Project Control Integrity -> report actual conclusion
VVIP Quality Gate -> report actual conclusion
any separate workflow failure -> report separately; never hide or relabel PASS
```

- [ ] **Step 4: Keep Production locked**

Do not merge, deploy, apply remote migrations, create paid resources, or authorize real spend as part of COST-02.
