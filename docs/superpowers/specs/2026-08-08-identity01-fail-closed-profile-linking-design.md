# IDENTITY-01 Fail-Closed Profile Linking Design

## Purpose

Close the remaining federated-identity sovereignty gap in `public.vvip_resolve_own_profile(text)` without rewriting reviewed historical migrations and without changing provider or Production configuration.

The current effective resolver introduced by LC04 is substantially hardened: it requires an authenticated Clerk subject, ignores caller-supplied email as ownership evidence, and prefers exact `clerk_user_id` lookup. However, when no subject-bound profile exists, it can still match an unbound legacy profile by a verified JWT email and mutate that row to assign the current Clerk subject. Under the binding federated-identity ADR, email is an attribute only and must not independently transfer account ownership. IDENTITY-01 removes that final automatic-link path.

## Scope

This slice is intentionally narrow:

- add one forward-only Supabase migration after LC04;
- redefine the existing `public.vvip_resolve_own_profile(p_email text default null)` signature for compatibility;
- add focused repository contracts proving the new fail-closed behavior;
- optionally update gap/evidence documentation after verification;
- keep all work local/repository-only and Draft + unmerged.

Out of scope:

- editing or deleting any historical migration;
- remote Supabase migration apply;
- provider-dashboard configuration;
- Production DB/Edge changes;
- changing Clerk/OIDC authority;
- automatic migration/linking workflow implementation;
- owner/L4 approvals, merge, or Production activation.

## Current effective behavior

LC04 currently:

1. requires `auth.role() = 'authenticated'`;
2. derives the current identity from JWT `sub`;
3. loads a profile already bound to that exact subject;
4. if none exists, derives a verified email from JWT claims;
5. matches an unbound active profile by that email;
6. updates its `clerk_user_id` to the current subject and returns `legacy_profile_recovered`;
7. otherwise creates a new profile bound to the current subject.

Step 6 violates the newer binding rule `NO AUTOMATIC ACCOUNT LINKING BY EMAIL` even though the email is provider-verified.

## Required behavior

The forward migration must preserve the public RPC signature and fail closed:

1. **Authentication gate:** unauthenticated callers remain rejected.
2. **Subject validation:** invalid/missing Clerk subjects remain rejected.
3. **Exact-subject first:** if a profile is already bound to the JWT subject, return it normally.
4. **Legacy collision detection only:** if no exact-subject profile exists and a non-closed, unbound profile shares the verified JWT email, do **not** mutate that row and do **not** return it as the caller's profile.
5. **Explicit status:** return `ok=false`, `status='identity_migration_required'`, with a safe user-facing message and no legacy profile payload/identifier.
6. **No email-only ownership transfer:** the new function body must contain no update that assigns `clerk_user_id` based on an email match.
7. **New-account creation remains allowed:** when there is no subject-bound profile and no legacy same-email collision, create a new profile directly bound to the authenticated JWT subject, using verified JWT email as an attribute.
8. **Client hint remains non-authoritative:** `p_email` may be accepted for API compatibility / UX telemetry only; it must not participate in legacy ownership selection or transfer.
9. **Conflict remains fail closed:** uniqueness/concurrency conflicts may only load a record by exact current subject; otherwise return a safe conflict state.
10. **Privilege posture remains unchanged:** authenticated-only execute grant, fixed search path, SECURITY DEFINER boundary, and no direct authenticated insert/update/delete grants.

## Legacy collision semantics

A legacy collision means a row where:

- `lower(email) = verified JWT email`;
- `account_status` is not `closed`;
- `clerk_user_id` is null or blank;
- no row was already found by exact current JWT subject.

IDENTITY-01 only detects this condition. It does not claim, expose, or mutate the matching legacy row.

This deliberately separates **authentication** from **account migration**. A reviewed future migration/linking procedure can establish ownership using stronger evidence and owner-defined controls.

## Privacy and enumeration boundary

The fail-closed response must not expose the legacy profile id, role, name, phone, timestamps, or other profile data. The caller learns only that identity migration/review is required for the authenticated account.

## Compatibility

The browser currently calls:

`supabase.rpc('vvip_resolve_own_profile', { p_email: primaryEmail })`

The signature remains unchanged, so no browser transport change is required for this backend closure. A later UI slice may explicitly render the new `identity_migration_required` state; until then the existing generic safe-failure path must remain non-destructive.

## Migration strategy

Add a new timestamped migration later than `20260808134000_lc04_production_legacy_rpc_hardening.sql`. The migration uses `create or replace function` for the resolver only, preserving historical LC04 bytes and its reviewed content-addressed hash.

No historical migration may be amended to make tests pass.

## Test strategy — TDD

IDENTITY-01 follows RED -> GREEN:

### RED contract

Add a focused test that requires a new forward migration and asserts:

- migration exists after LC04;
- exact authenticated JWT subject remains authoritative;
- legacy email collision is detected with `select exists`/equivalent read-only logic;
- status `identity_migration_required` is returned;
- no email-matched `update public.profiles ... set clerk_user_id` exists;
- old `legacy_profile_recovered` success status is absent from the new migration;
- new profile creation binds directly to current JWT subject;
- `p_email` is not used as ownership evidence;
- grants remain authenticated-only;
- no production execution commands are embedded.

The test must first fail because the new migration does not yet exist.

### GREEN implementation

Add the minimum forward migration needed to satisfy the contract, then run the focused test and repository gates.

## Acceptance criteria

IDENTITY-01 is repository-verified only when:

1. the focused test was observed failing for the expected missing-migration reason before implementation;
2. the new migration exists and no historical migration bytes changed;
3. the focused test passes on the implementation head;
4. relevant repository quality/security/project-control checks that actually run on the exact final head pass;
5. the PR remains Draft + OPEN + UNMERGED;
6. no remote migration apply, provider change, Production mutation, or protected approval is inferred.