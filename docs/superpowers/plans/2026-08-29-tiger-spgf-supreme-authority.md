# TIGER SPGF Supreme Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 (SPGF)` to the sole supreme owner architecture, delete superseded competing SGF authority/spec/plan material from the current tree, and implement the first proof-first security/runtime foundation without merging or touching Production.

**Architecture:** SPGF becomes the only owner-level sovereign/security/release architecture. Existing useful SGF modules remain only as subordinate implementation components; top-level machine truth moves to SPGF. New proof components are pure, deterministic, fail-closed modules with external signature/attestation verifiers and no provider-specific production activation.

**Tech Stack:** Node.js 22, CommonJS, JSON machine authority, GitHub repository governance, SHA-256 content addressing, external verifier interfaces, existing TIGER test/quality-gate conventions.

**Spec:** `docs/superpowers/specs/2026-08-29-tiger-sovereign-proof-genome-fabric-2026.md`

## Global Constraints

- Newest owner-approved rule is latest-only and fully supersedes conflicting older current-tree authority.
- No archive/trash/legacy copy of superseded competing authority.
- Git history is the only historical provenance for deleted superseded material.
- `OWNER_ROOT.country/currency/market = null` and standing root privilege is false.
- No default country, currency, payment provider, legal entity, tax profile, data region, or market.
- Fail closed on missing/stale/unverified/revoked critical evidence.
- No custom cryptography or custom PQC.
- PR #346 remains the mandatory predecessor for merge; this branch must not merge to `main` or mutate Production while #346 is unresolved.
- Persistent self-hosted runners are not introduced for untrusted public PR execution.

---

### Task 1: Promote SPGF as the sole owner authority and delete superseded SGF top-level authority

**Files:**
- Create: `docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`
- Modify: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Modify: `project-control/authority/authority-registry.v1.json`
- Modify: `config/fusion/current-authority.json`
- Delete: `docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`
- Delete: `docs/superpowers/specs/2026-08-29-tiger-sovereign-genome-fabric-2026.md`
- Delete: `docs/superpowers/plans/2026-08-29-tiger-sgf-foundation.md`
- Delete: `docs/superpowers/plans/2026-08-29-tiger-sgf-runtime-zero-default-convergence.md`
- Test: `tests/spgf-supreme-owner-authority.test.cjs`

**Interfaces:**
- Produces: the only owner authority path `docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md` and authority id `authority.sovereign-proof-genome-fabric.v1`.

- [ ] **Step 1: Write failing authority test**

```js
assert.match(ownerBinding, /TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
assert.doesNotMatch(ownerBinding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
assert.equal(fs.existsSync(oldSgfAuthority), false);
assert.equal(fs.existsSync(oldSgfSpec), false);
assert.equal(fs.existsSync(oldSgfPlan), false);
assert.equal(registry.records.some(r => r.authority_id === 'authority.sovereign-genome-fabric.v1'), false);
assert.equal(registry.records.some(r => r.authority_id === 'authority.sovereign-proof-genome-fabric.v1'), true);
```

- [ ] **Step 2: Run the focused test and confirm RED because SPGF current authority does not yet exist and SGF current authority still exists.**

Run: `node --test tests/spgf-supreme-owner-authority.test.cjs`
Expected: FAIL.

- [ ] **Step 3: Create SPGF current owner authority from the approved spec and update owner binding/router/registry/fusion config to point only to SPGF.**

Machine references must use:

```json
{
  "tigerSpgfOwnerReference": "docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md",
  "tigerSpgfConfig": "config/sovereignty/spgf-v1.json"
}
```

and must remove `tigerSgfOwnerReference` / `tigerSgfConfig`.

- [ ] **Step 4: Delete superseded SGF top-level authority/spec/plans from the current tree; create no archive replacement.**

- [ ] **Step 5: Re-run test; expected PASS.**

- [ ] **Step 6: Commit.**

```bash
git commit -m "feat(spgf): promote supreme owner authority"
```

### Task 2: Replace SGF machine root with SPGF machine authority

