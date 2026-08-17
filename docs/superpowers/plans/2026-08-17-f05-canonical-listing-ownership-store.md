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

- [ ] **Step 3: Write the minimal fail-closed implementation**

Create `scripts/media/server/aws/f05-marketplace-listing-ownership-store.js` with this contract:

```js
'use strict';

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNER_SUBJECT = /^[A-Za-z0-9_-]{1,128}$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function createMarketplaceListingOwnershipStore(options) {
  const client = options && options.client;
  if (!client || typeof client.from !== 'function') fail('listing_ownership_store_unavailable');

  async function getById(listingId, context) {
    const ownerClerkUserId = context && context.ownerClerkUserId;
    if (!LISTING_ID.test(String(listingId || '')) || !OWNER_SUBJECT.test(String(ownerClerkUserId || ''))) {
      fail('listing_ownership_scope_invalid');
    }

    let result;
    try {
      result = await client
        .from('vvip_marketplace_listings')
        .select('listing_id,owner_subject')
        .eq('listing_id', listingId)
        .eq('owner_subject', ownerClerkUserId)
        .maybeSingle();
    } catch (cause) {
      const error = new Error('listing_ownership_store_unavailable');
      error.code = 'listing_ownership_store_unavailable';
      error.cause = cause;
      throw error;
    }

    if (!result || result.error) fail('listing_ownership_store_unavailable');
    if (result.data == null) return null;
    if (!result.data || result.data.listing_id !== listingId || result.data.owner_subject !== ownerClerkUserId) {
      fail('listing_ownership_store_unavailable');
    }

    return Object.freeze({ listingId, ownerClerkUserId });
  }

  return Object.freeze({ getById });
}

exports.createMarketplaceListingOwnershipStore = createMarketplaceListingOwnershipStore;
Object.freeze(module.exports);
```

- [ ] **Step 4: Run the focused contract and verify GREEN**

Run: `node --test tests/f05-canonical-listing-ownership-store.test.cjs`

Expected: all focused tests PASS, including exact table/projection/filter call order, invalid-scope no-query behavior, null not-found behavior, fail-closed query/malformed-row behavior, and source-level no-legacy/no-credential/no-mutation assertions.

- [ ] **Step 5: Commit the implementation**

Commit only the new module on `feat/f05-canonical-listing-ownership-store-20260817` with message:

```text
feat(f05): add canonical listing ownership store
```

### Task 2: Verify repository-wide gates on the exact implementation head

**Files:**
- No implementation changes unless a gate reveals a contract defect.

**Interfaces:**
- Consumes: the exact head SHA created by Task 1.
- Produces: evidence that VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, and Project Control Integrity all pass on that same head.

- [ ] **Step 1: Wait for/check the PR-triggered workflow runs**

Expected workflows on the exact Task 1 head:

```text
VVIP Quality Gate
TIGER CleanGuard
Zero-Residue Full History
Project Control Integrity
```

- [ ] **Step 2: Inspect any failed job before changing code**

If a workflow fails, fetch the failing job steps/logs and verify the failure is attributable to this scoped change before editing. Do not weaken a security assertion or repository gate to obtain green status.

- [ ] **Step 3: Re-run the focused test after any required correction**

Run: `node --test tests/f05-canonical-listing-ownership-store.test.cjs`

Expected: PASS.

- [ ] **Step 4: Require all four repository gates GREEN on one exact SHA**

Do not mark the PR ready for review until all four required workflows pass on the same current head SHA.

### Task 3: Final diff and scope audit

**Files:**
- Review all files changed by PR #267.

**Interfaces:**
- Consumes: final PR #267 diff and workflow evidence.
- Produces: a scoped, review-ready child PR that remains based on `feat/f05-aws-production-media-runtime-20260817` rather than `main`.

- [ ] **Step 1: Review changed-file list and diff**

Expected change set is limited to the design, implementation plan, focused contract test, and one implementation module.

- [ ] **Step 2: Confirm forbidden scope is absent**

Verify no SQL/migration, secret, environment credential read, `vvip_listings`, `SupabaseListingRepository`, AWS deploy mutation, DNS change, Amplify action, or Supabase Production access appears in the final diff.

- [ ] **Step 3: Confirm PR base and state**

PR #267 must continue targeting `feat/f05-aws-production-media-runtime-20260817` and remain Draft until verification is complete.

- [ ] **Step 4: Mark ready only after exact-head verification**

After all gates and final scope audit pass, transition PR #267 from Draft to Ready for review. Do not merge it directly to `main`.
