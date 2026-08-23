# TIGER SOVEREIGN TRUST ORGANISM 2026 — Architecture Design

**Date:** 2026-08-23
**Status:** Owner-approved in-chat architecture / written specification pending owner review
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026`
**Short name:** `TSTO`
**Genome subsystem:** `TIGER SOVEREIGN LIVING TRUST GENOME 2026` (`TSLTG`)
**Decision equation:** `TIGER SOVEREIGN CONTINUOUS AUTHORITY EQUATION` (`SCAE`)
**Immediate implementation milestone:** `M12 — Sovereign Continuous Authority Core`
**Baseline:** Private Market Genesis M0–M11 are source-implemented on Draft PR #323. M9 supplies durable replay authority, M10 defines deployed-environment replay evidence, and M11 binds Market Genesis source readiness into the existing sealed Production artifact chain. None of those source states is itself Production deployment authorization.

## 1. Executive thesis

TSTO treats TIGER as a continuously verifiable digital organism rather than a set of independently trusted users, servers, tokens, builds, and deployments.

> **TIGER does not trust a server, user, build, AI output, deployment, document, role, token, or boolean merely because it exists. TIGER authorizes only one exact action when the mandatory evidence for that action is fresh, authentic, mutually consistent, and policy-compatible at decision time.**

The system separates permanent identity facts from time-bounded trust facts and from action authority.

The composition is:

`TSLTG Release Trust DNA`
+ `Runtime Trust Pulse`
+ `Trust Nervous System`
+ `Evidence Constellation`
+ `Sovereign Epoch Chain`
+ `Authority Cortex (PDP)`
+ `Capability Enforcement Point (PEP)`
+ `Adaptive Proof Geometry`
→ `Proof-Carrying Action Lease`
→ `Execute Once / Bounded Use`
→ `Immutable Audit`
→ `Automatic Expiry / Event-Driven Revocation / Capability-Scoped Immune Response`

This architecture is **Continuous Sovereign Authorization** built on **Living Verifiable Sovereignty**.

TSTO does not replace M9–M11. It treats them as founding genes and evidence sources.

## 2. Non-negotiable owner laws preserved

TSTO must never weaken current owner authority.

For Private Market Genesis:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. TIGER Pulse / country-payment authority remains the platform advertising-billing authority and never becomes buyer–seller payment authority for the advertised underlying deal.
5. Raw private intent, contact data, precise private location, credentials, secrets, and unnecessary runtime-identifying evidence are not advertising inventory.
6. AI may understand intent, draft, normalize, translate, analyze anomalies, explain decisions, and recommend remediation, but AI may not mint sovereign authority, move money, activate Production/countries, create whole-vehicle exceptions, mutate owner authority, or bypass deterministic policy.
7. A green Draft PR, workflow success string, administrator role, sponsorship, payment, source boolean, or document cannot substitute for required evidence.
8. Missing evidence never becomes permission through fallback.
9. Production, Staging, remote database, DNS, secrets, payment providers, and release activation remain separately authorized operations.

## 3. 2026 standards posture

TSTO is vendor-neutral. External standards supply interoperable evidence, identity, authorization, and transparency primitives. TIGER remains the business-policy and sovereign-action authority.

### 3.1 Stable foundations to adopt or align with where applicable

- **SLSA v1.2 Source Track** for source provenance, source history, continuous technical controls, and review semantics.
- **SLSA v1.2 Build Track** as the target model for provenance and hardened build isolation; TIGER claims only levels actually demonstrated by the selected builder and controls.
- **in-toto / artifact attestations** for provenance-bound statements where supported by the existing release plane.
- **GitHub artifact attestations / OIDC short-lived credentials** where the current GitHub release system uses them, without making GitHub sovereign policy authority.
- **Sigstore identity-based signing / Rekor transparency** where independent signing/transparency increases assurance without creating a second release authority.
- **IETF RATS, RFC 9334** for Attester → Verifier → Relying Party semantics.
- **Entity Attestation Token, RFC 9711** as a standards-aligned representation option for runtime attestation claims where real target platforms support it.
- **IETF SCITT, RFC 9943** for signed-statement transparency and independently verifiable receipts when TIGER introduces generic transparency registration.
- **OpenID AuthZEN Authorization API 1.0** concepts for separation between Policy Decision Point and Policy Enforcement Point.
- **OpenID Shared Signals Framework / CAEP 1.0** concepts for event-driven trust/revocation signals rather than relying only on token expiry or polling.
- **OAuth Rich Authorization Requests, RFC 9396** concepts for action/resource-specific authorization descriptions.
- **OAuth DPoP, RFC 9449** concepts for sender-constrained proof-of-possession tokens/capabilities where protocol fit and client support justify it.
- **SPIFFE/SPIRE** for short-lived workload identity only when TIGER has distributed backend workloads that justify workload attestation and mTLS/JWT-SVID identity.
- **CycloneDX 1.7** for SBOM/CBOM and cryptographic inventory.
- **FIDO2/WebAuthn/passkeys** for phishing-resistant human authentication and high-impact step-up where appropriate.
- **NIST FIPS 203 / 204 / 205** as the stable post-quantum algorithm baseline for future crypto-agility decisions.

### 3.2 Research/watch only — no current authority claim

Unstable work may shape adapters and interfaces but is not current compliance authority. Examples include:

- IETF WIMSE working-group drafts;
- OAuth Transaction Tokens drafts;
- SLSA draft Build Environment / Dependency tracks;
- CycloneDX 2.0 until a stable release and explicit migration decision;
- draft/new post-quantum profiles beyond the stable NIST standards.

TIGER may design compatibility seams for those directions without claiming compliance or binding the architecture to them prematurely.

### 3.3 No inflated compliance claims

TSTO must not claim `SLSA_SOURCE_L4`, `SLSA_BUILD_L3`, `SCITT_VERIFIED`, `RATS_VERIFIED`, `SPIFFE_ATTESTED`, `PQC_READY`, `AUTHZEN_CONFORMANT`, or equivalent unless the exact external requirements and real evidence are implemented and independently verifiable.

Owner sovereignty does not waive an external standard's requirements. If a standard requires independent/two-person review or specific builder isolation, TIGER must either satisfy it or make no claim.

## 4. TSTO body plan

TSTO is one coherent trust system with specialized organs.

### 4.1 TSLTG — Sovereign Living Trust Genome

**Purpose:** immutable/slow-changing trust identity.

The genome contains the authoritative composition rules for release identity, sovereign epochs, evidence-class identities, and action-policy references.

#### Trust DNA

Trust DNA is not merely a Git SHA. It is a closed canonical composition of authenticated release facts and digest references, such as:

- repository identity;
- source SHA and source tree;
- source provenance reference;
- builder/workflow identity;
- build recipe identity;
- sealed artifact digest;
- release manifest digest;
- SBOM digest;
- CBOM digest when present;
- reviewed migration digests;
- policy/authority digests;
- Market Genesis source-readiness digest;
- AI policy digest where relevant;
- country/policy/market epoch references where relevant.

A caller cannot create trusted DNA by submitting strings that look like hashes. Trusted facts must come from authenticated repository/release adapters or previously verified evidence.

#### Sovereign Epoch Chain

Versioned sovereign domains may expose monotonic epochs such as:

- `OWNER_EPOCH`
- `POLICY_EPOCH`
- `MARKET_EPOCH`
- `COUNTRY_<code>_EPOCH`
- `AI_POLICY_EPOCH`
- `CRYPTO_EPOCH`

A proof-carrying lease binds to the exact epoch vector required by its action. A controlling epoch change invalidates old authority deterministically.

Epoch mismatch supplements, not replaces, explicit revocation where explicit revocation is required.

### 4.2 Runtime Trust Pulse

**Purpose:** represent fresh observed runtime state.

An immutable artifact can be correct while a deployed environment has drifted. A Trust Pulse therefore represents time-bounded verified runtime facts, such as:

- exact release/artifact identity observed at runtime;
- environment class;
- workload/runtime identity;
- migration state;
- approved configuration/reference-value digest;
- replay-protection state;
- attestation issuer/verifier identity;
- issued time / freshness limit;
- policy epoch;
- drift/revocation state.

A stale Pulse is `BLOCKED`, never warning-to-PASS.

M12 defines the contract/evaluation shape only; it does not fabricate real Staging or Production Pulse evidence.

### 4.3 Trust Nervous System

**Purpose:** propagate security/trust changes fast enough that authority does not wait for token expiry.

The Nervous System receives and normalizes trusted security signals such as:

- session or credential revocation;
- user/device assurance change;
- workload identity change;
- runtime attestation invalidation;
- policy/epoch change;
- country activation/revocation change;
- release/artifact supersession;
- critical dependency/security posture change;
- replay or abuse event.

Future runtime integration should align with Shared Signals / CAEP semantics where appropriate. The source contract must not treat caller-generated events as trusted signals.

### 4.4 Authority Cortex — PDP

**Purpose:** make the deterministic action authorization decision.

The Cortex is the Policy Decision Point. It receives an action request plus authenticated evidence references/context and returns a bounded decision object.

It does not execute the action.

The conceptual request shape is:

`subject + action + resource + purpose/context + trusted evidence bindings`

The Cortex uses the action's Adaptive Proof Geometry to determine mandatory evidence and policy requirements.

### 4.5 Capability Enforcement Point — PEP

**Purpose:** enforce the Cortex decision at the actual operation boundary.

The PEP verifies the Proof-Carrying Action Lease and exact action/resource binding before execution.

No PEP may turn a missing/invalid lease into an allow-by-default path. A UI control, client role, cached Boolean, or AI recommendation is not a PEP authorization substitute.

### 4.6 Adaptive Proof Geometry

**Purpose:** require evidence proportionate to the exact action without applying expensive high-assurance checks to every click.

Each governed action has a closed proof profile over independent dimensions such as:

- `IDENTITY`
- `SOURCE`
- `BUILD`
- `ARTIFACT`
- `RUNTIME`
- `POLICY`
- `COUNTRY`
- `CONTEXT/RISK`
- `REPLAY`
- `FRESHNESS`
- `TRANSPARENCY`
- `HARDWARE_ATTESTATION` where justified.

The geometry is a mandatory set, not a numeric trust score.

A public low-risk read may require few dimensions. Owner L4 Production mutation may require most of them. This prevents security theater and unnecessary latency while keeping high-risk paths strict.

### 4.7 Evidence Constellation

**Purpose:** avoid single-assertion or single-vendor authority.

Critical actions may require multiple independently authenticated evidence classes, including source provenance, artifact provenance, build attestation, target-environment attestation, workload identity, sovereign epochs, country/legal state, replay evidence, transparency receipts, and risk/session signals.

The rule is:

`ALLOW = all mandatory independent proof requirements satisfied`

A missing mandatory proof produces `BLOCKED`; TIGER does not use `82% trusted` to authorize critical actions.

A single evidence object must not silently satisfy multiple logically independent requirements unless policy explicitly defines that equivalence.

### 4.8 Proof-Carrying Action Lease — PCAL

**Purpose:** replace broad long-lived privilege with one bounded authorization object.

A PCAL is conceptually bound to:

- exact action;
- subject/actor identity reference;
- workload/client proof reference where relevant;
- exact resource/object reference;
- purpose/context class;
- country/sector scope where relevant;
- exact Trust DNA digest/reference;
- required sovereign epoch vector;
- Trust Pulse/attestation-result reference;
- decision-policy/profile version;
- issue and expiry times;
- bounded use count;
- replay binding;
- proof-of-possession/key binding where used;
- evidence digest/reference set;
- audit correlation reference.

A PCAL is not `admin=true` and must not contain raw sensitive evidence.

It becomes invalid on expiry, use exhaustion, replay, release mismatch, epoch mismatch, explicit revocation, required Pulse expiry, mandatory evidence invalidation, proof-of-possession failure, scope mismatch, or policy incompatibility.

Future protocol adapters may map appropriate PCAL semantics to RAR, DPoP, transaction-token, or workload-identity standards without making those protocols the sovereign policy model.

### 4.9 TIGER Sovereign Continuous Authority Equation — SCAE

SCAE is a set-intersection rule, not a probability score:

`Authority(action, t) = Identity(t) ∩ RequiredSourceEvidence ∩ RequiredArtifactEvidence ∩ RequiredRuntimeEvidence(t) ∩ Policy(action,t) ∩ SovereignEpochs(t) ∩ CountryAuthority(t) ∩ RequiredRiskSignals(t) ∩ ReplayState(t) ∩ Freshness(t)`

Only the dimensions required by the action's Adaptive Proof Geometry are evaluated.

The result is `ALLOW` or `BLOCKED` with bounded reason codes. `ALLOW` permits creation of a bounded PCAL; it is not itself the execution.

### 4.10 Digital Immune System

**Purpose:** respond to trust drift by capability instead of blindly killing the entire platform.

When a trusted signal or verifier proves that a dependency has failed, the Immune System identifies which action profiles/leases depend on that evidence and blocks or revokes those capabilities while preserving unrelated safe paths.

> **Fail closed by capability, not fail dead by platform.**

Loss of durable Contact/Handoff evidence should block Contact/Handoff authority but should not automatically disable unrelated public social-feed reads.

### 4.11 Transparency Memory

**Purpose:** create externally/verifiably timestamped evidence history without exposing private runtime data.

Where transparency registration is used, TIGER should register signed statements over cryptographic digests and bounded non-sensitive metadata rather than raw PII, secrets, private intent, runtime identifiers, or authorization capabilities.

SCITT receipts and/or Sigstore/Rekor may become evidence sources, not the business authorization engine.

### 4.12 Crypto Genome

**Purpose:** make cryptographic dependencies visible and replaceable.

The cryptographic inventory should identify algorithms, protocols, keys/certificates classes, signing/encryption uses, and affected components through CBOM/xBOM evidence.

Application code should prefer versioned crypto profiles over hard-coded permanent algorithm assumptions where practical.

PQC migration is an explicit future policy decision. TSTO provides crypto agility; it does not force premature migration.

### 4.13 Sovereign Cell — optional high-assurance tier

Confidential computing / hardware-backed attestation is not a universal requirement.

A future Sovereign Cell may protect only highest-impact operations such as:

- owner L4 authorization;
- release signing/trust-root operations;
- selected highly sensitive financial/ad-control decisions;
- key unsealing/derivation;
- selected private AI processing.

No TEE/cloud vendor is mandated. Hardware attestation is introduced only when a specific threat model and cost/operational case justify it.

### 4.14 AI Sentinel

AI is an analyst and intent interpreter, never the sovereign signer.

AI may:

- infer candidate intent;
- explain `BLOCKED` decisions;
- recommend remediation;
- correlate anomalies/drift;
- assist source authoring/review under normal controls.

AI must not:

- issue/mint a PCAL;
- create trusted evidence from its own output;
- change sovereign epochs;
- declare Production healthy;
- activate countries;
- move money;
- bypass Market Genesis laws;
- mutate owner authority;
- authorize destructive L4 actions.

Final authorization remains deterministic and independently verifiable.

## 5. Trusted-context law

Fields that establish provenance, identity, freshness, environment, or authorization must come from authenticated trusted adapters/context, not from the same untrusted payload asking for permission.

Trusted-context examples include:

- repository identity;
- source SHA/tree;
- workflow/builder identity and run ID;
- artifact ID/digest;
- environment identity;
- attestation issuer/verifier identity;
- workload identity;
- trusted current time;
- current sovereign epoch vector;
- trusted security-signal issuer identity;
- transparency receipt verification result;
- proof-of-possession verification result.

An untrusted request may carry references to evidence, but the verifier must independently authenticate/bind those facts.

The caller must never self-assert fields such as `trusted=true`, `ALLOW`, `productionReady`, environment identity, workflow identity, verifier result, current time, current epoch, signal issuer, or attestation result.

Pure M12 tests may inject trusted adapters/clocks explicitly. Test dependency injection represents the trust boundary; it is not a runtime request field.

## 6. Trust decay, freshness, and event-driven invalidation

Different evidence classes have different lifetimes.

Immutable facts such as artifact digests may remain true historically. Runtime evidence, user step-up, workload identity, environment state, and action authorization require bounded freshness.

Every time-sensitive proof class must define:

- issued time;
- freshness/expiry boundary;
- sovereign/policy epoch dependency;
- supersession semantics;
- explicit/event-driven revocation semantics where needed;
- which action profiles depend on it.

A verifier must not silently extend freshness.

Where attestation freshness challenges are used, challenge/nonce generation must be verifier-controlled so old good-state evidence cannot simply be replayed.

Trusted CAEP/SSF-style events may invalidate a proof/lease before its nominal expiry.

## 7. Privilege model

TSTO separates five concepts:

1. **Identity** — who or what is acting.
2. **Policy eligibility** — which actions could ever be allowed.
3. **Evidence** — what proves the required facts now.
4. **Decision** — deterministic PDP result for this exact action/context.
5. **PCAL capability** — bounded authorization to execute one exact operation.

Owner sovereignty remains the root of policy intent. It must not be represented as an indefinitely reusable browser/server session credential for every destructive or Production action.

High-impact action profiles may require phishing-resistant step-up, proof-of-possession, exact release binding, independent review where policy requires it, fresh runtime evidence, and short PCAL duration.

## 8. M9–M11 mapping — no rebuild

### M9 — Replay Gene

M9 supplies durable cross-instance replay state and the reviewed migration. It becomes a replay-consumption gene for one-time/bounded capabilities.

### M10 — Deployment Evidence Gene

M10 defines target-environment facts required to prove durable Contact/Handoff replay behavior. Its current evidence contract remains authoritative until an explicitly approved successor exists.

### M11 — Source/Artifact Gene

M11 proves the exact release source passed Market Genesis source contracts before sealing and binds Market source-readiness into the Production V2 artifact chain.

### Combined law

`M9 + M10 + M11` do not automatically equal universal authorization.

TSTO consumes their verified facts as action-specific evidence. There is no rewrite of the durable replay migration, no second Market Genesis engine, and no parallel release plane.

## 9. Market Genesis Contact/Handoff target flow

The future governed flow is:

`User intent`
→ `SYNAPSE candidate interpretation`
→ `Authority Cortex: CONTACT_HANDOFF action profile`
→ `Market eligibility + whole-vehicle prohibition + no-transaction checks`
→ `Identity/session proof requirements`
→ `Exact Trust DNA verification`
→ `Fresh target-environment Trust Pulse / M10/M13 replay-attestation evidence`
→ `Country/policy/epoch checks`
→ `Nervous System risk/revocation state`
→ `SCAE decision`
→ `PCAL mint`
→ `PEP exact-scope verification`
→ `single bounded consume`
→ `M9 durable replay authority`
→ `terminal handoff`

The PCAL expires or dies on use and can never become buyer/seller order, product payment, escrow, settlement, delivery, ownership transfer, or dispute authority.

M12 verifies only the pure source contracts and decision semantics with synthetic fixtures; it does not activate this runtime path.

## 10. TIGER Pulse advertising target flow

A campaign activation action may use an action profile requiring:

- valid country contract/profile;
- authorized advertising-billing/payment profile;
- eligible campaign object;
- DIDE/capacity/pricing policy;
- applicable sovereign epochs;
- trusted release/runtime state where required;
- owner/partner capability scope;
- risk/revocation state.

The resulting PCAL authorizes only the TIGER advertising action. It never grants TIGER authority over payment/settlement for the underlying advertised buyer–seller product/service transaction.

## 11. Provider-neutrality law

TIGER owns the trust and business-policy model. Vendors provide evidence, identity, or execution surfaces.

- GitHub may provide source/build/provenance evidence, not sovereign policy.
- Cloud providers may provide workload/hardware attestation, not owner policy.
- Sigstore/Rekor or SCITT services may provide transparency, not business authorization.
- SPIFFE/SPIRE may provide workload identity, not business permission.
- AuthZEN-compatible interfaces may standardize PDP/PEP exchange, not define TIGER's business laws.
- CAEP/SSF may transport trusted security signals, not create authority.
- AI may provide analysis, not deterministic permission.

TSTO interfaces should allow equivalent evidence providers to be substituted without rewriting owner laws.

## 12. Privacy and evidence minimization

Trust evidence must contain only what a verifier requires.

Prohibited content includes, unless a separately reviewed cryptographic protocol explicitly requires a protected representation:

- raw secrets or credentials;
- database connection strings;
- service-role keys;
- reusable authorization capabilities;
- raw Contact/Handoff nonces;
- PII;
- message content;
- raw private intent;
- precise private location;
- unnecessary hostnames/IP addresses;
- unnecessary runtime-instance identifiers;
- buyer/seller transaction state.

Transparency systems should receive signed statements over cryptographic digests and bounded metadata rather than raw sensitive evidence.

## 13. Performance and availability law

Security must be risk-adaptive, not uniformly heavyweight.

- Low-risk actions use a small proof geometry and cached immutable facts where safe.
- High-risk actions use stricter freshness, proof-of-possession, runtime/identity evidence, and independent proof classes.
- Immutable evidence can be verified/cached by digest; freshness-sensitive evidence cannot be silently cached past its policy window.
- A failure in one evidence domain blocks only dependent capabilities where possible.
- TSTO must not require confidential computing, network transparency lookups, or distributed attestation for every ordinary user interaction.

This preserves both strong security and practical latency/cost.

## 14. Failure model

TSTO is fail-closed with bounded reason codes. Core categories include:

- `TRUST_DNA_MISSING`
- `TRUST_DNA_INVALID`
- `TRUST_DNA_RELEASE_MISMATCH`
- `TRUST_PULSE_MISSING`
- `TRUST_PULSE_STALE`
- `TRUST_ATTESTATION_INVALID`
- `TRUST_EVIDENCE_MISSING`
- `TRUST_EVIDENCE_DIGEST_MISMATCH`
- `TRUST_EPOCH_MISMATCH`
- `TRUST_SIGNAL_UNTRUSTED`
- `TRUST_SIGNAL_REVOKED`
- `TRUST_POLICY_BLOCKED`
- `TRUST_ACTION_PROFILE_UNKNOWN`
- `TRUST_PROOF_GEOMETRY_UNSATISFIED`
- `TRUST_LEASE_EXPIRED`
- `TRUST_LEASE_REPLAYED`
- `TRUST_LEASE_SCOPE_MISMATCH`
- `TRUST_LEASE_USE_EXHAUSTED`
- `TRUST_PROOF_OF_POSSESSION_FAILED`
- `TRUST_WORKLOAD_IDENTITY_UNPROVEN`
- `TRUST_TRANSPARENCY_RECEIPT_UNPROVEN`

Implementations may define narrower bounded subcodes but must not echo secrets, raw tokens, PII, or arbitrary untrusted values.

## 15. Delivery decomposition

TSTO is intentionally decomposed so it does not become a monolithic security rewrite.

### M12 — Sovereign Continuous Authority Core — implement first

**Scope:** source-only foundation; no remote runtime mutation.

M12 defines/tests:

1. closed canonical `TIGER_TRUST_DNA_V1` contract;
2. closed canonical `TIGER_SOVEREIGN_EPOCH_VECTOR_V1` contract;
3. closed canonical `TIGER_TRUST_PULSE_V1` shape for synthetic/local verification only;
4. source-controlled action-profile registry;
5. Adaptive Proof Geometry compiler;
6. AuthZEN-style PDP/PEP-neutral decision contract without claiming AuthZEN conformance;
7. pure deterministic SCAE evaluator;
8. closed canonical `TIGER_PCAL_V1` schema for test-only candidate leases;
9. explicit trusted-context adapters/clock boundary;
10. exact Market Genesis `CONTACT_HANDOFF` profile proving whole-vehicle/no-transaction/replay/source requirements cannot be weakened by caller input;
11. negative tests preventing caller-supplied `ALLOW`, environment, clock, epoch, attestation, signal issuer, or authority override;
12. bounded failure codes and evidence minimization;
13. no SVEF Production bundle schema change in M12 unless a later separately reviewed release-binding need is proven.

M12 must **not**:

- apply a migration remotely;
- contact remote Supabase/Production/Staging;
- dispatch Production artifact builder/promotion;
- mint a live Production/Staging PCAL;
- create a real target-environment Trust Pulse;
- claim M10 `DEPLOYED_DURABLE_VERIFIED`;
- claim RATS/SCITT/SPIFFE/AuthZEN compliance;
- activate Contact/Handoff;
- change DNS/secrets/payment providers;
- merge PR #323.

**M12 completion meaning:**

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`

