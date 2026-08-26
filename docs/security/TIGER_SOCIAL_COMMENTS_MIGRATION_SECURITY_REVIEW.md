# TIGER Social Comments — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED
**Migration:** `supabase/migrations/20260818143000_social_comments.sql`
**Reviewed SHA-256:** `ed40f4e4ed67ad5dee8c87181f90602cf8878593f55b05d041e3e7a1201ce5fb`
**Review date:** 2026-08-19

## Decision

The exact migration bytes above are approved for the repository and isolated local-rehearsal path only. This review does **not** authorize a remote Supabase migration, Production mutation, deployment, or launch-readiness claim.

Any byte change invalidates this review automatically and must re-enter Steel Shield as an unreviewed migration.

## Steel Shield evidence before approval

The exact reviewed bytes produced:

```text
CRITICAL=0
HIGH=11
```

No CRITICAL finding is accepted or suppressed by this review.

The eleven HIGH findings were individually classified as follows:

- `NOT_NULL_RISK = 7`
  - all five are integrity requirements on a new table: `post_id`, `author_subject`, `body`, `created_at`, and `updated_at`;
  - the migration does not apply `SET NOT NULL` to populated historical data.
  - two additional scanner matches are lexical `is not null` predicates used to validate the optional parent and reply-depth bounds; they do not alter a column constraint.
- `BROAD_GRANT_TO_AUTHENTICATED = 4`
  - each finding is an `EXECUTE` grant on one exact bounded function signature only:
    - `vvip_social_comment_list(uuid,uuid,timestamptz,uuid,integer)`;
    - `vvip_social_comment_create(uuid,text,uuid)`;
    - `vvip_social_comment_update(uuid,text)`;
    - `vvip_social_comment_remove(uuid)`.
  - none is a table CRUD grant.

## Security invariants reviewed

1. `public.vvip_social_comments` grants no direct table privilege to `public`, `anon`, or `authenticated`.
2. RLS and FORCE RLS are enabled before browser RPC grants are created.
3. Browser-facing authority is limited to the four exact RPC signatures above. The list RPC serves either top-level comments or one top-level parent's replies, clamps every page to 1–20 rows, orders by `(created_at, comment_id)`, and returns an opaque `next_cursor` only when another bounded page exists.
4. Every RPC derives the acting subject through the canonical Clerk-backed `public.vvip_marketplace_actor_id()` boundary; no `auth.uid()` or caller-provided author is accepted.
5. List and create re-evaluate `public.vvip_social_can_view_post(post_id, actor)` before reading or writing comments.
6. Update loads the trusted target, requires `target.author_subject = actor`, and rechecks current post visibility before mutation.
7. Remove loads the trusted target and requires exact actor ownership. It intentionally remains available to the owner even if later relationship changes make the post invisible, so a user can remove their own previously created content.
8. A reply may reference only a top-level comment on the same post. Missing parents, cross-post parents, and replies to replies fail closed with bounded codes.
9. Database and browser adapter boundaries use the same explicit Unicode edge-whitespace set and cap normalized bodies at 2,000 Unicode code points. Newline/tab/NBSP-only values are rejected, and astral characters count as one code point.
10. RPC JSON does not disclose `author_subject`. It returns bounded comment fields and a viewer-specific `viewer_can_edit` boolean.
11. Every `SECURITY DEFINER` function explicitly sets `search_path = pg_catalog` and schema-qualifies application objects.
12. There is no grant to `anon`, no direct auth-schema mutation, no DROP/TRUNCATE, and no unbounded UPDATE or DELETE.
13. Deleting a post removes its comments, and removing an owned top-level comment removes its reply subtree through the explicit foreign-key cascade. This is current thread-removal semantics, not a moderation or transaction authority.
14. UI ownership controls are presentation only. The server repeats ownership and visibility decisions for every mutation.

## Residual risks and bounded scope

- This slice does not create a separate moderation queue, anti-spam reputation engine, or database-native rate limiter. Server-clamped pagination, user-triggered loading, and browser concurrency limits bound response/read fanout but are not a remote abuse control. Existing platform moderation and edge/request throttling remain required for deployment; absence of live-provider evidence keeps Production activation blocked.
- Physical comment removal means thread bytes are no longer present in the active table. Any legal retention or moderator-preservation requirement must be approved as a separate current policy before Production application.
- The repository test proves one reply level. It does not claim arbitrary-depth conversations.

## Required proof after this review

Repository acceptance still requires all of the following on the exact implementation head:

- reviewed-hash contract PASS;
- Steel Shield emits `REVIEWED_BASELINE` for this exact migration;
- full isolated Supabase migration rebuild PASS;
- focused comment RPC, visibility, reply-depth, ownership, and minimum-truth behavior PASS;
- existing Social Core and Social Reactions RLS behavior remains PASS;
- source tree remains immutable during rehearsal;
- browser adapter/controller tests and exact Public Release tests PASS;
- full Quality Gate and remote Social DB Rehearsal remain GREEN on the same final head.

Until those are proven, this review is evidence of source inspection only, not runtime readiness.
