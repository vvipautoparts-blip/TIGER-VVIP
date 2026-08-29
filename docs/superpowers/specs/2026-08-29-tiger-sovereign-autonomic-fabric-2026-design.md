# TIGER SOVEREIGN AUTONOMIC FABRIC 2026 — DESIGN

**Short name:** `T-SAF 2026`  
**Status:** `OWNER_APPROVED_DESIGN / SPEC_REVIEW_REQUIRED_BEFORE_IMPLEMENTATION`  
**Owner decision:** 2026-08-29  
**Scope:** platform-wide operational architecture, software-supply-chain trust, provider independence, cost containment, runtime delivery, recovery, owner assurance, bounded autonomy, and evidence-driven readiness.  
**Sovereign dependency:** `TIGER SOVEREIGN GENOME FABRIC 2026 (TIGER-SGF)` remains the binding sovereign-market constitution. T-SAF layers operational and delivery architecture on top of SGF; it does not replace SGF market/genome/passport semantics.

## 1. Decision

Adopt `TIGER SOVEREIGN AUTONOMIC FABRIC 2026 (T-SAF 2026)` as the target operational fabric for VVIP TIGER.

T-SAF is designed so the platform is not defined by, or existentially dependent on, a single source host, CI vendor, cloud provider, edge network, payment provider, region, country, currency, or AI service.

The platform's durable identity is the combination of:

`OWNER_ROOT + CURRENT OWNER AUTHORITY + VERIFIED SOURCE + SIGNED POLICY + EXACT RELEASE + EVIDENCE + AUDITABLE EXECUTION`

External providers are replaceable adapters or execution surfaces.

## 2. Constitutional invariants

T-SAF inherits all current SGF invariants and adds these operational rules:

1. `NO DEFAULT COUNTRY / NO DEFAULT CURRENCY / NO DEFAULT PAYMENT PROVIDER`.
2. `NO UNSIGNED OR UNATTESTED PRODUCTION RELEASE` as the target production release rule.
3. `NO STANDING PRIVILEGED DEPLOYMENT CREDENTIAL` as the target privileged-access model.
4. `NO UNBOUNDED METERED SPENDING`.
5. `NO READINESS CLAIM WITHOUT MATCHING EVIDENCE`.
6. `NO SINGLE-PROVIDER SURVIVAL DEPENDENCY` for source recovery and release evidence.
7. `NO AI ROOT AUTHORITY`.
8. `NO INFRASTRUCTURE LOCATION -> SOVEREIGN MARKET INFERENCE`.
9. `FAIL CLOSED` when required authority, policy, evidence, signature, release identity, or market capability state is absent, invalid, expired, conflicting, or revoked.
10. Existing marketplace transaction boundary remains unchanged: TIGER does not become buyer/seller or provider/beneficiary payment intermediary.

## 3. Why this approach

Three architectural approaches were considered:

### A. GitHub-only platform

Advantages: simplest, low current cost, minimal migration.

Rejected as the final architecture because source, CI, preview, release evidence, and hosting become too concentrated in one provider. GitHub remains an important control-plane component, but not the definition of TIGER itself.

### B. Mandatory active-active multi-cloud everywhere

Advantages: maximal provider redundancy on paper.

Rejected as the default because it creates cost, synchronization, security, operational, and observability complexity before measured scale or legal need justifies it.

### C. T-SAF — modular sovereign fabric

Selected. It keeps GitHub as the primary source/governance plane, adds signed release identity and provider-neutral interfaces, separates delivery/runtime from source governance, preserves a recovery mirror/evidence archive, and introduces hard cost and authority boundaries. Redundancy is activated where evidence justifies it rather than duplicated everywhere by default.

## 4. Relationship to TIGER-SGF

T-SAF must not create a second competing country-sovereignty model.

The existing SGF primitives remain canonical for sovereign activation:

