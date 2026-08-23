# TIGER Sovereign Proof Continuum v2

**Status:** ACTIVE OWNER-APPROVED ARCHITECTURE
**Date:** 2026-08-23
**Base verified checkpoint:** `f60a99414fb92ff825ad144bd4a15dd9d4288280`
**Atomic execution core:** TIGER Sovereign Action Chamber / Proof-Bound Privileged BFF
**Scope:** privileged/sensitive execution only; normal Social, ONE FIELD, discovery and ordinary RLS-governed fast paths remain unchanged unless separately classified by server policy.

## 1. Decision

TIGER adopts **Sovereign Proof Continuum v2** as the current architecture for HIGH/CRITICAL privileged execution.

The Sovereign Action Chamber remains the atomic execution core inside the continuum. The browser may request an action and render safe confirmation data, but it must never possess a portable credential that is sufficient by itself to execute a protected mutation.

Canonical rules:

```text
PRESENTATION != AUTHORITY
ACTION_INTENT != AUTHORITY
AUTHENTICATION != PLATFORM_PERMISSION
DEVICE_SIGNAL != PLATFORM_PERMISSION
RISK_SIGNAL != PLATFORM_PERMISSION
RELEASE_PROOF != PLATFORM_PERMISSION
PERSISTENT_GRANT = PERMISSION AUTHORITY
SINGLE_USE_PERSISTENT_LEASE = EXECUTION AUTHORITY
DATABASE = FINAL ATOMIC ENFORCEMENT
AI_CAN_RAISE_SECURITY_BAR=true
AI_CAN_LOWER_AUTHORITY_BAR=false
```

The continuum extends the existing Unified Authorization Runtime Bridge. It does not create a second permission engine, a second identity system, a second grant store, or a parallel audit ledger.

## 2. Research basis and 2026 correction

This architecture follows current security direction and deliberately distinguishes final standards from emerging capabilities:

- RFC 10017 (OAuth 2.0 for Browser-Based Applications, August 2026): selective BFF is the preferred high-security browser pattern for keeping provider access/refresh credentials out of general JavaScript.
- RFC 9700 (OAuth 2.0 Security Best Current Practice): sender-constrained credentials such as DPoP/mTLS reduce replay value of stolen tokens where supported.
- FAPI 2.0 Security Profile: high-value deployments benefit from confidential-client, PKCE/PAR and sender-constrained principles.
- NIST SP 800-63-4: stronger assurance favors phishing-resistant cryptographic authentication when the provider and flow actually support it.
- WebAuthn Level 3: modern phishing-resistant authentication foundation, but browser capability alone does not prove that the selected identity provider supports WebAuthn for every privileged reverification flow.
- Clerk current reverification capability must be discovered/verified rather than assumed. TIGER must not claim Passkey/WebAuthn privileged step-up unless the selected provider flow explicitly supports it. A provider reverification identifier/freshness signal may be used only under its documented semantics and must be bound server-side to the TIGER action intent.
- Continuous Access Evaluation / Shared Signals concepts may reduce trust after events such as session revocation, credential change or risk change. Such signals can tighten or revoke trust; they cannot grant TIGER permissions.
- Device Bound Session Credentials (DBSC) are a promising 2026 device/session-theft mitigation but remain optional until support is sufficiently broad and environment-tested.
- IETF Transaction Tokens provide a useful transaction-context principle; TIGER adopts intent-bound context without creating a browser-held portable bearer transaction token.
- CSP3, Trusted Types, Fetch Metadata and subresource integrity/integrity-policy concepts provide browser defense-in-depth for the privileged confirmation island.
- SLSA provenance and signed/transparency-backed attestations are suitable release/supply-chain evidence. They are evidence inputs, never authorization by themselves.
- HTTP Message Signatures / Content-Digest may be used for service-to-service semantic integrity when TIGER later has multiple privileged workloads; they are not required for the first single-boundary implementation.

No emerging technology is allowed to weaken fail-closed behavior when absent or unsupported.

