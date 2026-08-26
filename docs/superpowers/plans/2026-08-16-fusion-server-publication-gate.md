# FUSION Server-Authoritative Publication Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local-only FUSION composer publication path with a server-authoritative listing activation flow that consumes owner-approved activation-card/visibility entitlement, preserves the seven-image/F05 media boundary, and never lets the browser mint paid entitlement or force ACTIVE status.

**Architecture:** Reuse the existing V14 marketplace repository, Supabase RLS, trusted review RPC pattern, and Clerk JWT subject. Add a narrowly scoped PostgreSQL activation-entitlement model plus a security-definer publication-preparation RPC. The browser may create a DRAFT and upload sanitized JPEG/WebP media, then submit a publication intent containing only listing id, plan id, and an opaque entitlement receipt; the database verifies ownership, jurisdiction, plan, entitlement state, remaining Pulse/impression allowance, and replay protection before moving the listing to `PENDING_REVIEW`. Payment-provider issuance of the entitlement remains a separate trusted integration and cannot be performed by browser code.

**Tech Stack:** PostgreSQL/Supabase migrations + RLS/RPC, vanilla JavaScript repository adapter, FUSION progressive composer, Node `node:test`, existing quality/release gates.

## Global Constraints

- Latest owner decision wins; conflicting older product rules are SUPERSEDED / NON-OPERATIVE.
- FUSION 2026 remains the single authoritative user surface.
- Maximum listing media allowance is 7 images; ordinary video listing media is not enabled.
- Original HEIC/HEIF conversion remains client-side; server publication receives only approved JPEG/WebP derivatives.
- The platform is a discovery/advertising/connection platform and is not a party to buyer/seller/service transactions.
- Activation cards are visibility entitlements, not a universal listing-age timer.
- The fixed universal 120-day listing lifetime is cancelled.
- Browser code must never mint payment/visibility entitlement or directly transition a listing to ACTIVE.
- `GLOBAL_LAUNCH_ELIGIBLE = TRUE` remains the only completion condition; this plan can remove a launch blocker but cannot assert global launch by itself.

---

### Task 1: RED contract for trusted publication preparation

**Files:**
- Create: `tests/fusion-publication-entitlement-contract.test.cjs`
- Test: `tests/vvip-marketplace-repository.test.cjs`

**Interfaces:**
- Consumes: existing `createMarketplaceRepository(options)` and `prepareForPublication(listingId, options)`.
- Produces: executable contract requiring a trusted RPC named `vvip_marketplace_prepare_publication` and forbidding browser-side entitlement issuance.

- [ ] **Step 1: Write the failing contract test**

Assert that the repository calls `client.rpc("vvip_marketplace_prepare_publication", { target_listing, target_plan_id, entitlement_receipt })`, propagates trusted server errors, and never writes `ACTIVE` directly.

- [ ] **Step 2: Run the focused tests**

Run: `node --test tests/fusion-publication-entitlement-contract.test.cjs tests/vvip-marketplace-repository.test.cjs`
Expected: FAIL because `prepareForPublication` currently throws `PUBLICATION_TRANSPORT_UNAVAILABLE`.

- [ ] **Step 3: Commit RED only**

Commit message: `test(fusion): require trusted publication entitlement transport`

### Task 2: Activation-card entitlement schema and RPC

**Files:**
- Create: `supabase/migrations/20260816090000_fusion_publication_entitlement.sql`
- Test: `tests/fusion-publication-entitlement-contract.test.cjs`

**Interfaces:**
- Produces tables `vvip_visibility_plans`, `vvip_listing_activation_entitlements`, and RPC `vvip_marketplace_prepare_publication(uuid,text,text)`.
- Browser roles receive read-only access only to enabled plan projections required for UI; entitlement issuance remains unavailable to `anon`/`authenticated`.

- [ ] **Step 1: Extend RED contract for SQL security**

Require plan ids, country/sector scope, ISO currency, positive integer price minor units, positive Pulse/impression entitlement, activation window, entitlement receipt hash uniqueness, owner binding, listing binding, one-way consumption state, audit timestamps, RLS/forced RLS, and revoked browser write privileges.

- [ ] **Step 2: Run test and confirm RED**

Run: `node --test tests/fusion-publication-entitlement-contract.test.cjs`
Expected: FAIL because migration does not exist.

- [ ] **Step 3: Implement the migration**

