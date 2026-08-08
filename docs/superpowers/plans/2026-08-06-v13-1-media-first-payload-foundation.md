# V13.1 Media-First Payload Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an infrastructure-free media control-plane foundation that validates immutable media manifests, enforces the exact seven-photo binding model, and projects one bounded visual-first listing card without exposing storage or authority internals.

**Architecture:** Three pure ES modules define the canonical media catalogs, immutable asset/derivative/binding manifests, and a trusted card projector. The modules accept only bounded plain data, return stable fail-closed decisions, and contain no browser, storage, network, database, environment, credential, or production implementation. A focused media integrity gate is added only after its registration test proves RED.

**Tech Stack:** Node.js 22 ES modules, Node built-in test runner, CommonJS test harnesses with dynamic `import()`, existing isolated `scripts/quality-gate.sh`, GitHub Actions.

## Global Constraints

- Stack above PR #126 final SHA `088c127b438894ecf97b3e2e2a176e5b870d2db3`.
- Exactly seven photos maximum; no paid increase and no video.
- Original user-selected files stay local; the server contract models only PR36 JPEG/WebP 4:3 ingress artifacts.
- No default country, legal entity, tax, residency, bucket, object path, storage region, or delivery URL.
- Exact lowercase SHA-256 only; no weak fallback.
- `objectRef` and `deliveryRef` are opaque tokens, not paths or URLs.
- One card contains one hero visual and encodes to at most 2,048 bytes.
- Future pages remain bounded to 50 cards and 128 KiB.
- All outputs are deeply frozen.
- No endpoint, Supabase connection, migration, Storage API call, credential, production data, remote database, or direct `main` change.
- Existing PR36, listing, authorization, security, and smoke suites must remain green.

## File Structure

### Create

- `scripts/media/v13-media-contracts.js` — canonical contracts, states, purposes, limits, errors, and primitive validators.
- `scripts/media/v13-media-manifest.js` — immutable asset, derivative, binding, and binding-set validation.
- `scripts/media/v13-media-card-projector.js` — trusted media-first card projection and disclosure allowlist.
- `tests/v13-1-media-contracts.test.cjs` — exact catalog and primitive invariant tests.
- `tests/v13-1-media-manifest.test.cjs` — manifest and cross-record invariant tests.
- `tests/v13-1-media-card-projector.test.cjs` — visual payload, masking, expiry, size, and purity tests.
- `tests/v13-1-media-quality-gate.test.cjs` — focused gate ordering and registration contract.

### Modify only after focused-gate RED

- `scripts/quality-gate.sh` — register the three media test files in `MEDIA_TESTS` and execute `v13_1_media_integrity` after authorization integrity and before secret scanning.

---

### Task 1: Canonical Media Contracts

**Files:**
- Create: `tests/v13-1-media-contracts.test.cjs`
- Create: `scripts/media/v13-media-contracts.js`

**Interfaces:**
- Produces: `MEDIA_CONTRACTS`, `MEDIA_LIMITS`, `MEDIA_MIME_TYPES`, `MEDIA_DERIVATIVE_PURPOSES`, `MEDIA_ASSET_STATES`, `MEDIA_DERIVATIVE_STATES`, `MEDIA_BINDING_STATES`, `MEDIA_DISCLOSURE_CLASSES`, `MEDIA_ERROR_CODES`, `isMediaIdentifier(value, prefix)`, `isCountryCode(value)`, `isSha256(value)`, `isOpaqueObjectRef(value)`, `isOpaqueDeliveryRef(value)`.
- Consumers: Tasks 2 and 3.

- [ ] **Step 1: Write the failing contracts test**

Create a CommonJS test that dynamically imports the missing ES module and asserts exact frozen values:

```js
const EXPECTED_CONTRACTS = {
  ASSET: { name: 'V13.1_MEDIA_ASSET_MANIFEST', version: 1 },
  DERIVATIVE: { name: 'V13.1_MEDIA_DERIVATIVE_MANIFEST', version: 1 },
  BINDING: { name: 'V13.1_LISTING_MEDIA_BINDING', version: 1 },
  CARD: { name: 'V13.1_MEDIA_FIRST_LISTING_CARD', version: 1 }
};

assert.deepEqual(module.MEDIA_CONTRACTS, EXPECTED_CONTRACTS);
assert.equal(module.MEDIA_LIMITS.MAX_LISTING_MEDIA, 7);
assert.equal(module.MEDIA_LIMITS.MAX_CARD_BYTES, 2048);
assert.equal(module.MEDIA_LIMITS.MAX_PAGE_ITEMS, 50);
assert.equal(module.MEDIA_LIMITS.MAX_PAGE_BYTES, 128 * 1024);
assert.deepEqual(module.MEDIA_MIME_TYPES, ['image/jpeg', 'image/webp']);
assert.equal(Object.isFrozen(module.MEDIA_CONTRACTS.ASSET), true);
```