## 3. Core innovation — Proof Convergence

A protected action is executable only when all mandatory proof dimensions converge on the same canonical action at execution time.

Conceptual envelope:

```text
IDENTITY PROOF
      +
SESSION FRESHNESS / REVOCATION PROOF
      +
CONTINUOUS RISK PROOF
      +
DEVICE / SENDER PROOF [OPTIONAL, POLICY-DEFINED]
      +
ACTION INTENT PROOF
      +
REVERIFICATION PROOF [WHEN REQUIRED]
      +
PERSISTENT GRANT PROOF
      +
EXACT SCOPE PROOF
      +
POLICY / AUTHORITY VERSION PROOF
      +
RELEASE / SUPPLY-CHAIN PROOF
      +
SINGLE-USE EXECUTION LEASE
      +
ATOMIC AUDIT PROOF
              ↓
       EXECUTION ALLOWED
```

The **Sovereign Proof Envelope** is server-side canonical state/evidence. It is not a JWT, not a browser bearer token and not an alternative grant.

If any proof required by the server-owned risk policy is missing, stale, contradictory or unverifiable, execution fails closed.

## 4. Threat model

The continuum is designed to reduce damage from:

- stolen browser bearer/session tokens;
- malicious or injected same-origin JavaScript;
- XSS on the general Social/Marketplace surface;
- stale presentation snapshots;
- replayed privileged requests;
- replayed/fabricated reverification identifiers;
- confused-deputy scope substitution;
- TOCTOU between confirmation and execution;
- caller-controlled time;
- grant revocation races;
- session-revocation races;
- cross-tab/process/device replay;
- action parameter tampering;
- client risk-tier downgrade;
- release/policy drift between confirmation and execution;
- compromised or stale build/release evidence;
- accidental leakage of credentials/approval material into logs, analytics or audit metadata;
- supply-chain substitution of privileged UI/runtime assets.

The design does not claim an endpoint, browser, identity provider, operating system or supply chain can never be compromised. The objective is layered containment, short authority lifetime, exact binding, revocation responsiveness, auditability and recovery.

## 5. Scope classification

### 5.1 Normal fast path — preserved

Examples:

- Social feed presentation;
- ONE FIELD intent capture;
- ordinary discovery/search;
- public/profile presentation under existing RLS;
- ordinary low-risk user actions already enforced by RLS/current server contracts.

These flows are not forced through the privileged BFF merely for architectural purity.

### 5.2 Privileged continuum path — mandatory

At minimum:

- `GRANT_PERMISSION`;
- `DELEGATE_PERMISSION`;
- permission revocation;
- owner-only/confidential disclosure approval and release;
- financial/platform-control mutations;
- payment configuration or production-enablement controls;
- security-policy mutations;
- protected owner/admin actions;
- future actions classified `HIGH` or `CRITICAL` by authoritative server policy.

The client cannot choose or downgrade the risk tier.

## 6. Component model

### 6.1 Privileged Security Island

HIGH/CRITICAL confirmation is rendered in a minimal isolated surface separate from general Social/Marketplace script composition.

Requirements:

- no ads;
- no analytics;
- no marketplace widgets;
- no arbitrary third-party UI code;
- minimal dependencies;
- strict CSP;
- Trusted Types enforcement where supported;
- clickjacking denial through `frame-ancestors` or equivalent;
- restrictive `form-action`, referrer and navigation policy;
- Fetch Metadata/origin checks at the privileged request boundary;
- no raw credential/token/lease material in DOM, logs, URLs or analytics;
- deterministic rendering from safe server-canonical confirmation data.

The security island is presentation only. Its UI state is never execution authority.

### 6.2 Proof-Bound Privileged BFF

A narrowly scoped server/edge boundary for privileged actions only.

Responsibilities:

- verify the federated identity/session server-side;
- enforce HTTPS/origin/CSRF/request-method/content-type policy;
- create/read canonical Action Intents;
- evaluate server-owned risk tier and required proof classes;
- validate supported provider reverification evidence when required;
- consume session-revocation/risk signals where available;
- re-resolve persistent TIGER grants;
- request/consume persistent execution leases;
- verify release/policy binding;
- invoke the atomic executor;
- append structured audit evidence;
- return bounded opaque results.

