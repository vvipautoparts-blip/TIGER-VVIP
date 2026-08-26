# Sovereign Runtime Authority Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the marketplace hardening/rollback wrapper from production and converge browser publication, canonical-media finalization, public reads, and release packaging onto one canonical runtime repository with one trusted publication command.

**Architecture:** Keep Supabase as the browser data boundary under RLS, keep the dedicated HTTPS media-finalizer service as the only canonical-media promoter, and keep the existing trusted PostgreSQL publication RPC internally. Move all valid browser-side finalization/public-read behavior from `vvip-marketplace-rollback.js` into `vvip-marketplace-repository.js`, expose only `requestPublication`, then delete the wrapper and remove broad runtime artifact inclusion.

**Tech Stack:** Vanilla JavaScript, Node `node:test`, Python release builder tests, Supabase JS RPC/storage client, existing F05 media-finalizer service, GitHub Actions quality/security gates.

## Global Constraints

- Less code, fewer authorities, fewer paths; materially higher security and reliability.
- The browser never sets `PENDING_REVIEW` or `ACTIVE` directly.
- The browser never mints trusted advertising/visibility entitlement.
- Original HEIC/HEIF remains client-side only; the server finalizer receives JPEG/WebP derivatives only.
- Public listing media is served from canonical private storage only after trusted finalization.
- `vvip-marketplace-rollback.js` is not a permanent runtime layer and must disappear after behavior convergence.
- No compatibility layer remains in the production artifact after zero-reference proof.
- Production release uses exact allowlists, not broad `scripts/runtime/` copying.
- Existing migrations are not rewritten merely to simplify history.
- Security gates are never weakened to make CI green.
- Facebook-style account/feed/composer and OpenSooq-grade discovery remain one coherent TIGER surface; this plan must not create a second UI authority.

---

## File responsibility map

- `scripts/runtime/vvip-marketplace-repository.js` — the only browser marketplace repository; owns untrusted draft/media staging, finalization request transport, canonical public reads, favorites, and the single publication request adapter.
- `scripts/fusion/progressive-composer.js` — UI orchestration only; calls `createDraftWithMedia` and `requestPublication`; never owns trusted state.
- `services/media-finalizer/*` — trusted server canonicalization; unchanged unless tests expose a real defect.
- `tools/vvip_public_release.py` — exact public artifact allowlist and runtime load order; no broad runtime prefix.
- `tests/fusion-sovereign-runtime-authority.test.cjs` — executable architecture invariants proving single runtime/publication authority.
- `tests/vvip-marketplace-repository.test.cjs` — repository behavior contract.
- `tests/fusion-server-media-finalization-contract.test.cjs` — server/browser finalization boundary contract.
- `tests/test_vvip_public_release.py` and `tests/test_vvip_release_load_order.py` — artifact closure/load order.
- Delete `scripts/runtime/vvip-marketplace-rollback.js` and `tests/vvip-marketplace-rollback.test.cjs` only after their valid behavior is represented in canonical tests.

---

### Task 1: RED single-authority runtime contract

**Files:**
- Create: `tests/fusion-sovereign-runtime-authority.test.cjs`
- Test: `scripts/runtime/vvip-marketplace-repository.js`
- Test: `tools/vvip_public_release.py`

**Interfaces:**
- Consumes: repository source and release-builder source as text.
- Produces: an executable invariant requiring one browser publication method named `requestPublication` and forbidding the rollback wrapper in production packaging.

- [ ] **Step 1: Write the failing architecture test**

