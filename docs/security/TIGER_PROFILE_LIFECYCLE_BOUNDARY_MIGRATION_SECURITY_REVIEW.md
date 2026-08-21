# TIGER Profile Lifecycle Boundary — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED
**Migration:** `supabase/migrations/20260820231500_profile_lifecycle_boundary.sql`
**Reviewed SHA-256:** `5e23b0f296e3b447ce42cc4d7bb11b42fe4c6cbed43d654b065d911f40a07b68`
**Review date:** 2026-08-20

## Decision

The exact migration bytes above are approved only for repository verification and isolated local database rehearsal. This review does **not** authorize a remote Supabase migration, Production mutation, provider credential use, deployment, or launch-readiness claim.

Any byte change invalidates this review automatically and returns the migration to Steel Shield as unreviewed.

## Steel Shield evidence before approval

After making all three lifecycle UPDATE predicates scanner-visible without changing their SQL semantics, the exact reviewed bytes produce:

```text
CRITICAL=0
HIGH=2
```

No CRITICAL finding is accepted or suppressed.

The two HIGH findings are both `BROAD_GRANT_TO_AUTHENTICATED`, limited to exact `EXECUTE` grants on:

- `public.vvip_deactivate_my_social_profile()`;
- `public.vvip_reactivate_my_social_profile()`.

The trusted deletion function is not granted to browser roles; it is granted only to `service_role`.

## Security invariants reviewed

1. Self-deactivation and self-reactivation derive the acting subject through `public.vvip_marketplace_actor_id()`; callers cannot provide a subject or lifecycle target.
2. `active -> deactivated` and `deactivated -> active` transitions are bounded by the canonical subject and expected current state in the UPDATE predicate.
3. Same-subject lifecycle transitions serialize with `pg_advisory_xact_lock(hashtextextended(..., 0))`.
4. Repeated deactivation of an already deactivated profile and repeated reactivation of an already active profile are deterministic and preserve the same opaque `profile_id` and presentation data.
5. A `deleted` profile is terminal for browser self-reactivation and remains blocked from owner presentation mutation by the existing owner boundary.
6. `public.vvip_mark_social_profile_deleted(text)` accepts only bounded Clerk-style `user_*` subjects and is executable only by `service_role`; `authenticated`, `anon`, and `PUBLIC` are revoked.
7. Trusted deletion tombstones presentation data while preserving the opaque profile row identity needed for orphan-safe rendering and deterministic historical references.
8. Direct browser CRUD on `public.vvip_social_profile_projection` remains revoked.
9. Public profile projection continues to expose active profiles only, so deactivated/deleted profiles are hidden from public reads.
10. All three lifecycle functions are `SECURITY DEFINER` with scanner-visible `search_path = pg_catalog`; referenced application objects are schema-qualified.
11. There is no direct `auth.*` mutation, no legacy `public.profiles` dependency, no RLS disable, no DROP/TRUNCATE, and no scanner rule is weakened.
12. The three UPDATE statements retain explicit subject/state predicates on the same source line solely so the existing fail-closed Steel Shield parser can verify them without ambiguity; behavior and authorization are unchanged.

## Required runtime acceptance

Repository acceptance still requires, on one exact implementation head:

- lifecycle static contract PASS;
- reviewed SHA-256 contract PASS;
- Steel Shield `REVIEWED_BASELINE` for the exact migration bytes;
- complete isolated Supabase migration replay PASS;
- authenticated self-deactivation and self-reactivation PASS;
- idempotent repeated lifecycle transitions PASS;
- deactivated profile hidden publicly and blocked from owner mutation PASS;
- authenticated browser deletion attempt denied PASS;
- service-role deletion and presentation tombstone PASS;
- deleted profile hidden publicly, unable to reactivate, and unable to mutate PASS;
- raw projection table CRUD unavailable to browser roles PASS;
- exact-head source immutability PASS;
- VVIP Quality Gate, TIGER CleanGuard, Zero-Residue, Project Control, Social DB rehearsal, LC04, LC05, and LC06 GREEN on the same exact SHA.

Until those proofs are green, this document is source-review evidence only, not runtime or Production readiness.
