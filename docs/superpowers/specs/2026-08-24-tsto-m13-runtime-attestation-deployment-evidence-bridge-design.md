# TIGER SOVEREIGN TRUST ORGANISM 2026 — M13 Runtime Attestation and Deployment Evidence Bridge

**Date:** 2026-08-24
**Status:** `WRITTEN SPEC PENDING OWNER REVIEW / NO M13 IMPLEMENTATION YET`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`
**Milestone:** `M13 — Runtime Attestation and Deployment Evidence Bridge`
**Depends on:** M9 durable replay authority, M10 deployment evidence contract, M11 source/artifact readiness, M12 Sovereign Continuous Authority Core

## 1. Purpose

M13 closes the next trust gap after M12:

> M11 can prove which source/release TIGER intended to ship, M10 can prove required deployment/replay facts, and M12 can make deterministic exact-action authorization decisions. M13 adds a vendor-neutral way to consume authenticated runtime attestation results and bind them to the exact TIGER release, environment, deployment evidence, Trust DNA, epochs, and freshness window.

M13 does **not** make Production trusted merely because a server, cloud provider, JSON document, workflow, administrator, or attestation-looking token says so.

The invariant is:

`Runtime authority = authenticated verifier result ∩ exact release binding ∩ exact environment binding ∩ trusted freshness ∩ M10 deployment evidence ∩ M11 source readiness ∩ TSTO policy`

Missing or inconsistent evidence is `BLOCKED`.

## 2. Architectural choice

Three approaches were considered.

### A. Provider-native attestation embedded directly in SCAE — rejected

Embedding AWS/Azure/GCP-specific attestation semantics directly into TSTO would create provider lock-in, duplicate policy logic, and make SCAE depend on infrastructure-specific claim formats.

### B. Mandatory TEE/hardware attestation for every TIGER workload — rejected for M13

Hardware-backed attestation can provide stronger assurance for selected high-impact workloads, but making it mandatory platform-wide now would add cost and operational complexity without a demonstrated threat-model requirement for every path. TSTO already reserves Sovereign Cell / hardware attestation for justified later use.

### C. Vendor-neutral RATS/EAT-aligned bridge — selected

TIGER acts as the Relying Party. A trusted verifier/appraisal boundary evaluates evidence from an Attester and produces an authenticated result. TIGER normalizes only the minimum claims needed for policy, then binds that result to M10/M11/M12 state.

This follows the role separation of IETF RATS RFC 9334 and can accept EAT RFC 9711 or provider-native attestation through explicit trusted adapters. M13 does not claim conformance merely by using the terminology.

Active 2026 RATS drafts such as EAR/AR4SI may inform future adapters but are not M13 authority contracts while they remain Internet-Drafts.

## 3. Trust topology

```text
Runtime / Attester
      │
      │ Evidence
      ▼
Trusted Verifier / Appraisal Boundary
      │
      │ authenticated bounded result
      ▼
TIGER M13 Verifier Adapter
      │
      ▼
TIGER_ATTESTATION_RESULT_V1
      │
      ├── exact release/environment/artifact binding
      ├── trusted verifier identity binding
      ├── evidence/reference-policy digests
      └── freshness / nonce binding
      │
      ▼
M13 Deployment Evidence Bridge
      │
      ├── M10 release evidence
      ├── M11 source readiness
      ├── M12 Trust DNA / epochs
      └── M13 attestation result
      │
      ▼
TIGER_TRUST_PULSE_V2
      │
      ▼
