# TIGER Public Profile Projection — Content-Addressed Migration Security Review

**Status:** REVIEWED REPOSITORY ARTIFACT — NOT PRODUCTION APPLIED  
**Migration:** `supabase/migrations/20260820220500_public_profile_projection.sql`  
**Reviewed SHA-256:** `28ca8d105c318327b6f2dce95303c4147f3ae7e73d312367d28922e990ee0257`  
**Review date:** 2026-08-20

## Decision

The exact migration bytes above are approved only for the repository and isolated local-rehearsal path. This review does **not** authorize a remote Supabase migration, Production mutation, provider activation, deployment, or launch-readiness claim.

Any byte change invalidates this review automatically and returns the migration to Steel Shield as unreviewed.

## Steel Shield evidence before approval

The exact reviewed bytes produced:

```text
CRITICAL=0
HIGH=6
```

No CRITICAL finding is accepted or suppressed.

The six HIGH findings were individually classified:

- `NOT_NULL_RISK = 5`
  - `subject`, `profile_state`, `display_name`, `created_at`, and `updated_at` are integrity requirements on a brand-new projection table;
  - this migration does not add `NOT NULL` to populated historical data and does not backfill or rewrite a retired profile table.
- `BROAD_GRANT_TO_AUTHENTICATED = 1`
  - the only grant is `EXECUTE` on the exact bounded function `public.vvip_get_public_profile(uuid)`;
  - there is no authenticated table `SELECT`, `INSERT`, `UPDATE`, or `DELETE` grant.

## Security invariants reviewed

1. `public.vvip_social_profile_projection` is a new Clerk-era social read model and never reads from or recreates retired `public.profiles`.
2. The public opaque identifier is `profile_id uuid`; the canonical Clerk `user_*` subject is retained only as an internal unique key and is never returned by the public RPC.
3. The raw projection table grants no direct privilege to `public`, `anon`, or `authenticated`.
4. RLS and FORCE RLS are enabled on the raw projection store.
5. Browser-facing read authority is limited to one exact RPC signature: `public.vvip_get_public_profile(uuid)` for `authenticated` only.
6. The RPC is `SECURITY DEFINER SET search_path = pg_catalog` on the same scanner-visible line and schema-qualifies the application table.
7. The RPC fails closed unless `profile_state = 'active'`; `deactivated`, `deleted`, and unknown profile IDs return no profile document.
8. The return object is an explicit allowlist: `profile_id`, `display_name`, `avatar_url`, `business_name`, `location`, `specialization`, and `business_description`.
9. The return object excludes Clerk subject, email, phone, account status, subscription/trial data, role/approval internals, hierarchy, and company-code internals.
10. No `auth.*` table is read or mutated, no legacy profile resolver is restored, and no caller can supply or override the internal Clerk subject through this read RPC.
11. There is no grant to `anon`, no DROP/TRUNCATE, no unbounded UPDATE/DELETE, no RLS disable, and no scanner rule is weakened.

## Residual risks and bounded scope

- This slice establishes the safe public projection storage/read boundary only. Owner profile mutation, lifecycle synchronization from the identity provider, profile timeline pagination, and orphan-safe deleted-user rendering remain separate P0-B slices.
- `profile_state` in this projection is a social visibility state, not a replacement identity authority. Clerk remains canonical identity authority; a later trusted synchronization/admin boundary must own lifecycle changes.
- The migration is repository-only until an explicitly authorized environment rehearsal/deployment gate is approved.

## Required proof after this review

Repository acceptance still requires all of the following on one exact implementation head:

- static projection privacy contract PASS;
- reviewed SHA-256 contract PASS;
- Steel Shield emits `REVIEWED_BASELINE` for these exact migration bytes;
- full isolated Supabase migration rebuild PASS;
- runtime proof that browser roles have no direct table CRUD;
- runtime proof that authenticated RPC reads active profiles only;
- runtime proof that deactivated/deleted profiles fail closed and identity/private keys are absent;
- VVIP Quality Gate, TIGER CleanGuard, Zero-Residue, Project Control, and Social DB rehearsal GREEN.

Until those are proven, this document is source-review evidence only, not runtime or Production readiness.
