# TIGER SOVEREIGN LIVING TRUST GENOME 2026 — Architecture Design

**Date:** 2026-08-23
**Status:** Owner-approved in-chat architecture / written specification pending owner review
**Program name:** `TIGER SOVEREIGN LIVING TRUST GENOME 2026`
**Short name:** `TSLTG`
**Immediate implementation milestone:** `M12 — Sovereign Trust Genome Core`
**Baseline:** Private Market Genesis M0–M11 are source-implemented and exact-head repository verified on Draft PR #323. M9 supplies durable replay authority, M10 defines deployed-environment replay evidence, and M11 binds Market Genesis source readiness into the existing sealed Production artifact chain. None of those source states is itself Production deployment authorization.

## 1. Executive thesis

TSLTG changes TIGER from a platform that asks whether a user, build, deployment, or service is generally trusted into a platform that asks whether one **exact action** is presently authorized by a fresh, verifiable intersection of source, artifact, runtime, identity, policy, country, and time evidence.

The governing statement is:

> **TIGER does not trust a server, user, build, AI output, deployment, document, or boolean merely because it exists. TIGER grants only bounded capabilities derived from continuously verifiable evidence for one exact action.**

The core innovation is the composition, not any single external standard:

`Release Trust DNA`
+ `Runtime Trust Pulse`
+ `Evidence Constellation`
+ `Sovereign Epoch Chain`
+ `Exact-Action Authority Compiler`
→ `Short-Lived Trust Lease`
→ `Execute Once / Bounded Use`
→ `Immutable Audit`
→ `Automatic Expiry or Revocation on Drift`

This architecture is called **Living Verifiable Sovereignty**.

TSLTG does not replace M9–M11. It treats them as the first verified genes of the wider trust system.

## 2. Non-negotiable owner laws preserved

TSLTG must never weaken current owner authority.

For Private Market Genesis specifically:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. Pulse/country-payment authority remains separate advertising-billing authority and never becomes buyer–seller transaction authority.
5. Raw private intent, contact data, precise private location, credentials, secrets, and runtime-identifying evidence are not advertising inventory.
6. AI may assist with intent understanding, drafting, normalization, anomaly analysis, explanation, and recommendation, but cannot itself issue sovereign authority, money movement, Production activation, whole-vehicle exceptions, or owner mutation.
7. A green Draft PR, source boolean, workflow success string, administrator role, sponsorship, or payment cannot substitute for a required trust proof.
8. No fallback converts missing evidence into permission.

## 3. 2026 standards baseline

TSLTG is vendor-neutral and uses stable external standards as evidence sources rather than making any vendor the sovereign authority.

### 3.1 Adopt as stable foundations

- **SLSA v1.2 Source Track** for source provenance, history, continuous technical controls, and review semantics.
- **SLSA v1.2 Build Track** as the target model for provenance and hardened build isolation; TIGER must claim only levels actually demonstrated by the selected builder and controls.
- **in-toto / artifact attestations** for binding artifacts to provenance and policy-verifiable statements where already supported by the release plane.
- **GitHub OIDC / short-lived workload credentials** where cloud access is required, instead of long-lived deployment credentials whenever practicable.
- **Sigstore identity-based signing and transparency concepts** where they add independent assurance without duplicating or weakening the existing exact-artifact verification chain.
- **IETF RATS architecture (RFC 9334)** for the Attester → Verifier → Relying Party trust model.
- **Entity Attestation Token (RFC 9711)** as a standards-aligned representation option for runtime attestation claims when real target environments support it.
- **IETF SCITT architecture (RFC 9943, June 2026)** for signed-statement transparency and independently verifiable receipts when TIGER adds transparency registration.
- **SPIFFE/SPIRE** for short-lived workload identity only when TIGER has distributed runtime services that benefit from workload attestation and mTLS/JWT-SVID identity.
- **CycloneDX 1.7** for SBOM/CBOM and cryptographic inventory, including post-quantum migration readiness.
- **NIST FIPS 203 / 204 / 205** as the stable post-quantum algorithm baseline for future crypto-agility decisions; no forced migration is authorized merely by this design.

### 3.2 Watch, do not claim as current authority

Emerging or draft standards may inform future architecture, but TIGER must not claim compliance with unstable work.

In particular, SLSA working-draft tracks such as Build Environment and Dependency Track are **research/watch inputs**, not current compliance claims. CycloneDX 2.0 is likewise future-facing until a stable version and an explicit migration decision exist.

