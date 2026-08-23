# TIGER SOVEREIGN LIVING TRUST GENOME 2026 — Architecture Design

**Date:** 2026-08-23
**Status:** Owner-approved in-chat architecture / written specification pending owner review
**Program:** `TIGER SOVEREIGN LIVING TRUST GENOME 2026`
**Short name:** `TSLTG`
**Immediate implementation milestone:** `M12 — Sovereign Trust Genome Core`
**Baseline:** Private Market Genesis M0–M11 are source-implemented and exact-head repository verified on Draft PR #323. M9 supplies durable replay authority, M10 defines deployed-environment replay evidence, and M11 binds Market Genesis source readiness into the existing sealed Production artifact chain. None of those source states is itself Production deployment authorization.

## 1. Executive thesis

TSLTG changes TIGER from a platform that asks whether a user, build, deployment, or service is generally trusted into a platform that asks whether one **exact action** is presently authorized by a fresh, verifiable intersection of source, artifact, runtime, identity, policy, country, and time evidence.

> **TIGER does not trust a server, user, build, AI output, deployment, document, or boolean merely because it exists. TIGER grants only bounded capabilities derived from verifiable evidence for one exact action.**

The TIGER composition is:

`Release Trust DNA`
+ `Runtime Trust Pulse`
+ `Evidence Constellation`
+ `Sovereign Epoch Chain`
+ `Exact-Action Authority Compiler`
→ `Short-Lived Trust Lease`
→ `Execute Once / Bounded Use`
→ `Immutable Audit`
→ `Automatic Expiry / Capability-Scoped Revocation`

This architecture is **Living Verifiable Sovereignty**.

TSLTG does not replace M9–M11. It treats them as founding genes of the wider trust system.

## 2. Owner laws preserved

TSLTG must never weaken current owner authority.

For Private Market Genesis:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. Pulse/country-payment authority remains separate advertising-billing authority and never becomes buyer–seller transaction authority.
5. Raw private intent, contact data, precise private location, credentials, secrets, and runtime-identifying evidence are not advertising inventory.
6. AI may assist with intent understanding, drafting, normalization, anomaly analysis, explanation, and recommendation, but cannot itself issue sovereign authority, money movement, Production activation, whole-vehicle exceptions, or owner mutation.
7. A green Draft PR, source boolean, workflow success string, administrator role, sponsorship, or payment cannot substitute for a required trust proof.
8. Missing evidence never becomes permission through fallback.

## 3. 2026 standards baseline

TSLTG is vendor-neutral. External standards supply interoperable evidence models; TIGER remains the policy authority.

### 3.1 Stable foundations to adopt or align with

- **SLSA v1.2 Source Track** for source provenance, history, continuous technical controls, and review semantics.
- **SLSA v1.2 Build Track** as the target model for provenance and hardened build isolation; TIGER claims only levels actually demonstrated by the selected builder and controls.
- **in-toto / artifact attestations** for provenance-bound statements where supported by the existing release plane.
- **OIDC short-lived workload credentials** for cloud access where practicable instead of long-lived deployment credentials.
- **Sigstore identity-based signing / Rekor transparency concepts** where they add independent assurance without weakening the existing exact-artifact verifier.
- **IETF RATS, RFC 9334** for Attester → Verifier → Relying Party semantics.
- **Entity Attestation Token, RFC 9711** as a representation option for runtime attestation claims where a real target platform supports it.
- **IETF SCITT, RFC 9943 (June 2026)** for signed-statement transparency and verifiable receipts when TIGER introduces generic transparency registration.
- **SPIFFE/SPIRE** for short-lived workload identity only when distributed runtime services justify workload attestation and mTLS/JWT-SVID identity.
- **CycloneDX 1.7** for SBOM/CBOM and cryptographic inventory.
- **NIST FIPS 203 / 204 / 205** as the stable post-quantum algorithm baseline for future crypto-agility decisions.

### 3.2 Research/watch only

Unstable work may influence future design but is not current compliance authority. SLSA draft Build Environment / Dependency tracks and CycloneDX 2.0 remain watch items until stable and explicitly adopted.

### 3.3 No inflated compliance claims

TSLTG must not state `SLSA_SOURCE_L4`, `SLSA_BUILD_L3`, `SCITT_VERIFIED`, `RATS_VERIFIED`, `SPIFFE_ATTESTED`, `PQC_READY`, or equivalent unless exact requirements and real evidence exist.

SLSA Source L4, for example, requires two trusted persons to review protected-branch changes. Owner sovereignty does not waive that external requirement. If TIGER later wants that claim, owner policy may remain sovereign while an independent security reviewer supplies the required second-person review.

