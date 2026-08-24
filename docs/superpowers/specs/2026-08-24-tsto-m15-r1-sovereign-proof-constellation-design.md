# TSTO M15-R1 — TIGER Sovereign Proof Constellation Design

**Date:** 2026-08-24
**Status:** `OWNER APPROVED DESIGN / SUPERSEDES ORIGINAL M15 DESIGN / SOURCE COMPLETION NOT CLAIMED`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`
**Milestone:** `M15-R1 — TIGER Sovereign Proof Constellation`
**Internal proof construct:** `TIGER Sovereign Proof DNA (T-SPDNA)`
**Authority:** `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
**Base architecture:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`
**Supersedes:** `docs/superpowers/specs/2026-08-24-tsto-m15-transparency-workload-identity-constellation-design.md`
**Predecessors:** M12 Sovereign Continuous Authority Core; M13 Runtime Attestation and Deployment Evidence Bridge; M14 Trust Nervous System and Continuous Revocation.

## 1. Executive design decision

M15-R1 replaces the original M15 design before SCAE integration. The original M15 correctly identified two missing evidence classes — independently trusted workload identity and transparency — but 2026 review establishes that those two classes alone are not sufficient for the strongest TIGER authorization path.

M15-R1 creates one **Sovereign Proof Constellation** inside TSTO. It does not create another trust architecture. It composes independently verified evidence and requires cross-binding among them before high-impact action authority can be considered.

The governing rule is:

> **No source, build, artifact, workload identity, key proof, runtime attestation, transparency receipt, revocation signal, policy fact, administrator state, payment fact, AI output, or single provider can mint TIGER authority by itself. SCAE may ALLOW only one exact action when every mandatory evidence class is original, trusted, fresh where required, policy-compatible, and cryptographically or canonically bound to the same release, artifact, workload/key, environment, request scope, and sovereign epoch context.**

The high-assurance evidence path becomes:

`Trust DNA + verified build provenance + sealed artifact + proof-bound workload identity + runtime attestation + verified transparency + continuous revocation + policy/epochs + exact request scope -> Sovereign Proof DNA -> SCAE -> PCAL -> PEP -> bounded execution`.

## 2. 2026 standards posture

M15-R1 is standards-informed and vendor-neutral. External standards and implementations are evidence sources or interoperability targets; TIGER remains the sovereign policy and action authority.

Stable or final foundations that may be used where applicable:

- IETF RATS architecture and EAT for attestation semantics;
- IETF SCITT RFC 9943 for transparent signed-statement registration and receipts;
- SLSA v1.2 for build-provenance requirements and maturity claims only when actually evidenced;
- GitHub Artifact Attestations / Sigstore verification where the existing release plane already emits and verifies them;
- SPIFFE stable workload-identity concepts and trust-domain semantics where an actual workload identity provider is later deployed;
- OpenID AuthZEN 1.0 concepts for PDP/PEP interoperability;
- OpenID SSF / CAEP concepts for external continuous security events;
- CycloneDX stable schema for SBOM/CBOM evidence;
- NIST FIPS 203/204/205 as the stable post-quantum baseline for later M17 crypto-agility work.

Research/watch posture only:

- IETF WIMSE workload-credential / proof-of-possession work may shape M15-R1 interfaces, especially key binding and request-bound proof, but TIGER must not claim WIMSE conformance while those documents remain Internet-Drafts.
- CycloneDX 2.0 or any other not-yet-stable schema may shape adapters only; current implementation uses stable versions until an explicit migration is approved.

No standards name is permission. Conformance is never inferred from structural similarity.

## 3. Owner laws preserved

M15-R1 preserves all stricter TSTO and Market Genesis laws:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. Advertising billing authority never becomes buyer–seller transaction authority.
5. Missing evidence never becomes permission.
6. M14 trusted `REVOKED` overrides otherwise perfect M15-R1 evidence for the exact governed capability scope.
7. AI may analyze, draft, explain, classify, recommend, and detect anomalies, but may not mint trusted evidence, SCAE authority, PCAL authority, owner authority, payment authority, country activation, or Production activation.
8. UI state, administrator role, sponsorship, payment, workflow text, source booleans, copied JSON, or provider-looking payloads cannot create trusted provenance.
9. Production/Staging deployment, remote database mutation, DNS, secrets, certificates, payment-provider changes, country activation, release activation, and merge to `main` remain separately gated operations.
10. Staging evidence never satisfies Production.
11. Source-only fixtures never become real Production/Staging evidence.
12. M15-R1 outputs expose bounded digests/references only; raw private intent, PII, credentials, private keys, raw nonces/challenges, raw receipts, certificate chains, exact host/IP data, database URLs, or precise private location are excluded.

## 4. Supersession and no-fallback law

The original M15 design is historical after this approval and is not a parallel authority.

Partial source modules created from the original M15 design before this revision — including any `TIGER_WORKLOAD_IDENTITY_V1`, `TIGER_TRANSPARENCY_RESULT_V1`, or `TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1` implementation — are **pre-completion draft source only**. They have no source-completion truth and must not be accepted by SCAE as a fallback.

Before M15-R1 can be source-complete:

- the binding workload contract must be M15-R1 proof-bound workload identity;
- the binding transparency contract must be the strengthened M15-R1 transparency result;
- the binding constellation must include build provenance and workload key proof in addition to M13 runtime evidence;
- old M15 V1 shapes must be removed from executable authorization paths or explicitly rejected;
- no compatibility fallback may silently accept the superseded V1 contracts.

## 5. Evidence classes and one-architecture composition

M15-R1 adds or strengthens these evidence classes inside existing TSTO:

1. `SOURCE` — existing Trust DNA / source readiness facts.
2. `BUILD` — independently verified build provenance bound to source, builder/workflow, artifact and SBOM/material evidence.
3. `ARTIFACT` — exact sealed runtime artifact identity.
4. `IDENTITY` — proof-bound workload identity with trust-domain and public-key binding.
5. `KEY_PROOF` — short-lived proof that the current workload possesses the private key corresponding to the bound identity key for the exact request context.
6. `RUNTIME` — M13 trusted runtime attestation / Trust Pulse V2.
7. `TRANSPARENCY` — independently verified statement/receipt evidence with policy binding.
8. `RISK_SIGNAL` / revocation — M14 continuous trusted revocation state.
9. `POLICY`, `COUNTRY`, `REPLAY`, `FRESHNESS`, `EPOCHS` — existing TSTO controls.

The constellation verifies relationships among evidence classes, not merely a list of `PASS` labels.

## 6. Build provenance contract

M15-R1 introduces `TIGER_BUILD_PROVENANCE_RESULT_V1`.

Purpose: convert a real verifier result from the existing release provenance plane into a provenance-protected TSTO evidence object. A caller-provided `BUILD=PASS` is never sufficient.

Required bounded fields:

- `schema`: `TIGER_BUILD_PROVENANCE_RESULT_V1`
- `result_class`: `VERIFIED_BUILD_PROVENANCE`
- `repository_ref_sha256`
- `source_sha_ref_sha256`
- `source_tree_ref_sha256`
- `builder_ref_sha256`
- `workflow_ref_sha256`
- `artifact_sha256`
- `provenance_statement_sha256`
- `materials_sha256`
- `sbom_sha256`
- `verification_policy_sha256`
- `verifier_ref_sha256`
- `verified_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

