# F05 Canonical Listing Ownership Store Design

## Purpose

Close the F05 listing-ownership persistence gap without reviving the legacy PR34 `SupabaseListingRepository` contract and without creating a second listing data authority.

## Authority decision

The current marketplace authority is `public.vvip_marketplace_listings`, introduced by the V14 marketplace foundation and consumed by `scripts/runtime/vvip-marketplace-repository.js`. Its canonical identity/ownership fields are `listing_id` (UUID) and `owner_subject` (Clerk subject).

The older PR34 `SupabaseListingRepository` remains a historical fail-closed placeholder. Its domain model is not isomorphic to the current marketplace schema: identifiers, lifecycle, taxonomy, price representation, media representation, and idempotency fields differ. Implementing it against a new table or lossy mapping would create or perpetuate a second authority and is forbidden by this change.

## Scope

Add one server-side, read-only ownership-store adapter for F05:

- consumes an injected Supabase/PostgREST-compatible client;
- queries only `vvip_marketplace_listings`;
- selects only `listing_id,owner_subject`;
- filters by both exact `listing_id` and exact `owner_subject` before retrieval;
- returns `{ listingId, ownerClerkUserId }` only when both fields exactly match;
- returns `null` for a legitimate not-found/ownership mismatch;
- throws a stable fail-closed error when the client/query contract fails;
- exposes no create/update/delete/list mutation surface.

## Input constraints

- `listingId` must be an RFC-4122-style UUID accepted by the canonical table.
- `ownerClerkUserId` must be a bounded opaque Clerk subject (`[A-Za-z0-9_-]`, 1..128).
- malformed inputs fail closed before any query.

## Security invariants

- No service-role key, URL, token, secret, or environment variable is embedded or loaded by this module.
- No Production Supabase request is performed by tests or this change.
- No SQL migration is added or applied.
- No fallback to legacy `vvip_listings`, local storage, browser state, or PR34 `SupabaseListingRepository` is allowed.
- Database query is owner-scoped as well as listing-scoped, providing defense in depth even if the injected server client has broad database privileges.
- Query errors, malformed response rows, and ambiguous multi-row responses fail closed.

## F05 integration

`createAwsProductionBindings()` already consumes a `listingStore.getById(listingId, { ownerClerkUserId })` port. The new adapter implements exactly that read-only port, so F05 can reuse the current marketplace ownership authority without changing its authorization contract.

## Verification

TDD sequence:

1. RED contract requires the ownership-store module while it is intentionally absent.
2. GREEN implementation satisfies exact table/projection/dual-filter behavior with an in-memory fake query client only.
3. Repository Quality Gate / CleanGuard / Zero-Residue remain green on the exact final head.

## Non-goals

This change does not configure Production Supabase credentials, wire a deployed AWS runtime, implement Clerk request-token verification, implement the JPEG/WebP canonical image engine, add durable AWS sinks, perform a deploy, or claim Global Launch readiness.
