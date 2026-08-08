# Feature Verification — Historical Snapshot

> **Status: HISTORICAL SNAPSHOT.** This file no longer defines the current authentication architecture.
>
> Current identity authority: [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md).

This document originally recorded June 2026 UI/auth experiments, including local saved-email behavior, legacy admin UI work, and proposed OAuth/RLS work. Those notes remain useful only as historical context.

## Current authentication truth

- External identity provider/runtime owns authentication, credentials, and recovery.
- VVIP TIGER has no first-party password authentication.
- Canonical account identity is the verified external issuer + subject, not email.
- VVIP TIGER owns authorization, roles/capabilities, account status, RLS/data policy, approvals, and audit evidence.
- Supabase remains the data layer and must not become a parallel password-auth system.

The former executable password runtimes referenced by older versions of this file have been retired. See [Legacy Password Runtime Removal](docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md).

## Current live marketplace references

- [index.html](index.html) — current primary marketplace/auth entry surface.
- [private-profile-p03.html](private-profile-p03.html) — current private-profile entry in the active launch stack.
- [scripts/vvip-pr29-home-marketplace.js](scripts/vvip-pr29-home-marketplace.js) — marketplace UI/search behavior.
- [scripts/runtime/vvip-runtime-loader.js](scripts/runtime/vvip-runtime-loader.js) — external identity + Supabase runtime bridge.
- [project-control/security/federated-identity-policy.v1.json](project-control/security/federated-identity-policy.v1.json) — machine-readable identity policy.

## Known unresolved identity item

The historical `legacy_profile_recovered` email-based profile ownership fallback remains an explicit launch-blocking compatibility gap. See [Federated Identity Known Gap](docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md).

Do not use older line-number references, demo credentials, password flows, or direct Supabase/Firebase authentication instructions from previous revisions of this document as current implementation guidance. Git history preserves the full historical snapshot.
