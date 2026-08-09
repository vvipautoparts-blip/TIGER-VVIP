# Reviewer Operations Gap — Security Design

## Status

DESIGN PREPARED / NO PRODUCT OR PRODUCTION MUTATION.

## Problem

Phase B correctly protects listing state transitions through `public.vvip_marketplace_review_listing(...)` and the private authority predicate `vvip_marketplace_actor_can_review(country)`.

However, the current authenticated SELECT policy for `vvip_marketplace_listings` permits only:

1. the listing owner; or
2. ACTIVE listings in an active country.

The media SELECT policy similarly permits only the owner or media belonging to an ACTIVE public listing.

Therefore an authorized reviewer cannot safely discover and inspect `PENDING_REVIEW` listings through the current browser API. The repository layer exposes `reviewListing()` but there is no launch reviewer queue/UI calling it. A reviewer who somehow knows a listing UUID can invoke the RPC, but that is not an operable moderation workflow.

## Required remediation

Create a forward-only reviewer-operations migration and reviewer console with the following controls.

### Database read boundary

Extend authenticated listing SELECT only for rows where:

- status = `PENDING_REVIEW`; and
- `vvip_private.vvip_marketplace_actor_can_review(active_market_country)` is true.

Do **not** expose DRAFT listings owned by other users.

Extend listing-media SELECT only when the caller can review the linked listing's country and the linked listing is `PENDING_REVIEW`.

The existing state-change RPC remains the only review transition authority. Browser direct UPDATE must not gain reviewer privilege beyond existing owner-safe RLS; reviewers must never update listing status directly.

### Reviewer queue API

Prefer an explicit SECURITY DEFINER read RPC rather than broadening table SELECT more than necessary:

`public.vvip_marketplace_review_queue(target_country text default null, row_limit int default 50)`

The RPC must:

- require an authenticated Clerk subject;
- return only PENDING_REVIEW listings the caller is authorized to review;
- apply optional country scope only after authority evaluation;
- cap rows to 100;
- return no authority-table internals;
- return only moderation-relevant fields;
- include media metadata required to request short-lived Storage signed URLs through a separately authorized reviewer media-read policy;
- use fixed `search_path = pg_catalog, public`;
- be executable only by `authenticated` and `service_role`, not `anon` or `public`.

### UI boundary

A reviewer console may be a static protected-by-data page because database authority remains server enforced. It must:

- show only queue rows returned by the reviewer queue RPC;
- create short-lived signed media URLs;
- support APPROVE / REJECT / BLOCK through the existing review RPC only;
- require a reason for REJECT/BLOCK in UI and rely on DB validation as the final authority;
- refresh the queue after every decision;
- surface authority/state errors without leaking internals;
- never expose owner/admin credential management;
- never seed authority principals or grant reviewer roles.

### Evidence requirements

Staging proof must demonstrate:

1. normal authenticated owner cannot read another user's PENDING_REVIEW listing;
2. unauthorized authenticated user receives an empty/denied queue;
3. authorized country-scoped reviewer sees only that country's pending listings;
4. platform reviewer sees authorized pending listings;
5. reviewer can view pending media but cannot mutate owner media;
6. direct reviewer UPDATE of listing state is denied;
7. APPROVE/REJECT/BLOCK works only through the review RPC;
8. audit events remain append-only;
9. all synthetic rows are rolled back/removed.

## Release boundary

This design does not authorize a new migration, Production mutation, authority seeding, country activation, or merge. It exists so the operational moderation gap is fully specified before implementation.
