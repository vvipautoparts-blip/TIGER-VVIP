# TIGER VVIP — Sovereign Owner Access Design

**Status:** DESIGN APPROVED BY OWNER — IMPLEMENTATION NOT YET AUTHORIZED BY THIS DOCUMENT

**Date:** 2026-08-13

**Scope:** Owner identity, owner authentication, owner private data, owner public profile, owner authority, recovery, step-up, audit, and protected access to owner-control surfaces.

**Repository baseline:** `main@78fe36e33cb8eeb1f1b44e12eac53db166c272a2`

**Design rule:** Security is enforced by server/database authority. Frontend visibility is never an authorization boundary.

---

## 1. Objective

Build a 2026-grade owner access system that separates:

1. **Public owner identity** visible to users.
2. **Private owner vault** invisible to ordinary users and browser-only code.
3. **Sovereign OWNER authority** proving who may exercise owner powers.
4. **Owner access session** proving that the owner authenticated recently and strongly enough for the requested action.
5. **Immutable audit trail** proving who requested, approved, executed, failed, or reversed a sensitive owner action.

The system must fail closed and must not claim that any security architecture is impossible to breach. The target is layered prevention, strong containment, rapid detection, explicit approval boundaries, and recoverability.

---

## 2. Approved Product Decision — Option B

The platform exposes a limited **Owner Public Profile** while preserving sensitive owner information inside a protected **Owner Private Vault**.

### 2.1 Public fields

Allowed public fields are limited to fields explicitly approved for publication, for example:

- display name;
- founder/owner title;
- country;
- optional public image;
- short professional biography;
- verified-owner badge;
- approved public contact or corporate link if separately enabled.

No public field is populated automatically from private data without an explicit publication action.

### 2.2 Private fields

Examples of private fields:

- legal full name;
- private email;
- private telephone;
- identity-document references;
- legal-entity records;
- emergency security contact;
- recovery metadata;
- owner-security status;
- confidential notes;
- sensitive compliance evidence.

Private owner data must never be committed to Git, embedded in HTML/JavaScript, stored in LocalStorage, or exposed through a browser key.

---

## 3. Authentication Strategy

### 3.1 Primary owner sign-in: Passkey-first

The preferred owner sign-in method is a Clerk-managed passkey using platform/WebAuthn capabilities. A passkey is preferred because it is phishing-resistant and device-bound.

Password-only authentication is not sufficient for `OWNER` authority.

### 3.2 Secondary strong factor

The owner account must have at least one independent recovery/second-factor method enrolled before OWNER authority becomes ACTIVE:

- authenticator app (TOTP), and
- backup codes stored offline.

SMS may exist as an availability fallback for lower-risk account recovery, but it is not the sole protection for sovereign actions.

### 3.3 Email code

Email OTP may be used as a recovery or verification component, but never as the only factor for privileged OWNER control.

### 3.4 Owner sign-in states

`OWNER_AUTH_UNAUTHENTICATED`

`OWNER_AUTH_PRIMARY_VERIFIED`

`OWNER_AUTH_MFA_VERIFIED`

`OWNER_AUTH_REVERIFIED`

`OWNER_AUTH_RESTRICTED`

`OWNER_AUTH_LOCKED`

`OWNER_AUTH_RECOVERY_PENDING`

No frontend code may upgrade these states by itself.

---

## 4. Sovereign Owner Authority

OWNER is not represented merely by `role = 'owner'` in a browser-visible profile.

Create a separate server-controlled authority binding:

`PENDING -> VERIFIED -> ACTIVE -> SUSPENDED -> REVOKED`

The binding must identify the authoritative Clerk user and must be immutable except through a protected authority-change workflow.

Recommended logical fields:

- `owner_authority_id`
- `clerk_user_id`
- `authority_status`
- `authority_version`
- `verified_at`
- `activated_at`
- `suspended_at`
- `revoked_at`
- `created_by`
- `approved_by`
- `reason_code`
- `evidence_ref`
- `created_at`
- `updated_at`

Browser roles receive no direct privilege to create, activate, suspend, or revoke OWNER authority.

