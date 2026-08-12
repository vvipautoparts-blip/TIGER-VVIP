# Google Authentication Setup — Historical Notice

> **Status: HISTORICAL / DO NOT EXECUTE**
>
> This file previously documented a direct Firebase/Supabase-era Google authentication experiment. VVIP TIGER now follows the binding federated identity architecture in [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md).

## Current rule

Google authentication, when enabled, must be configured through the approved external identity provider/runtime. VVIP TIGER must not implement a parallel Google/Firebase/Supabase credential path in browser code.

Current requirements include:

- OIDC for authentication;
- OAuth 2.0 authorization flow with PKCE where applicable;
- exact allowlisted callback/redirect origins;
- provider-managed credential and recovery lifecycle;
- stable external subject as the identity anchor;
- no automatic account linking solely by email;
- no provider client secret or private signing key in browser code.

## Historical runtime status

The former executable authentication runtime referenced by this guide has been retired from the current product tree. See [Legacy Password Runtime Removal](docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md).

Provider dashboard configuration is launch evidence and is not modified by this document.
