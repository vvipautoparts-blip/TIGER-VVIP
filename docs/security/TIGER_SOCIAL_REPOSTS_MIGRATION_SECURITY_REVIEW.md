# TIGER Social Reposts — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED
**Migration:** `supabase/migrations/20260824111500_social_reposts.sql`
**Reviewed SHA-256:** `1b4694956de038c004e6cdc9d505e1ed59a5a528cd8e7b37622b8713803254e4`
**Review date:** 2026-08-24

## Decision

The exact migration bytes above are approved for the repository/local-rehearsal path only. This review does **not** authorize a remote Supabase migration, Production mutation, merge to `main`, or release claim.

Any byte change invalidates this review automatically and must re-enter Steel Shield as an unreviewed migration.

## Steel Shield evidence before approval

The exact reviewed bytes produced:

```text
CRITICAL=0
HIGH=8
```

No CRITICAL finding is accepted or suppressed by this review.

The eight HIGH findings were individually classified as follows:

- `NOT_NULL_RISK = 5`
  - four are integrity constraints on the new lineage table: `original_post_id`, `repost_post_id`, `actor_subject`, and `created_at`;
  - one is the bounded predicate `v_existing_repost_post_id is not null`, conservatively matched by the line-oriented scanner and is not an `ALTER ... SET NOT NULL` operation.
- `UPDATE_WITHOUT_WHERE = 2`
  - both are trigger event clauses (`BEFORE UPDATE OR DELETE` and `AFTER UPDATE OF body`), not SQL UPDATE statements;
  - the actual snapshot synchronization UPDATE contains an explicit `WHERE repost_post.post_id in (...)` predicate on the same statement line.
- `BROAD_GRANT_TO_AUTHENTICATED = 1`
  - this is an `EXECUTE` grant on the exact bounded function signature `vvip_social_repost_post(uuid,text)`;
  - it is not a table CRUD grant.

## Security invariants reviewed

1. `public.vvip_social_reposts` grants no direct table privilege to `public`, `anon`, or `authenticated` and has both RLS and FORCE RLS enabled.
2. Browser-facing repost persistence is limited to `vvip_social_repost_post(uuid,text)` and derives the acting subject from the canonical Clerk-backed `public.vvip_marketplace_actor_id()` boundary; no `auth.uid()` fallback is introduced.
3. A repost can be created only when the actor can currently view the original post and the actor profile is active.
4. Repost audience may stay equal to or become more restrictive than the original audience, but never widen it; widening raises `SOCIAL_REPOST_AUDIENCE_WIDENING_FORBIDDEN`.
5. Reposting a repost is rejected with `SOCIAL_REPOST_CHAIN_FORBIDDEN`, keeping lineage one level deep.
6. `(original_post_id, actor_subject)` is unique and the RPC uses a transaction-scoped advisory lock, so one actor has at most one active repost for an original post under concurrent requests.
7. Repost visibility is an intersection: the viewer must satisfy the repost post's current audience/block rules **and** the original post's current audience/block rules.
8. `original_post_id` intentionally remains a lineage UUID rather than an FK. If the original is deleted, the original join no longer resolves and repost visibility fails closed instead of leaving a visible detached copy.
9. Repost snapshot writes are guarded. A Clerk actor cannot delete a repost snapshot, change its audience, or replace its body with content different from the still-existing original.
10. Original body edits synchronize linked repost snapshots transactionally; the guard permits only an exact mirror of the current original body.
11. Duplicate RPC calls return the existing repost and its stored audience rather than widening or rewriting it.
12. Every `SECURITY DEFINER` function in this migration has an explicit bounded search path and all browser table privileges remain revoked.
13. There is no grant to `anon`, no direct auth-schema mutation, no destructive DROP/TRUNCATE, and no unbounded DELETE.

## Required proof after this review

Repository acceptance still requires all of the following on one exact implementation head:

- reviewed-hash contract PASS;
- Steel Shield emits `REVIEWED_BASELINE` for this exact migration;
- full local Supabase migration rebuild PASS;
- focused repost lineage/privacy/idempotency behavior PASS;
- private bookmark behavior remains PASS;
- Social Core feed/privacy behavior remains PASS;
- source tree remains immutable during rehearsal;
- Quality Gate and all existing repository safety/rehearsal gates remain green.

Until those are proven, this review is source-review evidence only, not runtime or Production readiness.