---

## 5. Owner Private Vault

Create a dedicated private store, logically separate from `vvip_clerk_profiles`.

Recommended boundary:

- browser never performs unrestricted SELECT on private-vault rows;
- browser never receives encryption keys;
- sensitive reads/writes pass through a server/Edge Function boundary;
- the server validates session, authority, reverification freshness, requested field set, and action policy;
- every private access generates an audit event.

Recommended logical fields:

- `owner_id`
- encrypted legal identity payload
- encrypted private-contact payload
- encrypted recovery metadata
- compliance/evidence references
- `data_version`
- `classification`
- `retention_policy`
- `updated_at`

Field-level encryption should use envelope-encryption architecture with keys outside the data table. Plaintext secrets must not be stored in source control or frontend configuration.

---

## 6. Owner Public Profile

Create a separate public representation containing only approved fields.

Recommended logical fields:

- `owner_id`
- `public_display_name`
- `public_title`
- `public_country_code`
- `public_bio`
- `public_avatar_url`
- `verified_owner_badge`
- `publication_status`
- `public_version`
- `published_at`
- `published_by`

A private-field edit must not silently change the public profile.

Publication is a separate state transition:

`DRAFT -> REVIEWED -> PUBLISHED -> WITHDRAWN`

---

## 7. Owner Control Center Access

The existing `owner-control` UI entry may remain hidden for ordinary users, but route secrecy is not security.

Before protected owner content is returned or privileged operations are allowed, the server must verify:

1. valid Clerk session;
2. exact active owner-authority binding;
3. no owner kill switch or security hold;
4. adequate authentication assurance;
5. action-specific reverification freshness;
6. correct environment and action scope.

If any check fails, return an explicit protected error and create an audit event when appropriate.

---

## 8. Step-Up / Reverification Policy

Not every owner action has the same risk.

### L1 — read-only owner dashboard

Requires active owner authority and an authenticated session.

### L2 — routine owner configuration

Requires active owner authority and recent strong authentication.

### L3 — sensitive identity/security configuration

Examples:

- edit private owner contact;
- add/remove authentication factor;
- add/remove passkey;
- change recovery configuration;
- view highly sensitive owner-vault fields.

Requires strict reverification immediately before execution.

### L4 — sovereign action

Examples:

- change OWNER authority;
- activate production/country-level authority where separately permitted;
- alter security kill-switch policy;
- change privileged access bindings;
- authorize destructive or financially material administrative actions if they are ever implemented.

Requires all of:

- active owner authority;
- strict reverification;
- exact action binding;
- short-lived authorization lease;
- single-use nonce;
- server-owned timestamp;
- environment binding;
- release/digest binding where applicable;
- audit-before-execute and audit-after-execute;
- explicit denial if any binding changes.

---

## 9. Sovereign Authorization Lease

For L4, create a short-lived server-issued authorization lease rather than trusting a persistent browser role.

Lease fields should bind at minimum:

- owner authority id;
- Clerk session/user identity;
- exact action code;
- exact target/resource;
- environment;
- policy version;
- release digest when relevant;
- issued-at timestamp owned by server/database;
- expires-at;
- random nonce;
- single-use consumption state.

The lease must be consumed atomically and reject replay.

---

## 10. Adaptive Risk Controls

Risk signals may tighten access but must not silently grant authority.

Signals can include:

- new device/browser;
- unusual country or network change;
- impossible-travel pattern;
- repeated failed reverification;
- recovery event;
- recent passkey/MFA reset;
- security incident flag;
- session anomaly.

High-risk result can force:

- stricter reverification;
- restricted read-only mode;
- temporary hold;
- owner notification;
- manual recovery workflow.

Risk scoring must not make irreversible decisions against the owner without explicit policy and evidence.

---

## 11. Recovery Architecture

Owner recovery must not depend on a single email account.

### Standard recovery order

1. secondary enrolled passkey;
2. TOTP;
3. offline backup code;
4. controlled account recovery procedure.

### High-risk recovery

Changing the authoritative owner identity, replacing all authenticators, or recovering after total credential loss is a protected break-glass process.

