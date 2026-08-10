# Federated Identity — Legacy Linking Compatibility Gap

- **Status:** REMOTE SEMANTIC REMEDIATION VERIFIED / STANDALONE IDENTITY-01 NOT REQUIRED BY CURRENT PRODUCTION STATE
- **Decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Repository forward migration:** `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`

## Historical gap

Historical migration `supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql` contained a legacy recovery path that could bind an unbound profile by email. That historical path returned the marker `legacy_profile_recovered`. The historical migration remains in Git history for provenance and is not rewritten.

## Repository remediation

The forward IDENTITY-01 migration expresses subject-first fail-closed behavior:

1. exact authenticated external subject lookup is authoritative;
2. browser-supplied email never transfers ownership of an existing profile;
3. verified JWT email may detect an unbound legacy profile but returns `identity_migration_required` rather than claiming it;
4. conflict recovery re-reads by exact subject only;
5. anon/public execution is denied.

Frozen H2 SHA-256:

```text
ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6
```

## Staging evidence

Sovereign Staging contains `identity_01_fail_closed_profile_resolver_staging_proof`. Runtime proof executed inside a transaction and rolled back. It verified subject-first ownership, fail-closed legacy detection, no browser-email ownership transfer, and zero synthetic residue.

A data-quality observation remains: when the JWT has no verified email, compatibility `p_email` may create a separate profile sharing an email with an unbound legacy row. The legacy row remains unclaimed. This is duplicate-email hygiene, not ownership transfer.

## Production evidence

Production project `zelcngyyvbomuzokvuxo` does not need the standalone IDENTITY-01 migration while the deployed Phase A resolver remains semantically canonical.

Fresh read-only reconciliation confirms the deployed resolver remains subject-first and the Phase A regression proof after Production Phase B is PASS. Production Phase B did not regress identity boundaries.

Therefore:

```text
FEDERATED_IDENTITY_POLICY=BINDING
STAGING_IDENTITY_RUNTIME_PROOF=PASS
PRODUCTION_IDENTITY_REMOTE_STATE=SEMANTICALLY_CANONICAL_FROM_PHASE_A
PRODUCTION_STANDALONE_IDENTITY_01_REAPPLY_REQUIRED=FALSE_UNLESS_FUTURE_DRIFT_PROVES_OTHERWISE
```

## Future legacy reassignment

`identity_migration_required` is not permission to assign a subject by email. Genuine historical reassignment requires a separately governed re-verification procedure with explicit identity proof and audit evidence.

## Hard boundary

Future Production identity/data mutations remain separately protected. This document records verified state; it grants no Production write authority.
