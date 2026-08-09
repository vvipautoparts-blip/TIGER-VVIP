# VVIP TIGER

VVIP TIGER is a security-first, multi-page web platform under controlled global-launch finalization.

## Current architecture

The repository currently uses:

- `index.html` — primary marketplace/auth entry surface;
- `private-profile-p03.html` — private profile/account surface in the active launch stack;
- Clerk — external identity/authentication runtime;
- Supabase — platform data/storage layer under externally authenticated sessions;
- VVIP-owned authorization/RLS/audit controls;
- provider-neutral static delivery optimization through `sw-vvip-static.js`.

## Identity architecture

VVIP TIGER is **federated-identity only**.

The binding decision is recorded in [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md) and enforced by [federated-identity-policy.v1.json](project-control/security/federated-identity-policy.v1.json).

Key rules:

- no first-party VVIP passwords;
- no local password hashes or password recovery;
- authentication is delegated to approved external identity providers;
- OIDC is used for authentication, with OAuth 2.0/PKCE protections where applicable;
- canonical account identity is the verified external issuer + subject, not email;
- no automatic account linking solely by email;
- provider secrets/private signing keys never enter browser code;
- VVIP TIGER retains ownership of roles, permissions, account status, RLS/data access, owner approvals, and audit evidence.

Legacy Firebase/Supabase password runtimes have been removed from the current product tree. Historical compatibility routes such as `reset-password.html` now redirect users back to the external identity entry rather than performing local recovery.

## Identity production state

The historical email-based profile ownership recovery path has been replaced in deployed Production by the Phase A fail-closed resolver. Production verification confirms no `legacy_profile_recovered` path, an `identity_migration_required` fail-closed status for unbound legacy profiles, exact Clerk-subject ownership lookup, RLS + FORCE RLS on `profiles`, no anonymous table privilege, and authenticated `SELECT` only.

A separate historical credential-retirement task remains before public Production release: the Supabase Auth schema still contains legacy email/password users and refresh-token state even though the current product tree no longer calls Supabase password authentication. The binding federated-only policy requires that parallel credential surface to be retired through its own protected Production security gate; it must not be silently deleted or auto-linked by email.

See [Federated Identity Known Gap](docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md) and the PRG evidence for the exact deployed-state proof and retirement plan.

## Runtime boundary

`scripts/runtime/vvip-runtime-loader.js` obtains the current external Clerk session token for Supabase and disables Supabase browser session persistence and automatic token refresh. Database authorization remains subject/RLS controlled.

## Quality and security

Repository changes are verified through the VVIP Quality Gate and Project Control Integrity. Security or launch-evidence failures are not bypassed or hidden.

## Development preview

For a local static preview:

```bash
python -m http.server 800
```

Then open `http://localhost:800/index.html`.

## Production boundary

Repository readiness does not itself authorize Production deployment, Production database mutation, provider purchases, real charges, protected identity-provider configuration changes, country activation, persistent owner seeding, or real Production data mutation. Those actions require their separate protected release/evidence process.
