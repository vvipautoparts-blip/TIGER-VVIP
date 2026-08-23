# TIGER SOVEREIGN TRUST ORGANISM 2026 — Architecture Design

**Date:** 2026-08-23
**Status:** `CURRENT OWNER-APPROVED ARCHITECTURE / M12 SOURCE IMPLEMENTED`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026`
**Short name:** `TSTO`
**Genome subsystem:** `TIGER SOVEREIGN LIVING TRUST GENOME 2026` (`TSLTG`)
**Decision equation:** `TIGER SOVEREIGN CONTINUOUS AUTHORITY EQUATION` (`SCAE`)
**Immediate implemented milestone:** `M12 — Sovereign Continuous Authority Core`
**Owner authority:** `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
**Baseline:** Private Market Genesis M0–M12 are source-implemented on Draft PR #323. M9 supplies durable replay authority, M10 defines deployed-environment replay evidence, M11 binds Market Genesis source readiness into the existing sealed Production artifact chain, and M12 adds the source-only continuous-authority core. None of those source states is itself Production deployment authorization.

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

## 3. Scope-control law — no architecture stacking

TSTO is the one current base architecture for TIGER trust and continuous authorization.

> **Do not propose or stack additional trust architectures outside TSTO merely for novelty. Extend TSTO only when implementation evidence proves a concrete security, correctness, interoperability, resilience, privacy, or compliance gap that TSTO cannot safely express.**

This prevents security-tool accumulation and duplicate authority while preserving the ability to repair a demonstrated defect.

## 4. 2026 standards posture

TSTO is vendor-neutral. External standards supply interoperable evidence, identity, authorization, and transparency primitives. TIGER remains the business-policy and sovereign-action authority.

### 4.1 Stable foundations to adopt or align with where applicable

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

### 4.2 Research/watch only — no current authority claim

Unstable work may shape adapters and interfaces but is not current compliance authority. Examples include IETF WIMSE drafts, OAuth Transaction Tokens drafts, SLSA draft Build Environment/Dependency tracks, CycloneDX 2.0 until stable and explicitly adopted, and draft/new post-quantum profiles beyond stable NIST standards.

### 4.3 No inflated compliance claims

TSTO must not claim `SLSA_SOURCE_L4`, `SLSA_BUILD_L3`, `SCITT_VERIFIED`, `RATS_VERIFIED`, `SPIFFE_ATTESTED`, `PQC_READY`, `AUTHZEN_CONFORMANT`, or equivalent unless the exact external requirements and real evidence are implemented and independently verifiable.

Owner sovereignty does not waive an external standard's requirements.

## 5. TSTO body plan

### 5.1 TSLTG — Sovereign Living Trust Genome

**Purpose:** immutable/slow-changing trust identity.

Trust DNA is a closed canonical composition of authenticated release facts and digest references, including repository identity, source SHA/tree, provenance, builder/workflow identity, sealed artifact/release digests, SBOM/CBOM where present, reviewed migration digests, policy/authority digests, Market Genesis source-readiness, and applicable sovereign epochs.

A caller cannot create trusted DNA by submitting strings that merely look like hashes.

### 5.2 Sovereign Epoch Chain

Versioned sovereign domains may expose monotonic epochs such as `OWNER_EPOCH`, `POLICY_EPOCH`, `MARKET_EPOCH`, `COUNTRY_<code>_EPOCH`, `AI_POLICY_EPOCH`, and `CRYPTO_EPOCH`.

A PCAL binds to the exact required epoch vector. A controlling epoch change invalidates old authority deterministically. Epoch mismatch supplements explicit revocation where explicit revocation is required.

### 5.3 Runtime Trust Pulse

A release can be immutable while the environment changes. A Trust Pulse represents time-bounded verified runtime facts such as release/artifact identity, environment class, workload identity, migration/configuration/replay state, attestation identity, freshness, policy epoch, and drift/revocation state.

A stale Pulse is `BLOCKED`, never warning-to-PASS.

**M12 implements only the closed `SYNTHETIC_TEST_ONLY` source contract. It does not create a real Staging or Production Pulse.**

### 5.4 Trust Nervous System

Future runtime integration propagates authenticated session/credential/device/workload/runtime/policy/country/release/replay security signals quickly enough that authority need not wait for token expiry. Caller-generated events are never trusted signals.

### 5.5 Authority Cortex — PDP

The Cortex is the deterministic Policy Decision Point. It receives an exact action request plus authenticated trusted context/evidence references and returns a bounded decision. It does not execute the action.

