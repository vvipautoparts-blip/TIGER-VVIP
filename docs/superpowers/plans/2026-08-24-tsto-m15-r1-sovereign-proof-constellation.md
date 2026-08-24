# TSTO M15-R1 — TIGER Sovereign Proof Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner-approved M15-R1 Sovereign Proof Constellation so high-assurance Market Genesis Contact/Handoff can depend on original trusted build provenance, proof-bound workload identity, request-bound key proof, M13 runtime attestation, M14 revocation, strengthened transparency evidence, and deterministic Sovereign Proof DNA without any legacy M15 fallback.

**Architecture:** Preserve TSTO as the only trust architecture. Add focused provenance-protected evidence modules and a single constellation factory that cross-binds all evidence to one release, artifact, workload/key, environment, request scope, profile geometry, country/epoch context, and trusted time. SCAE remains the deterministic PDP; PCAL remains the bounded action lease and is revised only if tests prove explicit T-SPDNA binding is required.

**Tech Stack:** Node.js CommonJS, `node:test`, `node:assert/strict`, existing TSTO canonical JSON/SHA-256 helpers, existing GitHub/Sigstore release-attestation plane, GitHub Actions quality/security/database rehearsals.

**Spec:** `docs/superpowers/specs/2026-08-24-tsto-m15-r1-sovereign-proof-constellation-design.md`

## Global Constraints

- Preserve `AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN`.
- Preserve `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION`.
- Preserve Living Classified Fabric retirement; no fallback or parallel authority.
- M14 trusted `REVOKED` overrides otherwise perfect M15-R1 evidence.
- M13 Trust Pulse V2 provenance rules remain unchanged.
- `TIGER_TRUST_PULSE_V1` remains synthetic-test-only.
- All trust contracts use exact closed keys and reject all-zero security digests.
- Adapter/factory trusted time is source-owned; caller time cannot create trust.
- Trusted provenance is process-local/non-serializable; copy/spread/JSON loses provenance.
- M15-R1 outputs contain bounded digests/references only; no raw secrets, keys, signatures, challenges, credentials, PII, private intent, receipts, certificate chains, precise locations, or DB URLs.
- No network/cloud/provider calls are required by source tests.
- No Production/Staging deployment, remote DB, DNS, secret, certificate, payment-provider, country, release activation, `main`, or merge mutation.
- Work only on `feat/tiger-private-market-genesis-20260823`; PR #323 remains Draft/Open/Unmerged.
- Superseded M15 V1 contracts must not remain executable fallback authority.
- Completion truth is allowed only after fresh exact-head GREEN verification: `SOVEREIGN_PROOF_CONSTELLATION_SOURCE_VERIFIED`.

---

### Task 1: Migrate Workload Identity to Proof-Bound V2

**Files:**
- Modify: `tests/tsto-m15-workload-identity.test.cjs`
- Modify: `scripts/trust/workload-identity.cjs`

**Produces:**
- `WORKLOAD_IDENTITY_SCHEMA = 'TIGER_WORKLOAD_IDENTITY_V2'`
- `createTrustedWorkloadIdentityAdapter({ authenticate, clock })`
- `validateWorkloadIdentity(value, { nowMs })`
- `digestWorkloadIdentity(value, { nowMs })`
- `isTrustedWorkloadIdentity(value)`

- [ ] Write RED tests requiring `AUTHENTICATED_PROOF_BOUND_WORKLOAD_IDENTITY`, `trust_domain_sha256`, and `identity_public_key_sha256`, and rejecting V1 shapes.
- [ ] Verify RED on current V1 implementation.
- [ ] Replace V1 contract with V2 only; preserve five-minute maximum lifetime and WeakSet provenance.
- [ ] Verify focused tests GREEN and Quality Gate GREEN.
- [ ] Commit.

### Task 2: Request-Bound Workload Key Proof

**Files:**
- Create: `tests/tsto-m15-r1-workload-key-proof.test.cjs`
- Create: `scripts/trust/workload-key-proof.cjs`

**Produces:**
- `WORKLOAD_KEY_PROOF_SCHEMA = 'TIGER_WORKLOAD_KEY_PROOF_V1'`
- max lifetime `30_000` ms
- trusted adapter + validation/digest/provenance functions
- `digestWorkloadRequestScope(...)` for exact profile/subject/resource/purpose/country/release binding

- [ ] RED: module absent; test exact closed keys, strong digests, trusted clock, 30s ceiling, provenance loss, exact request-scope binding, cross-resource/action/purpose/country/release replay rejection.
- [ ] GREEN: implement minimal source-owned contract and trusted adapter.
- [ ] Run focused tests + Quality Gate.
- [ ] Commit.

### Task 3: Trusted Build Provenance Result

**Files:**
- Create: `tests/tsto-m15-r1-build-provenance.test.cjs`
- Create: `scripts/trust/build-provenance.cjs`

**Produces:**
- `BUILD_PROVENANCE_SCHEMA = 'TIGER_BUILD_PROVENANCE_RESULT_V1'`
- trusted verifier adapter + validation/digest/provenance functions

**Required fields:** repository/source SHA/source tree/builder/workflow/artifact/provenance statement/materials/SBOM/verification policy/verifier digests, verified/fresh times, state.

