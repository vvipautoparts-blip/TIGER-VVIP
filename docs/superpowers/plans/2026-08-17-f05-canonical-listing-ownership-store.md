# F05 Canonical Listing Ownership Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the smallest fail-closed, read-only F05 listing ownership adapter backed exclusively by `vvip_marketplace_listings`.

**Architecture:** Add one CommonJS module under the existing F05 AWS server boundary. It accepts an injected Supabase/PostgREST-compatible client, validates the exact listing UUID and Clerk owner subject before issuing any request, queries the canonical marketplace table with both ownership filters, and returns only the normalized ownership pair. It exposes no mutation methods and translates dependency/query/response failures to one stable unavailable error.

**Tech Stack:** Node.js CommonJS, `node:test`, injected Supabase/PostgREST query client, GitHub Actions repository gates.

## Global Constraints

- Query only `vvip_marketplace_listings`.
- Select only `listing_id,owner_subject`.
- Filter by both exact `listing_id` and exact `owner_subject` before retrieval.
- Never read environment variables or embed Supabase URLs, tokens, keys, or service-role credentials.
- Never add SQL/migrations or access Supabase Production.
- Never fall back to `vvip_listings`, browser/local state, or the historical `SupabaseListingRepository`.
- Expose no create/update/delete/list mutation surface.
- Malformed inputs must fail before any database call.
- Not-found/ownership mismatch returns `null`; query failures, malformed rows, and ambiguous responses fail closed.

---

### Task 1: Implement the canonical ownership-store adapter

**Files:**
- Create: `scripts/media/server/aws/f05-marketplace-listing-ownership-store.js`
- Test: `tests/f05-canonical-listing-ownership-store.test.cjs`

**Interfaces:**
- Consumes: `createMarketplaceListingOwnershipStore({ client })`, where `client.from(table)` returns a PostgREST-style query builder supporting `.select()`, `.eq()`, and `.maybeSingle()`.
- Produces: a frozen object with `async getById(listingId, { ownerClerkUserId })` returning `{ listingId, ownerClerkUserId }`, `null`, or throwing a stable fail-closed error.

- [x] **Step 1: Write the failing contract test**

The focused test already exists at `tests/f05-canonical-listing-ownership-store.test.cjs` and requires the implementation module while it is intentionally absent.

- [x] **Step 2: Run the focused contract and verify RED**

Run: `node --test tests/f05-canonical-listing-ownership-store.test.cjs`

Expected: FAIL because `scripts/media/server/aws/f05-marketplace-listing-ownership-store.js` does not exist. The repository VVIP Quality Gate is expected to fail on the same missing module while CleanGuard, Zero-Residue, and Project Control remain green.

- [x] **Step 3: Write the minimal fail-closed implementation**

Implemented `scripts/media/server/aws/f05-marketplace-listing-ownership-store.js` with strict UUID and Clerk subject validation, exact canonical table/projection/dual-filter query, null not-found semantics, stable fail-closed errors, and no mutation surface.

- [x] **Step 4: Run the focused contract and verify GREEN**

The repository VVIP Quality Gate passed on implementation head `7a763caa064e1d6884c3e2ace66416f8c0ea2a97`, covering the focused contract.

- [x] **Step 5: Commit the implementation**

```text
7a763caa064e1d6884c3e2ace66416f8c0ea2a97 feat(f05): add canonical listing ownership store
```

### Task 2: Verify repository-wide gates on the exact implementation head

**Files:**
- No implementation changes were required after the GREEN implementation commit.

**Interfaces:**
- Consumes: exact head `7a763caa064e1d6884c3e2ace66416f8c0ea2a97`.
- Produces: evidence that VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, and Project Control Integrity all pass on that same head.

- [x] **Step 1: Check the PR-triggered workflow runs**

- [x] **Step 2: Inspect any failed job before changing code**

No workflow failed on the implementation head.

- [x] **Step 3: Verify the focused contract**

Covered by successful VVIP Quality Gate on the exact implementation head.

- [x] **Step 4: Require all four repository gates GREEN on one exact SHA**

```text
VVIP Quality Gate — success
TIGER CleanGuard — success
Zero-Residue Full History — success
Project Control Integrity — success
```

### Task 3: Final diff and scope audit

**Files:**
- `docs/superpowers/plans/2026-08-17-f05-canonical-listing-ownership-store.md`
- `docs/superpowers/specs/2026-08-17-f05-canonical-listing-ownership-store-design.md`
- `scripts/media/server/aws/f05-marketplace-listing-ownership-store.js`
- `tests/f05-canonical-listing-ownership-store.test.cjs`

**Interfaces:**
- Consumes: final PR #267 diff and workflow evidence.
- Produces: a scoped, review-ready child PR that remains based on `feat/f05-aws-production-media-runtime-20260817` rather than `main`.

- [x] **Step 1: Review changed-file list and diff**

The change set is limited to the design, implementation plan, focused contract test, and one implementation module.

- [x] **Step 2: Confirm forbidden scope is absent from executable change**

The implementation contains no SQL/migration, secret, environment credential read, legacy listing authority, AWS deploy mutation, DNS change, Amplify action, or Supabase Production access.

- [x] **Step 3: Confirm PR base and state**

PR #267 targets `feat/f05-aws-production-media-runtime-20260817`, not `main`, and remained Draft through verification.

- [x] **Step 4: Mark ready only after exact-head verification**

Exact-head verification is complete; the PR can now transition to Ready for review without merging to `main`.