### 3.3 No inflated compliance claims

TSLTG must not state `SLSA_SOURCE_L4`, `SLSA_BUILD_L3`, `SCITT_VERIFIED`, `RATS_VERIFIED`, `SPIFFE_ATTESTED`, `PQC_READY`, or equivalent unless the exact requirements and evidence for that claim are implemented and verified.

For example, SLSA Source L4 requires two trusted persons to review protected-branch changes. Owner sovereignty does not make that requirement disappear. TIGER may preserve the owner as sovereign policy root while using an independent security reviewer for release-critical changes if Source L4 is later desired.

## 4. Architectural components

### 4.1 TIGER Trust DNA

**Purpose:** immutable release identity.

Trust DNA is not merely a Git SHA. It is a closed, canonical composition of exact release facts and digest references.

Conceptual members include:

- repository identity;
- source SHA;
- source tree;
- source provenance reference/digest;
- builder identity / workflow identity;
- build recipe identity;
- sealed artifact digest;
- production bundle manifest digest;
- SBOM digest;
- CBOM digest when present;
- reviewed migration digests;
- policy/authority digests;
- Market Genesis source-readiness digest;
- AI policy digest where applicable;
- country-contract/policy epoch references where applicable.

Trust DNA must reference existing authenticated artifacts rather than copying arbitrary caller-supplied values.

### 4.2 TIGER Trust Pulse

**Purpose:** fresh runtime state.

A release can be immutable while its environment changes. Trust Pulse therefore represents time-bounded runtime evidence, such as:

- exact release/artifact identity observed at runtime;
- environment class;
- runtime/workload identity;
- migration state;
- configuration digest or approved reference values;
- replay-protection state;
- attestation freshness;
- policy epoch;
- drift state;
- revocation state.

A Trust Pulse has an explicit freshness window. A stale pulse is not converted to a warning-to-PASS.

M12 defines this contract but does **not** fabricate real Staging or Production pulses. Real runtime attestation is a later separately gated milestone.

### 4.3 TIGER Evidence Constellation

**Purpose:** avoid single-assertion authority.

Critical actions may require multiple independent evidence classes. Examples:

- source provenance;
- artifact provenance;
- build attestation;
- transparency receipt;
- target-environment attestation;
- workload identity;
- policy/epoch state;
- country/legal activation state;
- replay evidence.

The constellation is a mandatory proof set, **not a percentage score**.

For a critical action:

`ALLOW = proof_A AND proof_B AND proof_C ...`

A missing mandatory proof produces `BLOCKED`, never `82% trusted`.

### 4.4 TIGER Sovereign Epoch Chain

**Purpose:** invalidate old authority without maintaining an unbounded token revocation list.

Versioned sovereign domains may expose monotonic epochs such as:

- `OWNER_EPOCH`
- `POLICY_EPOCH`
- `MARKET_EPOCH`
- `COUNTRY_<code>_EPOCH`
- `AI_POLICY_EPOCH`
- `CRYPTO_EPOCH`

A Trust Lease binds to the exact relevant epoch vector. If a controlling epoch changes, the lease no longer matches current authority and becomes invalid.

Epochs do not replace explicit revocation where required. They provide a deterministic invalidation mechanism for authority changes.

### 4.5 TIGER Authority Compiler

**Purpose:** convert an intent into a deterministic proof requirement, not into permission.

Example:

`intent = CONTACT_SELLER`

The compiler resolves the required policy profile for that exact action and produces a closed requirement set. It does not accept AI-generated `ALLOW` decisions.

For Market Genesis Contact/Handoff the requirement profile may include:

- object is an eligible auto part or other allowed sector object;
- whole vehicle prohibition satisfied;
- publication and visibility valid;
- actor/contact reveal policy valid;
- country policy valid;
- exact release Trust DNA valid;
- M10/M13 deployment evidence valid when required;
- fresh Trust Pulse;
- durable replay proof;
- capability unused;
- no buyer–seller transaction authority.

### 4.6 TIGER Trust Lease

**Purpose:** replace broad long-lived privilege with an exact, bounded capability.

A Trust Lease is issued only after all mandatory requirements for one action pass.

Conceptual lease binding:

- lease schema/version;
- exact action;
- actor/subject identity reference;
- exact resource/object reference;
- country/sector scope where applicable;
- exact release Trust DNA digest;
- exact required epoch vector;
- Trust Pulse/attestation result reference;
- issued-at / expires-at;
- bounded use count;
- replay/nonce binding;
- decision-policy version;
- audit correlation reference.