The break-glass process must include:

- documented recovery request;
- identity/evidence verification outside the compromised session;
- security hold while recovery is pending;
- revocation of old sessions after success;
- re-enrollment of passkeys/MFA;
- audit event chain;
- notification to all previously trusted owner channels;
- cooling-off period for the highest-risk authority changes where operationally practical.

No support agent, moderator, partner, developer, AI agent, or administrator may silently promote themselves to OWNER.

---

## 12. Database Security Rules

For owner-sensitive tables:

- `ENABLE ROW LEVEL SECURITY`;
- `FORCE ROW LEVEL SECURITY` where compatible with the implementation boundary;
- default deny;
- no browser `BYPASSRLS`;
- no direct browser write to owner-authority binding;
- no direct browser write to immutable audit data;
- composite scope checks where environment/tenant/country apply;
- server-side validation of every protected mutation;
- idempotency for privileged mutations;
- optimistic/explicit concurrency handling;
- no caller-supplied security timestamps for approval expiry or consumption.

RLS is a defense layer, not the only layer. Protected server functions must repeat authorization checks relevant to the action.

---

## 13. Audit Black Box

Create append-only owner audit events.

Event examples:

- `OWNER_SIGNIN_SUCCEEDED`
- `OWNER_SIGNIN_FAILED`
- `OWNER_REVERIFICATION_SUCCEEDED`
- `OWNER_REVERIFICATION_FAILED`
- `OWNER_PRIVATE_DATA_ACCESSED`
- `OWNER_PRIVATE_DATA_UPDATED`
- `OWNER_PUBLIC_PROFILE_PUBLISHED`
- `OWNER_AUTHORITY_CHANGE_REQUESTED`
- `OWNER_AUTHORITY_CHANGED`
- `OWNER_RECOVERY_STARTED`
- `OWNER_RECOVERY_COMPLETED`
- `OWNER_RECOVERY_FAILED`
- `OWNER_SECURITY_HOLD_STARTED`
- `OWNER_SECURITY_HOLD_RELEASED`
- `OWNER_AUTHORIZATION_LEASE_ISSUED`
- `OWNER_AUTHORIZATION_LEASE_CONSUMED`
- `OWNER_AUTHORIZATION_REPLAY_REJECTED`

Each event should record only necessary metadata and must avoid copying sensitive plaintext into logs.

---

## 14. Frontend Rules

The owner UI must:

- show owner controls only after server-confirmed authority;
- treat hidden controls as UX only, never security;
- display current security state clearly;
- require explicit confirmation for sensitive actions;
- trigger reverification when the server requests it;
- never cache private owner payloads in LocalStorage;
- mask sensitive values by default;
- avoid console logging of private data, session tokens, JWTs, recovery factors, or approval payloads;
- provide clear locked/restricted/recovery-pending states.

---

## 15. Owner Information UX

### Public section

Users may see only approved public-owner identity.

### Private owner section

The owner sees categories, not a wall of raw sensitive data:

- Identity
- Private Contact
- Legal Entity
- Security & Authentication
- Recovery
- Evidence
- Audit

Sensitive fields are masked until explicitly revealed, and high-risk reveals require current strong assurance.

---

## 16. Administrative Governance

OWNER authority is distinct from:

- admin;
- super_admin legacy concept;
- partner;
- accountant;
- legal reviewer;
- moderator;
- country manager;
- developer;
- AI agent.

No non-owner role inherits OWNER merely by being the highest administrative role.

Separation of duties remains mandatory for financial, security, legal, and production operations where the platform defines independent approvals.

---

## 17. AI Boundary

AI may help summarize audit evidence, detect anomalies, or prepare owner actions, but AI cannot:

- authenticate as the owner;
- create owner authority;
- bypass reverification;
- consume an L4 authorization lease unless explicitly allowed by a separately approved tool contract;
- change owner recovery factors;
- reveal owner-vault plaintext beyond an explicitly authorized server response;
- override kill switches;
- synthesize owner approval.

Default behavior is deny.

---

## 18. Failure Handling