**Files:**
- Create: `config/sovereignty/spgf-v1.json`
- Create: `scripts/sovereignty/verify-spgf-authority.cjs`
- Delete: `config/sovereignty/sgf-v1.json`
- Delete: `scripts/sovereignty/verify-sgf-authority.cjs`
- Test: `tests/spgf-machine-authority.test.cjs`
- Update/remove old SGF authority tests that treat SGF as top-level truth.

**Interfaces:**
- Produces: `verifySpgfAuthority(manifest) -> { ok:boolean, errors:string[] }`.

- [ ] **Step 1: Write RED tests requiring `TIGER_SPGF_V1`, null sovereign defaults, exact component map, technology maturity policy, evidence-first release policy, and no SGF fallback fields.**

- [ ] **Step 2: Run tests; expected FAIL because SPGF machine config is absent.**

- [ ] **Step 3: Implement `spgf-v1.json` with:**

```json
{
  "schemaVersion": "TIGER_SPGF_V1",
  "ownerRoot": {"id":"OWNER_ROOT","country":null,"currency":null,"market":null,"standingRuntimePrivilege":false},
  "defaults": {"country":null,"currency":null,"paymentProvider":null,"legalEntity":null,"taxProfile":null,"dataRegion":null,"market":null},
  "trustModel": "PROOF_CAPSULE_REQUIRED_FAIL_CLOSED",
  "fallbackPolicy": "DENY_NO_SOVEREIGN_FALLBACK",
  "technologyMaturityPolicy": "STABLE_ONLY_FOR_SOVEREIGN_PRODUCTION"
}
```

plus exact canonical component paths for Market Genome, Compiler, Passport, Owner Lease, Execution Seal, Signed Policy, Kill Grid, Evidence Graph, CI Classifier, Crypto Twin, Release Certificate, Witness Quorum, and Proof Capsule verifier.

- [ ] **Step 4: Implement strict validator; unknown/missing canonical component paths or non-null defaults are errors.**

- [ ] **Step 5: Delete the former top-level SGF config/validator only after all current references point to SPGF.**

- [ ] **Step 6: Run tests; expected PASS.**

### Task 3: Build the Sovereign Evidence Graph and CI Evidence Classifier

**Files:**
- Create: `scripts/sovereignty/sovereign-evidence-graph.cjs`
- Create: `scripts/release/ci-evidence-classifier.cjs`
- Test: `tests/spgf-evidence-graph.test.cjs`
- Test: `tests/spgf-ci-evidence-classifier.test.cjs`

**Interfaces:**
- Produces: `createEvidenceNode(input)`, `verifyEvidenceNode(node, context)`, `classifyCiJob(job)`.

- [ ] **Step 1: Write tests covering digest-bound evidence, expiry, revocation, exact release binding, and deterministic ordering.**
- [ ] **Step 2: Write CI tests requiring `runner_id=0` plus zero steps to classify as `BLOCKED_RUNNER`, not code red.**
- [ ] **Step 3: Run tests; expected RED.**
- [ ] **Step 4: Implement minimal deterministic modules. CI states:**

```js
EXECUTED_GREEN
EXECUTED_CODE_RED
EXECUTED_SECURITY_RED
EXECUTED_POLICY_RED
BLOCKED_RUNNER
BLOCKED_PROVIDER
BLOCKED_ACCOUNT
STALE
REVOKED
UNVERIFIED
```

- [ ] **Step 5: Run tests; expected PASS.**

### Task 4: Build Crypto Digital Twin projection without claiming readiness

**Files:**
- Create: `scripts/security/crypto-evidence-harvester.cjs`
- Create: `scripts/security/crypto-digital-twin.cjs`
- Modify: `config/security/crypto-inventory.v1.json` or replace it with a generated/projection schema under SPGF authority.
- Test: `tests/spgf-crypto-digital-twin.test.cjs`

**Interfaces:**
- Produces: `harvestSourceCryptoEvidence(sourceDescriptors)`, `buildCryptoTwin(evidence)`, `detectCryptoDrift(expected, observed)`.