A lease is not `admin=true`. It is authority for one bounded operation.

Lease invalidation conditions include at least:

- expiry;
- use-count exhaustion;
- replay detection;
- release mismatch;
- epoch mismatch;
- revocation;
- required Trust Pulse expiry;
- mandatory evidence invalidation;
- policy incompatibility.

### 4.7 TIGER Digital Immune System

**Purpose:** respond to drift by capability, not by blindly killing the whole platform.

When expected and observed trust state diverge, the system determines which capabilities depend on the failed evidence and blocks/revokes those capabilities while preserving unrelated safe paths.

The governing principle is:

> **Fail closed by capability, not fail dead by platform.**

Example: loss of durable Contact/Handoff evidence must block new Contact/Handoff leases; it must not automatically make public social-feed reads unavailable if those reads do not depend on that evidence.

### 4.8 TIGER Sovereign Cell — optional high-assurance tier

Confidential computing / hardware-backed attestation is not a universal requirement.

A future Sovereign Cell may protect only the highest-impact operations, such as:

- owner L4 authorization;
- release signing or trust-root operations;
- highly sensitive advertising/financial control decisions;
- sensitive key derivation;
- selected private AI processing.

No cloud TEE vendor is mandated by this architecture. Hardware attestation is introduced only when a concrete threat model and cost/operational case justify it.

## 5. Trust decay and freshness

TSLTG treats evidence as having different lifetimes.

Immutable evidence, such as an artifact digest, may remain valid as a historical fact. Runtime evidence, session step-up, environment state, and authorization must have tighter freshness windows.

Every time-sensitive proof class must define:

- `issued_at`;
- `fresh_until` or equivalent deterministic expiry;
- authority/policy epoch;
- supersession/revocation semantics;
- the exact actions that depend on it.

A verifier must not silently extend evidence freshness.

## 6. Privilege model

TSLTG separates four concepts:

1. **Identity** — who or what is acting.
2. **Authority policy** — what actions are eligible for that identity/context.
3. **Evidence** — what proves the required state now.
4. **Capability lease** — the bounded authorization to execute one exact action.

Owner sovereignty remains the root of policy intent. It must not be represented as an indefinitely reusable session credential for every destructive or Production action.

High-impact actions should be capable of requiring fresh step-up, exact action binding, exact release binding, and short lease duration.

## 7. AI boundary

AI is an analyst and intent interpreter, never the sovereign signer.

AI may:

- interpret natural-language intent;
- classify requested action candidates;
- explain a BLOCKED reason to the user;
- recommend remediation;
- identify drift/anomaly patterns;
- assist source authoring or review under normal controls.

AI must not directly:

- mint Trust Leases;
- change sovereign epochs;
- create trusted evidence from its own output;
- declare Production healthy;
- activate countries;
- move money;
- bypass Market Genesis whole-vehicle/no-transaction laws;
- mutate owner authority;
- authorize destructive L4 actions.

The final authorization path remains deterministic and independently verifiable.

## 8. M9–M11 mapping into TSLTG

Existing Market Genesis work becomes foundational rather than obsolete.

### M9 — Replay Gene

M9 supplies durable cross-instance replay state and the reviewed migration. It is the replay-consumption gene for future Trust Leases where a one-time capability is required.

### M10 — Deployment Evidence Gene

M10 defines the minimum target-environment facts required to prove durable Contact/Handoff replay behavior. Its current release evidence contract remains authoritative for those facts until a separately approved superseding contract exists.

### M11 — Source/Artifact Gene

M11 proves the exact release source contains and passed Market Genesis source contracts before sealing. It binds the Market source-readiness bytes into the existing Production V2 artifact chain.

### Combined law

`M9 + M10 + M11` do not by themselves equal a universal authorization system.

TSLTG uses them as evidence inputs for action-specific decisions.

## 9. Market Genesis example — Contact/Handoff

The future target flow is:

`User intent`
→ `SYNAPSE interpretation`
→ `Authority Compiler: CONTACT_HANDOFF requirements`
→ `Market eligibility + whole-vehicle prohibition + no-transaction checks`
→ `Exact release Trust DNA verification`
→ `Fresh target-environment Trust Pulse / replay attestation`
→ `Actor/contact policy verification`
→ `Epoch vector verification`
→ `Trust Lease mint`
→ `single bounded consume`
→ `M9 durable replay authority`
→ `terminal handoff`