## 4. Architectural components

### 4.1 TIGER Trust DNA

**Purpose:** immutable release identity.

Trust DNA is not merely a Git SHA. It is a closed canonical composition of authenticated release facts and digest references, such as repository identity, source SHA/tree, source provenance, builder/workflow identity, build recipe identity, sealed artifact digest, release manifest digest, SBOM/CBOM digests, reviewed migration digests, policy/authority digests, Market Genesis source-readiness digest, and relevant policy/country epoch references.

Trust DNA must derive from trusted repository/release context or authenticated evidence. A caller cannot manufacture it by sending strings that look like hashes.

M12 may exercise Trust DNA using deterministic fixtures and current source evidence, but **M12 does not claim that a real Production Trust DNA has been emitted or deployed**. Actual release-plane binding is a later gated milestone.

### 4.2 TIGER Trust Pulse

**Purpose:** fresh runtime state.

A release can be immutable while its environment changes. Trust Pulse represents time-bounded runtime evidence such as exact release/artifact identity observed at runtime, environment class, workload identity, migration state, approved configuration/reference values, replay-protection state, attestation freshness, policy epoch, drift state, and revocation state.

A stale pulse is `BLOCKED`, never warning-to-PASS.

M12 defines the closed contract and evaluator semantics only. It does **not** fabricate Staging or Production pulses. Real runtime attestation belongs to M13.

### 4.3 TIGER Evidence Constellation

**Purpose:** avoid single-assertion authority.

Critical actions may require multiple evidence classes: source provenance, artifact provenance, build attestation, transparency receipt, environment attestation, workload identity, policy/epoch state, country/legal state, and replay evidence.

The constellation is a mandatory proof set, **not a percentage trust score**:

`ALLOW = proof_A AND proof_B AND proof_C ...`

A missing mandatory proof is `BLOCKED`, never `82% trusted`.

A single evidence object must not silently satisfy multiple logically independent proof requirements unless the policy explicitly defines that equivalence.

### 4.4 TIGER Sovereign Epoch Chain

**Purpose:** invalidate old authority deterministically.

Versioned sovereign domains may expose monotonic epochs such as:

- `OWNER_EPOCH`
- `POLICY_EPOCH`
- `MARKET_EPOCH`
- `COUNTRY_<code>_EPOCH`
- `AI_POLICY_EPOCH`
- `CRYPTO_EPOCH`

A Trust Lease binds to the exact relevant epoch vector. If a controlling epoch changes, the lease no longer matches current authority and becomes invalid.

Epoch mismatch supplements, not replaces, explicit revocation where explicit revocation is required.

### 4.5 TIGER Authority Compiler

**Purpose:** convert an intent into a deterministic proof requirement, not into permission.

For example, `CONTACT_SELLER` compiles to a closed action profile that may require eligible object/sector state, whole-vehicle prohibition, publication/visibility validity, actor/contact policy, country policy, exact Trust DNA, fresh Trust Pulse, durable replay proof, unused capability state, and the no-transaction boundary.

AI may propose an intent classification, but the compiler determines the authoritative requirement profile.

### 4.6 TIGER Trust Lease

**Purpose:** replace broad long-lived privilege with an exact bounded capability.

A lease is bound to the exact action, subject/actor reference, resource reference, country/sector scope where relevant, Trust DNA digest, required epoch vector, Trust Pulse/attestation-result reference, issue/expiry times, bounded use count, replay binding, decision-policy version, and audit correlation reference.

A lease is not `admin=true`.

A lease becomes invalid on expiry, use exhaustion, replay, release mismatch, epoch mismatch, explicit revocation, required Pulse expiry, evidence invalidation, or policy incompatibility.

The lease carries only bounded references/digests required for verification; it must not embed raw sensitive evidence.

**M12 does not mint a live Production or Staging lease.** It implements pure source contracts/evaluation and test-only lease fixtures. Live lease issuance requires later runtime integration and separate approval.

### 4.7 TIGER Digital Immune System

**Purpose:** respond to drift by capability instead of blindly killing the platform.

When expected and observed trust state diverge, later runtime logic blocks/revokes only capabilities depending on the failed evidence while preserving unrelated safe paths.

> **Fail closed by capability, not fail dead by platform.**

Loss of durable Contact/Handoff evidence, for example, blocks new Contact/Handoff leases but does not automatically disable unrelated public social-feed reads.

### 4.8 TIGER Sovereign Cell — optional high-assurance tier

