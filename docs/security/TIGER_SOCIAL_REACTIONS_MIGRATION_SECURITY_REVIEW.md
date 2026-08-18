# TIGER Social Reactions — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED  
**Migration:** `supabase/migrations/20260818133000_social_reactions.sql`  
**Reviewed SHA-256:** `174b688fee994e329824230f48e031bb59de9f0c4049f322791f363dc88354ea`  
**Review date:** 2026-08-18

## Decision

The exact migration bytes above are approved for the repository/local-rehearsal path only. This review does **not** authorize a remote Supabase migration, Production mutation, country activation, or release claim.

Any byte change invalidates this review automatically and must re-enter Steel Shield as an unreviewed migration.

## Steel Shield evidence before approval

The exact reviewed bytes produced:

```text
CRITICAL=0
HIGH=13
```

No CRITICAL finding is accepted or suppressed by this review.

The 13 HIGH findings were individually classified as follows:

- `NOT_NULL_RISK = 6`
  - five are new-table integrity constraints for `post_id`, `actor_subject`, `reaction_type`, `created_at`, and `updated_at`;
  - one is the fail-closed predicate `p_actor is not null`, conservatively matched by the line-oriented scanner and is not an `ALTER ... SET NOT NULL` operation.
- `POLICY_CHANGE_REVIEW_REQUIRED = 4`
  - the four policies are the visible-read, actor-owned insert, actor-owned update, and actor-owned delete policies for the new reactions table;
  - RLS and FORCE RLS are enabled before browser use.
- `BROAD_GRANT_TO_AUTHENTICATED = 3`
  - each finding is an `EXECUTE` grant on one exact bounded function signature only:
    - `vvip_social_reaction_summary(uuid)`;
    - `vvip_social_set_reaction(uuid,text)`;
    - `vvip_social_remove_reaction(uuid)`.
  - these are not table CRUD grants.

## Security invariants reviewed

1. `public.vvip_social_reactions` grants no direct table privilege to `public`, `anon`, or `authenticated`.
2. Browser-facing authority is limited to the three exact RPCs above.
3. `public.vvip_social_can_view_post(uuid,text)` is not executable by browser roles.
4. Every RPC derives the acting subject through the canonical Clerk-backed `public.vvip_marketplace_actor_id()` boundary; no `auth.uid()` fallback is introduced.
5. A reaction may be written only when the actor can view the target post under the Social Core audience rules.
6. Friends-only visibility requires an actual `relationship_state = 'friends'` relationship.
7. `only_me` remains author-only.
8. `(post_id, actor_subject)` is unique, so one actor has at most one current reaction per post.
9. Reaction changes use a bounded `ON CONFLICT ... DO UPDATE ... WHERE` path rather than creating duplicate reaction rows.
10. Reaction removal is bounded by both target post and current actor.
11. All `SECURITY DEFINER` functions in this migration explicitly set `search_path = pg_catalog` and schema-qualify application objects.
12. There is no grant to `anon`, no direct auth-schema mutation, no destructive DROP/TRUNCATE, and no unbounded DELETE.
13. Summary output returns aggregate counts plus the current viewer's own reaction; it does not return the list of reacting actor subjects.

## Required proof after this review

Repository acceptance still requires all of the following on the exact implementation head:

- reviewed-hash contract PASS;
- Steel Shield emits `REVIEWED_BASELINE` for this exact migration;
- full local Supabase migration rebuild PASS;
- focused reaction RPC/visibility behavior PASS;
- existing Social Core RLS behavior remains PASS;
- source tree remains immutable during rehearsal;
- normal Quality / Release / CodeQL / CleanGuard gates remain green.

Until those are proven, this review is evidence of source inspection only, not runtime readiness.