Create a Node test that asserts:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("production runtime exposes one sovereign publication authority", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  const composer = read("scripts/fusion/progressive-composer.js");
  const release = read("tools/vvip_public_release.py");

  assert.match(repository, /function requestPublication\s*\(/);
  assert.doesNotMatch(repository, /\bsubmitForReview\b/);
  assert.doesNotMatch(repository, /\bcreateAndSubmit\b/);
  assert.doesNotMatch(repository, /function prepareForPublication\s*\(/);
  assert.match(composer, /\.requestPublication\s*\(/);
  assert.doesNotMatch(composer, /\.prepareForPublication\s*\(/);
  assert.doesNotMatch(release, /vvip-marketplace-rollback\.js/);
  assert.doesNotMatch(release, /"scripts\/runtime\/"/);
});

test("browser repository cannot directly mutate trusted publication status", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  assert.doesNotMatch(repository, /\.update\([^)]*status\s*:\s*["'](?:PENDING_REVIEW|ACTIVE)["']/s);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/fusion-sovereign-runtime-authority.test.cjs
```

Expected: FAIL because the current API still uses `prepareForPublication`, the release builder injects `vvip-marketplace-rollback.js`, and `PUBLIC_PREFIXES` broadly includes `scripts/runtime/`.

- [ ] **Step 3: Commit RED only**

```bash
git add tests/fusion-sovereign-runtime-authority.test.cjs
git commit -m "test(fusion): require sovereign single-path runtime authority"
```

---

### Task 2: Integrate trusted media-finalization transport into the canonical repository

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Modify: `tests/vvip-marketplace-repository.test.cjs`
- Modify: `tests/fusion-server-media-finalization-contract.test.cjs`

**Interfaces:**
- Consumes: `options.client`, `options.config.mediaFinalizerUrl`, optional `options.fetch`, existing RPC `vvip_marketplace_request_media_finalization`.
- Produces: internal `finalizeMediaRow(mediaId)` and canonical `createDraftWithMedia(input, images)` behavior; these helpers are not additional global runtime authorities.

- [ ] **Step 1: Add failing repository tests for finalization**

Add tests requiring:

```js
await assert.rejects(
  () => repository.createDraftWithMedia(validDraft, [validJpeg]),
  { code: "MEDIA_FINALIZER_URL_REQUIRED" }
);
```

and a success fixture where `client.rpc("vvip_marketplace_request_media_finalization", { target_media: mediaId })` returns a 64-hex token and mocked HTTPS fetch returns:

```js
{ ok: true, mediaId, state: "CANONICAL" }
```

Assert every inserted media row is finalized before `createDraftWithMedia` resolves.

- [ ] **Step 2: Run focused RED tests**

```bash
node --test tests/vvip-marketplace-repository.test.cjs tests/fusion-server-media-finalization-contract.test.cjs
```

Expected: FAIL because finalization currently lives in the wrapper.

- [ ] **Step 3: Move only valid finalization behavior into repository scope**

Inside `createMarketplaceRepository(options)` add private helpers equivalent to:

```js
function mediaFinalizerUrl() {
  const raw = String(config.mediaFinalizerUrl || (root.__VVIP_RUNTIME_CONFIG__ && root.__VVIP_RUNTIME_CONFIG__.mediaFinalizerUrl) || "").trim();
  if (!raw) throw marketplaceError("MEDIA_FINALIZER_URL_REQUIRED");
  let parsed;
  try { parsed = new URL(raw); } catch (_) { throw marketplaceError("MEDIA_FINALIZER_URL_INVALID"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw marketplaceError("MEDIA_FINALIZER_URL_INVALID");
  }
  return parsed.toString();
}

async function finalizeMediaRow(mediaId) {
  const grantResult = await client.rpc("vvip_marketplace_request_media_finalization", { target_media: mediaId });
  const grantData = assertClientResult(grantResult, "MEDIA_FINALIZATION_GRANT_FAILED");
  const grant = Array.isArray(grantData) ? grantData[0] : grantData;
  if (!grant || grant.media_id !== mediaId || !/^[0-9a-f]{64}$/.test(String(grant.finalization_token || ""))) {
    throw marketplaceError("MEDIA_FINALIZATION_GRANT_INVALID");
  }
  const fetchFn = (options && options.fetch) || root.fetch;
  if (typeof fetchFn !== "function") throw marketplaceError("MEDIA_FINALIZER_TRANSPORT_REQUIRED");
  const response = await fetchFn(mediaFinalizerUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    body: JSON.stringify({ mediaId, finalizationToken: grant.finalization_token })
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok || !payload || payload.ok !== true || payload.mediaId !== mediaId || payload.state !== "CANONICAL") {
    throw marketplaceError("MEDIA_SERVER_FINALIZATION_FAILED");
  }
  return payload;
}
```

Update `createDraftWithMedia` so it receives inserted media rows from `uploadMedia`, finalizes each `media_id`, and resolves only when all are canonical. On failure, delete the draft/raw staging objects using the existing bounded cleanup behavior; cleanup failure must never convert a failed finalization into success.

- [ ] **Step 4: Run focused tests**

```bash
node --test tests/vvip-marketplace-repository.test.cjs tests/fusion-server-media-finalization-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/runtime/vvip-marketplace-repository.js tests/vvip-marketplace-repository.test.cjs tests/fusion-server-media-finalization-contract.test.cjs
git commit -m "refactor(runtime): converge media finalization into canonical repository"
```

---

### Task 3: Serve public listing media from canonical storage only

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Modify: `tests/vvip-marketplace-repository.test.cjs`

**Interfaces:**
- Consumes: `vvip_marketplace_listing_media(canonical_storage_path,finalization_state,position,is_cover,alt_text)`.
- Produces: `listPublic(filters)` whose signed URLs come only from bucket `listing-media-canonical` and only for `finalization_state === "CANONICAL"`.

- [ ] **Step 1: Add failing canonical-read test**

Mock two media rows, one canonical and one raw/pending. Assert `createSignedUrls` is called on `listing-media-canonical` only with the canonical path and the pending row receives an empty URL.

- [ ] **Step 2: Run RED**

```bash
node --test tests/vvip-marketplace-repository.test.cjs
```

Expected: FAIL because the base repository currently selects/signs `storage_path` from `listing-media`.

- [ ] **Step 3: Replace the public media projection and signer**

Change the repository's public select to canonical fields and make the signing path fail closed:

```js
const PUBLIC_FEED_SELECT = "listing_id,active_market_country,sector,title,summary,price_minor,currency_code,location_label,contact_phone,whatsapp_enabled,media:vvip_marketplace_listing_media(canonical_storage_path,finalization_state,position,is_cover,alt_text)";
```

Only canonical rows may contribute signable paths. Sign via:

```js
client.storage.from("listing-media-canonical").createSignedUrls(paths, 900)
```

- [ ] **Step 4: Run test and commit**

```bash
node --test tests/vvip-marketplace-repository.test.cjs
git add scripts/runtime/vvip-marketplace-repository.js tests/vvip-marketplace-repository.test.cjs
git commit -m "security(runtime): serve canonical listing media only"
```

---

### Task 4: Rename the single browser publication command to `requestPublication`

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Modify: `scripts/fusion/progressive-composer.js`
- Modify: `tests/fusion-publication-entitlement-contract.test.cjs`
- Modify: `tests/experience-convergence-publication.test.cjs`
- Modify: `tests/fusion-composer-integration.test.cjs`
- Modify: `tests/vvip-marketplace-repository.test.cjs`

**Interfaces:**
- Produces: `requestPublication(listingId, { planId, entitlementReceipt }) -> Promise<bounded server result>`.
- Internal transport remains the current server RPC `vvip_marketplace_prepare_publication` until DB forward-convergence is separately executed.

- [ ] **Step 1: Update tests first**

Require the repository export to contain `requestPublication` and not `prepareForPublication`, `submitForReview`, or `createAndSubmit`. Require the composer to call:

```js
context.repository.requestPublication(draft.listing_id, {
  planId: activation.planId,
  entitlementReceipt: activation.entitlementReceipt
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/fusion-publication-entitlement-contract.test.cjs tests/experience-convergence-publication.test.cjs tests/fusion-composer-integration.test.cjs tests/vvip-marketplace-repository.test.cjs
```

Expected: FAIL on old method name.

- [ ] **Step 3: Rename the browser API without adding an alias**

Implement `requestPublication` using the existing normalized intent and exact trusted RPC call:

```js
const result = await client.rpc("vvip_marketplace_prepare_publication", {
  target_listing: intent.listingId,
  target_plan_id: intent.planId,
  entitlement_receipt: intent.entitlementReceipt
});
```

No deprecated alias is retained in the returned repository object.

- [ ] **Step 4: Run focused tests and commit**

```bash
node --test tests/fusion-publication-entitlement-contract.test.cjs tests/experience-convergence-publication.test.cjs tests/fusion-composer-integration.test.cjs tests/vvip-marketplace-repository.test.cjs
git add scripts/runtime/vvip-marketplace-repository.js scripts/fusion/progressive-composer.js tests/fusion-publication-entitlement-contract.test.cjs tests/experience-convergence-publication.test.cjs tests/fusion-composer-integration.test.cjs tests/vvip-marketplace-repository.test.cjs
git commit -m "refactor(fusion): expose one publication request command"
```

---

### Task 5: Remove the wrapper and close the production artifact

**Files:**
- Delete: `scripts/runtime/vvip-marketplace-rollback.js`
- Delete: `tests/vvip-marketplace-rollback.test.cjs`
- Modify: `tools/vvip_public_release.py`
- Modify: `tests/test_vvip_public_release.py`
- Modify: `tests/test_vvip_release_load_order.py`
- Modify: `tests/fusion-server-media-finalization-contract.test.cjs`
- Modify any exact references found by zero-reference search.

**Interfaces:**
- Produces: production artifact with an exact runtime file list and no wrapper/legacy publication layer.

- [ ] **Step 1: Change release tests before builder code**

Require the built candidate to contain:

```text
scripts/runtime/vvip-runtime-loader.js
scripts/runtime/vvip-marketplace-repository.js
```

and not contain:

```text
scripts/runtime/vvip-marketplace-rollback.js
```

Require transformed index load order to include runtime-config → runtime-loader → marketplace-repository → auth, with no wrapper script.

- [ ] **Step 2: Run RED release tests**

```bash
python -m pytest tests/test_vvip_public_release.py tests/test_vvip_release_load_order.py -q
```

Expected: FAIL because the builder still broadly copies `scripts/runtime/` and injects the wrapper.

- [ ] **Step 3: Replace broad runtime prefix with exact runtime allowlist**

Remove `"scripts/runtime/"` from `PUBLIC_PREFIXES`. Add the exact required runtime scripts to `PUBLIC_SCRIPT_FILES` or a dedicated exact tuple:

```python
"scripts/runtime/vvip-runtime-loader.js",
"scripts/runtime/vvip-marketplace-repository.js",
```

Delete the rollback injection line from `_transform_index`.

- [ ] **Step 4: Zero-reference proof before deletion**

Run:

```bash
git grep -n "vvip-marketplace-rollback\|hardenRepository\|MARKETPLACE_LEGACY_PUBLICATION_BYPASS_PRESENT" -- ':!docs/**' ':!docs/superpowers/**'
```

Expected: only the file/test scheduled for deletion, or no references after test migration. Any production/runtime reference must be removed deliberately before proceeding.

- [ ] **Step 5: Delete wrapper and obsolete wrapper test**

```bash
git rm scripts/runtime/vvip-marketplace-rollback.js tests/vvip-marketplace-rollback.test.cjs
```

- [ ] **Step 6: Run release + architecture tests**

```bash
node --test tests/fusion-sovereign-runtime-authority.test.cjs tests/fusion-server-media-finalization-contract.test.cjs
python -m pytest tests/test_vvip_public_release.py tests/test_vvip_release_load_order.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tools/vvip_public_release.py tests/test_vvip_public_release.py tests/test_vvip_release_load_order.py tests/fusion-server-media-finalization-contract.test.cjs
git commit -m "refactor(release): remove runtime wrapper and exact-allowlist marketplace authority"
```

---

### Task 6: Exact-head verification and blocker classification

**Files:**
- No product file unless a failing test identifies a real defect.

**Interfaces:**
- Produces: one exact SHA with evidence for runtime convergence and a precise remaining blocker list for the next DB/staging plan.

- [ ] **Step 1: Run all focused FUSION/runtime/media tests**

```bash
node --test tests/fusion-sovereign-runtime-authority.test.cjs tests/vvip-marketplace-repository.test.cjs tests/fusion-publication-entitlement-contract.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/experience-convergence-publication.test.cjs tests/fusion-composer-integration.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Run release tests**

```bash
python -m pytest tests/test_vvip_public_release.py tests/test_vvip_release_load_order.py -q
```

Expected: PASS.

- [ ] **Step 3: Run the repository quality gate**

Use the same command invoked by `.github/workflows` for `VVIP Quality Gate`. Do not edit the gate to accommodate failures.

Expected: either PASS or a smaller, exact set of independent failures.

- [ ] **Step 4: Run SQL/LC03 scanner without pinning new hashes prematurely**

If scanner failure is caused by unreviewed new SQL, classify it as `REVIEW_REQUIRED`, inspect the migration, and do not add an allowlist hash until the DB convergence design/live migration state has been reviewed.

- [ ] **Step 5: Verify zero wrapper references**

```bash
git grep -n "vvip-marketplace-rollback" -- ':!docs/**'
```

Expected: no output.

- [ ] **Step 6: Record exact commit SHA and CI status**

The next plan starts only from this exact verified SHA and addresses live Supabase migration authority convergence plus staging evidence; it must not resurrect a browser wrapper.