The Trust Lease expires or dies on use. It cannot become a general buyer/seller order, payment, escrow, settlement, delivery, ownership-transfer, or dispute capability.

## 10. Advertising example

TIGER Pulse may use the same trust architecture for an exact campaign activation action.

A campaign activation lease can require:

- valid country contract/profile;
- authorized ad billing/payment profile;
- eligible campaign object;
- capacity and DIDE policy state;
- pricing/policy epoch;
- trusted release/runtime state;
- exact owner/partner capability scope.

This architecture does not grant TIGER authority over payment for the advertised underlying product/service transaction.

## 11. Provider-neutrality law

TIGER owns the trust model. Vendors provide evidence or execution surfaces.

Therefore:

- GitHub may be a source/build/provenance provider, not sovereign authority.
- A cloud provider may provide workload/hardware attestation, not owner policy.
- Sigstore/Rekor or a SCITT Transparency Service may provide signed-statement transparency, not action authorization.
- SPIFFE/SPIRE may provide workload identity, not business permission.
- AI may provide analysis, not deterministic authority.

TSLTG contracts must remain capable of verifying equivalent evidence from another conforming provider without rewriting TIGER business laws.

## 12. Privacy and evidence minimization

Trust evidence must contain only what a verifier needs.

Prohibited evidence content includes, unless a separately reviewed cryptographic protocol explicitly requires a protected representation:

- raw secrets or credentials;
- database connection strings;
- service-role keys;
- reusable authorization tokens/capabilities;
- raw Contact/Handoff nonces;
- PII;
- message content;
- raw private intent;
- precise private location;
- unnecessary hostnames/IP addresses;
- unnecessary runtime instance identifiers;
- buyer/seller transaction state.

Where a transparency system is used, TIGER should register signed statements about cryptographic digests and bounded non-sensitive metadata rather than publishing sensitive runtime evidence.

## 13. Failure model

TSLTG is fail-closed and reason-bounded.

Critical categories include:

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

Implementation milestones may introduce narrower subcodes, but must not echo secrets or arbitrary untrusted payload values.

## 14. Delivery decomposition

TSLTG is too broad for one implementation plan. It is intentionally decomposed into independently reviewable milestones. Each later milestone receives its own written design/spec or amendment before implementation.

### M12 — Sovereign Trust Genome Core — implement first

**Scope:** source-only foundation; no remote runtime mutation.

M12 will define and test:

1. canonical closed `TIGER_TRUST_DNA_V1` contract;
2. canonical `TIGER_SOVEREIGN_EPOCH_VECTOR_V1` contract;
3. action-specific requirement profiles;
4. canonical Trust Pulse **contract shape** without claiming real runtime attestation;
5. canonical `TIGER_TRUST_LEASE_V1` contract;
6. pure deterministic Authority Compiler / Trust Lease evaluator;
7. fail-closed behavior when mandatory runtime/deployment evidence is absent;
8. mapping of M9/M10/M11 evidence into the new evaluator without changing their current truth;
9. Market Genesis Contact/Handoff negative and positive source-fixture tests;
10. privacy/forbidden-field tests;
11. no AI/direct-caller path capable of setting `ALLOW` or authority booleans directly.

**M12 explicitly does not:**

- change SVEF Production V2 merely to add another evidence file;
- dispatch the Production artifact builder;
- apply a migration;
- call a remote database;
- deploy Staging/Production;
- create a real Trust Pulse from a remote environment;
- integrate SPIRE;
- create SCITT/Rekor registrations;
- introduce confidential computing;
- enable Contact/Handoff;
- merge PR #323.

This prevents release-schema churn while the sovereign semantics are still being proven.

### M13 — Attested Deployment Evidence Bridge — later

Maps real environment evidence into a trusted Attester/Verifier/Relying Party model, binds M10 replay proof to exact release Trust DNA, and produces fresh deployment attestation results. EAT-compatible representation may be used where appropriate. No claim is allowed until a real target environment and trust anchor exist.

### M14 — Transparency Constellation — later

Adds signed statement transparency and independently verifiable receipts. SCITT RFC 9943 is the preferred architectural reference for generic supply-chain statements; Sigstore/Rekor may be used for software-signature transparency where appropriate. TIGER policy decides which receipts are mandatory for which actions.

### M15 — Workload Identity Fabric — later and conditional

Adds SPIFFE/SPIRE only when distributed backend workloads make it useful. Static API keys should be reduced in favor of short-lived workload identity where operationally justified.

