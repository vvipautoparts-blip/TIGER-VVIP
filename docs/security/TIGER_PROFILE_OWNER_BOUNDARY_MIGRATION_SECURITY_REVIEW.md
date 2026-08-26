# TIGER Profile Owner Boundary — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED
**Migration:** `supabase/migrations/20260820223000_profile_owner_boundary.sql`
**Reviewed SHA-256:** `55bb7b98771cc26061a6d40625b9419627c38cc2ed2420a394bf35f4931013bc`
**Review date:** 2026-08-20

## Decision

The exact migration bytes above are approved only for repository verification and isolated local database rehearsal. This review does **not** authorize a remote Supabase migration, Production mutation, provider credential use, deployment, or launch-readiness claim.

Any byte change invalidates this review automatically and returns the migration to Steel Shield as unreviewed.

## Steel Shield evidence before approval

The exact reviewed bytes produced:

```text
CRITICAL=0
HIGH=2
```

No CRITICAL finding is accepted or suppressed.

The two HIGH findings are both `BROAD_GRANT_TO_AUTHENTICATED` and are individually bounded:

- `EXECUTE` on `public.vvip_get_my_social_profile()`;
- `EXECUTE` on `public.vvip_upsert_my_social_profile(text,text,text,text,text,text)`.

Neither grant provides direct `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or `ALL` authority on `public.vvip_social_profile_projection`.

## Security invariants reviewed

1. Both browser-facing RPCs derive the acting subject through `public.vvip_marketplace_actor_id()`; the caller cannot supply a Clerk subject or profile owner identifier.
2. The upsert signature contains presentation fields only. It accepts neither `subject` nor `profile_state` and therefore cannot be used to mint ownership or change lifecycle state.
3. Raw table privileges remain revoked from `authenticated`; all browser mutation goes through the bounded RPC.
4. `vvip_upsert_my_social_profile` serializes same-user create/update races with `pg_advisory_xact_lock(hashtextextended(v_actor, 0))`.
5. Existing rows are read by the canonical subject before mutation. If the trusted stored state is not `active`, the RPC raises `SOCIAL_PROFILE_MUTATION_DISABLED` and fails closed.
6. The UPDATE predicate repeats both `subject = v_actor` and `profile_state = 'active'`, so lifecycle state cannot be bypassed between the initial read and the write statement.
7. A missing profile may be created only for the authenticated Clerk-backed actor and is initialized to the fixed server value `active`.
8. RPC output never returns the canonical Clerk subject. Owner responses expose only the opaque `profile_id`, lifecycle presentation state, and bounded profile presentation fields.
9. Both functions are `SECURITY DEFINER` with scanner-visible `search_path = pg_catalog`; application objects are schema-qualified.
10. Execution is granted only to `authenticated`; no execute grant is provided to `anon`.
11. Input sizes are bounded before mutation, including display name, avatar URL, business name, location, specialization, and description.
12. There is no direct `auth.*` mutation, no legacy `public.profiles` dependency, no RLS disable, no DROP/TRUNCATE, and no scanner rule is weakened.

## Residual risks and bounded scope

- Lifecycle transitions themselves are intentionally outside this browser RPC and remain a separate trusted P0-B slice.
- The owner read RPC reports the stored social lifecycle state to the owner; the public projection continues to hide non-active profiles entirely.
- This slice establishes repository and local-rehearsal authority only. Production provider state remains separately gated.

## Required proof after this review

Repository acceptance requires all of the following on one exact implementation head:

- owner-boundary static contract PASS;
- reviewed SHA-256 contract PASS;
- Steel Shield emits `REVIEWED_BASELINE` for the exact migration bytes;
- full isolated Supabase migration replay PASS;
- runtime proof that authenticated users can create/read/update only their own profile;
- runtime proof that one user cannot alter another user's profile;
- runtime proof that deactivated/deleted profiles reject owner mutation;
- runtime proof that raw table CRUD remains unavailable to browser roles;
- VVIP Quality Gate, TIGER CleanGuard, Zero-Residue, Project Control, Social DB rehearsal, LC04, LC05, and LC06 GREEN on the same exact SHA.

Until those proofs are green, this document is source-review evidence only, not runtime or Production readiness.