SCAE → PCAL candidate → PEP
```

The raw untrusted request never supplies verifier identity, current time, expected release, expected environment, appraisal result, reference values, artifact identity, or required proof geometry.

## 4. Stable 2026 standards posture

M13 aligns with stable published foundations only:

- **IETF RATS RFC 9334** for Attester → Verifier → Relying Party role separation and appraisal semantics.
- **IETF EAT RFC 9711** as a standards-aligned representation option for attestation claims/results where supported by the chosen platform/verifier.
- Existing TSTO/M10/M11/M12 closed contracts remain the TIGER policy authority.

M13 does not make `EAR`, `AR4SI`, `CoRIM`, provider-native claim sets, or hardware TEE formats into TIGER sovereign authority. Those may be adapted only through explicit trusted adapters and only after their claims are normalized into the closed M13 contract.

No `RATS_CONFORMANT`, `EAT_CONFORMANT`, `HARDWARE_ATTESTED`, or provider certification claim is allowed unless the actual implementation and evidence independently satisfy the external requirements.

## 5. M13 contracts

### 5.1 `TIGER_ATTESTATION_RESULT_V1`

M13 introduces a closed normalized attestation-result contract. It represents the authenticated output of a trusted verifier boundary; it is **not** raw Attester evidence and it is never accepted directly from a user/client request.

Required fields:

- `schema = TIGER_ATTESTATION_RESULT_V1`
- `result_class = VERIFIED_RUNTIME_APPRAISAL`
- `environment = staging | production`
- `release_sha` — exact 40-hex release/source SHA
- `runtime_artifact_sha256` — exact runtime artifact/image digest supplied through trusted release/deployment context
- `verifier_ref_sha256` — privacy-safe digest reference to the authenticated verifier identity/configuration
- `attester_ref_sha256` — privacy-safe digest reference to the attested runtime/workload identity
- `evidence_sha256` — digest of the authenticated evidence/result material used by the verifier
- `appraisal_policy_sha256` — digest of the verifier appraisal policy/reference-value set
- `freshness_binding_sha256` — digest binding nonce/challenge/epoch freshness material; raw nonce is forbidden
- `issued_at_ms`
- `fresh_until_ms`
- `state = PASS`

Unknown keys, malformed digests, invalid environment, invalid chronology, stale/future-invalid results, or non-PASS state fail closed.

### 5.2 `TIGER_TRUST_PULSE_V2`

M12 `TIGER_TRUST_PULSE_V1` remains immutable and `SYNTHETIC_TEST_ONLY`. M13 must not weaken or reinterpret it.

M13 introduces V2 for attested runtime state rather than silently expanding V1 semantics.

Required fields:

- `schema = TIGER_TRUST_PULSE_V2`
- `evidence_class = ATTESTED_RUNTIME_RESULT`
- `release_dna_sha256`
- `epoch_vector_sha256`
- `deployment_evidence_sha256`
- `attestation_result_sha256`
- `runtime_artifact_sha256`
- `verifier_ref_sha256`
- `attester_ref_sha256`
- `issued_at_ms`
- `fresh_until_ms`
- `state = PASS`

The Pulse must be derived by trusted source code from validated inputs. A caller cannot submit a V2 object and make it trusted by shape alone.

### 5.3 `TIGER_DEPLOYMENT_ATTESTATION_BRIDGE_V1`

The bridge is a pure deterministic derivation contract over already-authenticated/validated facts. It must require:

1. M11 source readiness validates for the expected source SHA/tree.
2. M10 release evidence validates for the same exact release SHA and target environment.
3. `TIGER_ATTESTATION_RESULT_V1` validates and is fresh at a trusted `now_ms`.
4. Attestation `release_sha` equals M10 release SHA and expected/observed head SHA.
5. Attestation `environment` equals M10 target environment.
6. Runtime artifact digest equals the trusted expected artifact digest supplied by the release/deployment adapter.
7. Trust DNA digest and sovereign epoch digest are exact trusted inputs.
8. No raw secrets, nonce, credentials, PII, private intent, message content, database connection strings, or unnecessary host identifiers appear in bridge output.

The bridge output may establish `runtime_attestation_verified=true` only for the authenticated normalized verifier result. It must never translate that into Production activation authority.

## 6. Relying-Party law

TIGER is the sovereign **Relying Party**, not the source of Attester truth.

The Verifier determines the attestation appraisal result. TIGER determines whether that result is sufficient for an exact TIGER action.

Therefore:

`Verifier PASS ≠ SCAE ALLOW`

A valid runtime appraisal is only one evidence dimension. Market laws, M10/M11 evidence, source durability, whole-vehicle prohibition, no-transaction law, epochs, replay, country/policy constraints, signals, and other mandatory proof geometry remain independently enforced.

## 7. Trusted-adapter law

M13 separates two layers:

1. **Provider/verifier adapter** — authenticates and validates the external result/token/provider response and maps only approved claims into `TIGER_ATTESTATION_RESULT_V1`.
2. **TSTO bridge** — consumes only the normalized trusted result and TIGER-native evidence.

Provider-specific parsing, certificate-chain validation, token signature verification, cloud API calls, nonce issuance, and hardware-specific claim appraisal do not belong in SCAE.

A future AWS/Azure/GCP/independent-verifier adapter can be replaced without changing the sovereign policy core.

M13 source implementation may define adapter interfaces and deterministic validators, but it must not pretend that a test fixture performed real external cryptographic verification.

## 8. Freshness and anti-replay

Runtime attestation must be time-bounded.

Rules:

- `fresh_until_ms > issued_at_ms`.
- trusted `now_ms` must be within the attestation/Pulse validity window.
- freshness material is represented only by a digest/reference; raw nonce is not propagated into TSTO decision output.
- a reused/stale attestation result cannot create a fresh Trust Pulse merely by changing local timestamps.
- M9 durable Contact/Handoff replay authority remains independent; runtime attestation freshness does not replace action replay protection.

## 9. Release and environment binding

M13 is intentionally strict about cross-binding.

A valid attestation for:

- another release,
- another environment,
- another runtime artifact,
- another verifier policy,
- another attester identity,
- or an expired freshness window

must not satisfy the current action.

Staging evidence can never satisfy Production and vice versa.

## 10. Privacy and evidence minimization

TSTO stores/propagates bounded cryptographic references rather than raw infrastructure details whenever possible.

M13 outputs must exclude:

- raw nonce/challenge;
- private keys, certificates or bearer credentials;
- service-role keys;
- database URLs/passwords;
- raw IP/hostnames unless an explicit threat model later requires a bounded identity claim;
- user PII;
- raw private intent/contact/location;
- buyer/seller transaction data.

Verifier and attester references are digest-based unless a later explicit interoperability requirement justifies a public identifier.

## 11. Error and fail-closed model

M13 uses stable bounded reason codes. Expected classes include:

- `ATTESTATION_RESULT_MISSING`
- `ATTESTATION_RESULT_INVALID`
- `ATTESTATION_RESULT_STALE`
- `ATTESTATION_RELEASE_MISMATCH`
- `ATTESTATION_ENVIRONMENT_MISMATCH`
- `ATTESTATION_ARTIFACT_MISMATCH`
- `ATTESTATION_VERIFIER_UNTRUSTED`
- `ATTESTATION_FRESHNESS_INVALID`
- `DEPLOYMENT_EVIDENCE_UNVERIFIED`
- `SOURCE_READINESS_UNVERIFIED`
- `TRUST_DNA_BINDING_MISMATCH`
- `TRUST_EPOCH_BINDING_MISMATCH`

Unknown/missing mandatory evidence is `BLOCKED`; no warning-to-PASS path exists.

## 12. M13 source implementation scope

The implementation plan should remain small and composable. Expected source units:

- `scripts/trust/runtime-attestation.cjs` — closed normalized result validation/digesting.
- `scripts/trust/deployment-attestation-bridge.cjs` — pure M10+M11+M13 cross-binding.
- `scripts/trust/contracts.cjs` — add V2 Trust Pulse validation without mutating V1 semantics.
- `scripts/trust/scae.cjs` — accept a trusted V2 Pulse through the same proof-geometry model while preserving all M12 laws.
- focused `tests/tsto-m13-*.test.cjs`.

No cloud SDK, network call, remote database call, or Production integration is required for source completion.

## 13. TDD acceptance criteria

M13 source tests must prove at minimum:

1. closed attestation-result schema; unknown fields rejected;
2. V1 synthetic Pulse semantics remain unchanged;
3. V2 Pulse cannot be trusted directly from request payload;
4. exact release SHA mismatch blocks;
5. Staging/Production mismatch blocks;
6. runtime artifact digest mismatch blocks;
7. stale/future-invalid attestation blocks;
8. invalid verifier/appraisal/freshness digests block;
9. valid M11 alone cannot create runtime attestation truth;
10. valid M10 alone cannot create runtime attestation truth;
11. valid attestation alone cannot create deployed-durable truth;
12. only mutually consistent M10 + M11 + trusted M13 result may derive an attested deployment state;
13. whole-vehicle prohibition still overrides otherwise perfect runtime trust;
14. transaction-authority prohibition still overrides otherwise perfect runtime trust;
15. caller cannot manufacture verifier identity/current time/expected release/environment/artifact or proof requirements;
16. output contains no raw nonce, secrets, PII or unnecessary runtime details;
17. M12 focused tests remain GREEN;
18. full existing repository gates remain GREEN on the exact final SHA.

## 14. Completion truth

M13 source completion may state only:

`RUNTIME_ATTESTATION_DEPLOYMENT_BRIDGE_SOURCE_VERIFIED`

It must **not** state:

- `PRODUCTION_RUNTIME_ATTESTED`;
- `DEPLOYED_DURABLE_VERIFIED` unless real separately authorized target-environment M10 evidence exists and validates;
- `CONTACT_HANDOFF_ENABLED`;
- `RATS_CONFORMANT`;
- `EAT_CONFORMANT`;
- `HARDWARE_ATTESTED`;
- `PRODUCTION_READY`.

The source document must not self-embed a final commit SHA as truth. Exact-head CI/PR evidence supplies current-source binding.

## 15. Explicit non-goals / release boundary

M13 source work does **not** authorize or perform:

- merge to `main`;
- Production/Staging deployment;
- remote Supabase migration;
- Production artifact promotion;
- Contact/Handoff activation;
- DNS/secrets/payment-provider changes;
- real cloud attestation API calls;
- real hardware/TEE attestation;
- real EAT token issuance/verification unless a separately approved trusted adapter is later implemented;
- SCITT/Sigstore transparency work (M15 boundary);
- CAEP/SSF continuous revocation work (M14 boundary);
- SPIFFE/SPIRE workload identity deployment (M15 boundary);
- Sovereign Cell/PQC work (M17 boundary).

## 16. Final design law

M13 extends TSTO; it does not create another trust architecture.

> **TIGER trusts a runtime appraisal only when an authenticated verifier result is fresh and cross-bound to the exact release, artifact, environment, deployment evidence, Trust DNA, epochs, and policy required for the exact action. Runtime attestation is evidence, never sovereign authority by itself.**