### 5.6 Capability Enforcement Point — PEP

The PEP verifies the exact PCAL and action/resource scope at the execution boundary. UI state, a client role, cached Boolean, or AI recommendation cannot substitute for PEP authorization.

### 5.7 Adaptive Proof Geometry

Each governed action has a source-controlled mandatory proof set over independent dimensions such as `IDENTITY`, `SOURCE`, `BUILD`, `ARTIFACT`, `RUNTIME`, `POLICY`, `COUNTRY`, `RISK_SIGNAL`, `REPLAY`, `FRESHNESS`, `TRANSPARENCY`, and optional `HARDWARE_ATTESTATION` where justified.

The geometry is a mandatory set, not a numeric trust score. Low-risk actions may use fewer dimensions; high-risk actions may require more. Caller input cannot shrink the geometry.

### 5.8 Evidence Constellation

Critical actions may require multiple independently authenticated evidence classes. `ALLOW` requires all mandatory independent proofs; a missing mandatory proof is `BLOCKED`.

### 5.9 Proof-Carrying Action Lease — PCAL

PCAL replaces broad long-lived privilege with bounded exact-action authority. It binds exact action, subject, resource, purpose, country/sector when relevant, Trust DNA, epochs, Pulse/attestation reference, decision/profile version, issue/expiry time, use count, replay binding, optional proof-of-possession binding, evidence digest set, and audit correlation.

It becomes invalid on expiry, use exhaustion, replay, release/epoch/Pulse mismatch, revocation, evidence invalidation, scope mismatch, or policy incompatibility.

**M12 implements only `TIGER_PCAL_V1` with `candidate_mode=TEST_ONLY_SOURCE_CONTRACT`. It is not a live Production/Staging token.**

### 5.10 SCAE

`Authority(action, t) = Identity(t) ∩ RequiredSourceEvidence ∩ RequiredArtifactEvidence ∩ RequiredRuntimeEvidence(t) ∩ Policy(action,t) ∩ SovereignEpochs(t) ∩ CountryAuthority(t) ∩ RequiredRiskSignals(t) ∩ ReplayState(t) ∩ Freshness(t)`

Only dimensions required by the action's Adaptive Proof Geometry are evaluated. Result is `ALLOW` or `BLOCKED`; `ALLOW` permits creation of a bounded PCAL candidate and is not itself execution.

### 5.11 Digital Immune System

Future runtime logic maps failed trust dependencies to affected capabilities and blocks/revokes those capabilities while preserving unrelated safe paths where possible.

> **Fail closed by capability, not fail dead by platform.**

### 5.12 Transparency Memory, Crypto Genome, Sovereign Cell, AI Sentinel

Transparency Memory may later use bounded digest statements/receipts; Crypto Genome provides crypto inventory/agility; Sovereign Cell is optional for justified high-impact confidential-computing paths; AI Sentinel may analyze/explain/recommend but never mint authority, create trusted evidence, change epochs, activate Production/countries, move money, or bypass deterministic laws.

## 6. Trusted-context law

Fields that establish provenance, identity, freshness, environment, or authorization must come from authenticated trusted adapters/context, not from the untrusted payload asking for permission.

The caller must never self-assert `trusted=true`, `ALLOW`, `productionReady`, environment identity, workflow identity, verifier result, current time, current epoch, signal issuer, attestation result, or required proof geometry.

M12 source tests use dependency injection for trusted clocks/context only as a test boundary; those values are not runtime request fields.

## 7. Trust decay and privilege model

Immutable facts such as artifact digests may remain historically true. Runtime evidence, step-up authentication, environment state, signals, and action authority have bounded freshness.

TSTO separates identity, policy eligibility, evidence, decision, and PCAL capability. Owner sovereignty remains the root of policy intent but is not represented as an indefinitely reusable session credential for every destructive/Production action.

## 8. M9–M11 mapping — no rebuild

- **M9 Replay Gene:** durable cross-instance replay state and reviewed migration.
- **M10 Deployment Evidence Gene:** target-environment facts required to prove durable Contact/Handoff replay behavior.
- **M11 Source/Artifact Gene:** exact release source readiness bound into Production V2 artifact evidence.

`M9 + M10 + M11` do not automatically equal universal authorization. TSTO consumes verified facts as exact-action evidence. There is no rewrite of durable replay, no second Market Genesis engine, and no parallel release plane.

## 9. M12 implemented source core

M12 implements these focused source modules:

- `scripts/trust/contracts.cjs`
- `scripts/trust/action-profiles.cjs`
- `scripts/trust/scae.cjs`
- `scripts/trust/pcal.cjs`
- `scripts/trust/market-genesis-evidence.cjs`
- `tests/tsto-m12-contracts.test.cjs`
- `tests/tsto-m12-action-profiles.test.cjs`
- `tests/tsto-m12-scae.test.cjs`
- `tests/tsto-m12-pcal.test.cjs`
- `tests/tsto-m12-market-genesis.test.cjs`

Implemented contracts/boundaries include:

1. closed canonical `TIGER_TRUST_DNA_V1`;
2. closed canonical `TIGER_SOVEREIGN_EPOCH_VECTOR_V1`;
3. closed `TIGER_TRUST_PULSE_V1` restricted to `SYNTHETIC_TEST_ONLY` in M12;
4. immutable `MARKET_GENESIS.CONTACT_HANDOFF` action profile;
5. proof geometry that caller input cannot reduce;
6. exact request/trusted-context separation;
7. deterministic `TIGER_SCAE_DECISION_V1`;
8. test-only `TIGER_PCAL_V1` candidate contract;
9. first Contact/Handoff candidate lease policy of **45 seconds / one use**;
10. pure M10+M11 evidence derivation: M11 source readiness alone cannot become deployed durability.

## 10. Market Genesis Contact/Handoff law under M12

The governed target flow remains:

`User intent → SYNAPSE candidate interpretation → CONTACT_HANDOFF action profile → Market laws → identity/evidence requirements → Trust DNA/Pulse/epochs/signals → SCAE decision → PCAL → PEP → bounded consume → M9 replay authority → terminal handoff`.

M12 source tests prove that:

- whole vehicle state blocks Contact/Handoff even with otherwise complete trust evidence;
- transaction authority blocks Contact/Handoff;
- `source_durable=true` is insufficient without deployed-durable evidence;
- M11 source evidence cannot substitute for M10 deployment evidence;
- invalid M10 migration/replay evidence cannot derive deployed durability;
- caller input cannot reduce required proof dimensions or extend PCAL TTL/use count.

## 11. Privacy and performance

Decision/PCAL output carries bounded digests/references, not raw secrets, database strings, service-role keys, raw nonces, PII, message content, raw private intent, precise location, unnecessary host/runtime identifiers, or buyer/seller transaction state.

Security is risk-adaptive rather than uniformly heavyweight: immutable facts may be cached by digest where safe, freshness-sensitive facts cannot be cached beyond policy, and high-assurance mechanisms are not imposed on every ordinary interaction.

## 12. M12 completion boundary

M12 is source-only and **does not**:

- apply a migration remotely;
- contact or mutate remote Supabase/Production/Staging;
- dispatch Production artifact build/promotion;
- mint a live Production/Staging PCAL;
- create real target-environment Trust Pulse evidence;
- claim M10 `DEPLOYED_DURABLE_VERIFIED`;
- claim RATS/SCITT/SPIFFE/AuthZEN/SLSA/PQC compliance;
- activate Contact/Handoff;
- change DNS/secrets/payment providers;
- merge PR #323;
- change `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`.

The valid M12 source-completion statement is:

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`

This statement is valid only when external same-SHA repository evidence for the current branch head is GREEN. The source document never self-asserts its own final SHA; PR/CI evidence supplies that binding.

It does **not** mean runtime trust, deployed durability, or Production authorization exists.

## 13. Later milestones already bounded by TSTO — not part of M12

- **M13:** Runtime Attestation and Deployment Evidence Bridge.
- **M14:** Trust Nervous System and Continuous Revocation.
- **M15:** Transparency and Workload Identity Constellation.
- **M16:** Digital Immune System.
- **M17:** Crypto Agility and optional Sovereign Cell.

These are planned organs inside TSTO, not invitations to propose additional parallel architectures. Each requires its own implementation evidence and appropriate authorization.

## 14. Current source truth

`TSTO_2026_CURRENT_OWNER_APPROVED_ARCHITECTURE`

`M0_M12_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED` is permitted only when the current exact branch SHA has matching GREEN external CI/rehearsal evidence.

`DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`

`DRAFT_OPEN_UNMERGED / NOT_DEPLOYED_TO_PRODUCTION`

The exact commit SHA, tree, and workflow run IDs are external evidence and must be read from PR #323/current CI. Evidence from an older SHA is historical only after the head changes.