It does not mean runtime trust or Production authorization exists.

### M13 — Runtime Attestation and Deployment Evidence Bridge

Future separate milestone:

- authenticate M10 target-environment evidence provenance;
- map real target runtime evidence into Trust Pulse semantics;
- adopt RATS/EAT-compatible adapters where target infrastructure supports them;
- enforce verifier-controlled freshness;
- prove target environment/release binding;
- continue to require separate Production activation authority.

### M14 — Trust Nervous System and Continuous Revocation

Future separate milestone:

- trusted signal ingestion;
- CAEP/SSF-style signal adapters where appropriate;
- signal issuer authentication;
- session/device/workload/policy/release revocation mapping;
- lease invalidation before nominal expiry;
- anti-spoof/replay protections for signals.

### M15 — Transparency and Workload Identity Constellation

Future separate milestone:

- SCITT/Sigstore/Rekor evidence adapters where justified;
- transparency receipts over bounded digests/metadata;
- workload identity integration when backend topology justifies SPIFFE/SPIRE or equivalent;
- DPoP/proof-of-possession adapters where clients and threat model justify them.

### M16 — Digital Immune System

Future separate milestone:

- capability dependency graph;
- drift-to-capability mapping;
- scoped revocation/quarantine;
- safe-mode behavior;
- audit/evidence capsules;
- no platform-wide shutdown for unrelated proof failures unless shared critical dependencies demand it.

