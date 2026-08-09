# VVIP TIGER — Legacy Password Runtime Removal

- **Date:** 2026-08-08
- **Architecture decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Current status:** EXECUTABLE PASSWORD RUNTIME REMOVED / DEPLOYED LEGACY CREDENTIAL RETIREMENT STILL REQUIRED

## Removed executable legacy authentication/recovery files

The following historical runtimes were removed from the current branch after repository evidence showed the old auth files were outside the official Clerk path and the recovery runtime directly contradicted delegated recovery:

```text
auth.js
auth-supabase.js
scripts/supabase-auth-bridge.js
reset-password.js
```

### Why removal was required

These files retained executable first-party password authentication or Firebase password-recovery logic from older Firebase/Supabase experiments. Keeping executable copies in the product tree contradicted the binding Federated Identity Sovereignty decision even when a runtime was no longer linked from the current official UI.

The current identity path is external/federated through Clerk, with Supabase used as the data layer under an externally authenticated session.

## Recovery compatibility route

`reset-password.html` is intentionally retained as a legacy URL compatibility surface, but it no longer loads Firebase or implements password reset. It redirects to:

```text
index.html?recovery=provider
```

This preserves old bookmarks/routes while returning recovery responsibility to the external identity entry path.

## Repository regression prevention

`tests/federated-identity-sovereignty.test.cjs` keeps the retired executable runtime paths absent, scans owned authentication/runtime surfaces for first-party password sign-in/reset/sign-up constructs, and verifies the legacy reset URL is redirect-only.

Fresh repository search on 2026-08-09 also found zero current `signInWithPassword` and zero `supabase.auth` code references in the launch tree.

## Profile-linking gap — deployed remediation verified

The separate historical `legacy_profile_recovered` email ownership-transfer path is no longer present in the deployed Production resolver. Current Production verification confirms:

```text
LEGACY_PROFILE_RECOVERED_PRESENT=false
IDENTITY_MIGRATION_REQUIRED_PRESENT=true
EXACT_SUBJECT_LOOKUP_PRESENT=true
EMAIL_OWNERSHIP_UPDATE_PATTERN_DETECTED=false
```

That profile-linking gap is therefore closed independently of password-runtime removal.

## Remaining deployed credential surface — blocking

Removing executable password code did not remove historical credentials already stored in Supabase Auth. Read-only Production inspection on 2026-08-09 found:

```text
SUPABASE_AUTH_USERS=7
EMAIL_PROVIDER_USERS=7
USERS_WITH_ENCRYPTED_PASSWORD=7
CONFIRMED_EMAIL_USERS=6
AUTH_SESSIONS=4
REFRESH_TOKENS=6
REFRESH_TOKENS_NOT_REVOKED=4
LATEST_LEGACY_SIGN_IN=2026-07-05
```

This is a **deployed credential-retirement issue**, not a current repository runtime path. The binding policy explicitly requires federated identity only and forbids a parallel Supabase password authentication system.

The retirement must be performed through a separate protected security gate that disables the legacy provider surface, revokes sessions/tokens, preserves `public.profiles`, and avoids any email-based auto-linking. Historical Auth users must not be silently deleted merely because the current UI no longer calls them.

```text
LEGACY_PASSWORD_RUNTIME=REMOVED_FROM_PRODUCT_TREE
LOCAL_PASSWORD_RECOVERY=REMOVED
PROFILE_EMAIL_AUTO_LINKING_GAP=CLOSED_IN_PRODUCTION
LEGACY_SUPABASE_PASSWORD_CREDENTIAL_SURFACE=RETIREMENT_REQUIRED
DELEGATED_RECOVERY=REQUIRED
FEDERATED_IDENTITY_POLICY=BINDING
PRODUCTION_CREDENTIAL_RETIREMENT=NOT_AUTHORIZED
```
