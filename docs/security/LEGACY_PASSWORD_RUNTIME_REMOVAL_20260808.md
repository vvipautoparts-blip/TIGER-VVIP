# VVIP TIGER — Legacy Password Runtime Removal

- **Date:** 2026-08-08
- **Architecture decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Status:** REMOVED FROM CURRENT PRODUCT TREE

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

## Evidence of prior non-use

The historical audit `docs/VVIP_TIGER_LEGACY_AUTH_AUDIT.md` had already classified `auth.js`, `auth-supabase.js`, and `scripts/supabase-auth-bridge.js` as old/non-official. Repository searches before deletion found no current HTML `<script src>` references to those three authentication runtimes.

`reset-password.js` was still referenced only by the legacy reset page; that page was converted in the same slice to a provider-recovery compatibility redirect before the script was removed.

## Files intentionally retained

`auth-flow.html` is retained because it is a safe redirect to `index.html` and does not implement authentication or password handling.

`reset-password.html` is retained only as the delegated-recovery compatibility redirect described above.

Other historical documentation is retained only where it does not create broken executable references; obsolete authentication setup guides are explicitly marked historical/non-executable. Git history preserves deleted source for forensic or rollback inspection without leaving it executable in the current tree.

## Regression prevention

`tests/federated-identity-sovereignty.test.cjs`:

- requires all four retired executable runtime paths to remain absent;
- scans owned authentication/runtime surfaces for first-party password sign-in/reset/sign-up constructs;
- verifies the legacy reset URL is redirect-only and contains no Firebase or reset form.

A future password runtime may not be reintroduced silently. Any change to the federated-only architecture requires an explicit owner-approved superseding ADR.

## Remaining independent identity gap

Removal of legacy password runtimes does **not** resolve the separate historical profile-linking issue in `vvip_resolve_own_profile`: the `legacy_profile_recovered` email-matching ownership transfer path remains a known gap and must be replaced by a new forward migration before Production identity launch.

```text
LEGACY_PASSWORD_RUNTIME=REMOVED
LOCAL_PASSWORD_RECOVERY=REMOVED
DELEGATED_RECOVERY=REQUIRED
FEDERATED_IDENTITY_POLICY=BINDING
EMAIL_AUTO_LINKING_GAP=OPEN
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```
