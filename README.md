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

Legacy Firebase/Supabase password runtimes have been removed from the current product tree. Historical compatibility routes such as `reset-password.html` redirect users back to the external identity entry rather than performing local recovery.

## Identity remediation state

The historical email-linking compatibility gap is **semantically remediated in the deployed Production resolver**. Production uses subject-first profile ownership and does not transfer ownership of an existing profile from browser-supplied email. Sovereign Staging runtime proof also passed with rollback and zero synthetic residue.

The standalone repository IDENTITY-01 migration is retained as forward provenance but is not reapplied to Production while the deployed Phase A resolver remains semantically canonical. See [Federated Identity Known Gap](docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md).

## Production state

The current Production Web source is `3d8bbfc8611e53510b3bb776b8d9752df6595d8d`. GitHub Pages deployment succeeded on the repository's default Pages URL. The custom domain `tigerautoparts.shop` is not yet configured in the GitHub Pages API.

Phase B marketplace/authority schema is present in Supabase Production as a **dark launch**. Fresh read-only reconciliation verified RLS/FORCE RLS, expected schema/policies/storage boundaries, zero authority/country seed rows, zero marketplace rows, and a PASS Phase A regression proof.

See `MASTER_PROJECT_STATE.md` and `reports/reconciliation/2026-08-10/` for the authoritative current-state evidence once the reconciliation PR is merged.

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

Observed Production state does not grant authority for future Production mutations. Country activation, Owner seeding, data mutation, provider configuration changes, and future deployments remain independently governed and must fail closed on drift.
