# VVIP TIGER — Global Launch Phase A Production Evidence

**Status:** `VERIFIED`

**Evidence date:** 2026-08-09 (+03:00)

## Exact source identity

- Release-candidate PR: `#181` — `release: VVIP TIGER global launch candidate`
- Branch: `feat/launch-home-runtime-convergence-20260808`
- Exact source SHA authorized for Phase A: `22fbd9232d0f28bb604eb5ddb1b0f8e7d23f6d65`
- Migration: `supabase/migrations/20260808223000_global_launch_phase_a_identity_convergence.sql`
- Reviewed SHA-256: `173766f1203890d3461db6b67cc95b1d9ca28d23c65026ff9393115ad4433c31`

The production SQL was not modified after Staging proof. Steel Shield approval is content-addressed: any byte drift invalidates the reviewed baseline.

## Exact-head release gates before Production application

All required observed workflows completed `SUCCESS` on exact SHA `22fbd9232d0f28bb604eb5ddb1b0f8e7d23f6d65` before the migration was applied:

- Project Control Integrity — run `31280961954`
- Documentation Sovereign Knowledge Plane — run `31280961947`
- TIGER CleanGuard — run `31280962025`
- Dependency Review — run `31280961968`
- V14 Release Candidate — run `31280961989`
- VVIP Quality Gate — run `31280961946`
- CodeQL — run `31280961971`
- LC03 Supabase Security Rehearsal — run `31280961974`
- LC04 Production Legacy RPC Rehearsal — run `31280961952`
- LC05 Credential Surface Isolation Rehearsal — run `31280962035`
- LC06 RLS Performance Hardening Rehearsal — run `31280961945`
- TSRF Sovereign Phone OTP Rehearsal — run `31280962011`

Quality Gate additionally reported the Phase A file as `REVIEWED_BASELINE` and the dangerous-SQL scanner completed with `CRITICAL=0 HIGH=0` for the reviewed exact artifacts.

## Pre-application Production fingerprint

Immediately before application:

- profiles: `8`
- unbound legacy profiles: `6`
- distinct bound Clerk subjects: `2`
- duplicate Clerk subject groups: `0`
- `vvip_private` schema: absent
- marketplace schema: absent
- the six observed legacy authorization helper functions were in `public`
- `profiles` still exposed legacy browser write grants

No user-row content was copied into this evidence.

## Production application

Production migration application returned `success:true`.

Supabase migration ledger then contained:

- version: `20260808221204`
- name: `global_launch_phase_a_identity_convergence`

## Post-application structural proof

Immediately after application:

- profile cardinality remained `8`
- unbound legacy profiles remained `6`
- distinct bound Clerk subjects remained `2`
- duplicate subject groups remained `0`
- `vvip_private` exists
- all six observed legacy authorization helper functions moved from `public` to `vvip_private`
- their Production function OIDs were preserved across the move
- `public_helper_count=0` for the migrated helper set
- `profiles` has RLS enabled and forced
- browser ACL on `profiles` is now authenticated `SELECT` only
- the canonical profile policy is `Clerk users can read own profile`, scoped to `authenticated` and JWT `sub`
- `vvip_resolve_own_profile(text)` is executable by `authenticated` and contains the fail-closed `identity_migration_required` path
- legacy `otp_codes`, `email_verifications`, and retired `vvip_clerk_profiles` are RLS-enabled + forced, have zero browser policies, and expose no anon/authenticated table privileges

## Production behavioral proof

A transaction-scoped synthetic legacy profile was created only for the proof, a signed-request claim context was set, and the resolver was executed.

Expected result was observed:

- resolver status: `identity_migration_required`
- no Clerk subject was linked to the synthetic legacy profile
- transaction was rolled back
- synthetic rows remaining after rollback: `0`

No real user identity was reassigned or used for the proof.

## Security conclusion

Phase A is **Production VERIFIED** for the identity/profile/legacy-credential convergence scope. It does not claim marketplace deployment, Clerk Production promotion, Web deployment, Android/iPhone release, or global launch completion.

## Next safe action

Proceed to a separate **Phase B — Marketplace Production Convergence**. Do not replay the historical migration chain blindly. Build a forward-only convergence artifact from the current Production fingerprint to the already-proven Staging marketplace contract, prove it through TDD + isolated replay/Staging evidence + exact-head release gates, and only then apply it to Production.