### M17 — Crypto Agility and Sovereign Cell

Future separate milestone:

- CBOM-backed crypto inventory;
- versioned crypto profiles;
- PQ migration readiness and algorithm rotation planning;
- selective confidential-computing/hardware-attestation integration only for justified high-impact paths.

## 16. M12 TDD requirements

M12 implementation must follow strict RED → GREEN.

Required negative/positive coverage includes at least:

1. caller cannot provide trusted current time;
2. caller cannot provide current sovereign epochs;
3. caller cannot self-assert `ALLOW`, environment identity, trusted signal issuer, attestation result, or workflow identity;
4. unknown action profile fails closed;
5. action profiles cannot be reduced by request input;
6. missing mandatory proof dimension produces `BLOCKED`;
7. extra/unknown fields in closed contracts are rejected;
8. Trust DNA source/release mismatch is rejected;
9. stale Trust Pulse is rejected;
10. epoch mismatch is rejected;
11. invalid/revoked trusted signal blocks a dependent action;
12. expired/replayed/out-of-scope/use-exhausted PCAL is rejected;
13. Market Genesis `CONTACT_HANDOFF` cannot bypass whole-vehicle or no-transaction law;
14. Market Genesis `CONTACT_HANDOFF` cannot treat M11 source evidence as M10 deployed evidence;
15. a complete synthetic trusted-context fixture produces a deterministic `ALLOW` decision and deterministic PCAL candidate;
16. canonical serialization/digest results are stable across key order;
17. no sensitive evidence is serialized into decision/PCAL output.

