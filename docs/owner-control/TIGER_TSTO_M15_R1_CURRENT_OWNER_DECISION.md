# TIGER TSTO M15-R1 — CURRENT OWNER DECISION

**Effective date:** 2026-08-24
**Status:** `CURRENT / BINDING FOR M15 SCOPE`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`

## 1. Binding decision

The owner adopts **M15-R1 — TIGER Sovereign Proof Constellation** as the only current M15 design authority.

Binding design:

`docs/superpowers/specs/2026-08-24-tsto-m15-r1-sovereign-proof-constellation-design.md`

The former design:

`docs/superpowers/specs/2026-08-24-tsto-m15-transparency-workload-identity-constellation-design.md`

is historical and **superseded**. It is not a fallback, compatibility authority, or parallel trust architecture.

## 2. M15-R1 scope

M15-R1 extends the existing TSTO path with one Sovereign Proof Constellation that cross-binds:

- existing Trust DNA/source authority;
- verified build provenance from the existing sealed release plane;
- exact artifact identity;
- proof-bound workload identity with trust-domain and public-key binding;
- request-bound proof-of-possession of the workload key;
- existing M13 runtime attestation / Trust Pulse V2;
- strengthened transparency statement/receipt verification;
- existing M14 capability-scoped continuous revocation;
- policy, country, epochs, replay, freshness, action profile and exact request scope;
- deterministic `TIGER Sovereign Proof DNA (T-SPDNA)` as a bounded evidence-constellation digest, never as permission by itself.

SCAE remains the sovereign deterministic PDP. PCAL remains the bounded action lease. PEP remains the execution boundary.

## 3. No-fallback law

Any partial original-M15 source implementing `TIGER_WORKLOAD_IDENTITY_V1`, `TIGER_TRANSPARENCY_RESULT_V1`, or `TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1` is pre-completion draft source only.

It must not become executable fallback authority. Before M15-R1 source completion, the binding implementation must migrate to the R1 contracts and reject superseded V1 authorization shapes.

## 4. Current implementation truth

The valid current state is:

`M0_M14_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

`M15_R1_OWNER_APPROVED_DESIGN`

`M15_PARTIAL_DRAFT_SOURCE_EXISTS / M15_R1_SOURCE_NOT_COMPLETE / NOT EXACT_HEAD VERIFIED`

No M15-R1 source-completion claim is permitted yet.

The only future source-completion truth permitted after full implementation and fresh exact-head GREEN verification is:

`SOVEREIGN_PROOF_CONSTELLATION_SOURCE_VERIFIED`

## 5. Preserved release boundary

This decision does not authorize or claim:

- merge to `main`;
- Production or Staging deployment;
- remote database mutation;
- DNS, secret, certificate, payment-provider, country, or release activation changes;
- real SPIFFE/SPIRE deployment;
- WIMSE conformance;
- SCITT/Rekor/Sigstore conformance merely from source adapters;
- any SLSA level not independently evidenced;
- PQC readiness or quantum safety;
- real TEE/hardware attestation;
- Contact/Handoff activation;
- Production readiness.

All stricter TSTO and Market Genesis owner laws remain in force.