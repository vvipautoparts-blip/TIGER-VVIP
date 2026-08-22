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

## Identity remediation evidence

Historical deployment and reconciliation records are provenance only; they do not establish current Production runtime truth. Repository identity requirements remain subject to the current exact-SHA tests, security controls, RLS/policy evidence, and the execution-state authority in `docs/MASTER_PROJECT_STATE.md`.

The standalone repository IDENTITY-01 migration remains forward provenance. Whether any migration or resolver is active in Production must be established by fresh runtime evidence rather than inferred from historical repository documentation. See [Federated Identity Known Gap](docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md).

## Deployment evidence boundary

Production runtime status is separate from repository readiness. Historical Production deployment/reconciliation evidence must not be represented as current runtime state, and any current Production claim requires fresh exact-SHA/runtime evidence under the applicable deployment controls.

The current commercial/discovery authority is Issue #312: TIGER supports discovery, relevance/explanation and contact handoff, then stops for advertised user-to-user or user-to-provider goods/services. Platform finance is limited to platform-owned advertising, ad credits/packages, approved platform-owned services, and their own refunds/adjustments/taxes/treasury/accounting.

See `docs/MASTER_PROJECT_STATE.md` and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` for current repository execution and owner-authority boundaries. Historical reconciliation reports remain audit provenance unless independently re-verified against the current runtime.

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

Observed or historical Production state does not grant authority for future Production mutations. Country activation, Owner seeding, data mutation, provider configuration changes, and future deployments remain independently governed and must fail closed on drift.