Confidential computing is not a universal requirement. A future Sovereign Cell may protect only highest-impact operations such as owner L4 authorization, trust-root/signing operations, selected sensitive financial/ad controls, key derivation, or selected private AI processing.

No cloud TEE vendor is mandated. Hardware attestation is introduced only when a specific threat model and cost/operational case justify it.

## 5. Trusted-context law

This is a core security boundary.

Fields that establish provenance, identity, freshness, environment, or authorization must come from an authenticated trusted adapter/context, not from the same untrusted payload asking for permission.

Examples include:

- repository ID;
- source SHA/tree;
- workflow/builder identity and run ID;
- artifact ID/digest;
- environment identity;
- attestation issuer/verifier identity;
- workload identity;
- trusted current time;
- current epoch vector;
- transparency receipt verification result.

An input may contain a reference to such evidence, but the verifier must independently bind/authenticate the referenced fact.

The caller must never be able to self-assert `trusted=true`, `ALLOW`, `productionReady`, an environment identity, workflow identity, current time, current epoch, or verifier result.

M12 pure tests may inject trusted adapters/clocks explicitly. That injection represents the trust boundary in tests; it is not a runtime request field.

## 6. Trust decay and freshness

Different evidence classes have different lifetimes.

Immutable facts such as an artifact digest may remain valid historically. Runtime evidence, step-up authentication, environment state, and authorization require bounded freshness.

Every time-sensitive proof class must define issued time, freshness/expiry, epoch, supersession/revocation semantics, and which action profiles depend on it.

A verifier must not silently extend freshness. Freshness challenges/nonces used by later attestation protocols must be verifier-controlled to prevent replay of old good-state evidence.

## 7. Privilege model

TSLTG separates:

1. **Identity** — who or what is acting.
2. **Authority policy** — which actions could be eligible.
3. **Evidence** — what proves required conditions now.
4. **Capability lease** — bounded permission for one exact action.

Owner sovereignty remains the root of policy intent. It must not be represented as an indefinitely reusable session credential for every destructive or Production action.

High-impact action profiles may require fresh owner/admin step-up, independent review where policy demands it, exact release binding, and short lease duration.

## 8. AI boundary

AI is an analyst and intent interpreter, never the sovereign signer.

AI may interpret natural language, classify candidate intent, explain BLOCKED reasons, recommend remediation, identify anomalies, and assist code authoring/review under normal controls.

AI must not mint leases, change epochs, create trusted evidence from its own output, declare Production healthy, activate countries, move money, bypass Market Genesis laws, mutate owner authority, or authorize destructive L4 actions.

The final authorization path remains deterministic and independently verifiable.

## 9. M9–M11 become founding genes

### M9 — Replay Gene

M9 supplies durable cross-instance replay state and the reviewed migration. It becomes the replay-consumption gene for one-time/bounded capabilities.

### M10 — Deployment Evidence Gene

M10 defines the target-environment facts required to prove durable Contact/Handoff replay behavior. Its current evidence contract remains authoritative until an explicitly approved successor exists.

### M11 — Source/Artifact Gene

M11 proves the exact release source passed Market Genesis source contracts before sealing and binds source-readiness bytes into the Production V2 artifact chain.

### Combined law

`M9 + M10 + M11` do not automatically equal universal authorization. TSLTG consumes their verified facts as action-specific evidence.

## 10. Market Genesis Contact/Handoff target flow

`User intent`
→ `SYNAPSE interpretation`
→ `Authority Compiler: CONTACT_HANDOFF requirements`
→ `Market eligibility + whole-vehicle prohibition + no-transaction checks`
→ `Exact Trust DNA verification`
→ `Fresh target-environment Trust Pulse / replay attestation`
→ `Actor/contact policy verification`
→ `Epoch vector verification`
→ `Trust Lease`
→ `single bounded consume`
→ `M9 durable replay authority`
→ `terminal handoff`

The lease expires or dies on use and can never become buyer/seller order, product payment, escrow, settlement, delivery, ownership-transfer, or dispute authority.

M12 verifies this flow through pure source fixtures only; it does not activate the runtime path.

## 11. Advertising target flow

Pulse may use the same trust architecture for exact campaign activation actions. A campaign activation profile can require a valid country profile, authorized ad-billing profile, eligible campaign object, DIDE/capacity policy, pricing/policy epoch, trusted release/runtime state, and exact owner/partner capability scope.

This never grants TIGER authority over payment for the advertised underlying product/service transaction.

## 12. Provider-neutrality law

TIGER owns the trust model. Vendors provide evidence/execution surfaces.