The trusted adapter owns authentication and current time. The result uses process-local non-serializable provenance. Copy/spread/JSON round-trip loses trust.

Existing GitHub/Sigstore provenance verification is an upstream evidence source; M15-R1 does not duplicate the release plane and does not infer any SLSA level unless the exact official requirements are independently met.

## 7. Proof-bound workload identity

M15-R1 introduces the binding workload contract `TIGER_WORKLOAD_IDENTITY_V2`.

Required bounded fields:

- `schema`: `TIGER_WORKLOAD_IDENTITY_V2`
- `identity_class`: `AUTHENTICATED_PROOF_BOUND_WORKLOAD_IDENTITY`
- `environment`: `staging | production`
- `release_dna_sha256`
- `runtime_artifact_sha256`
- `trust_domain_sha256`
- `workload_ref_sha256`
- `identity_public_key_sha256`
- `issuer_ref_sha256`
- `evidence_sha256`
- `issued_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

Maximum source-policy lifetime: **5 minutes** unless a stricter action profile applies.

Shape validation never grants provenance. The adapter authenticates upstream evidence, normalizes the closed contract, enforces trusted time, freezes the result, and stores provenance in module-local non-serializable state.

M15-R1 does not claim a real SPIFFE/SPIRE deployment, mTLS federation, certificate-chain validation, or OIDC workload federation until separately implemented and evidenced.

## 8. Workload key proof

M15-R1 introduces `TIGER_WORKLOAD_KEY_PROOF_V1`.

Purpose: prove that the current workload possesses the private key corresponding to `identity_public_key_sha256` and that the proof is bound to the exact authorization attempt rather than being a reusable bearer artifact.

Required bounded fields:

- `schema`: `TIGER_WORKLOAD_KEY_PROOF_V1`
- `proof_class`: `REQUEST_BOUND_PROOF_OF_POSSESSION`
- `workload_identity_sha256`
- `identity_public_key_sha256`
- `request_scope_sha256`
- `release_dna_sha256`
- `runtime_artifact_sha256`
- `proof_method_ref_sha256`
- `verifier_ref_sha256`
- `evidence_sha256`
- `issued_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

