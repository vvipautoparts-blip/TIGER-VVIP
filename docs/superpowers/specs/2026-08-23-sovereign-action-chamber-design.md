# TIGER Sovereign Action Chamber — Proof-Bound Privileged BFF

**Status:** OWNER-APPROVED DESIGN — WRITTEN SPEC FOR REVIEW  
**Date:** 2026-08-23  
**Base checkpoint:** `f60a99414fb92ff825ad144bd4a15dd9d4288280`  
**Scope:** privileged/sensitive execution only; normal Social, ONE FIELD, discovery and ordinary RLS-governed reads remain on the existing fast path.

## 1. Decision

TIGER will add a **Proof-Bound Privileged Backend-for-Frontend (BFF)** for high-risk actions only.

The browser may request a privileged action and render a confirmation surface, but it must never possess a portable credential that is sufficient by itself to execute that action.

Canonical rule:

```text
PRESENTATION != AUTHORITY
ACTION_INTENT != AUTHORITY
AUTHENTICATION != PLATFORM_PERMISSION
PERSISTENT_GRANT = PERMISSION AUTHORITY
SINGLE_USE_PERSISTENT_LEASE = EXECUTION AUTHORITY
DATABASE = FINAL ATOMIC ENFORCEMENT
```

This extends the existing Unified Authorization Runtime Bridge. It does not create a second permission engine, a second identity system, or a parallel audit ledger.

## 2. Research basis

The design follows current 2025–2026 security direction:

- RFC 10017 (OAuth 2.0 for Browser-Based Applications, August 2026): BFF is the preferred high-security browser pattern because access/refresh tokens can be kept out of JavaScript.
- RFC 9700 (OAuth 2.0 Security Best Current Practice): sender-constrained credentials such as DPoP/mTLS reduce replay value of stolen tokens.
- FAPI 2.0 Security Profile: confidential clients, PKCE, PAR and sender-constrained access for high-value systems.
- NIST SP 800-63-4: phishing-resistant cryptographic authentication for stronger assurance levels.
- WebAuthn Level 3 (2026 Candidate Recommendation): modern passkey/WebAuthn foundation for phishing-resistant step-up.
- Device Bound Session Credentials (DBSC): promising 2026 session-theft mitigation, but not yet sufficiently universal to be mandatory.
- IETF Transaction Tokens work: useful principle of transaction-bound authorization context; TIGER adopts the binding principle without creating a portable bearer transaction token.
- Trusted Types + strict CSP: defense-in-depth against DOM-XSS in privileged confirmation surfaces.

These sources guide the architecture; TIGER remains fail-closed when a provider/browser lacks an optional enhancement.

## 3. Threat model

The chamber is designed to reduce damage from:

- stolen browser bearer/session tokens;
- malicious or injected same-origin JavaScript;
- stale UI snapshots;
- replayed privileged requests;
- confused-deputy scope substitution;
- TOCTOU between confirmation and execution;
- caller-controlled time;
- grant revocation races;
- cross-tab/process replay;
- privileged action parameter tampering;
- accidental leakage of approval/authorization secrets into logs or analytics;
- deployment-version mismatch between what was approved and what executes.

It does not claim to make a compromised endpoint or identity provider harmless. It is a defense-in-depth execution boundary.

## 4. Scope classification

### 4.1 Normal fast path — unchanged

Examples:

- Social feed presentation;
- ONE FIELD intent capture;
- ordinary discovery/search;
- public/profile presentation under existing RLS;
- ordinary low-risk user actions already safely enforced by RLS and current server contracts.

These do not need to be forced through the privileged chamber merely for architectural purity.

### 4.2 Chamber path — mandatory

At minimum:

- `GRANT_PERMISSION`;
- `DELEGATE_PERMISSION`;
- permission revocation;
- owner-only/confidential disclosure approval and release;
- financial/platform-control mutations;
- payment configuration or production-enablement controls;
- security-policy mutations;
- protected owner/admin actions;
- future actions explicitly classified `HIGH` or `CRITICAL` by policy.

Risk classification is server policy. The browser cannot downgrade a risk tier.

## 5. Components

### 5.1 Privileged BFF endpoint

A narrowly scoped server/edge execution boundary used only for privileged flows.

Responsibilities:

- verify federated identity/session server-side;
- enforce CSRF/origin/request-method policy;
- create canonical action intents;
- decide whether fresh step-up is required;
- resolve persistent TIGER grants;
- request/consume persistent execution leases;
- execute the exact approved action atomically;
- append structured audit evidence;
- return a minimal result.

It must never expose service-role credentials, provider secrets, private keys, persistent grants, raw audit evidence, or execution-lease secrets to browser JavaScript.

### 5.2 Action Intent Record

A server-side record representing exactly what the user is asking to do.

Minimum canonical fields:

```text
intent_id
principal
identity_issuer
identity_subject
action
resource_type
resource_id
canonical_scope
risk_tier
policy_version
authority_version
release_sha
request_nonce
correlation_id
created_at
expires_at
status
intent_digest
```