### M16 — Digital Immune System — later

Adds continuous drift evaluation, capability-scoped revocation, trust decay scheduling, lease invalidation, and evidence-driven remediation while preserving unrelated safe capabilities.

### M17 — Crypto Agility + Sovereign Cell — later and conditional

Adds CBOM-driven crypto inventory, algorithm agility, post-quantum transition policy, and optional confidential-computing Sovereign Cell for the highest-assurance operations. No cloud-vendor TEE dependency is required before the threat model justifies it.

## 15. M12 implementation boundaries

The implementation plan written after this specification is approved must cover **M12 only**.

Expected M12 source surface should be small and modular, likely centered under a dedicated trust namespace such as:

- `scripts/trust/` or another repository-consistent security namespace;
- focused `node:test` suites;
- Market Genesis integration adapters that consume existing M9/M10/M11 contracts rather than duplicating them;
- documentation/owner truth only after exact-head verification.

Exact filenames are an implementation-plan decision after repository inspection. This specification defines behavior and trust boundaries, not premature file naming.

## 16. M12 acceptance criteria

M12 is source-complete only when all of the following are true:

1. Trust DNA, epoch vector, Trust Pulse contract, requirement profile, and Trust Lease schemas are closed and canonical.
2. Caller-supplied `ALLOW`, `trusted`, `admin`, `productionReady`, or equivalent booleans cannot create authority.
3. AI output cannot become a trusted authority input without deterministic validation.
4. Missing mandatory evidence always blocks.
5. Stale Trust Pulse blocks any action profile that requires freshness.
6. Epoch mismatch invalidates a lease.
7. Release Trust DNA mismatch invalidates a lease.
8. Lease scope/use/expiry/replay invariants are enforced.
9. Market Genesis Contact/Handoff still enforces whole-vehicle prohibition and no-transaction law.
10. M9/M10/M11 contracts remain valid and are referenced rather than reimplemented.
11. No SVEF Production bundle version change occurs in M12.
12. No network, remote database, Production/Staging, cloud, transparency-log, SPIRE, TEE, DNS, secret, or payment-provider mutation occurs.
13. Existing exact-head quality/security/database rehearsals remain GREEN on one final M12 SHA.
14. PR #323 remains Draft/Open/Unmerged unless a later explicit integration decision changes that status.

## 17. Completion language

M12 completion may establish:

`SOVEREIGN_TRUST_GENOME_CORE_SOURCE_VERIFIED`

It must **not** claim:

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

- SLSA v1.2 specification: `https://slsa.dev/spec/v1.2/`
- SLSA v1.2 Source requirements: `https://slsa.dev/spec/v1.2/source-requirements`
- SLSA v1.2 Build requirements: `https://slsa.dev/spec/v1.2/build-requirements`
- IETF RATS Architecture, RFC 9334: `https://www.rfc-editor.org/rfc/rfc9334.html`
- Entity Attestation Token, RFC 9711: `https://www.rfc-editor.org/rfc/rfc9711.html`
- SCITT Architecture, RFC 9943: `https://www.rfc-editor.org/rfc/rfc9943.html`
- Sigstore keyless signing overview: `https://docs.sigstore.dev/cosign/signing/overview/`
- Sigstore Rekor overview: `https://docs.sigstore.dev/logging/overview/`
- SPIFFE/SPIRE concepts: `https://spiffe.io/docs/latest/spire-about/spire-concepts/`
- SPIFFE SVIDs: `https://spiffe.io/docs/latest/deploying/svids/`
- CycloneDX 1.7: `https://cyclonedx.org/docs/1.7/json/`
- CycloneDX CBOM: `https://cyclonedx.org/capabilities/cbom/`
- NIST FIPS 203 / ML-KEM: `https://csrc.nist.gov/pubs/fips/203/final`
- NIST FIPS 204 / ML-DSA: `https://csrc.nist.gov/pubs/fips/204/final`
- NIST FIPS 205 / SLH-DSA: `https://csrc.nist.gov/pubs/fips/205/final`

## 19. Final architectural law

TSLTG is not a collection of security products. It is one sovereign decision model:

> **No exact action receives authority unless TIGER can prove the required release identity, runtime state, actor/workload identity, policy/epoch state, freshness, and action scope. Authority is short-lived, bounded, auditable, and dies automatically when its evidence or governing epoch no longer matches.**

That law is the controlling design principle for M12 and any later TSLTG milestone.
