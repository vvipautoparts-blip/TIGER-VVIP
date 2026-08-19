# TIGER Social Post RETURNING RLS Fix — Security Review

**Date:** 2026-08-19
**Status:** `REVIEWED / BYTE-EXACT / PRIVACY PROOF`
**Migration:** `supabase/migrations/20260819132000_social_post_returning_rls_fix.sql`
**SHA-256:** `f77360e08346827bbbcb0794fabcaf30bc87ae609917bf31dc49368638f1b6dd`

## Root cause

The exact-head Social DB rehearsal proved that the Social Core foundation passed, but the Reactions rehearsal failed before any reaction write. PostgreSQL rejected Alice's first `INSERT ... RETURNING post_id` on `vvip_social_posts` because a data-modifying statement with `RETURNING` must also satisfy applicable SELECT RLS policies. The privacy-hardened SELECT policy delegates to a helper that re-reads the post by `post_id`; the proposed row is not available to that helper as an ordinary existing-row lookup at the SELECT-policy check point.

The baseline Foundation proof used INSERT without RETURNING, which is why it remained green while the Reactions setup exposed the production-relevant incompatibility.

## Reviewed correction

The migration adds one additional permissive SELECT policy for `authenticated` whose only successful condition is:

`author_subject = vvip_marketplace_actor_id()`

This is not a new visibility entitlement. The existing privacy visibility helper already permits an author to read the author's own post. The new row-aware policy expresses that same owner invariant directly on the proposed row so `INSERT ... RETURNING` can pass without re-reading the target table.

## Security invariants

- Forward-only migration; no reviewed historical migration bytes are rewritten.
- `SET LOCAL lock_timeout = '2s'` bounds migration lock acquisition.
- Existing `vvip_social_post_visible_read` remains intact and block-aware for non-owner visibility.
- No `DROP POLICY`, `DROP TABLE`, `DROP COLUMN`, RLS disable, or destructive contract operation.
- No new table privilege or function EXECUTE grant.
- The private `vvip_social_is_blocked_pair` oracle remains non-browser-callable.
- Public/friends/only_me semantics for non-owners are not widened.
- Owners already had owner-read semantics; this policy only makes that invariant row-aware for RETURNING checks.
- No remote Supabase, Staging, Production, or `main` mutation is performed by this repository migration.

## Steel Shield review

Before content-addressed registration the scanner classification for this migration is expected to be:

- `CRITICAL=0`
- `HIGH=1`
- the single HIGH is `POLICY_CHANGE_REVIEW_REQUIRED` for the explicit `CREATE POLICY` statement.

No wildcard, path-only bypass, scanner disable, or syntax evasion is approved. The migration is accepted only at the exact SHA-256 above; any byte drift must re-enter review.

## Acceptance condition

This review closes only when the exact PR head proves all of the following together:

1. migration SHA-256 equals the value above;
2. Steel Shield binds the same path to the same hash;
3. static RETURNING regression contract passes;
4. Social Core RLS rehearsal remains PASS;
5. Social Reactions rehearsal passes including `INSERT ... RETURNING`;
6. Comments and Privacy rehearsals subsequently run and pass;
7. required exact-head quality/security gates are green.