The digest is computed server-side over a canonical representation.

The browser receives only an opaque `intent_reference` plus safe human-readable confirmation data. The reference is not execution authority.

### 5.3 Proof-Bound Confirmation Surface

A minimal privileged confirmation UI isolated from the normal Social/Marketplace surface.

For `HIGH/CRITICAL` actions it must display the exact server-canonical meaning of the action, for example:

```text
Grant: VIEW_FINANCIAL_EARNINGS
To: partner:alpha
Sector: food
Entity: entity:alpha
Geo policy: JO
Expires: <server-derived expiry>
```

The user must never confirm one set of fields while the server executes a different set.

The confirmation response is bound to `intent_digest` and cannot authorize a mutated intent.

The surface must not load advertising, marketplace, analytics, arbitrary third-party widgets, or unrelated application scripts.

### 5.4 Federated Step-Up Adapter

TIGER continues to delegate credential lifecycle to the approved external identity provider.

For policy-required step-up:

- prefer provider-managed passkey/WebAuthn or another phishing-resistant method;
- require fresh authentication evidence appropriate to the risk tier;
- bind the successful step-up to the exact `intent_digest`, principal and challenge;
- never store a TIGER password or first-party recovery secret;
- never treat authentication success as sufficient platform authorization.

The step-up adapter must support provider replacement without changing TIGER capability IDs or grant semantics.

### 5.5 Persistent Grant Resolver

Reuse the existing authoritative grant model.

The chamber must re-resolve the current persistent grant immediately before execution. A presentation snapshot is never enough.

Checks include:

- principal;
- capability/action;
- resource scope;
- sector/entity/geo scope;
- policy version;
- current server/database time;
- revocation/expiry;
- delegation ceiling where applicable.

### 5.6 Non-Portable Execution Lease

Reuse/extend the existing persistent single-use lease model.

Properties:

- created server-side;
- database-time bounded;
- exact action/scope binding;
- bound to `intent_digest`;
- bound to principal;
- TTL no greater than the existing privileged maximum and policy may require less;
- single-use;
- consumed atomically with the protected mutation when technically possible;
- invalid after grant revocation/expiry;
- no reusable lease secret is returned to browser JavaScript.

The browser may carry only an opaque operation/reference ID that has no standalone execution power.

### 5.7 Atomic Executor

The final protected mutation must execute only after all required gates pass.

Preferred transaction shape:

```text
LOCK / RE-RESOLVE GRANT
VERIFY ACTION INTENT
VERIFY STEP-UP IF REQUIRED
VERIFY LEASE
VERIFY RELEASE/POLICY BINDING
EXECUTE PROTECTED MUTATION
CONSUME LEASE
APPEND AUDIT EVENT
COMMIT
```

If any step fails, the transaction fails closed. No half-consumed authorization and no half-applied protected mutation may be reported as success.

### 5.8 Existing Audit Chain

Reuse the current append-only authorization/audit chain.

Record structured non-secret facts such as:

- correlation ID;
- intent ID/digest;
- principal;
- action;
- target/resource;
- policy version;
- release SHA;
- risk tier;
- decision/reason code;
- step-up class (not credential material);
- grant/lease outcome identifiers safe for audit;
- server timestamps.

Never log passwords, OTPs, bearer tokens, provider tokens, WebAuthn private material, raw approval secrets, authorization headers, or reusable lease secrets.

## 6. Session and token isolation

### 6.1 Existing general browser runtime

The existing Clerk→Supabase browser path may remain for ordinary operations already protected by RLS and current contracts.

### 6.2 Privileged chamber

For chamber operations, the target end-state is that provider access/refresh credentials required for privileged backend calls are not exposed to general application JavaScript.

The privileged BFF may use a narrow server-managed session/continuation mechanism after server-side federated verification. Such a mechanism:

- is not a TIGER password or recovery credential;
- must be `HttpOnly`, `Secure`, tightly scoped and short-lived if cookie-based;
- must use strong SameSite/CSRF/origin protections;
- cannot itself bypass TIGER persistent capability/grant checks;
- is rotated/expired according to risk policy.

Exact provider mechanics remain adapter-specific and must be proven against the selected provider before Production activation.

## 7. Sender-constrained and device-bound enhancements

### 7.1 DPoP / mTLS / private-key client auth

Where TIGER's server-to-server OAuth/provider integration supports it, prefer sender-constrained credentials over bearer-only semantics.

This is an enhancement to transport/token replay resistance, not a substitute for TIGER authorization.

### 7.2 DBSC

Prepare an optional device-bound session signal interface.

Rules:

- DBSC is never mandatory for basic platform compatibility until browser/platform support is sufficiently broad and proven;
- presence may raise confidence or reduce re-auth frequency under policy;
- absence must not silently grant equivalent high-assurance status;
- DBSC can never replace capability/grant/lease checks.

## 8. Browser hardening for the confirmation surface

The privileged surface should target:

- strict CSP with no unnecessary third-party origins;
- Trusted Types enforcement where supported;
- no inline arbitrary script execution;
- no analytics/ads/marketplace code;
- clickjacking protection (`frame-ancestors` / equivalent);
- strict referrer policy;
- minimal DOM and dependency count;
- no credential/token logging;
- deterministic action rendering from server-safe data;
- fail-closed behavior when integrity/session/step-up state is uncertain.

## 9. Release binding

Privileged intents and execution audit must carry the active release/source identity.

`release_sha` is evidence, not authorization by itself.

A policy may reject execution when the confirmation was produced under a release/policy version that no longer matches the authoritative execution environment.

This prevents silent execution under materially different privileged semantics after a deployment change.

## 10. Risk tiers

Initial policy model:

```text
LOW       -> existing RLS/server contract; chamber optional
MEDIUM    -> chamber required; persistent grant + short lease
HIGH      -> chamber + fresh federated step-up + short single-use lease
CRITICAL  -> HIGH controls + owner/policy-specific approval + stricter confirmation/isolation
```

The server owns risk classification. Client-provided risk labels are ignored.

## 11. Failure behavior

Fail closed on:

- missing/expired action intent;
- intent digest mismatch;
- stale/missing step-up;
- missing/revoked/expired grant;
- scope mismatch;
- policy/release mismatch when policy requires exact binding;
- reused/expired lease;
- failed atomic audit append where audit is mandatory;
- unsupported privileged runtime configuration;
- uncertain identity/session binding.

Return stable opaque reason codes to the browser. Keep sensitive diagnostic detail server-side.

## 12. Privacy and minimization

The chamber stores only data needed to authorize, execute and audit protected operations.

Action intents receive a short retention lifecycle. Rejected/expired intents should be compacted or deleted according to audit/legal policy without retaining unnecessary user content.

The chamber must not become a post-HANDOFF deal-observation channel. It does not change TIGER's discovery/contact commercial boundary.

## 13. Compatibility with the existing architecture

This design preserves:

- Federated Identity Sovereignty;
- ONE FIELD / Social Home fast path;
- Unified Authorization Runtime Bridge;
- persistent capability grants;
- single-use persistent leases;
- Owner-Sealed Disclosure;
- DB authoritative time;
- append-only audit chain;
- CONTACT -> HANDOFF terminal commercial boundary;
- no buyer/seller transaction-value commission.

It adds an execution chamber around high-risk actions only.

## 14. Explicit non-goals

This phase will not:

- migrate all TIGER traffic behind a full BFF;
- create a first-party password/passkey credential store;
- replace Clerk/federated identity with TIGER authentication;
- create a second permission engine;
- create a second audit ledger;
- create browser-held transaction JWTs;
- make DBSC mandatory;
- claim DPoP/mTLS support where the selected provider does not support it;
- claim Production protection before real environment deployment/evidence;
- monitor or control external deals after CONTACT/HANDOFF.

## 15. Implementation sequence

Implementation should proceed as isolated TDD slices:

1. Action Intent canonical contract and digest.
2. Privileged BFF request boundary and CSRF/origin/session contract.
3. Server-side persistent grant re-resolution adapter.
4. Intent-bound execution lease extension.
5. Step-up policy adapter and phishing-resistant capability contract.
6. Minimal secure confirmation surface contract.
7. Atomic protected-action executor.
8. Structured audit integration and secret rejection.
9. Release/policy binding and replay/race tests.
10. Optional DPoP/DBSC capability hooks (non-mandatory until provider/browser evidence exists).
11. Full integration, threat-model regression and exact-SHA evidence.

Every implementation slice follows RED -> GREEN -> exact-SHA gates.

## 16. Acceptance invariants

```text
BROWSER_PORTABLE_EXECUTION_AUTHORITY=false
BROWSER_SERVICE_ROLE_SECRET=false
BROWSER_PERSISTENT_GRANT_AUTHORITY=false
BROWSER_EXECUTION_LEASE_SECRET=false
ACTION_INTENT_IS_AUTHORITY=false
AUTHENTICATION_ALONE_IS_AUTHORIZATION=false
PERSISTENT_GRANT_RECHECK_BEFORE_EXECUTION=true
EXECUTION_LEASE_SINGLE_USE=true
EXECUTION_LEASE_INTENT_BOUND=true
DATABASE_TIME_AUTHORITATIVE=true
PRIVILEGED_MUTATION_ATOMIC=true
PRIVILEGED_AUDIT_SECRET_SAFE=true
PRIVILEGED_RISK_CLASS_SERVER_OWNED=true
FIRST_PARTY_PASSWORD_SYSTEM=false
NORMAL_FAST_PATH_PRESERVED=true
CONTACT_HANDOFF_BOUNDARY_PRESERVED=true
```

## 17. Naming

`TIGER Sovereign Action Chamber` and `Proof-Bound Privileged BFF` are mutable internal names.

The durable authority is the execution contract: **non-portable, intent-bound, server-enforced privileged authority**.