All existing Market Genesis M0–M11 tests and repository gates must remain green after M12 implementation.

## 17. M12 expected implementation surface

The implementation plan should prefer a small set of focused modules rather than one large trust engine. Expected source areas include new `scripts/trust/` modules and focused `tests/` files, with Market Genesis integration only through action-profile/evidence adapters.

M12 should not modify the durable replay SQL, create a new release workflow, replace SVEF V2, or add remote deployment infrastructure.

Exact filenames and task ordering belong to the implementation plan after written-spec approval.

## 18. Acceptance and completion boundaries

The architecture/program is approved in concept, but this written specification must be reviewed by the owner before an implementation plan is authored.

M12 will be considered source-complete only when:

- all written M12 contracts are implemented with closed schemas;
- trusted-context and caller-input boundaries are proven by negative tests;
- Adaptive Proof Geometry cannot be weakened by caller input;
- SCAE is deterministic and fail-closed;
- PCAL is bounded, canonical, scope-specific, time-bounded, replay-aware, and non-sensitive;
- Market Genesis immutable laws remain enforced;
- M9–M11 remain foundational rather than duplicated/rebuilt;
- all applicable exact-head repository/security/database rehearsal workflows are green on one final SHA;
- PR #323 remains Draft/Open/Unmerged unless separately authorized;
- no remote Staging/Production/Supabase/DNS/secret/payment-provider mutation or Contact/Handoff activation occurs as part of M12 source implementation.

## 19. Current truth before M12 implementation

Current state remains:

`M0_M11_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

`EXACT_RELEASE_SOURCE_ATTESTED_FOR_MARKET_GENESIS` was proven on the prior exact M11 implementation head and becomes historical evidence after design-only commits move the branch head.

`DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`

`M12_NOT_IMPLEMENTED`

`TSTO_WRITTEN_SPEC_PENDING_OWNER_REVIEW`

The design commits themselves do not authorize Production build, promotion, deployment, remote migration apply, Contact/Handoff activation, or merge.
