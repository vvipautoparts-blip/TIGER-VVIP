# SVEF WP-A Immutable Supply Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VVIP TIGER release/security workflows immutable, produce one exact release bundle with material/SBOM/provenance metadata, and ensure Production can only promote previously verified exact bytes without rebuilding.

**Architecture:** Add a repository-level immutable-action policy, pin every protected workflow action to a full commit SHA, introduce a deterministic SVEF release-bundle manifest over an already-built V14 candidate, and convert the Production workflow from builder to constrained promoter. The final artifact identity is SHA-256 bound to source SHA/tree and release bundle metadata; any mismatch fails closed.

**Tech Stack:** GitHub Actions YAML, Node.js 22 `node:test`, Python 3.12 existing V14 builder, SHA-256, JSON canonicalization, GitHub workflow artifacts/attestations.

## Global Constraints

- Objective: `ZERO_UNPROVEN_RELEASE`.
- Final release bytes are built once and MUST NOT be rebuilt after verification.
- Protected workflow `uses:` references MUST use full 40-character lowercase immutable commit SHAs.
- No uncontrolled dependency/tool upgrades in release workflows.
- Production deployer cannot select arbitrary source or call `tools/vvip_public_release.py`.
- Missing provenance/SBOM/artifact binding is `BLOCKED` / `NO_GO`.
- No Production mutation while implementing or testing this work package.
- Every source change invalidates previous source-bound evidence.

---

## File Structure

- Create `tests/svef-immutable-actions.test.cjs` — protected-workflow pinning and release dependency policy.
- Create `scripts/tsrf/svef/release-bundle.cjs` — deterministic release-bundle manifest, candidate hashing, SBOM/material digest binding.
- Create `tests/svef-release-bundle.test.cjs` — release-bundle behavior and tamper negatives.
- Create `.github/workflows/svef-release-candidate.yml` — exact-SHA build-once workflow that produces the release bundle and attestation inputs.
- Create `tests/svef-release-workflow.test.cjs` — workflow contract: exact SHA, no uncontrolled upgrade, one build, immutable actions, artifact digest binding.
- Modify `.github/workflows/pages.yml` — constrained promoter only; no source build or dependency resolution.
- Create `tests/svef-production-promoter.test.cjs` — proves Production workflow cannot rebuild or accept unbound artifact selection.
- Modify protected workflows listed in the A++ spec — replace tag-based `uses:` references with resolved full immutable SHAs.

### Task 1: Immutable Action Policy

**Files:**
- Create: `tests/svef-immutable-actions.test.cjs`
- Modify: protected workflow files listed in the A++ spec.

**Interfaces:**
- Consumes: repository workflow YAML text.
- Produces: fail-closed policy test requiring `owner/action@<40-lowercase-hex>` for non-local actions.

- [ ] **Step 1: Write the failing test**

Create a Node test that loads the protected workflow list, extracts non-comment `uses:` values, ignores local `./` actions, and asserts every external reference matches:

```js
/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/
```

The same test asserts protected release workflows do not contain:

```text
pip install --upgrade pip
@v1
@v2
@v3
@v4
@v5
@v6
@v7
```

