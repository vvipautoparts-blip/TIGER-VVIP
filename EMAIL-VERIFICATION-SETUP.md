# Email Verification — Historical Authentication Notice

> **Status: HISTORICAL / DO NOT EXECUTE AS AN AUTHENTICATION GUIDE**
>
> The previous Supabase/Firebase email-authentication flow has been superseded by the binding [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md).

## Current identity rule

VVIP TIGER does not own an email/password credential lifecycle. Email verification used for authentication or recovery belongs to the approved external identity provider.

VVIP TIGER may consume a verified email claim as profile/contact data when required, but:

- email is not the canonical account identifier;
- email equality cannot transfer ownership of an existing account;
- email cannot be used to auto-link identities across providers;
- password reset/recovery is never performed by a VVIP-owned Firebase/Supabase auth path.

The canonical identity anchor is the verified external `(issuer, subject)` pair.

## Data-layer rule

Supabase remains a platform data layer. RLS and authorization must be bound to the verified external subject. Supabase email/password authentication must not become a parallel credential system.

## Historical runtime status

The former executable password/authentication runtimes have been removed from the current product tree. See [Legacy Password Runtime Removal](docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md).

The separate historical email-based profile ownership fallback remains a known gap and is tracked in [Federated Identity Known Gap](docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md).

No Production provider, database, SMTP, or recovery configuration is changed by this document.
