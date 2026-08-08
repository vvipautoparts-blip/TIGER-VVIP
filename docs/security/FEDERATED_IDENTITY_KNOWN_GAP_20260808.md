# Federated Identity — Known Compatibility Gap

- **Status:** OPEN / FAIL-CLOSED REMEDIATION REQUIRED BEFORE PRODUCTION IDENTITY LAUNCH
- **Decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`

## Existing compliant foundation

The existing Supabase profile resolver and RLS policies identify authenticated users primarily through the Clerk JWT subject:

```sql
(auth.jwt() ->> 'sub') = clerk_user_id
```

This is aligned with the new federated identity architecture because the external subject, not the email address, is the authorization anchor.

## Existing incompatible legacy behavior

Historical migration:

```text
supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql
```

contains a legacy recovery path that, when no profile exists for the current Clerk subject, may update a profile by matching the email address and assigning the current `clerk_user_id` when the previous subject field is empty.

The function returns status:

```text
legacy_profile_recovered
```

This was a migration convenience for historical profiles. Under the newly binding Federated Identity Sovereignty ADR, it is no longer an acceptable automatic identity-linking path because email equality alone must not prove account ownership.

## Required remediation

Do **not** edit or rewrite the historical migration in place.

Create a new forward migration that replaces the resolver behavior so that:

1. exact authenticated external subject lookup remains first and authoritative;
2. an existing profile with no external subject is **not** claimed automatically by matching email;
3. an unbound legacy profile produces a fail-closed status such as `identity_migration_required`;
4. any legacy identity reassignment occurs only through a separately governed, auditable migration/re-verification procedure;
5. creation of a genuinely new profile remains bound directly to the authenticated external subject;
6. RLS continues to enforce subject equality;
7. no Production migration is applied without protected release authorization and same-SHA evidence.

## Runtime compatibility

The browser may continue sending the current email hint temporarily because it is not itself an authority. After the forward migration, the backend must never use that hint to transfer ownership of an existing unbound profile.

A later cleanup may remove `p_email` entirely when schema/runtime compatibility has been proven.

## Hard boundary

Until this gap is resolved and verified:

```text
FEDERATED_IDENTITY_POLICY=ADOPTED
CURRENT_IMPLEMENTATION=PARTIAL
EMAIL_AUTO_LINKING_PATH=KNOWN_GAP
PRODUCTION_IDENTITY_LAUNCH=BLOCKED_ON_REMEDIATION
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```