Required protected failure codes include:

- `ERR_OWNER_AUTHORITY_MISSING`
- `ERR_OWNER_AUTHORITY_INACTIVE`
- `ERR_OWNER_REVERIFICATION_REQUIRED`
- `ERR_OWNER_REVERIFICATION_FAILED`
- `ERR_OWNER_SECURITY_HOLD`
- `ERR_OWNER_RECOVERY_PENDING`
- `ERR_OWNER_LEASE_EXPIRED`
- `ERR_OWNER_LEASE_REPLAY`
- `ERR_OWNER_LEASE_BINDING_MISMATCH`
- `ERR_OWNER_PRIVATE_FIELD_FORBIDDEN`
- `ERR_OWNER_PUBLICATION_NOT_APPROVED`

Sensitive errors must not leak whether hidden owner records or recovery factors exist.

---

## 19. Testing Requirements

Implementation is not complete until at least these tests exist:

### Authentication

- passkey owner sign-in success;
- non-owner passkey sign-in does not grant OWNER;
- password-only session cannot execute L3/L4;
- TOTP/backup recovery behavior;
- revoked session is denied.

### Authorization

- ordinary user cannot query private owner vault;
- admin/super_admin cannot query private owner vault merely because of legacy role;
- suspended OWNER is denied;
- cross-user/cross-session replay is denied;
- changed target/action invalidates lease;
- expired lease is denied;
- consumed lease cannot be reused.

### Data privacy

- public endpoint returns only allowlisted public fields;
- private fields never appear in public profile payload;
- logs contain no secret/recovery plaintext;
- browser bundle contains no private owner data or server secret.

### Recovery

- recovery start restricts sensitive owner actions;
- successful recovery revokes old sessions;
- failed recovery does not disclose factor inventory;
- break-glass cannot grant authority to a different identity without protected evidence and approval path.

### Database

- RLS deny-by-default probes;
- FORCE RLS behavior where used;
- browser roles have no privileged function/table grants;
- concurrent lease consumption permits exactly one winner;
- audit chain remains append-only.

---

## 20. Rollout Plan

Implementation must be incremental and non-production by default:

1. contracts and tests;
2. owner-authority schema;
3. private-vault schema and server boundary;
4. public-owner profile;
5. passkey/MFA owner policy integration;
6. reverification gate;
7. authorization lease;
8. audit events;
9. owner-control UI integration;
10. recovery workflow;
11. isolated database/RLS tests;
12. browser manual owner acceptance;
13. security review;
14. staging evidence;
15. separate owner authorization for production activation.

No migration is applied remotely merely because it exists in a PR.

---

## 21. Explicit Non-Goals for First Slice

The first implementation slice will not:

- redesign all platform authentication for ordinary users;
- move every user profile into the owner vault;
- create autonomous AI owner actions;
- enable production database changes;
- expose private owner contact to users;
- add money movement;
- bypass current PR/owner gates.

---

## 22. Acceptance Definition

The owner-access feature is design-complete when:

- public/private owner information is physically and logically separated;
- OWNER authority cannot be created by frontend or legacy role manipulation;
- privileged owner access is passkey/MFA capable;
- sensitive operations require fresh reverification;
- L4 operations use exact short-lived single-use authorization leases;
- recovery does not rely on a single email account;
- browser roles cannot directly read private-vault data;
- every protected owner operation is auditable;
- all negative, replay, privilege-escalation, and RLS tests pass;
- production remains blocked until explicit deployment evidence and owner approval exist.

---

## 23. Design Decision

**Approved architecture name:** `TIGER Sovereign Owner Access (SOA)`

**Primary sign-in:** Passkey-first.

**Fallback:** TOTP + offline backup codes; email/SMS may assist recovery but do not independently grant sovereign authority.

**Data model:** Public Owner Profile + Private Owner Vault + Owner Authority Binding + Append-only Owner Audit.

**Sensitive action model:** Server-verified Step-Up/Reverification + short-lived exact authorization lease.

**Security posture:** Default deny, fail closed, least privilege, explicit evidence, immutable history, recoverable operation.