The exact request-scope digest must bind at least action profile, subject reference digest, resource reference digest, purpose digest, country digest, release DNA, and a verifier-controlled freshness/replay component where the selected proof method requires it.

Recommended default source-policy lifetime for high-assurance action proof: **30 seconds maximum**, with action profiles permitted to require less.

No raw private key, raw signature, reusable bearer credential, or raw challenge is emitted in the TSTO result.

## 9. Strengthened transparency result

M15-R1 introduces the binding transparency contract `TIGER_TRANSPARENCY_RESULT_V2`.

Required bounded fields:

- `schema`: `TIGER_TRANSPARENCY_RESULT_V2`
- `result_class`: `VERIFIED_TRANSPARENCY_STATEMENT`
- `release_dna_sha256`
- `runtime_artifact_sha256`
- `statement_type_ref_sha256`
- `statement_sha256`
- `statement_issuer_ref_sha256`
- `registry_ref_sha256`
- `receipt_profile_ref_sha256`
- `receipt_sha256`
- `verification_policy_sha256`
- `verifier_ref_sha256`
- `verified_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

Maximum live authorization acceptance horizon: **5 minutes**. Historical transparency may remain historically true, but live SCAE use requires a fresh trusted verification result.

A transparency receipt proves bounded registry/verification facts; it does not by itself prove that the statement issuer was honest, uncompromised, policy-authorized, or that the artifact is safe. Those are independent evidence dimensions.

## 10. Sovereign Evidence Graph

M15-R1 validates an evidence graph rather than independent booleans.

Required cross-bindings include:

- Build provenance source must match Trust DNA source identity.
- Build provenance artifact must match M13 runtime artifact.
- Workload identity release DNA and artifact must match Trust DNA/M13.
- Workload key proof must reference the exact trusted workload identity digest and exact identity public-key digest.
- Workload key proof request scope must match the exact SCAE request and current proof geometry/profile version.
- Transparency result release/artifact must match the same release/artifact.
- Transparency statement and verification policy must match source-controlled expectations for the action profile.
- Runtime environment must match workload environment.
- Revocation state must match the exact governed capability scope and release DNA.
- Country and epoch facts must match the exact request context.

Valid evidence from different releases, artifacts, workloads, keys, environments, countries, policies, or requests must not be combinable into authority.

## 11. Sovereign Proof DNA (T-SPDNA)

M15-R1 introduces `TIGER_SOVEREIGN_PROOF_DNA_V1` as a deterministic, bounded digest identity for the exact verified evidence constellation.

It is **not a token, credential, lease, permission, bearer capability, or authorization decision**.

Its canonical input binds digest references for:

- Trust DNA;
- epoch vector;
- build provenance result;
- runtime Trust Pulse / M13 bridge evidence;
- workload identity;
- workload key proof;
- transparency result;
- M14 revocation state;
- proof geometry/profile version;
- request scope;
- evidence-set digest;
- policy/country context;
- constellation verification time/freshness boundary.

Any material evidence change produces a different T-SPDNA. A later M14 `REVOKED` blocks the action even if an older T-SPDNA digest remains historically reproducible.

## 12. Sovereign Proof Constellation contract

M15-R1 introduces `TIGER_SOVEREIGN_PROOF_CONSTELLATION_V1`.

It may be derived only from original trusted objects emitted by the existing or new trusted adapters/factories:

- trusted M13 deployment-attestation bridge / Trust Pulse V2 path;
- trusted M15-R1 build provenance result;
- trusted M15-R1 workload identity V2;
- trusted M15-R1 workload key proof;
- trusted M15-R1 transparency result V2;
- trusted M14 revocation state;
- trusted factory-bound expected release/artifact/environment/policy/request context.

The result carries only bounded digests and the computed `sovereign_proof_dna_sha256`, plus `verified_at_ms`, `fresh_until_ms`, and `state=PASS`.

Constellation provenance is process-local and non-serializable. Copied/reconstructed objects are untrusted.

Constellation freshness is the minimum applicable live-use boundary among runtime attestation, workload identity, workload key proof, transparency verification, revocation state, and any stricter action-profile policy.

## 13. Trust decay / evidence half-life

M15-R1 treats historical truth separately from live authorization freshness.

Source-policy defaults for the high-assurance path:

- build provenance: historical fact, but trusted live-use verification result is policy-bounded;
- transparency registration: historical fact, but live verifier result <= 5 minutes;
- workload identity <= 5 minutes;
- runtime Trust Pulse V2 <= existing M13 ceiling;
- workload key proof <= 30 seconds;
- revocation state <= source-defined M14 freshness;
- PCAL remains 45 seconds / one use for the current Contact/Handoff policy unless separately approved.

SCAE authority may never outlive the earliest mandatory live-evidence expiry.

## 14. Adaptive Proof Geometry

M15-R1 keeps risk-adaptive proof geometry rather than imposing maximum-cost security everywhere.

For Market Genesis Contact/Handoff v2, the high-assurance geometry becomes at minimum:

- `IDENTITY`
- `SOURCE`
- `BUILD`
- `ARTIFACT`
- `RUNTIME`
- `POLICY`
- `COUNTRY`
- `RISK_SIGNAL`
- `REPLAY`
- `FRESHNESS`
- `TRANSPARENCY`

`KEY_PROOF` is represented as a mandatory structural dependency of the M15-R1 identity constellation and may also become an explicit TSTO dimension in a later contract revision if multiple action profiles require independent geometry-level visibility. No caller may remove it from the high-assurance identity path.

Hardware attestation / TEE remains optional and action-profile driven. It is not globally required by M15-R1.

## 15. SCAE integration

SCAE remains the deterministic sovereign PDP.

For a profile requiring M15-R1, SCAE must require the original trusted `TIGER_SOVEREIGN_PROOF_CONSTELLATION_V1` and verify that its bounded bindings match:

- current validated Trust DNA;
- current exact request;
- current profile id/version and proof geometry;
- current M13 trusted runtime evidence;
- current M14 trusted revocation state;
- current country/epoch context;
- BUILD and TRANSPARENCY proof digests supplied in the evidence set.

A valid constellation satisfies only the M15-R1 evidence dimensions. It never creates `ALLOW` by itself.

Fail-closed reason families must distinguish at least:

- missing/untrusted/stale constellation;
- build provenance untrusted/mismatch;
- workload identity untrusted/mismatch;
- workload key proof untrusted/mismatch/stale/replayed;
- transparency untrusted/mismatch/stale;
- runtime/release/artifact/environment mismatch;
- request/profile/geometry mismatch;
- M14 revocation;
- existing Market Genesis policy violations.

M14 `REVOKED`, whole-vehicle prohibition, transaction-authority prohibition, stale runtime evidence, replay failure, source/deployment evidence failure, country/epoch mismatch, and proof-geometry failure remain independently blocking.

## 16. PCAL evolution boundary

The existing PCAL remains the bounded capability mechanism. M15-R1 does not require an immediate schema bump unless tests demonstrate that the existing decision/evidence/geometry digests cannot preserve exact constellation binding at consume time.

If a PCAL schema revision is required, `TIGER_PCAL_V2` must bind `sovereign_proof_dna_sha256` explicitly and must remain short-lived, exact-action, exact-resource, replay-bound, and use-bounded.

No PCAL redesign may weaken consume-time SCAE reevaluation or M14 revocation precedence.

## 17. Existing release-plane reuse

TIGER already has a production release workflow that builds once, seals deterministic artifact bytes, creates source/material/SBOM evidence, emits GitHub artifact attestations, and verifies provenance identity before preservation. M15-R1 must consume a bounded trusted verification result from that plane rather than build a second supply-chain authority.

M15-R1 may separately upgrade the stable SBOM schema after regression testing, but a schema upgrade is not itself a trust claim.

## 18. AI-agent security posture

M15-R1 reserves an audit-only `AI Execution Shadow` pattern for future agentic actions. Agent/model/tool/delegation digests may be recorded for attribution and analysis, but AI evidence is non-sovereign.

The only permitted flow is:

`AI interpretation/recommendation -> deterministic policy/evidence verification -> SCAE -> PCAL -> PEP`.

Never:

`AI says ALLOW -> execute`.

## 19. M16 and M17 boundaries

M15-R1 prepares but does not implement:

- **M16 Digital Immune System:** capability-scoped isolation based on dependency/evidence failure; fail closed by capability rather than fail dead by platform.
- **M17 Crypto Genome / Agility:** cryptographic inventory, algorithm/key/certificate dependency map, migration policy, and later PQC transition using stable NIST standards.

M15-R1 may expose bounded evidence references useful to M16/M17, but it must not silently implement or claim those milestones.

## 20. Proposed source units

New/strengthened focused modules:

- `scripts/trust/build-provenance.cjs`
- `scripts/trust/workload-identity.cjs` -> binding V2 contract, no V1 fallback
- `scripts/trust/workload-key-proof.cjs`
- `scripts/trust/transparency-evidence.cjs` -> binding V2 contract, no V1 fallback
- `scripts/trust/sovereign-proof-constellation.cjs`
- optional `scripts/trust/sovereign-proof-dna.cjs` if separation improves clarity/testability

Modify only where required:

- `scripts/trust/action-profiles.cjs`
- `scripts/trust/scae.cjs`
- `scripts/trust/pcal.cjs` only if tests prove explicit T-SPDNA binding is necessary
- focused M12/M13/M14 regression fixtures/tests to supply trusted M15-R1 evidence after Contact/Handoff moves to v2
- release evidence adapter code only to expose an authenticated bounded build-provenance verifier result; do not rebuild the release system.

## 21. Mandatory TDD acceptance boundary

M15-R1 source completion requires tests proving at least:

1. exact closed keys and strong digests for each new contract;
2. adapter-owned trusted time and provenance;
3. copied/spread/serialized trusted results lose provenance;
4. future/stale/overlong live evidence fails closed;
5. workload identity binds trust domain and public key;
6. key proof binds the exact trusted workload identity, public key, request scope, release and artifact;
7. key proof cannot be replayed across resource/action/purpose/country/profile/release contexts;
8. build provenance cannot be replaced by `BUILD=PASS` or source booleans;
9. build source/artifact must match Trust DNA/M13 runtime artifact;
10. transparency statement/issuer/registry/profile/policy must match source-controlled expectations;
11. valid evidence from different releases/artifacts/workloads/keys/environments cannot be mixed;
12. T-SPDNA changes when any material evidence binding changes;
13. copied constellation loses provenance;
14. Contact/Handoff becomes profile version 2 and requires BUILD + TRANSPARENCY while preserving all prior dimensions;
15. valid constellation alone cannot bypass any independent SCAE requirement;
16. M14 REVOKED overrides otherwise perfect M15-R1 evidence;
17. whole-vehicle and transaction-authority prohibitions override otherwise perfect evidence;
18. PCAL creation/verification remains exact-scope, short-lived, replay-aware, and consume-time revocation aware;
19. no executable fallback accepts superseded M15 V1 contracts;
20. outputs exclude raw secrets, PII, private keys, signatures, challenges, credentials, certificate chains, registry receipts, private intent, precise location, and database URLs;
21. source tests require no network, cloud, real SPIFFE/SCITT/Rekor/Sigstore service, Production/Staging mutation, remote DB, DNS, secrets, certificates, payment-provider mutation, release activation, or `main` mutation.

## 22. Completion truth and non-claims

Only after implementation exists and fresh exact-head repository verification is GREEN may M15-R1 state:

`SOVEREIGN_PROOF_CONSTELLATION_SOURCE_VERIFIED`

This is a source-level completion truth only.

It must never be interpreted as:

- `PRODUCTION_WORKLOAD_IDENTITY_ACTIVE`
- `PRODUCTION_PROOF_OF_POSSESSION_ACTIVE`
- `PRODUCTION_TRANSPARENCY_ACTIVE`
- `PRODUCTION_SOVEREIGN_PROOF_CONSTELLATION_ACTIVE`
- `SPIFFE_ATTESTED` or `SPIFFE_CONFORMANT`
- `WIMSE_CONFORMANT`
- `SCITT_VERIFIED` or `SCITT_CONFORMANT`
- `REKOR_VERIFIED` or `SIGSTORE_VERIFIED` solely because source adapters exist
- any SLSA level not independently evidenced
- `PQC_READY` or `QUANTUM_SAFE`
- real certificate-chain validation
- real mTLS/OIDC workload federation
- real external transparency registration/receipt verification
- real TEE/hardware attestation
- `CONTACT_HANDOFF_ENABLED`
- `PRODUCTION_READY`
- remote deployment
- merge to `main`

The Draft PR remains open/unmerged and Production/Staging remain untouched unless separately and explicitly authorized.