The test must also prove:

```js
assert.equal(module.isCountryCode('JO'), true);
assert.equal(module.isCountryCode('jo'), false);
assert.equal(module.isCountryCode(undefined), false);
assert.equal(module.isSha256('a'.repeat(64)), true);
assert.equal(module.isSha256('A'.repeat(64)), false);
assert.equal(module.isOpaqueObjectRef('media_object_ref_00000001'), true);
assert.equal(module.isOpaqueObjectRef('https://bucket/object'), false);
assert.equal(module.isOpaqueObjectRef('../object'), false);
assert.equal(module.isOpaqueDeliveryRef('media_delivery_ref_00000001'), true);
assert.equal(module.isOpaqueDeliveryRef('media_delivery_ref_00000001?token=x'), false);
```

It must inspect source and reject `video`, `image/png`, a country default, URL literals, storage SDKs, browser APIs, environment reads, and weak hash terms.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/v13-1-media-contracts.test.cjs
```

Expected: fail with `ERR_MODULE_NOT_FOUND` for `v13-media-contracts.js`.

- [ ] **Step 3: Implement the minimal contracts module**

Use frozen literal catalogs. The limits must include:

```js
MAX_LISTING_MEDIA: 7
MAX_INGRESS_BYTES: 15 * 1024 * 1024
MAX_INGRESS_WIDTH: 1600
MAX_INGRESS_HEIGHT: 1200
MAX_ALT_TEXT: 140
MAX_CARD_BYTES: 2048
MAX_PAGE_ITEMS: 50
MAX_PAGE_BYTES: 128 * 1024
MAX_DELIVERY_TTL_MS: 300000
IDENTIFIER: 128
OPAQUE_REF: 256
```

Derivative purpose definitions:

```js
hero_4x3: { maxWidth: 1600, maxHeight: 1200 }
card_4x3: { maxWidth: 800, maxHeight: 600 }
thumbnail_4x3: { maxWidth: 400, maxHeight: 300 }
```

Use a strict stable identifier pattern with explicit prefixes. Opaque references may contain only ASCII letters, digits, `.`, `_`, `:`, and `-`; they reject slash, backslash, query, fragment, whitespace, and URL syntax.

- [ ] **Step 4: Run GREEN**

Run:

```bash
node --test tests/v13-1-media-contracts.test.cjs
```

Expected: all contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/media/v13-media-contracts.js tests/v13-1-media-contracts.test.cjs
git commit -m "feat(media): add V13.1 media contracts"
```

---

### Task 2: Immutable Media Manifests and Binding Set

**Files:**
- Create: `tests/v13-1-media-manifest.test.cjs`
- Create: `scripts/media/v13-media-manifest.js`

**Interfaces:**
- Consumes: Task 1 catalogs and primitive validators.
- Produces:

```js
createMediaAssetManifest(input)
createMediaDerivativeManifest(input)
createListingMediaBinding(input)
validateListingMediaBindingSet({ assets, bindings })
```

Each function returns a deeply frozen result:

```js
{ ok: true, code: 'MEDIA_MANIFEST_VALID', value }
```

or:

```js
{ ok: false, code: '<stable media error>' }
```

- [ ] **Step 1: Write failing asset-manifest tests**

A valid fixture must use:

```js
{
  contract: MEDIA_CONTRACTS.ASSET,
  assetId: 'media_asset_00000001',
  tenantId: 'tenant_global_0001',
  listingId: 'listing_00000001',
  listingPrincipalId: 'principal_00000001',
  countryCode: 'JO',
  countrySealVersion: 'seal_version_0001',
  ingress: {
    mimeType: 'image/webp',
    width: 1600,
    height: 1200,
    sizeBytes: 250000,
    sha256: 'a'.repeat(64)
  },
  state: 'verified',
  manifestRevision: 1,
  createdAt: '2026-08-06T08:00:00.000Z',
  verifiedAt: '2026-08-06T08:01:00.000Z',
  revokedAt: null
}
```

Tests must reject:

