# AI-18 Sovereign Owner Step-Up Authorization — Design

## Goal
Prevent TIGER AI and all server-side execution paths from performing critical owner actions unless a fresh, trusted, server-verified owner re-authentication is bound to the exact action and consumed once.

## Security decision
A fixed passcode embedded in prompts, source code, SQL, logs, or database functions is forbidden. Prompts are not an authentication boundary. Password-like secrets must never be hard-coded or compared in SQL.

AI-18 uses a provider-neutral step-up boundary that prefers phishing-resistant WebAuthn/passkeys or an equivalent trusted IdP re-authentication flow. The repository implementation verifies only trusted server-side authenticator results; provider credentials and private signing keys remain outside the repository.

## Protected actions
The initial protected owner actions are:
- MERGE_RELEASE
- PROMOTE_DATABASE
- ACTIVATE_PRODUCTION
- CHANGE_PRICES
- CHANGE_OWNER_SECURITY
- CHANGE_AI_SECURITY_POLICY

The list is fail-closed: unknown critical mutations are denied, not implicitly downgraded.

## Transaction binding
Every successful step-up authorization is bound to all of:
- ownerSubject
- action
- releaseDigest
- payloadDigest
- scopeDigest
- environment
- challengeId
- nonceHash
- issuedAt
- expiresAt

Changing any bound field invalidates the authorization.

## Trust boundary
1. Browser/UI requests a step-up challenge from the trusted backend.
2. Backend binds the challenge to one exact critical transaction.
3. Owner authenticates using an approved authenticator through the trusted identity provider or WebAuthn verifier.
4. Only the trusted server adapter can convert a provider verification result into a branded in-process verification assertion.
5. The authorization is persisted with a short expiration window.
6. Execution consumes the authorization exactly once using exact transaction binding.
7. Replay, stale, mismatched, copied JSON, browser-forged booleans, and untrusted authenticator methods fail closed.
8. Audit records never contain the authentication secret, passcode, raw credential, private key, or WebAuthn private material.

## Assurance policy
- Preferred critical-action method: WEBAUTHN_PASSKEY / phishing-resistant cryptographic re-authentication.
- Provider-neutral phishing-resistant IdP re-authentication is allowed when the backend explicitly marks and verifies the assurance method.
- Plain passwords, static PINs, prompt-provided secrets, SMS-only proof, and client-side `authenticated=true` flags are not sufficient for sovereign critical actions.
- Break-glass recovery is a separate future workflow and must not silently weaken this policy.

## Persistence
A new table `public.ai_owner_stepup_authorizations` will store only non-secret authorization metadata and exact binding digests.

Browser roles receive no direct authority. The service boundary owns creation, verification state transition, revocation, expiration, and one-time consumption.

## Database enforcement
A new `consume_ai_owner_stepup_authorization(...)` function must:
- lock the row;
- require status `verified`;
- compare owner/action/release/payload/scope/environment exactly;
- reject expired records;
- atomically transition `verified -> consumed`;
- return a deterministic reason code on replay or mismatch;
- expose no authentication secret.

## Interaction with existing owner decision receipts
AI-18 does not replace the Ed25519 owner decision receipt layer. The intended chain is:

`Step-Up Authentication -> one-time Step-Up Authorization -> Owner Decision Receipt -> existing L4 approval consumption -> controlled executor`

This gives defense in depth: identity proof, transaction proof, cryptographic approval, persistence/replay protection, and execution policy are separate controls.

## Explicit non-claims
AI-18 repository implementation does not claim:
- a live WebAuthn enrollment;
- a configured production IdP;
- production MFA deployment;
- HSM/KMS private-key custody;
- staging or production migration application;
- production activation.

## Constitutional owner boundaries
AI-18 cannot synthesize or bypass the three sovereign owner decisions: Merge, DB Promotion, or Production Activation.
