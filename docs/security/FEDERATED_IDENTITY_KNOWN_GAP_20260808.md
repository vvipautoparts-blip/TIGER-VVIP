# Federated Identity — Legacy Linking Compatibility Gap

- **Status:** PRODUCTION REMEDIATION VERIFIED / HISTORICAL GAP CLOSED
- **Decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Forward remediation source:** `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`
- **Production convergence ledger:** `global_launch_phase_a_identity_convergence`

## Historical incompatible behavior

Historical migration:

```text
supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql
```

contains the old provenance path that could recover an unbound profile by email and return `legacy_profile_recovered`. The historical migration remains in source control for audit/provenance and is not rewritten.

## Fail-closed target behavior

The forward resolver design requires:

1. exact authenticated external subject lookup as the authoritative ownership path;
2. no existing profile ownership transfer by email;
3. signed JWT email claims may detect an unbound legacy profile but may not claim it;
4. unbound legacy detection returns `identity_migration_required` without exposing the profile;
5. browser `p_email` cannot search for or claim existing ownership;
6. new profiles bind directly to the authenticated external subject;
7. unique-conflict recovery re-reads by exact subject only.

## Production verification — 2026-08-09

Read-only inspection of Production project `zelcngyyvbomuzokvuxo` confirms the deployed state is now compliant:

```text
PHASE_A_LEDGER_COUNT=1
IDENTITY_RESOLVER_PRESENT=true
LEGACY_PROFILE_RECOVERED_PRESENT=false
IDENTITY_MIGRATION_REQUIRED_PRESENT=true
EXACT_SUBJECT_LOOKUP_PRESENT=true
EMAIL_OWNERSHIP_UPDATE_PATTERN_DETECTED=false
PROFILES_RLS=true
PROFILES_FORCE_RLS=true
ANON_PROFILE_TABLE_PRIVILEGES=[]
AUTHENTICATED_PROFILE_TABLE_PRIVILEGES=[SELECT]
DUPLICATE_NONEMPTY_CLERK_SUBJECT_GROUPS=0
```

Therefore the previous documentation statement `REMOTE_DATABASE_STATE=UNVERIFIED_BY_IDENTITY_01` is superseded by live Production evidence from Phase A convergence.

This closes the legacy email-auto-linking deployment gap. It does **not** authorize Phase B, Production deployment, country activation, owner seeding, or any new Production mutation.

## Future legacy reassignment procedure

`identity_migration_required` is not an invitation to manually assign a subject by email. Any genuine historical account reassignment must use a separately governed re-verification procedure with explicit identity proof, owner/security authorization where required, and audit evidence.

A later compatibility cleanup may remove `p_email` entirely when runtime/provider claim availability is proven.

## Current boundary

```text
FEDERATED_IDENTITY_POLICY=BINDING
EMAIL_AUTO_LINKING_REPOSITORY_FIX=PREPARED
PRODUCTION_FAIL_CLOSED_RESOLVER=VERIFIED
PRODUCTION_IDENTITY_LEGACY_GAP=CLOSED
PHASE_B_PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED
```