- missing country or seal;
- lowercase country;
- PNG or video MIME;
- non-4:3 dimensions;
- width or height over PR36 limits;
- byte limit violations;
- uppercase or short hash;
- invalid revision or timestamps;
- unknown state;
- unknown top-level or ingress key;
- keys named `filename`, `exif`, `url`, `bucket`, `path`, `token`, `session`, `envelope`, `secret`, `authorityClass`, `legalEntityCountry`, or `dataResidencyRegion`.

- [ ] **Step 2: Write failing derivative-manifest tests**

A valid derivative uses an opaque object token:

```js
{
  contract: MEDIA_CONTRACTS.DERIVATIVE,
  derivativeId: 'media_derivative_00000001',
  assetId: 'media_asset_00000001',
  purpose: 'card_4x3',
  mimeType: 'image/webp',
  width: 800,
  height: 600,
  sizeBytes: 120000,
  sha256: 'b'.repeat(64),
  objectRef: 'media_object_ref_00000001',
  storageRevision: 1,
  state: 'active',
  createdAt: '2026-08-06T08:02:00.000Z'
}
```

Tests must reject purpose overflow, non-4:3 dimensions, path and URL-shaped object references, query strings, traversal, unknown fields, invalid state, and invalid hash.

- [ ] **Step 3: Write failing binding and set tests**

Valid bindings use contiguous positions and one cover. Test zero through seven items, then reject eight items, gaps, duplicate positions, duplicate assets, zero or multiple covers, tenant/listing mismatch, unknown asset, and incompatible asset state.

Published bindings require a published asset. Draft or ready bindings require processed or attached assets. Revoked, rejected, purged, reserved, quarantined, and verified assets cannot satisfy a published binding set.

- [ ] **Step 4: Run RED**

Run:

```bash
node --test tests/v13-1-media-manifest.test.cjs
```

Expected: fail with `ERR_MODULE_NOT_FOUND` for `v13-media-manifest.js`.

- [ ] **Step 5: Implement exact allowlists and state-aware validators**

Implementation rules:

- Accept plain objects only.
- Reject cycles, prototypes other than `Object.prototype` or `null`, functions, symbols, bigint, non-finite numbers, and pollution keys.
- Do not silently discard unknown fields.
- Normalize alt text with NFKC, remove executable/control characters, collapse whitespace, and limit to 140 characters.
- Normalize successful timestamps to ISO strings.
- Clone and deeply freeze every successful value.
- Never echo invalid input in a failure.

- [ ] **Step 6: Run GREEN**

Run:

```bash
node --test tests/v13-1-media-contracts.test.cjs tests/v13-1-media-manifest.test.cjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/media/v13-media-manifest.js tests/v13-1-media-manifest.test.cjs
git commit -m "feat(media): validate immutable media manifests"
```

---

### Task 3: Bounded Media-First Card Projector

**Files:**
- Create: `tests/v13-1-media-card-projector.test.cjs`
- Create: `scripts/media/v13-media-card-projector.js`

**Interfaces:**
- Consumes: Task 1 catalogs and Task 2 manifest/binding validation.
- Produces:

```js
projectMediaFirstListingCard({
  listing,
  assets,
  derivatives,
  bindings,
  delivery,
  now
})
```

Success:

```js
{
  ok: true,
  code: 'MEDIA_FIRST_CARD_PROJECTED',
  value: {
    contract,
    listingId,
    listingRevision,
    countryCode,
    sector,
    title,
    price: { amount, currency },
    locationLabel,
    hero: {
      derivativeId,
      deliveryRef,
      altText,
      mimeType,
      width,
      height,
      aspectRatio: '4:3'
    },
    imageCount,
    state: 'published'
  }
}
```

- [ ] **Step 1: Write the failing projector tests**

Build a valid listing, published asset, active `card_4x3` derivative, published binding set, and trusted delivery context:

```js
{
  ref: 'media_delivery_ref_00000001',
  tenantId: 'tenant_global_0001',
  listingId: 'listing_00000001',
  listingRevision: 4,
  countryCode: 'JO',
  derivativeId: 'media_derivative_00000001',
  storageRevision: 1,
  disclosureClass: 'beneficiary',
  policyVersion: 'V13.1',
  issuedAt: '2026-08-06T08:00:00.000Z',
  expiresAt: '2026-08-06T08:05:00.000Z'
}
```

Prove the output contains exactly one hero and no description, specifications, attributes, owner ID, object reference, hash, upload data, filename, EXIF, event payload, idempotency key, session, envelope, legal entity, residency, moderation, audit, token, bucket, or path.

- [ ] **Step 2: Add failure tests**