- `OWNER_ROOT`;
- zero-default constitution;
- `Market Genome`;
- `Sovereign Compiler`;
- `Market Activation Passport`;
- `Genome Execution Seal`;
- capability-specific activation;
- sovereign revocation;
- explicit presentment/settlement/reporting currency identity;
- explicit payment profiles;
- crypto inventory and agility.

The earlier conceptual term `Country Activation Capsule` is therefore normalized into SGF's canonical `Market Genome + Market Activation Passport` model. T-SAF consumes those artifacts; it does not invent a parallel activation authority.

## 5. Fabric components

### 5.1 Owner Genesis / Authority Cell

Purpose: preserve one global logical owner root and the current latest-only owner constitution.

Responsibilities:

- resolve current owner authority before every sensitive operation;
- bind sensitive actions to explicit owner intent and exact target scope;
- prefer phishing-resistant owner authentication;
- issue or consume short-lived purpose-bound owner execution authority;
- never infer owner jurisdiction from hosting, locale, IP, currency, or provider geography.

This cell is logical authority, not a permanently privileged interactive session.

### 5.2 Source & Governance Cell

Initial primary provider: GitHub.

Responsibilities:

- canonical source repository;
- pull requests, reviews, issues, branch governance;
- exact source SHA identity;
- CI/security gates where appropriate;
- current owner authority and machine-readable contracts.

Constraint: GitHub is a primary control-plane provider, not the sole survival copy of source/release evidence.

### 5.3 Verified Build Cell

Purpose: convert source into a release object whose provenance is verifiable.

Target release chain:

`SOURCE_SHA -> TEST EVIDENCE -> SECURITY EVIDENCE -> SBOM -> ARTIFACT_DIGEST -> PROVENANCE -> SIGNATURE/ATTESTATION -> VERIFIED_RELEASE_CAPSULE`

A production target must consume an exact verified release identity rather than an implicit `latest` branch state.

The implementation may use GitHub Artifact Attestations and/or Sigstore-compatible signing where the chosen hosting/account model supports them. The design must not require a long-lived custom signing private key in CI.

### 5.4 Edge Delivery Cell

Purpose: separate global delivery/runtime from source hosting.

Initial target adapter: Cloudflare Workers + Static Assets, subject to a separate implementation plan, provider-account readiness, security review, and exact deployment evidence.

Provider-neutral interface name: `EdgeRuntimeAdapter`.

Expected responsibilities:

- static asset delivery;
- controlled edge/API execution where justified;
- custom-domain TLS;
- preview environments;
- health and rollback hooks;
- no authority to activate a sovereign market merely because traffic is served from a region.

GitHub Pages remains suitable as a public preview/evidence/emergency static mirror where appropriate. It is not the sole production authority.

T-SAF does not introduce a framework or bundler by itself. The repository remains static/page-based unless a separately approved architecture changes that boundary.

### 5.5 Sovereign Runtime Cell

Purpose: execute only capabilities authorized by SGF.

Inputs include:

- exact verified release identity;
- valid Market Genome;
- applicable Market Activation Passport;
- runtime/cell policy;
- payment profile where required;
- security/operations readiness;
- revocation state.

Runtime must fail closed when required sovereign evidence is missing or invalid.

### 5.6 AUTONOMIC FINOPS SHIELD

Purpose: prevent accidental or silent metered-cost growth.

Every external metered service is classified by policy, for example:

- `FREE_ALLOWED`;
- `FIXED_COST_OWNER_APPROVED`;
- `VARIABLE_COST_CAPPED`;
- `BLOCKED`.

Initial development target policy:

- GitHub plan: free/current approved level;
- standard public GitHub Actions: allowed only within the provider's non-billable/current approved model;
- paid Actions overage: blocked unless explicitly owner-approved;
- Codespaces: blocked/disabled unless explicitly justified;
- paid AI/Copilot overage: blocked unless explicitly owner-approved;
- edge/runtime: free-tier or explicit hard cap until production evidence justifies a paid allowance.