- [ ] **Step 1: Test that known source evidence can represent `OIDC_JWT/RS256` from Media Finalizer while unknown provider/runtime surfaces remain `DISCOVERY_REQUIRED`.**
- [ ] **Step 2: Test drift detection and stale evidence.**
- [ ] **Step 3: Run RED.**
- [ ] **Step 4: Implement projection only; do not invent provider/KMS facts.**
- [ ] **Step 5: Run GREEN and keep `inventoryComplete=false` until all 11 surfaces have real evidence.**

### Task 5: Build Release Birth Certificate, Technology Maturity Firewall, and Witness Quorum

**Files:**
- Create: `scripts/release/release-birth-certificate.cjs`
- Create: `scripts/security/technology-maturity-firewall.cjs`
- Create: `scripts/release/witness-quorum.cjs`
- Test: `tests/spgf-release-birth-certificate.test.cjs`
- Test: `tests/spgf-technology-maturity-firewall.test.cjs`
- Test: `tests/spgf-witness-quorum.test.cjs`

**Interfaces:**
- Produces: exact-SHA release certificate, `isProductionMature(profile)`, and evidence quorum verifier.

- [ ] **Step 1: RED tests reject `latest`, mutable artifact identity, Preview/Draft/Experimental sovereign dependencies, and witness claims not bound to exact SHA.**
- [ ] **Step 2: Implement deterministic, provider-neutral objects.**
- [ ] **Step 3: Keep current #346 governance hard-coded as `NO_BYPASS`: independent witness cannot satisfy #346 required GitHub exact-head gates.**
- [ ] **Step 4: GREEN tests.**

### Task 6: Build the single Sovereign Proof Capsule verifier

**Files:**
- Create: `scripts/sovereignty/sovereign-proof-capsule.cjs`
- Test: `tests/spgf-sovereign-proof-capsule.test.cjs`

**Interfaces:**
- Produces: `verifySovereignProofCapsule(capsule, context, verifiers) -> {ok, code, evidence}`.

- [ ] **Step 1: RED tests require exact subject/action/market/capability/release/policy/genome bindings, fresh owner lease/passport/evidence, no kill-grid match, and required witness state.**
- [ ] **Step 2: Test any unknown/stale/unverified critical proof returns DENY.**
- [ ] **Step 3: Implement minimal orchestration over existing SPGF modules; do not duplicate cryptographic verification logic.**
- [ ] **Step 4: GREEN tests.**

### Task 7: Runtime Zero-Default integration after #346 merge only

**Files:**
- Modify after rebase: `scripts/runtime/vvip-marketplace-repository.js`
- Modify after rebase: `scripts/fusion/progressive-composer.js`
- Modify after rebase: `scripts/vvip-production-marketplace.js`
- Tests: existing marketplace tests plus new SPGF runtime contract tests.

**Interfaces:**
- Consumes: explicit market resolver + SPGF proof/policy context.

- [ ] **Step 1: Confirm #346 is merged to `main` with required exact-head executed-green/review evidence. If not, STOP this task without merging SPGF.**
- [ ] **Step 2: Rebase SPGF branch on the exact merged `main`.**
- [ ] **Step 3: RED tests forbid `defaultCountryCode`, prefilled `JOD`, and country inference in create/publish paths.**
- [ ] **Step 4: Implement explicit market/currency handling. Seller listing currency remains distinct from TIGER billing pricing contract.**
- [ ] **Step 5: Full repository quality/security/release gates on exact head.**

### Task 8: Final verification and PR discipline

**Files:** all changed files.

- [ ] **Step 1: Run focused SPGF tests.**
- [ ] **Step 2: Run `node --test --test-reporter=dot tests/*.test.cjs`.**
- [ ] **Step 3: Run `bash scripts/quality-gate.sh`.**
- [ ] **Step 4: Search current tree for the deleted old SGF authority/spec/plan names and verify zero current references except Git history (which is not searchable through current tree).**
- [ ] **Step 5: Verify no SQL migration, Production, provider, payment activation, country activation, or deploy mutation was introduced by the authority/foundation tasks.**
- [ ] **Step 6: Create/refresh a draft PR only after branch content is coherent; do not mark ready or merge until exact-head required CI executes and passes and review requirements are satisfied.**