Reject:

- unpublished listing;
- zero or invalid binding set;
- non-cover selection;
- cover asset not published;
- missing active `card_4x3` derivative;
- derivative and asset mismatch;
- delivery tenant/listing/country/revision/derivative/storage mismatch;
- delivery issued in the future;
- expired delivery;
- delivery lifetime over five minutes;
- URL or path-shaped delivery reference;
- invalid price, title, sector, location, currency, or country;
- card output over 2,048 bytes.

- [ ] **Step 3: Run RED**

Run:

```bash
node --test tests/v13-1-media-card-projector.test.cjs
```

Expected: fail with `ERR_MODULE_NOT_FOUND` for `v13-media-card-projector.js`.

- [ ] **Step 4: Implement strict projection**

The projector must:

1. validate the complete binding set;
2. select its single cover binding;
3. find the matching published asset;
4. find exactly one active `card_4x3` derivative for that asset;
5. validate the trusted delivery context against listing, asset, derivative, storage revision, country, tenant, disclosure class, policy version, and time;
6. sanitize only title and location labels;
7. project the exact allowlist;
8. calculate UTF-8 JSON byte length and fail with `MEDIA_CARD_TOO_LARGE` over 2,048 bytes;
9. deeply freeze the success result.

- [ ] **Step 5: Run GREEN**

Run:

```bash
node --test \
  tests/v13-1-media-contracts.test.cjs \
  tests/v13-1-media-manifest.test.cjs \
  tests/v13-1-media-card-projector.test.cjs
```

Expected: all media tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/media/v13-media-card-projector.js tests/v13-1-media-card-projector.test.cjs
git commit -m "feat(media): project bounded media-first cards"
```

---

### Task 4: Focused Media Integrity Gate and SHA Lock

**Files:**
- Create: `tests/v13-1-media-quality-gate.test.cjs`
- Modify after RED: `scripts/quality-gate.sh`

**Interfaces:**
- Produces a focused gate named `v13_1_media_integrity`.
- The gate runs after `v13_1_authorization_integrity` and before `scan_secret_leaks`.

- [ ] **Step 1: Write the failing registration test**

The test reads `scripts/quality-gate.sh` and requires this exact ordered array:

```bash
MEDIA_TESTS=(
    tests/v13-1-media-contracts.test.cjs
    tests/v13-1-media-manifest.test.cjs
    tests/v13-1-media-card-projector.test.cjs
)
```

It requires:

```bash
run_clean_gate \
    "v13_1_media_integrity" \
    node --test "${MEDIA_TESTS[@]}"
```

and verifies ordering:

```text
v13_1_authorization_integrity
  -> v13_1_media_integrity
  -> scan_secret_leaks
```

- [ ] **Step 2: Run focused-gate RED**

Run:

```bash
node --test tests/v13-1-media-quality-gate.test.cjs
```

Expected: one failure because `MEDIA_TESTS` and `v13_1_media_integrity` do not exist.

- [ ] **Step 3: Register the media gate without changing other gates**

Add only the ordered `MEDIA_TESTS` array and `run_clean_gate` invocation. Do not reorder or weaken authorization, secret, SQL, smoke, worktree, or project-control gates.

- [ ] **Step 4: Run focused tests**

```bash
node --test \
  tests/v13-1-media-contracts.test.cjs \
  tests/v13-1-media-manifest.test.cjs \
  tests/v13-1-media-card-projector.test.cjs \
  tests/v13-1-media-quality-gate.test.cjs
```

Expected: all pass.

- [ ] **Step 5: Run repository verification**

```bash
bash scripts/quality-gate.sh
```

Expected:

- all Node CJS tests pass;
- focused authorization gate passes;
- focused media gate passes;
- PR35/PR36 pass;
- listing contract passes;
- Python and cleanroom pass;
- secret findings equal zero;
- dangerous SQL CRITICAL/HIGH equal zero;
- QA smoke passes;
- isolated worktree clean;
- official workspace unchanged.

- [ ] **Step 6: Commit and SHA lock**

```bash
git add tests/v13-1-media-quality-gate.test.cjs scripts/quality-gate.sh
git commit -m "ci(media): register V13.1 media integrity gate"
```

Run all four GitHub workflows on the exact final SHA: VVIP Quality Gate, Project Control Integrity, Dependency Review, and CodeQL. Record run IDs and exact test counts in the PR body. Keep the official PR in Draft until the stacked dependency chain is merge-ready. Close the temporary CI-to-main PR without merge after evidence collection.