It must never expose service-role credentials, provider secrets, private signing keys, persistent grants, raw audit evidence or execution-lease secrets to browser JavaScript.

### 6.3 Canonical Action Intent

The server creates the exact meaning of the requested action.

Minimum fields:

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
required_proof_classes
policy_version
authority_version
release_sha
release_proof_ref
request_nonce
correlation_id
created_at
expires_at
status
intent_digest
```

The digest is calculated over a stable canonical representation. Client-generated digests are never authority.

The browser receives only an opaque `intent_reference` and safe confirmation projection. The reference alone cannot execute anything.

### 6.4 Sovereign Proof Envelope

A server-side evaluation record assembled for one intent/execution attempt.

Representative fields:

```text
intent_digest
principal
identity_proof_ref
session_proof_ref
session_freshness
session_revocation_state
risk_decision
risk_evidence_refs
device_signal_class
sender_constraint_class
reverification_ref
reverification_freshness
reverification_bound_intent_digest
grant_id
grant_state
scope_digest
policy_version
authority_version
release_sha
release_proof_ref
lease_id
lease_expiry
proof_decision
proof_reason_codes
evaluated_at
```

Only non-secret references/claims needed for authorization and audit are retained. The envelope itself is not reusable execution authority.

### 6.5 Federated Identity and Reverification Adapter

TIGER keeps credential lifecycle with the approved external provider.

Rules:

- discover provider capabilities rather than assuming them;
- use the strongest **verified provider-supported** reverification appropriate to the risk policy;
- prefer phishing-resistant mechanisms only when the selected provider/action flow actually supports them;
- bind accepted reverification evidence server-side to `intent_digest`, principal, challenge/context and freshness window;
- treat provider authentication/reverification as identity evidence, never TIGER permission;
- reject unknown, stale, replayed or mismatched reverification references;
- never create a TIGER password, first-party recovery secret or parallel credential database.

Provider replacement must not change TIGER capability IDs, grant semantics or audit authority.

### 6.6 Continuous Trust / Revocation Adapter

The continuum may consume authoritative session/risk events or polling results from provider/security systems.

Examples:

- session revoked;
- account disabled;
- credential changed;
- provider signals elevated risk;
- impossible session continuity detected;
- device/session binding lost.

Rules:

- these signals may revoke trust, shorten proof lifetime, force reverification, increase risk tier or deny execution;
- they may never grant capabilities, expand scope or lower mandatory authorization requirements;
- absence of an optional signal source must not be misrepresented as positive trust.

### 6.7 Risk Ratchet

Risk evaluation is server-owned and monotonic with respect to baseline authorization.

Canonical invariant:

```text
AI_OR_RISK_ENGINE_CAN_RAISE_SECURITY_BAR=true
AI_OR_RISK_ENGINE_CAN_REQUIRE_REVERIFICATION=true
AI_OR_RISK_ENGINE_CAN_DENY=true
AI_OR_RISK_ENGINE_CAN_GRANT_PERMISSION=false
AI_OR_RISK_ENGINE_CAN_EXPAND_SCOPE=false
AI_OR_RISK_ENGINE_CAN_LOWER_BASELINE_REQUIREMENTS=false
```

Any AI/behavioral model contributes bounded risk signals only. Deterministic policy remains the authority for what proofs are required.

### 6.8 Persistent Grant Resolver

Reuse the existing authoritative grant model from the Unified Authorization Runtime Bridge.

Immediately before execution the continuum re-resolves:

- principal;
- capability/action;
- resource/sector/entity/geo scope;
- policy version;
- authority version;
- database time;
- revocation/expiry;
- delegation ceiling where applicable.

A browser presentation snapshot can never substitute for this check.

### 6.9 Non-Portable Intent-Bound Execution Lease

Reuse/extend the existing persistent single-use lease model.

Properties:

- created by trusted server/database authority;
- database-time bounded;
- exact principal/action/scope binding;
- bound to `intent_digest`;
- bound to current grant/policy/authority version;
- optionally bound to required reverification/proof references;
- TTL no greater than the existing privileged maximum, and policy may require shorter;
- single-use;
- revoked/invalid when required grant/proof/session state becomes invalid according to policy;
- no reusable lease secret is returned to browser JavaScript.

The browser may carry only an opaque operation/reference ID with no standalone execution power.

### 6.10 Atomic Execution Core — Sovereign Action Chamber

Final protected mutation order:

```text
LOCK / RE-RESOLVE GRANT
LOCK / VERIFY ACTION INTENT
VERIFY SESSION / REVOCATION STATE
VERIFY REQUIRED REVERIFICATION
VERIFY RISK POLICY
VERIFY SCOPE / POLICY / AUTHORITY VERSION
VERIFY RELEASE PROOF POLICY
VERIFY SINGLE-USE LEASE
EXECUTE PROTECTED MUTATION
CONSUME LEASE
FINALIZE INTENT
APPEND REQUIRED AUDIT EVENT
COMMIT
```

The protected mutation and authority consumption must be in one transaction whenever the database boundary permits it. If an external provider operation prevents a single transaction, use an explicit state machine with idempotency, compensating/fail-closed states and no false success claim.

### 6.11 Existing Audit Chain

Reuse the current append-only audit chain. Do not create a second ledger.

Record bounded non-secret facts such as:

- correlation/intent IDs and digest;
- principal/action/resource;
- risk tier and reason codes;
- required/satisfied proof classes;
- provider reverification class/reference hash where safe;
- grant/lease outcome references;
- scope digest;
- policy/authority versions;
- release SHA/proof reference;
- session-revocation decision;
- server timestamps;
- final execution decision.

Reject recursively:

- passwords;
- OTP values;
- bearer/access/refresh tokens;
- authorization headers;
- provider session secrets;
- WebAuthn private material;
- raw approval/recovery secrets;
- reusable execution lease secrets;
- raw user prompts/content not required for the authorization audit.

### 6.12 Release and Supply-Chain Proof

`release_sha` alone is evidence, not permission.

The privileged boundary should support a release-proof verifier that can consume approved provenance/attestation metadata such as:

- exact source SHA;
- build provenance;
- artifact digest;
- builder/workflow identity;
- signed/transparency-backed attestation reference where adopted;
- environment/policy compatibility.

SLSA-style provenance and Sigstore-style attestations are suitable evidence mechanisms. No supply-chain attestation can create a TIGER capability.

Policy may reject a HIGH/CRITICAL action when the current executing release cannot prove the minimum required release evidence or when confirmation/execution semantics crossed a forbidden version boundary.

### 6.13 Sender-Constrained and Device-Bound Enhancements

Where supported and independently verified:

- prefer DPoP/mTLS/private-key client authentication for server-to-server OAuth over portable bearer-only semantics;
- expose DBSC/device-bound session evidence as an optional proof class;
- use HTTP Message Signatures + Content-Digest for multi-workload privileged service calls if/when that topology exists.

These mechanisms improve replay/device/workload binding. None replaces persistent TIGER grants or execution leases.

## 7. Session and token isolation

### 7.1 General fast path

The existing Clerk→Supabase browser runtime may remain for ordinary RLS-governed operations.

### 7.2 Privileged continuum

For HIGH/CRITICAL paths, the target state is that provider credentials used for privileged backend calls are unavailable to general application JavaScript.

A narrow server-managed continuation/session mechanism may be used after verified federated identity. If cookie-based it must be:

- `HttpOnly`;
- `Secure`;
- narrowly scoped;
- short-lived;
- SameSite/CSRF protected;
- origin-bound by request policy;
- incapable of bypassing persistent TIGER grant/lease checks.

Exact provider mechanics remain adapter-specific and require environment evidence before Production claims.

## 8. Risk tiers and proof policy

Initial model:

```text
LOW       -> existing RLS/server contract; continuum optional
MEDIUM    -> privileged BFF + persistent grant + short lease
HIGH      -> MEDIUM + fresh provider-supported reverification + security island
CRITICAL  -> HIGH + owner/policy approval when required + stricter release/risk/session proof
```

Server policy maps action → baseline tier → mandatory proof classes.

Risk signals may only retain or raise the effective tier. They cannot reduce it below the action baseline.

## 9. Browser security policy

The privileged security island targets:

- strict allowlist CSP;
- Trusted Types where supported;
- no arbitrary inline script;
- no ads/analytics/marketplace dependencies;
- `frame-ancestors 'none'` or equivalently strict policy unless a reviewed embedding flow exists;
- restrictive `form-action` and navigation destinations;
- strict referrer policy;
- Fetch Metadata and exact-origin validation at server boundary;
- SRI/integrity policy where feasible for static privileged assets;
- deterministic server-safe confirmation rendering;
- no sensitive data in URL query/fragment;
- no token/credential logging;
- fail-closed response when integrity/session/reverification state is uncertain.

## 10. Confirmation semantics

The user must approve the exact server-canonical action meaning.

Example:

```text
Grant: VIEW_FINANCIAL_EARNINGS
To: partner:alpha
Sector: food
Entity: entity:alpha
Geo policy: JO
Expires: <server-derived expiry>
```

The confirmation is bound to the same `intent_digest` that reaches execution. Any mutation of principal, target, action, scope, policy, expiry semantics or other protected fields invalidates confirmation/proof convergence.

The UI never displays hashes/tokens/leases unless a diagnostic owner-only mode is separately authorized; ordinary users see plain human meaning.

## 11. Failure behavior

Fail closed on:

- missing/expired/finalized action intent;
- intent digest mismatch;
- unknown/stale/replayed reverification evidence;
- session revoked or untrusted according to mandatory policy;
- missing/revoked/expired grant;
- principal/action/scope mismatch;
- policy/authority version mismatch;
- release proof below required policy;
- risk tier/proof class not satisfied;
- reused/expired/revoked lease;
- caller-controlled security time;
- failed mandatory audit append;
- unsupported privileged runtime configuration;
- uncertain identity/session binding;
- unknown critical reason code.

Return stable opaque reason codes to the browser. Sensitive diagnostic detail remains server-side.

## 12. Privacy, retention and HANDOFF boundary

The continuum stores only authorization/execution evidence necessary for protected operations, security and audit policy.

- Action Intents are short-lived.
- Rejected/expired intents are compacted/deleted according to retention policy.
- Device/risk evidence is minimized to bounded classifications/references rather than unnecessary behavioral raw data.
- The continuum does not become a surveillance profile.
- It must never observe or control external buyer/seller negotiation, payment, delivery or outcome after CONTACT/HANDOFF.

`CONTACT -> HANDOFF -> TIGER COMMERCIAL ROLE STOPS` remains unchanged.

## 13. Compatibility with existing architecture

Preserved without replacement:

- Federated Identity Sovereignty;
- ONE FIELD / Social Home fast path;
- Unified Authorization Runtime Bridge;
- persistent capability grants;
- single-use persistent leases;
- Owner-Sealed Disclosure;
- database-authoritative time;
- append-only audit chain;
- Self-Evolving Cognitive Continuum safety/governance boundary;
- CONTACT/HANDOFF commercial terminal boundary;
- no buyer/seller transaction-value commission.

The v1 Sovereign Action Chamber is retained as the atomic execution core; v2 wraps it with proof convergence rather than forking it.

## 14. Explicit non-goals / non-claims

This phase will not:

- migrate all TIGER traffic behind a full BFF;
- create first-party TIGER passwords or passkey credential storage;
- claim Passkey/WebAuthn privileged reverification when the selected provider flow does not support it;
- create a second permission engine;
- create a second grant store;
- create a second audit ledger;
- issue browser-held transaction JWTs;
- make DBSC mandatory;
- treat AI/risk scoring as authorization;
- claim DPoP/mTLS/HTTP Message Signatures support without real provider/workload support;
- claim SLSA/Sigstore release proof until build/release integration is implemented and evidenced;
- claim Production protection before deployed environment verification;
- monitor external deals after CONTACT/HANDOFF.

## 15. Implementation sequence

Implementation proceeds as isolated RED → GREEN → exact-SHA slices:

1. Sovereign Action Intent canonical contract and digest.
2. Server-owned risk tier and mandatory proof-class policy.
3. Privileged BFF request boundary: method/origin/CSRF/session/content-type rules.
4. Persistent Action Intent storage with database time and state transitions.
5. Federated reverification capability adapter with explicit provider-capability discovery and intent binding.
6. Continuous session/revocation/risk adapter + monotonic Risk Ratchet.
7. Persistent grant re-resolution bridge into the proof evaluator.
8. Intent-bound non-portable execution lease extension.
9. Minimal Privileged Security Island + CSP/Trusted Types/integrity contract.
10. Release/supply-chain proof contract and release-policy binding.
11. Atomic protected-action executor and audit finalization.
12. Optional sender/device/workload proof hooks: DPoP/mTLS/DBSC/message-signature interfaces with fail-safe unsupported states.
13. Full Proof Envelope integration, replay/race/TOCTOU/secret-leak threat-model regression and exact-SHA evidence.

No optional technology is required to become mandatory until its provider/browser/runtime support is independently evidenced.

## 16. Acceptance invariants

```text
SOVEREIGN_PROOF_CONTINUUM_V2=true
SOVEREIGN_ACTION_CHAMBER_IS_ATOMIC_CORE=true
BROWSER_PORTABLE_EXECUTION_AUTHORITY=false
BROWSER_SERVICE_ROLE_SECRET=false
BROWSER_PERSISTENT_GRANT_AUTHORITY=false
BROWSER_EXECUTION_LEASE_SECRET=false
ACTION_INTENT_IS_AUTHORITY=false
PROOF_ENVELOPE_IS_PORTABLE_AUTHORITY=false
AUTHENTICATION_ALONE_IS_AUTHORIZATION=false
DEVICE_SIGNAL_ALONE_IS_AUTHORIZATION=false
RISK_SIGNAL_ALONE_IS_AUTHORIZATION=false
RELEASE_PROOF_ALONE_IS_AUTHORIZATION=false
PERSISTENT_GRANT_RECHECK_BEFORE_EXECUTION=true
EXECUTION_LEASE_SINGLE_USE=true
EXECUTION_LEASE_INTENT_BOUND=true
DATABASE_TIME_AUTHORITATIVE=true
PRIVILEGED_MUTATION_ATOMIC=true
PRIVILEGED_AUDIT_SECRET_SAFE=true
PRIVILEGED_RISK_CLASS_SERVER_OWNED=true
RISK_RATCHET_MONOTONIC=true
AI_CAN_RAISE_SECURITY_BAR=true
AI_CAN_LOWER_AUTHORITY_BAR=false
PROVIDER_CAPABILITY_MUST_BE_VERIFIED=true
UNSUPPORTED_OPTIONAL_PROOF_CANNOT_BE_FAKED=true
FIRST_PARTY_PASSWORD_SYSTEM=false
NORMAL_FAST_PATH_PRESERVED=true
CONTACT_HANDOFF_BOUNDARY_PRESERVED=true
```

## 17. Naming and supersession

`TIGER Sovereign Proof Continuum`, `Sovereign Action Chamber`, `Proof Envelope` and `Proof-Bound Privileged BFF` are mutable internal names.

The durable contract is:

**one persistent authorization authority + convergent non-portable proof + intent-bound single-use execution + atomic enforcement + monotonic security ratchet.**

This v2 specification supersedes the earlier v1 design language where they differ. The v1 Action Chamber implementation concept survives only as the atomic execution core inside v2.