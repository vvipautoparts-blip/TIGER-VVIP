# Global Launch Phase B — Marketplace Production Convergence Design

**Date:** 2026-08-09 (+03:00)

**Status:** APPROVED BY EXISTING OWNER GLOBAL LAUNCH DIRECTIVE; IMPLEMENTATION PENDING TDD

## Problem

Production has completed and verified Global Launch Phase A for identity/profile convergence, but the current Production database has no marketplace substrate at all:

- no V13.1 authority tables required by trusted listing review;
- no country authority seals;
- no marketplace listings/media/favorites/audit tables;
- no marketplace guard/review helpers;
- no private `listing-media` bucket or its Storage RLS policies.

The shipped Production runtime already expects these contracts. Deploying the public artifact before database convergence would therefore be functionally invalid.

The historical migration chain cannot be replayed blindly because Production's migration ledger is intentionally partial and later migrations also contain unrelated assumptions. Phase B must converge the current observed Production drift directly to the already-proven Staging marketplace contract.

## Evidence inputs

### Production fingerprint after Phase A

All Phase B target objects were absent at the last read-only Production fingerprint:

- `vvip_authority_roles`
- `vvip_authority_permissions`
- `vvip_authority_principals`
- `vvip_authority_assignments`
- `vvip_authority_assignment_revisions`
- `vvip_country_authority_seals`
- `vvip_authorization_envelope_audit`
- `vvip_authorization_audit_events`
- `vvip_marketplace_listings`
- `vvip_marketplace_listing_media`
- `vvip_marketplace_favorites`
- `vvip_marketplace_listing_audit`
- marketplace public/private helper functions
- `listing-media` Storage bucket.

### Staging target contract

The current healthy branch `lc04-sovereign-staging-20260807` proves the final marketplace shape after V13.1, V14, LC03, V14 hardening, and LC06:

- authority/country tables are FORCE RLS and server-only, with zero browser policies;
- no authority principal, assignment, role, permission, country seal, price, payment, or legal activation data is seeded;
- marketplace listings/media/favorites are FORCE RLS with owner/public policies;
- listing audit is FORCE RLS, server-only, append-only;
- public ACTIVE visibility requires a country seal with `activation_state='ACTIVE'` and `seal_status='VALID'`;
- browser-owned operations require a Clerk-style JWT subject matching `user_%`;
- review requires OWNER_ROOT or a live scoped assignment containing `listing.review` or `listing.manage`;
- trusted review is exposed only through `vvip_marketplace_review_listing`;
- internal country/review helpers live in `vvip_private`;
- media bucket `listing-media` is private, max 10 MiB, MIME-limited to JPEG/PNG/WebP;
- Storage write paths are owner-subject scoped;
- anonymous media reads are only for ACTIVE listings in an active country;
- favorites have an FK index; authority assignments have a role FK index.

## Architecture decision

Create one new forward-only migration named `global_launch_phase_b_marketplace_convergence` that expresses the **final canonical state**, not the historical sequence.

The migration will be deliberately safe in two starting states:

1. **Observed Production state:** target objects absent — create them.
2. **Current Staging state:** target objects already canonical — reapply safely/idempotently without seeding or deleting rows.

This is not a generic migration-repair engine. If a future Production fingerprint reveals partially existing incompatible target objects, execution stops for a new drift review instead of guessing.

## Phase B scope

### 1. Authorization substrate

Create/retain the canonical V13.1 tables needed for marketplace review and later authorization work:

- authority roles;
- permissions;
- principals;
- assignments;
- assignment revisions;
- country authority seals;
- authorization envelope audit;
- authorization audit events.

Apply final constraints/indexes, FORCE RLS, server-only ACLs, owner-root mutation guard, and append-only authorization audit guard.

No rows are seeded.

### 2. Marketplace data model

Create/retain:

- `vvip_marketplace_listings`;
- `vvip_marketplace_listing_media`;
- `vvip_marketplace_favorites`;
- `vvip_marketplace_listing_audit`.

Preserve the exact runtime columns, size/format checks, status state machine, media bounds, owner-subject limits, public/owner indexes, one-cover constraint, favorite FK index, and append-only audit behavior proven on Staging.

### 3. Identity boundary

`public.vvip_marketplace_actor_id()` accepts only a non-empty JWT `sub` matching the Clerk subject shape `user_%`. Non-Clerk/anonymous subjects resolve to NULL and therefore fail owner predicates.

Email and phone never identify marketplace ownership.

### 4. Country activation boundary