- GitHub may provide source/build/provenance evidence, not sovereign policy.
- Cloud providers may provide workload/hardware attestation, not owner policy.
- Sigstore/Rekor or SCITT Transparency Services may provide transparency, not business authorization.
- SPIFFE/SPIRE may provide workload identity, not action permission.
- AI may provide analysis, not deterministic authority.

TSLTG should be able to verify equivalent evidence from another conforming provider without rewriting TIGER business laws.

## 13. Privacy and evidence minimization

Trust evidence must contain only what a verifier needs.

Prohibited content includes raw secrets/credentials, database connection strings, service-role keys, reusable authorization capabilities, raw Contact/Handoff nonces, PII, message content, raw private intent, precise private location, unnecessary host/IP/runtime identifiers, and buyer/seller transaction state.

Transparency systems should receive signed statements about cryptographic digests and bounded non-sensitive metadata rather than raw sensitive runtime evidence.

## 14. Failure model

TSLTG is fail-closed and reason-bounded. Core categories include:

- `TRUST_DNA_MISSING`
- `TRUST_DNA_INVALID`
- `TRUST_DNA_RELEASE_MISMATCH`
- `TRUST_PULSE_MISSING`
- `TRUST_PULSE_STALE`
- `TRUST_ATTESTATION_INVALID`
- `TRUST_EVIDENCE_MISSING`
- `TRUST_EVIDENCE_DIGEST_MISMATCH`
- `TRUST_EPOCH_MISMATCH`
- `TRUST_POLICY_BLOCKED`
- `TRUST_LEASE_EXPIRED`
- `TRUST_LEASE_REPLAYED`
- `TRUST_LEASE_SCOPE_MISMATCH`
- `TRUST_LEASE_USE_EXHAUSTED`
- `TRUST_WORKLOAD_IDENTITY_UNPROVEN`
- `TRUST_TRANSPARENCY_RECEIPT_UNPROVEN`

Implementations may define narrower bounded subcodes but must not echo secrets or arbitrary untrusted values.

## 15. Delivery decomposition

TSLTG is deliberately too broad for one implementation plan. Every later milestone receives its own review before implementation.

### M12 — Sovereign Trust Genome Core — first

**Scope:** source-only foundation; no remote runtime mutation.

M12 defines/tests:

1. closed canonical `TIGER_TRUST_DNA_V1`;
2. closed canonical `TIGER_SOVEREIGN_EPOCH_VECTOR_V1`;
3. action-specific requirement profiles;
4. closed Trust Pulse contract shape without real environment attestation;
5. closed canonical `TIGER_TRUST_LEASE_V1`;
6. pure deterministic Authority Compiler / Trust Lease evaluator;
7. explicit trusted-context adapters/clock boundary;
8. fail-closed behavior when mandatory runtime/deployment evidence is absent;
9. mapping of M9/M10/M11 evidence without reimplementation;
10. Market Genesis Contact/Handoff positive/negative source fixtures;
11. privacy/forbidden-field tests;
12. caller/AI inability to set authority directly.

M12 explicitly does **not**:

- alter SVEF Production V2 merely to add another evidence file;
- dispatch a Production artifact builder;
- apply a migration;
- call a remote database;
- deploy Staging/Production;
- create a real remote Trust Pulse;
- mint a live runtime Trust Lease;
- integrate SPIRE;
- register SCITT/Rekor statements;
- introduce confidential computing;
- enable Contact/Handoff;
- merge PR #323.

### M13 — Attested Deployment Evidence Bridge — later

Maps real environment evidence to an Attester/Verifier/Relying Party model, binds M10 replay proof to exact Trust DNA, and produces fresh deployment attestation results. EAT-compatible representation may be adopted when justified by the target platform. No claim exists until a real environment and trust anchor are proven.

### M14 — Transparency Constellation — later

Adds signed-statement transparency and verifiable receipts. SCITT RFC 9943 is the preferred generic architecture; Sigstore/Rekor may cover software-signature transparency. Policy determines which receipts are mandatory for which actions.

### M15 — Workload Identity Fabric — later and conditional

Adds SPIFFE/SPIRE only when distributed backend workloads make it useful. Static long-lived service credentials should be reduced in favor of short-lived workload identity when operationally justified.

### M16 — Digital Immune System — later

Adds continuous drift appraisal, capability-scoped revocation, trust-decay scheduling, lease invalidation, and evidence-driven remediation while preserving unrelated safe capabilities.

### M17 — Crypto Agility + Sovereign Cell — later and conditional

Adds CBOM-driven crypto inventory, algorithm agility, post-quantum transition policy, and optional confidential-computing Sovereign Cell for highest-assurance operations.