inside a `uses:` reference.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/svef-immutable-actions.test.cjs
```

Expected: FAIL against current workflows because tag references such as `actions/checkout@v7` exist.

- [ ] **Step 3: Resolve and pin exact action commits**

For each exact action/tag currently used, resolve the tag/ref from the action's official GitHub repository and replace the tag with the immutable commit SHA. Preserve the human-readable version in an inline YAML comment, for example:

```yaml
- uses: actions/checkout@<40-char-sha> # v7
```

Do not guess SHAs.

- [ ] **Step 4: Remove uncontrolled release-tool upgrades**

Delete `python -m pip install --upgrade pip` from protected release/security workflows. Keep dependency installation constrained to repository requirements and explicitly pinned tool action versions.

- [ ] **Step 5: Run GREEN**

Run the immutable-action test and the existing Quality Gate. Expected: PASS.

- [ ] **Step 6: Commit**

Commit message:

```text
security(svef): pin protected workflow actions
```

### Task 2: Deterministic Release Bundle

**Files:**
- Create: `scripts/tsrf/svef/release-bundle.cjs`
- Create: `tests/svef-release-bundle.test.cjs`

**Interfaces:**
- Consumes: `repositoryRoot`, `candidateDir`, trusted Git `sourceSha/sourceTree`, material records, SBOM bytes, provenance statement bytes.
- Produces: `createReleaseBundleManifest(options)` and `serializeReleaseBundleManifest(manifest)`.

The manifest fields are exactly:

```text
bundle_version
source_sha
source_tree
candidate_manifest_sha256
candidate_content_sha256
sbom_sha256
provenance_sha256
materials_sha256
created_by
```

No caller may supply an authoritative digest field; the module derives all digests from bytes/trusted Git identity.

- [ ] **Step 1: Write RED tests**

Tests prove:

1. exact source SHA/tree are trusted-provider derived;
2. candidate manifest source SHA must match trusted source;
3. candidate bytes are recomputed and bound;
4. undeclared/missing/tampered candidate files fail;
5. SBOM/provenance/material bytes change their respective digest and the final manifest;
6. symlink/path escape inputs fail closed;
7. caller attempts to inject authoritative digest fields fail.

- [ ] **Step 2: Run RED**

Expected: `MODULE_NOT_FOUND` for `release-bundle.cjs`.

- [ ] **Step 3: Implement minimal deterministic module**

Reuse the existing evidence canonical JSON and SHA-256 helpers from `scripts/tsrf/evidence/contracts.cjs`; do not create a second canonicalization implementation.

Compute `candidate_content_sha256` from canonical sorted records of every candidate file except its manifest, after verifying the candidate manifest's declared hashes.

- [ ] **Step 4: Run GREEN**

Run the new test plus `tests/tsrf-launch-evidence-plane.test.cjs` to ensure no Release DNA regression.

- [ ] **Step 5: Commit**

```text
feat(svef): add deterministic release bundle manifest
```

### Task 3: Build-Once Release Candidate Workflow

**Files:**
- Create: `.github/workflows/svef-release-candidate.yml`
- Create: `tests/svef-release-workflow.test.cjs`

**Interfaces:**
- Consumes: exact `source_sha` workflow input or exact PR head SHA; existing V14 builder.
- Produces: one candidate artifact directory, one SBOM/material document, provenance input/attestation, one release-bundle manifest, uploaded artifact whose name contains exact source SHA.

- [ ] **Step 1: Write RED workflow-contract tests**

Require:

- exact checkout `ref` bound to `SOURCE_SHA`;
- `git rev-parse HEAD` equality check;
- one and only one invocation of `tools/vvip_public_release.py`;
- no `pip install --upgrade pip`;
- no Production environment or Production secrets;
- output under `$RUNNER_TEMP`;
- release bundle module invocation;
- uploaded artifact name contains exact source SHA;
- artifact attestation/provenance step is present and bound to exact artifact subject digest;
- every external action reference is immutable-SHA pinned.

- [ ] **Step 2: Run RED**

Expected: missing workflow.

- [ ] **Step 3: Implement workflow**

Build V14 candidate once. Generate SBOM/material document from exact checked-out dependency files and tool/runtime identities without secret values. Build the deterministic release-bundle manifest. Produce/attach OIDC-backed provenance where GitHub repository capability supports it; if attestation capability is unavailable, the workflow MUST fail with `SVEF_ATTESTATION_UNAVAILABLE` rather than silently downgrade release eligibility.

- [ ] **Step 4: Run GREEN**

Run contract tests and Quality Gate.

- [ ] **Step 5: Commit**

```text
ci(svef): add build-once attested release candidate
```

### Task 4: Constrained Production Promoter

**Files:**
- Modify: `.github/workflows/pages.yml`
- Create: `tests/svef-production-promoter.test.cjs`

**Interfaces:**
- Consumes: approved originating workflow run ID, exact source SHA, exact release-bundle/artifact digest, and release-decision evidence reference.
- Produces: deployment of the previously generated Pages-compatible artifact only.

- [ ] **Step 1: Write RED tests**

The test requires Production workflow to reject these source-building capabilities:

```text
tools/vvip_public_release.py
pip install
npm install
pnpm install
yarn install
setup-python
setup-node
```

The test requires explicit exact digest/source inputs and an artifact download/verification phase before deployment. It also requires environment protection and no automatic deployment from an arbitrary `push` without the release decision inputs.

- [ ] **Step 2: Run RED**

Expected: FAIL because current `pages.yml` rebuilds the public artifact.

- [ ] **Step 3: Convert pages workflow to promoter**

Remove the build job. Retrieve only the prebuilt artifact from the approved release-candidate run, recompute/download-verified digest, verify release decision binding, then pass the exact Pages artifact to `actions/deploy-pages`.

If cross-workflow artifact identity cannot be proven with repository/run/source/digest, exit `SVEF_PROMOTION_ARTIFACT_UNPROVEN`.

- [ ] **Step 4: Run GREEN**

Run promoter contract, immutable-action policy, and Quality Gate.

- [ ] **Step 5: Commit**

```text
security(svef): make production deploy exact-artifact promotion only
```

### Task 5: Exact-SHA WP-A Verification

**Files:** no source changes unless a proven failure requires a new TDD cycle.

- [ ] Verify branch HEAD and tree.
- [ ] Run/fetch same-SHA Quality Gate, CodeQL, Dependency Review, CleanGuard, Project Control, V14/compatible release tests.
- [ ] Verify no protected workflow contains tag-based `uses:` refs.
- [ ] Verify release bundle artifact name/source SHA/digest.
- [ ] Verify Production workflow contains no build/rebuild command.
- [ ] Record WP-A Evidence Checkpoint in Issue #160 bound to exact SHA/run IDs/artifact digests.

**WP-A acceptance:** `IMMUTABLE_SUPPLY_CHAIN=PASS` and `BUILD_ONCE_PROMOTION_CONTRACT=PASS` on one exact SHA. This does not yet imply global launch readiness; WP-B/C/D remain mandatory.