- [ ] RED tests prove a caller `BUILD=PASS` or shape-only object cannot gain provenance.
- [ ] GREEN minimal verifier-adapter contract; no GitHub/Sigstore network call in module.
- [ ] Add focused evidence-binding tests against exact artifact/source digests.
- [ ] Run focused tests + Quality Gate.
- [ ] Commit.

### Task 4: Strengthen Transparency to V2

**Files:**
- Modify: `tests/tsto-m15-transparency-evidence.test.cjs`
- Modify: `scripts/trust/transparency-evidence.cjs`

**Produces:**
- `TRANSPARENCY_RESULT_SCHEMA = 'TIGER_TRANSPARENCY_RESULT_V2'`
- adds `statement_type_ref_sha256`, `statement_issuer_ref_sha256`, `receipt_profile_ref_sha256`, `verification_policy_sha256`
- removes V1 acceptance/fallback

- [ ] RED tests require V2 fields and reject V1.
- [ ] GREEN migration preserving five-minute live-use verification ceiling and provenance.
- [ ] Run focused tests + Quality Gate.
- [ ] Commit.

### Task 5: Sovereign Proof DNA + Constellation

**Files:**
- Create: `tests/tsto-m15-r1-sovereign-proof-constellation.test.cjs`
- Create: `tests/helpers/tsto-m15-r1-constellation-fixture.cjs`
- Create: `scripts/trust/sovereign-proof-dna.cjs`
- Create: `scripts/trust/sovereign-proof-constellation.cjs`
- Retire from executable use: `scripts/trust/identity-transparency-constellation.cjs`
- Retire/migrate tests: `tests/tsto-m15-constellation.test.cjs`

**Produces:**
- `TIGER_SOVEREIGN_PROOF_DNA_V1`
- `TIGER_SOVEREIGN_PROOF_CONSTELLATION_V1`
- trusted derivation from original M13 bridge + M14 revocation + build provenance + workload V2 + key proof + transparency V2 + trusted expected request/profile/policy context

- [ ] RED tests prove copied/untrusted/mixed-release/mixed-artifact/mixed-workload/mixed-key/mixed-environment evidence cannot be combined.
- [ ] RED tests prove T-SPDNA changes for every material binding change and is never permission itself.
- [ ] GREEN minimal deterministic DNA and constellation factories with freshness = minimum mandatory live boundary.
- [ ] Remove/disable legacy identity-transparency constellation as authorization input; no V1 fallback.
- [ ] Run focused tests + Quality Gate.
- [ ] Commit.

### Task 6: Contact/Handoff v2 + SCAE Integration

**Files:**
- Modify: `scripts/trust/action-profiles.cjs`
- Modify: `scripts/trust/scae.cjs`
- Create: `tests/tsto-m15-r1-scae.test.cjs`
- Modify M12/M13/M14 fixtures/tests that construct Contact/Handoff contexts directly.

**Profile v2 geometry:** retain existing dimensions and add mandatory `BUILD` and `TRANSPARENCY`; key proof remains a mandatory structural dependency inside the trusted constellation.

- [ ] RED tests require profile v2, BUILD, TRANSPARENCY, and original trusted constellation.
- [ ] RED tests cover missing/untrusted/stale constellation; build/workload/key-proof/transparency/runtime/request/profile/geometry mismatch; M14 REVOKED precedence.
- [ ] GREEN action-profile migration and SCAE fail-closed integration.
- [ ] Bind `proofs.BUILD.digest_sha256` and `proofs.TRANSPARENCY.digest_sha256` to trusted constellation evidence; raw PASS booleans cannot satisfy evidence.
- [ ] Migrate regression fixtures with no legacy fallback.
- [ ] Run focused M12–M15 tests + Quality Gate.
- [ ] Commit.

### Task 7: PCAL Boundary + Acceptance / No-Fallback

**Files:**
- Create: `tests/tsto-m15-r1-acceptance-boundaries.test.cjs`
- Modify: `scripts/trust/pcal.cjs` only if RED tests prove explicit T-SPDNA binding is required.
- Modify: owner authority/spec status docs after source implementation.

- [ ] Prove existing PCAL consume-time SCAE reevaluation blocks revoked/stale/mismatched constellation.
- [ ] If exact constellation identity is not fully preserved by existing decision/evidence/geometry digests, write RED test then implement `TIGER_PCAL_V2` with explicit `sovereign_proof_dna_sha256`; otherwise leave schema unchanged.
- [ ] Acceptance tests prove whole-vehicle/no-transaction laws, privacy/evidence minimization, no V1 executable fallback, no network/cloud/Production mutations.
- [ ] Run full Quality Gate.
- [ ] Commit source completion docs only after tests are GREEN.

### Task 8: Exact-Head Verification and Dynamic Truth

**Files:**
- Update PR #323 body metadata only after final source commit.
- Update owner authority completion truth only after exact-head verification passes.

- [ ] Capture final exact head SHA.
- [ ] Verify all required repository/security/database rehearsal workflows are SUCCESS on that exact SHA.
- [ ] Verify PR remains Draft/Open/Unmerged and `main`/Production untouched.
- [ ] Only then permit `SOVEREIGN_PROOF_CONSTELLATION_SOURCE_VERIFIED`.
- [ ] Record explicit non-claims for SPIFFE/WIMSE/SCITT/Rekor/Sigstore/SLSA/PQC/TEE/Production.
