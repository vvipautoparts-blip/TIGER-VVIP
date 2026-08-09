# Federated Identity — Legacy Linking Compatibility Gap

- **Status:** REMEDIATION PREPARED / NOT REMOTELY APPLIED
- **Decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Prepared forward migration:** `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`

## Existing compliant foundation

The existing Supabase profile resolver and RLS policies identify authenticated users primarily through the Clerk JWT subject:

```sql
(auth.jwt() ->> 'sub') = clerk_user_id
```

This is aligned with the federated identity architecture because the external subject, not the email address, is the authorization anchor.

## Historical incompatible behavior

Historical migration:

```text
supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql
```

contains a legacy recovery path that, when no profile exists for the current Clerk subject, may update a profile by matching email and assigning the current `clerk_user_id` when the previous subject field is empty.

That historical function returns:

```text
legacy_profile_recovered
```

The historical migration is intentionally preserved for audit/provenance and is not rewritten in place.

## IDENTITY-01 remediation prepared

Forward migration:

```text
supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql
```

replaces the resolver behavior in repository state so that:

1. exact authenticated external subject lookup remains first and authoritative;
2. no existing profile is updated to acquire `clerk_user_id` by email;
3. legacy detection uses only an email claim carried by the authenticated JWT, never browser-supplied `p_email`;
4. an unbound legacy profile detected from verified JWT email returns fail-closed `identity_migration_required` without returning the profile;
5. browser `p_email` remains compatibility/profile data only and cannot search for or claim existing ownership;
6. genuinely new profiles are created directly under the authenticated external subject;
7. unique-conflict recovery re-reads by exact subject only;
8. existing RLS/schema remain unchanged.

## What is still not done

The prepared migration has **not** been remotely applied to Staging or Production by this repository slice.

Therefore repository remediation and deployed-environment remediation are intentionally distinguished:

```text
REPOSITORY_EMAIL_AUTO_LINK_REMEDIATION=PREPARED
REMOTE_DATABASE_STATE=UNVERIFIED_BY_IDENTITY_01
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```

Production identity launch must remain blocked until the forward migration is separately approved/applied through the protected release process and same-SHA environment evidence proves the deployed resolver no longer contains email ownership transfer.

## Future legacy reassignment procedure

`identity_migration_required` is not an invitation to manually assign a subject by email. Any genuine historical account reassignment must use a separately governed re-verification procedure with explicit identity proof, owner/security authorization where required, and audit evidence.

A later compatibility cleanup may remove `p_email` entirely when runtime/provider claim availability is proven.

## Hard boundary

```text
FEDERATED_IDENTITY_POLICY=BINDING
EMAIL_AUTO_LINKING_REPOSITORY_FIX=PREPARED
REMOTE_MIGRATION=NOT_APPLIED
PRODUCTION_IDENTITY_LAUNCH=BLOCKED_ON_DEPLOYED_EVIDENCE
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```