A provider dashboard budget is an enforcement aid, not the only source of cost truth. T-SAF targets machine-readable internal cost policy plus provider-side budgets/stop controls where supported.

No automated system may create an unbounded financial commitment.

### 5.7 Zero-Standing-Privilege Security Cell

Purpose: minimize durable privileged credentials.

Target pattern:

`VERIFIED WORKLOAD IDENTITY -> SHORT-LIVED CREDENTIAL -> ONE PURPOSE -> EXPIRE`

Controls:

- OIDC/workload identity where supported;
- least privilege;
- short credential TTL;
- audience/resource binding;
- no provider secret in browser code;
- no shared permanent deployment key as the preferred design;
- immutable/auditable sensitive-operation evidence;
- passkey/security-key class authentication for sensitive owner operations where supported.

The existing AWS OIDC proof pattern is a valid architectural precedent.

### 5.8 Recovery & Evidence Cell

Purpose: make source/release recovery independent from a single provider outage.

Target three-part recovery model:

1. primary source/governance repository;
2. independent read-only or controlled recovery Git mirror;
3. immutable or retention-protected release-evidence archive.

The archive should preserve, per verified release where applicable:

- source snapshot/reference;
- exact release manifest;
- SBOM;
- artifact digest;
- signature/attestation/provenance;
- infrastructure/configuration digests;
- database schema/migration identity required for recovery;
- verification summary.

A GitLab mirror is one acceptable initial DR adapter, but T-SAF names the interface `SourceRecoveryMirror`; the provider can change.

### 5.9 TIGER Pulse — Owner Assurance Plane

`TIGER Pulse` in this architecture is an owner operational-health plane and must not be confused with the existing paid-visibility product `TIGER PULSE RING`.

To avoid naming collision in implementation, the operational plane's canonical machine name will be:

`TIGER_OWNER_ASSURANCE_PULSE`.

It reports minimized non-user-content operational state such as:

- release identity;
- active runtime adapter;
- authorized market/capability state summary;
- security posture;
- cost posture;
- dependency health;
- recovery posture;
- evidence freshness;
- degraded/contained/frozen status.

Initial assurance states:

- `SOVEREIGN` — required evidence is valid;
- `DEGRADED` — service impact exists but protected operation continues;
- `CONTAINED` — a risky capability/path is isolated;
- `FROZEN` — sensitive mutation is denied until authority/evidence is restored.

The assurance plane must minimize telemetry and must not export raw sensitive personal data for convenience.

### 5.10 Guardian AI Cell

Purpose: assist without becoming sovereign authority.

Allowed:

- observe;
- analyze;
- correlate;
- simulate;
- recommend;
- prepare bounded remediation;
- explain evidence gaps;
- detect drift or anomalous cost/security state.

Forbidden without separately valid human/policy authority:

- activate a market/capability;
- grant owner authority;
- move money;
- alter root policy;
- silently weaken a failed gate;
- delete production data;
- create unbounded spend.

### 5.11 Bounded Autonomy / Self-Healing Cell

Allowed target actions, when explicitly policy-bounded and evidenced:

- restart/retry a stateless component;
- route around an unhealthy instance/path;
- stop a bad deployment;
- roll back to the last verified compatible release;
- disable a malfunctioning optional feature;
- stop metered usage at an approved hard boundary.

Owner/policy-gated actions include:

- destructive data operations;
- changing sovereign market policy;
- activating payment providers;
- changing financial distribution;
- changing OWNER_ROOT authority;
- widening production privilege.

Autonomy is high only inside a narrow pre-authorized envelope.

## 6. Release object

The canonical target machine concept is `VerifiedReleaseCapsule`.

Minimum fields are expected to include:

- `release_id`;
- `source_repository_identity`;
- `source_sha`;
- `source_tree_digest`;
- `build_identity`;
- `test_evidence_digest`;
- `security_evidence_digest`;
- `sbom_digest`;
- `artifact_digest`;
- `provenance_digest`;
- `signing_identity`;
- `attestation_reference`;
- `created_at`;
- `revocation_state`.

Exact schema is deferred to the implementation plan and must be test-driven.

## 7. Evidence-before-authority rule

A positive readiness state is never a narrative assertion alone.

Examples:

`PRODUCTION_READY` requires exact-release evidence.

`MARKET_CAPABILITY_READY` requires the applicable SGF genome/passport/evidence.

`PAYMENT_READY` requires an authorized market payment profile and provider evidence.

`DR_READY` requires an actual recoverable mirror/archive proof.

`CRYPTO_INVENTORY_COMPLETE` requires inventory evidence for all required surfaces; unknown/unverified surfaces remain explicitly incomplete.

`CI_GREEN` requires executed matching checks; an infrastructure-blocked run with no assigned runner/steps is not GREEN.

## 8. Cryptographic agility and PQC readiness

T-SAF consumes SGF crypto inventory and adds operational requirements:

- no custom cryptographic algorithm design;
- inventory algorithms, providers, keys, certificates, signing identities, and rotation points;
- abstract provider-specific crypto behind explicit interfaces where practical;
- retain ability to migrate to NIST-standard post-quantum mechanisms as interoperability and provider support mature;
- prefer hybrid/provider-managed migration when available rather than premature custom protocol changes.

A claim of PQC readiness means migration paths are inventoried and testable; it does not mean every path must immediately use a post-quantum primitive.

## 9. Data and privacy boundaries

T-SAF does not authorize broader data collection.

Observability must be minimized and policy-governed. Market/data-residency rules remain SGF concerns. Runtime adapters must not silently relocate sensitive data or processing in a way that violates an authorized Market Genome or residency policy.

## 10. Failure model

### Provider outage

Use the recovery/adapter boundary. Do not infer permission to switch to an unauthorized market, payment provider, or data region.

### CI infrastructure failure before runner assignment

Classify as `INFRASTRUCTURE_BLOCKED`, not code RED and not GREEN. Independent work may continue only where current owner authority permits; release/merge/readiness claims must preserve the missing evidence.

### Payment/billing account problem

Separate provider-account health from code correctness. Cost or billing failure may block a provider capability but does not fabricate code failure evidence.

### Signature/provenance failure

Deny release activation. No fallback to unsigned deployment.

### Sovereign policy/evidence expiry

Suspend/deny the affected market capability. Do not fallback to another country, currency, or provider.

### Cost-cap reached

Stop or degrade only the policy-designated paid capability. Never silently raise the cap.

## 11. Initial provider map — replaceable, not constitutional

| Capability | Initial provider/adapter | T-SAF role |
|---|---|---|
| Source/governance | GitHub | `SourceGovernanceAdapter` |
| CI/security | GitHub Actions/CodeQL/Dependency Review | `VerificationAdapter` |
| Edge/static runtime target | Cloudflare Workers + Static Assets | `EdgeRuntimeAdapter` |
| Static emergency/public mirror | GitHub Pages | `StaticMirrorAdapter` |
| Source recovery mirror target | GitLab or equivalent | `SourceRecoveryMirror` |
| Cloud workload identity precedent | GitHub OIDC -> AWS STS | `WorkloadIdentityAdapter` |
| Data/storage | existing approved runtime/data providers | SGF/T-SAF governed adapters |
| Payment | none globally | SGF `PaymentProfile` adapters only |

A provider name in this table is an initial implementation target, not permanent platform identity.

## 12. Implementation sequence

Implementation must be decomposed. No broad provider migration is authorized merely by this design document.

### Phase 0 — Authority convergence

- establish T-SAF current owner authority;
- update owner router/binding and machine authority graph;
- ensure T-SAF explicitly depends on SGF rather than duplicating it;
- add anti-conflict tests.