These milestone numbers describe the proposed TSLTG program order; they do not authorize any later milestone automatically.

## 16. M12 implementation boundary and acceptance

The implementation plan written after this specification is approved covers **M12 only**.

Exact filenames are intentionally deferred to implementation planning after repository inspection; this is not an unresolved behavioral requirement.

M12 is source-complete only when:

1. Trust DNA, epoch vector, Pulse contract, requirement profile, and Lease schemas are closed/canonical.
2. Caller-supplied `ALLOW`, `trusted`, `admin`, `productionReady`, environment identity, workflow identity, current time, epoch, or verifier result cannot create authority.
3. AI output cannot become trusted authority without deterministic validation.
4. Missing mandatory evidence blocks.
5. Stale Pulse blocks profiles requiring freshness.
6. Epoch mismatch invalidates a lease fixture.
7. Release Trust DNA mismatch invalidates a lease fixture.
8. Lease scope/use/expiry/replay invariants are enforced.
9. Market Genesis Contact/Handoff still enforces whole-vehicle prohibition and no-transaction law.
10. M9/M10/M11 remain referenced, not duplicated.
11. M12 does not change SVEF Production bundle version.
12. No network, remote DB, Production/Staging, cloud, transparency-log, SPIRE, TEE, DNS, secret, or payment-provider mutation occurs.
13. No test-only Trust DNA/Pulse/Lease is represented as deployed evidence or live authority.
14. Existing exact-head quality/security/database rehearsals remain GREEN on one final M12 SHA.
15. PR #323 remains Draft/Open/Unmerged unless a later explicit integration decision changes that status.

## 17. Completion language

M12 may establish only:

`SOVEREIGN_TRUST_GENOME_CORE_SOURCE_VERIFIED`

It must not claim:

- `RUNTIME_ATTESTED`
- `SCITT_VERIFIED`
- `SPIFFE_ATTESTED`
- `CONFIDENTIAL_COMPUTING_VERIFIED`
- `PQC_MIGRATION_COMPLETE`
- `DEPLOYED_DURABLE_VERIFIED`
- `CONTACT_HANDOFF_ENABLED`
- `PRODUCTION_READY`
- `GLOBAL_LAUNCH_ELIGIBLE`

Those states require their own real evidence and separately authorized milestones.

## 18. Research references — stable baseline as of 2026-08-23

- SLSA v1.2: `https://slsa.dev/spec/v1.2/`
- SLSA Source requirements: `https://slsa.dev/spec/v1.2/source-requirements`
- SLSA Build requirements: `https://slsa.dev/spec/v1.2/build-requirements`
- IETF RATS, RFC 9334: `https://www.rfc-editor.org/rfc/rfc9334.html`
- Entity Attestation Token, RFC 9711: `https://www.rfc-editor.org/rfc/rfc9711.html`
- SCITT, RFC 9943: `https://www.rfc-editor.org/rfc/rfc9943.html`
- Sigstore keyless signing: `https://docs.sigstore.dev/cosign/signing/overview/`
- Sigstore Rekor: `https://docs.sigstore.dev/logging/overview/`
- SPIRE concepts: `https://spiffe.io/docs/latest/spire-about/spire-concepts/`
- SPIFFE SVIDs: `https://spiffe.io/docs/latest/deploying/svids/`
- CycloneDX 1.7: `https://cyclonedx.org/docs/1.7/json/`
- CycloneDX CBOM: `https://cyclonedx.org/capabilities/cbom/`
- NIST FIPS 203 / ML-KEM: `https://csrc.nist.gov/pubs/fips/203/final`
- NIST FIPS 204 / ML-DSA: `https://csrc.nist.gov/pubs/fips/204/final`
- NIST FIPS 205 / SLH-DSA: `https://csrc.nist.gov/pubs/fips/205/final`

## 19. Novelty / patent caution

TSLTG intentionally combines existing standards with TIGER-specific composition: release DNA, living runtime pulse, mandatory evidence constellation, sovereign epoch invalidation, exact-action compilation, and bounded trust leases.

This document does **not** claim that the composition is globally novel, patentable, or free of prior art. Any patentability claim requires a separate professional prior-art/patent search and legal analysis.

## 20. Final architectural law

> **No exact action receives authority unless TIGER can verify the required release identity, runtime state, actor/workload identity, policy/epoch state, freshness, and action scope. Authority is short-lived, bounded, auditable, and dies automatically when its evidence or governing epoch no longer matches.**

That law controls M12 and all later TSLTG milestones.