The RPC must lock the listing and entitlement rows; verify Clerk actor owns listing; require listing state DRAFT/REJECTED/PAUSED according to current transition policy; verify active jurisdiction; verify enabled plan matches market/sector; validate SHA-256-style opaque receipt digest/receipt value without logging the raw payment secret; require entitlement state `ISSUED`, not expired and not consumed; bind entitlement to listing atomically; move listing to `PENDING_REVIEW`; mark entitlement `CONSUMED`; append audit evidence; return a bounded publication result.

The RPC must never set listing `ACTIVE` and must never create an entitlement.

- [ ] **Step 4: Run focused contract test**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(marketplace): add trusted activation entitlement gate`

### Task 3: Repository transport

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Test: `tests/vvip-marketplace-repository.test.cjs`
- Test: `tests/fusion-publication-entitlement-contract.test.cjs`

**Interfaces:**
- `prepareForPublication(listingId, { planId, entitlementReceipt }) -> Promise<PublicationResult>`.

- [ ] **Step 1: Add failing repository tests**

Verify exact RPC arguments, authenticated requirement, normalized UUID/plan/receipt input, server error propagation, and public-read cache invalidation after successful transition.

- [ ] **Step 2: Run RED**

Expected: FAIL on current fail-closed stub.

- [ ] **Step 3: Implement minimal RPC adapter**

Replace only the transport stub. Do not add client-side entitlement fallback or direct table status update.

- [ ] **Step 4: Run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(runtime): connect publication intent to trusted RPC`

### Task 4: FUSION composer server draft and publication intent

**Files:**
- Modify: `scripts/fusion/progressive-composer.js`
- Modify: `index.html` only if runtime dependency ordering requires it.
- Test: `tests/fusion-progressive-composer.test.cjs`
- Test: `tests/experience-convergence-publication.test.cjs`

**Interfaces:**
- Consumes `VVIP_MARKETPLACE_REPOSITORY` and current PR36/F05 media display snapshot.
- Produces authenticated server DRAFT creation and publication-intent request; no local-only publisher state.

- [ ] **Step 1: Write RED composer test**

Require no `LOCAL_DRAFT_ONLY`, no localStorage as publication truth, no fake publish success. Require server repository availability, authenticated create, media array capped at 7, plan/receipt inputs, and explicit error state when entitlement is absent or rejected.

- [ ] **Step 2: Run RED**

Expected: FAIL because current composer stores local draft only.

- [ ] **Step 3: Implement server draft flow**

Collect normalized listing fields, obtain sanitized media blobs from the existing PR36/F05 session, call `createDraftWithMedia`, then call `prepareForPublication`. Surface `PENDING_REVIEW`/prepared state only from the server result. A missing payment/entitlement receipt is a real blocked state, not a successful publish state.

- [ ] **Step 4: Run focused tests**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(fusion): replace local-only publisher with trusted intent`

### Task 5: Public artifact closure and production fail-closed policy

**Files:**
- Modify if required: `tools/vvip_public_release.py`
- Modify if required: `tests/test_vvip_public_release.py`
- Test: `tests/test_vvip_release_load_order.py`

**Interfaces:**
- Candidate artifact includes only approved FUSION runtime files and dependencies.
- Production remains blocked by missing production runtime configuration/payment provider evidence, not by an obsolete local-only composer marker.

- [ ] **Step 1: Run current public release tests**

Expected: reveal any remaining reference closure or forbidden-marker mismatch.

- [ ] **Step 2: Apply smallest allow-list/load-order corrections**

Do not publish repository root, docs, tests, migrations, or internal files.

- [ ] **Step 3: Run release tests**

Expected: candidate artifact closure PASS; production mode still fail-closed when required environment/provider evidence is absent.

- [ ] **Step 4: Commit**

Commit message: `fix(release): close FUSION trusted publication artifact`

### Task 6: Exact-head security verification

**Files:** No product change unless a test identifies a real defect.

- [ ] **Step 1: Run focused unit/contract suite**

Run repository, composer, migration-contract, release, smoke, and owner-governance tests.

- [ ] **Step 2: Run full quality gate**

Expected: PASS on one exact SHA.

- [ ] **Step 3: Run Supabase/V14 security gate and CodeQL**

Expected: PASS on the same SHA; no security gate may be weakened to obtain green.

- [ ] **Step 4: Record remaining global-launch blockers**

Payment-provider entitlement issuance, country legal/tax activation, real device HEIC evidence, mobile/DR/red-team or other Launch Passport inputs remain explicit fail-closed items until independently satisfied.