### Phase 1 — Cost shield

- define machine-readable FinOps policy;
- inventory metered GitHub/CI/development services;
- encode fail-closed overage rules where technically enforceable;
- preserve provider-side budget stop controls;
- no automatic paid upgrade.

### Phase 2 — Verified release capsule

- define schema;
- create RED contracts;
- generate SBOM/provenance/digests;
- integrate signing/attestation without standing signing secrets;
- verify exact release before any production activation.

### Phase 3 — Edge runtime adapter

- preserve current static/page-based application boundary;
- add a provider-neutral deployment contract;
- introduce Cloudflare Workers/Static Assets only after tests and provider readiness;
- keep GitHub Pages as non-authoritative mirror/preview where appropriate;
- no sensitive production claim without runtime evidence.

### Phase 4 — Recovery/evidence plane

- source mirror;
- release evidence archive;
- restoration verification;
- provider-loss rehearsal.

### Phase 5 — Owner assurance pulse

- machine-readable posture summary;
- evidence freshness;
- cost/security/release/recovery states;
- strict telemetry minimization.

### Phase 6 — Bounded autonomy

- only after deterministic recovery/rollback evidence exists;
- safe self-healing actions first;
- destructive/financial/sovereign changes remain separately gated.

### Phase 7 — PQC/crypto-agility convergence

- complete crypto inventory evidence;
- provider/interoperability matrix;
- migration rehearsals for selected paths;
- no custom crypto.

## 13. Testing strategy

Every implementation phase follows TDD and exact-head verification.

Required test classes include:

- owner-authority/anti-conflict contracts;
- zero-default sovereign tests inherited from SGF;
- cost-policy boundary tests;
- release-capsule schema/digest/signature verification tests;
- negative tests for unsigned/mismatched/stale release evidence;
- adapter conformance tests;
- fail-closed market/capability tests;
- recovery artifact/mirror verification;
- bounded-autonomy allow/deny tests;
- telemetry minimization contracts;
- crypto-inventory completeness contracts.

No test may represent unavailable remote evidence as passed.

## 14. Non-goals

T-SAF does not authorize:

- rewriting the app into a framework;
- mandatory Kubernetes;
- mandatory active-active multi-cloud;
- blockchain;
- custom cryptography;
- automatic activation of 190 countries;
- a globally fixed currency/payment provider;
- automatic paid upgrades;
- AI sovereign authority;
- destructive cleanup outside current PHOENIX/AION governance;
- bypass of #346 or any later required exact-head verification gate.

## 15. Success criteria

T-SAF is considered implemented only when the applicable phases have evidence that:

1. current owner authority points to one non-conflicting T-SAF definition;
2. SGF remains the only sovereign market/capability authority;
3. exact production release identity can be cryptographically/evidentially verified;
4. metered spend cannot silently exceed owner-approved bounds;
5. privileged deployment paths avoid standing credentials where provider capability allows;
6. source/release evidence can survive loss of the primary provider;
7. runtime provider adapters can be replaced without changing OWNER_ROOT or market sovereignty semantics;
8. readiness states derive from machine/evidence state rather than prose alone;
9. bounded autonomy cannot cross sovereign, destructive, or financial authority boundaries;
10. CI/release claims accurately distinguish GREEN, RED, and infrastructure-blocked states.

## 16. Owner acceptance statement

> **Adopt TIGER SOVEREIGN AUTONOMIC FABRIC 2026 (T-SAF 2026) as the target operational fabric for VVIP TIGER. SGF remains the binding sovereign-market constitution. TIGER must remain provider-replaceable, evidence-driven, fail-closed, zero-default, cryptographically verifiable, cost-bounded, recovery-capable, and autonomous only inside explicitly approved limits. No provider, country, currency, CI service, AI system, or hosting region becomes the identity or sovereign authority of the platform.**
