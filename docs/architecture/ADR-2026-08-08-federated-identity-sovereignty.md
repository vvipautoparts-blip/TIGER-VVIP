# ADR — Federated Identity Sovereignty

- **Status:** ACCEPTED / BINDING
- **Date:** 2026-08-08
- **Platform:** VVIP TIGER
- **Decision owner:** Platform Owner

## Decision

VVIP TIGER will not operate a first-party password authentication system.

Identity authentication, credential security, password/passkey lifecycle, and account recovery are delegated to approved external identity providers through standards-based federated identity. VVIP TIGER consumes verified identity assertions and maintains only the minimum platform data required to map that external identity to VVIP TIGER authorization, profile, and audit state.

This is a permanent architecture boundary unless the Platform Owner explicitly approves a future replacement architecture through a new superseding ADR.

## Mandatory architecture rules

### 1. No VVIP-managed passwords

VVIP TIGER must not:

- collect a first-party account password;
- store password hashes;
- implement password reset or password recovery;
- maintain password salts, password verifiers, or custom credential databases;
- expose a custom password-authentication endpoint.

Any credential lifecycle belongs to the external identity provider.

### 2. OIDC identity, OAuth 2.0 authorization

Authentication must use OpenID Connect where an identity assertion is required. OAuth 2.0 alone is not treated as an authentication protocol.

Public-client authorization flows must use PKCE where applicable. `state` and OIDC `nonce` protections must be preserved whenever the selected provider/runtime exposes those controls.

### 3. Stable subject is the account identity

The canonical VVIP TIGER account key is the verified external subject, scoped by issuer/provider identity.

Conceptually:

```text
account_identity = (issuer, subject)
```

Email address, phone number, display name, and similar claims are attributes, not the primary account key.

VVIP TIGER must never rely on email equality alone to prove that two external identities belong to the same person.

### 4. No automatic account linking by email

Two identities must not be auto-linked merely because they present the same email address.

Account linking, when supported, must occur through an explicit identity-provider or owner-approved trusted linking flow with re-authentication and audit evidence.

### 5. Delegated recovery

Account recovery is handled by the external identity provider. VVIP TIGER may guide the user back to the provider-managed recovery flow but must not create a parallel local recovery secret or bypass.

### 6. Minimal local identity record

The default local identity record may contain only data required for platform operation, such as:

- external issuer/provider identifier;
- external subject identifier;
- current verified email or phone claim when needed for UX/contact;
- VVIP TIGER internal user/profile identifier;
- authorization/role state;
- account status;
- security/audit timestamps and non-secret provenance.

The external subject must remain the authoritative identity anchor.

### 7. Token minimization

VVIP TIGER must not persist provider access tokens or refresh tokens by default merely to maintain login identity.

Browser code must never receive provider client secrets, service-role secrets, private signing keys, or other server credentials.

Where the identity runtime supplies short-lived session/JWT tokens, they are consumed only for the minimum required authorization path and must not be logged.

### 8. Verification requirements

Every trusted identity assertion must be bound to the expected provider/runtime and protected against token substitution. Where VVIP TIGER performs token verification directly, verification must include the applicable issuer, audience/client identity, signature/JWKS, expiry/not-before, and nonce/session binding requirements.

No token claim is trusted merely because the payload is decodable.

### 9. Authorization remains VVIP-owned

Federated authentication does not delegate platform authorization.

VVIP TIGER remains responsible for:

- roles;
- permissions/capabilities;
- suspension/revocation state;
- risk controls;
- owner approvals;
- audit evidence;
- row-level/data access enforcement.

An authenticated external identity receives only the VVIP TIGER permissions explicitly granted to its mapped internal account.

### 10. Supabase/data-layer boundary

When Supabase is used, database authorization must be based on a verified external session/JWT mapped to the stable external subject and enforced with VVIP TIGER RLS/policy controls.

Supabase email/password authentication must not become a second user credential system behind the federated identity layer.

### 11. Provider recovery failures do not create a local bypass

If an external provider cannot recover an account, VVIP TIGER must not issue an alternate password, recovery code, or manually forged identity assertion. Any exceptional identity reassignment must be a separately governed owner/security procedure with auditable evidence and must never imitate normal authentication.

### 12. WhatsApp and non-OIDC channels

A channel such as WhatsApp must not be treated as a custom VVIP password/OTP authentication backend merely because it can deliver messages.

If such a channel is ever used for identity, it must be brokered by an approved external identity provider that owns verification, credential/OTP handling, abuse controls, and recovery. VVIP TIGER must not build a parallel first-party credential service around it.

## Current implementation alignment

The current browser runtime uses Clerk as the external identity runtime and obtains a short-lived session token for the Supabase client. Supabase session persistence and Supabase automatic token refresh are disabled in the VVIP runtime. The platform profile resolver is invoked under the external session rather than a locally stored VVIP password.

This ADR records the architecture boundary; it does not itself assert that every external provider dashboard setting is already configured for federated-only production login. Provider-side configuration remains separately verifiable launch evidence.

## Security truth

Federated identity materially reduces VVIP TIGER's credential-handling attack surface, but it does **not** make account compromise impossible. The remaining security boundary includes token/session theft, malicious or compromised identity providers, OAuth/OIDC misconfiguration, account-linking flaws, XSS, authorization errors, and recovery/social-engineering risks.

Therefore the platform must preserve defense-in-depth around sessions, authorization, CSP/XSS controls, auditability, and provider configuration.

## Cost and operating effect

This architecture avoids the engineering and operational burden of a first-party password store and first-party password recovery system. It also centralizes much of credential lifecycle security at specialist identity providers. It does not eliminate VVIP TIGER's privacy, authorization, security-monitoring, or regulatory responsibilities for the data and decisions the platform itself controls.

## Forbidden regression examples

The following are architecture regressions unless superseded by an owner-approved ADR:

```text
custom password field for VVIP account login
password_hash / bcrypt / argon2 credential database
Supabase signInWithPassword / resetPasswordForEmail for VVIP user login
local password reset token service
email-only account identity or email-only account linking
provider client secret embedded in browser code
persistent provider refresh token stored merely for login identity
custom WhatsApp OTP database operated as VVIP authentication
```

## Required future verification

Before Production identity launch, evidence must prove at minimum:

1. approved external providers and production provider configuration;
2. password strategy disabled wherever the chosen identity provider supports multiple strategies and federated-only is the selected policy;
3. redirect/callback origins are exact and allowlisted;
4. PKCE/state/nonce protections are active where applicable;
5. no provider secrets are delivered to browser code;
6. account mapping uses issuer + stable external subject rather than email;
7. no automatic email-based cross-provider linking exists;
8. sign-out/session revocation behavior is tested;
9. Supabase/RLS authorization is mapped to the external subject;
10. recovery returns users to provider-managed recovery without a VVIP credential bypass.

## Supersession rule

This ADR may be changed only by a new explicit architecture decision that references and supersedes it. Silent introduction of a local password path is prohibited.
