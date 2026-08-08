# VVIP TIGER — Legacy Password Runtime Removal

- **Date:** 2026-08-08
- **Architecture decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Status:** REMOVED FROM CURRENT PRODUCT TREE

## Removed executable legacy authentication files

The following historical authentication runtimes were removed from the current branch after repository evidence showed they were not linked by the active product entry points and prior audits had already classified them as legacy/non-official:

```text
auth.js

auth-supabase.js
scripts/supabase-auth-bridge.js
```

### Why removal was required

These files retained executable first-party password authentication behavior or password-recovery/password UI logic from older Firebase/Supabase experiments. Keeping executable copies in the product tree contradicted the binding Federated Identity Sovereignty decision even if the files were no longer linked from the current UI.

The current identity path is external/federated through Clerk, with Supabase used as the data layer under an externally authenticated session.

## Evidence of prior non-use

The historical audit `docs/VVIP_TIGER_LEGACY_AUTH_AUDIT.md` had already classified these files as old and not used by the official Clerk path. Repository searches before deletion found no current HTML `<script src>` references to these runtimes.

## Files intentionally retained

`auth-flow.html` is retained because it is a safe redirect to `index.html` and does not implement authentication or password handling.

Other historical documentation is retained for audit/history. Git history preserves the deleted source for forensic or rollback inspection without leaving it executable in the current tree.

## Regression prevention

`tests/federated-identity-sovereignty.test.cjs` scans owned runtime/auth surfaces for first-party password authentication constructs and explicitly requires the retired runtime paths above to remain absent.

A future password runtime may not be reintroduced silently. Any change to the federated-only architecture requires an explicit owner-approved superseding ADR.

## Remaining independent identity gap

Removal of legacy password runtimes does **not** resolve the separate historical profile-linking issue in `vvip_resolve_own_profile`: the `legacy_profile_recovered` email-matching ownership transfer path remains a known gap and must be replaced by a new forward migration before Production identity launch.

```text
LEGACY_PASSWORD_RUNTIME=REMOVED
FEDERATED_IDENTITY_POLICY=BINDING
EMAIL_AUTO_LINKING_GAP=OPEN
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```
