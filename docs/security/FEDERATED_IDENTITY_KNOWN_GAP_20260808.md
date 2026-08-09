# Federated Identity — Legacy Linking Compatibility Gap

- **Status:** REMOTE SEMANTIC REMEDIATION VERIFIED / STANDALONE IDENTITY-01 MIGRATION NOT REQUIRED BY CURRENT PRODUCTION STATE
- **Decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Repository forward migration:** `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`
- **PRG evidence:** `reports/prg/v1/identity-staging-proof.json` and `reports/prg/v1/production-read-only-preflight.json`

## Existing compliant foundation

Supabase profile authorization is anchored to the Clerk JWT subject:

```sql
(auth.jwt() ->> 'sub') = clerk_user_id
```

The external subject, not email, is the ownership anchor.

## Historical incompatible behavior

Historical migration:

```text
supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql
```

contained a legacy recovery path that could update an unbound profile by email and assign the current `clerk_user_id`. That historical migration remains in Git history for provenance and is not rewritten.

## Repository remediation

Forward migration:

```text
supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql
```

expresses the fail-closed subject-first behavior:

1. exact authenticated external subject lookup is first and authoritative;
2. no existing profile is assigned `clerk_user_id` by browser-supplied email;
3. a verified JWT email may detect an unbound legacy profile but returns `identity_migration_required` rather than claiming it;
4. browser `p_email` is compatibility/profile data only and is never an ownership key;
5. unique-conflict recovery re-reads by exact subject only;
6. public/anon execution is denied.

Frozen H2 SHA-256 for this migration:

```text
ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6
```

## Staging deployed evidence

Current sovereign Staging (`mduummtnlupktjaujgyx`) contains migration ledger entry:

```text
20260808211445 identity_01_fail_closed_profile_resolver_staging_proof
```

PRG runtime proof executed inside a transaction and rolled back. It verified:

- unauthenticated caller -> `auth_required`;
- exact subject -> `profile_loaded`;
- verified JWT email encountering an unbound legacy profile -> `identity_migration_required` with legacy `clerk_user_id` remaining null;
- arbitrary browser `p_email` cannot transfer ownership of an existing unbound row;
- browser-only compatibility email likewise leaves the pre-existing row unclaimed;
- final synthetic residue = zero.

A data-quality observation remains: if the JWT carries no verified email, compatibility `p_email` may create a separate profile with the same email as an unbound legacy row. This does **not** transfer ownership of the legacy row, but duplicate-email hygiene may be tightened later if product requirements require verified-email-only profile creation.

## Production deployed evidence

Production project:

```text
zelcngyyvbomuzokvuxo
```

has no standalone `identity_01` ledger entry, but `global_launch_phase_a_identity_convergence` is deployed and the live resolver was inspected read-only.

The deployed function is already semantically canonical and hardened:

- exact `clerk_user_id` subject lookup first;
- verified JWT email only detects an unbound legacy profile;
- detected legacy profile returns `identity_migration_required`;
- browser `p_email` is not used to locate/claim an existing profile;
- no email ownership-transfer update path exists;
- `SECURITY DEFINER` with hardened `search_path = pg_catalog, public`;
- `anon` execute = false;
- `public` execute = false;
- `authenticated` execute = true.

Therefore the old statement `REMOTE_DATABASE_STATE=UNVERIFIED_BY_IDENTITY_01` is superseded by current PRG evidence.

## Important release consequence

Do **not** apply the standalone IDENTITY-01 migration to Production merely because its ledger name is absent. Production is already semantically remediated by Phase A. PRG must classify current semantic state before any DDL and avoid redundant or regressive replacement.

Current classification:

```text
FEDERATED_IDENTITY_POLICY=BINDING
REPOSITORY_EMAIL_AUTO_LINK_REMEDIATION=PREPARED
STAGING_IDENTITY_RUNTIME_PROOF=PASS
PRODUCTION_IDENTITY_REMOTE_STATE=SEMANTICALLY_CANONICAL_FROM_PHASE_A
PRODUCTION_STANDALONE_IDENTITY_01_LEDGER_ENTRY=ABSENT
PRODUCTION_IDENTITY_01_REAPPLY_REQUIRED=FALSE_UNLESS_FUTURE_DRIFT_PROVES_OTHERWISE
PRODUCTION_DB_MUTATION_BY_PRG=NOT_AUTHORIZED
```

## Future legacy reassignment procedure

`identity_migration_required` is not permission to assign a subject by email. Genuine historical account reassignment requires a separately governed re-verification procedure with explicit identity proof, owner/security authorization where required, and audit evidence.

## Hard boundary

Production identity state may be inspected read-only without owner Production mutation authority. Synthetic Production mutation/runtime testing, DDL, data repair, country activation, and owner seeding remain separate protected actions.