`vvip_private.vvip_marketplace_country_is_active(text)` is SECURITY DEFINER with a safe search path and reads only `vvip_country_authority_seals`.

A market is active only when both are true:

- `activation_state='ACTIVE'`
- `seal_status='VALID'`

Phase B seeds **zero** country rows, so the marketplace remains fail-closed after schema creation.

### 5. Trusted review boundary

`vvip_private.vvip_marketplace_actor_can_review(text)` is internal and not a browser RPC.

It permits review only for:

- a live `OWNER_ROOT`; or
- a live assignment containing `listing.review` or `listing.manage` and covering platform or target country.

`public.vvip_marketplace_review_listing(uuid,text,text)` is the only browser-executable trusted review RPC and remains authenticated-only.

Phase B seeds **zero** principals/assignments, so nobody gains review authority merely because the schema exists.

### 6. Listing write state machine

A trigger enforces:

- authenticated Clerk ownership for browser writes;
- new client listings start as `DRAFT`;
- owner and country scope are immutable after creation;
- browser clients cannot self-promote into trusted states such as `ACTIVE`, `EXPIRED`, `REJECTED`, or `BLOCKED`;
- allowed owner transitions remain bounded;
- country must remain active;
- `updated_at` is server-controlled.

### 7. RLS and ACL contract

Final policies match the hardened Staging contract:

- anon: SELECT ACTIVE listings/media only when country is active;
- authenticated: SELECT own listings or public ACTIVE listings;
- authenticated owners: INSERT draft, bounded UPDATE/DELETE;
- media INSERT/UPDATE/DELETE split into separate owner policies;
- favorites owner-only;
- audit tables have no browser policies/privileges;
- authority/country substrate has no browser policies/privileges.

All marketplace tables use RLS + FORCE RLS.

### 8. Private media storage

Upsert bucket configuration only:

- id/name: `listing-media`
- `public=false`
- `file_size_limit=10485760`
- allowed MIME: JPEG/PNG/WebP.

Storage policies enforce owner directory on insert, owner identity on update/delete, and signed/private reads only for owners or public ACTIVE listings in active countries.

The bucket is never made public as a cost shortcut.

## Non-goals

Phase B does not:

- activate any country;
- create an owner/admin principal;
- grant any human review permission;
- seed listings or favorites;
- deploy Edge Functions;
- promote Clerk from Test to Production;
- set Production browser secrets/configuration;
- deploy the Web artifact;
- merge PR #181;
- publish Android/iPhone builds;
- claim global launch completion.

## Failure and rollback model

The migration runs transactionally for PostgreSQL DDL/policy/function changes. If any required invariant fails, the migration fails rather than partially guessing.

Storage bucket configuration is included in the same database transaction because Supabase Storage metadata is PostgreSQL-backed.

No user/business rows are deleted, truncated, or rewritten.

Before Production application, a fresh read-only fingerprint must reconfirm the Phase B objects are absent (or exactly match the expected idempotent state). Unexpected partial drift blocks Production execution.

## TDD acceptance contract

The RED test must fail before the Phase B migration exists. GREEN requires static proof that the migration:

1. creates the full authorization substrate without seeds;
2. creates all four marketplace tables;
3. preserves final constraints and indexes;
4. uses Clerk-subject-only actor identity;
5. places country/review helpers in `vvip_private`;
6. enforces FORCE RLS and final split policies;
7. makes audit/authority surfaces browser-inaccessible;
8. creates the private bounded `listing-media` bucket and owner/public-read Storage policies;
9. exposes only the authenticated review RPC as trusted browser mutation;
10. contains no destructive row primitives (`TRUNCATE`, unbounded `DELETE`, ownership reassignment/backfill);
11. emits its exact SHA-256 for content-addressed security review.

After GREEN static contracts, apply the exact bytes to the isolated Staging branch and verify idempotence + behavior. Then content-address the exact migration in Steel Shield and require the complete exact-head release/security workflow plane before Production execution.

## Production success criteria

Phase B becomes `VERIFIED IN PRODUCTION` only when all are true:

- exact-head required CI/rehearsals are GREEN before application;
- Production drift fingerprint still matches the approved starting state;
- migration ledger records Phase B;
- all target tables/functions/triggers/indexes/policies/bucket settings match the hardened contract;
- no authority/country/listing data is unexpectedly seeded;
- fail-closed behavior is proven transactionally with zero synthetic rows remaining;
- audit surfaces remain append-only/server-only;
- Production evidence is checkpointed in `docs/global/` and `docs/MASTER_PROJECT_STATE.md`.
