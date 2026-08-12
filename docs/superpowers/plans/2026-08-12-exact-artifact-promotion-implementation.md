# Exact-Artifact Production Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace rebuild-at-promotion with a two-stage 2026-grade release flow that builds Production bytes once, cryptographically seals them, then deploys the exact previously-built artifact without rebuilding.

**Architecture:** Stage A is a manual, exact-current-main Production Release Artifact Builder with no Pages authority. Stage B is a manual promotion workflow that resolves one GitHub Actions artifact by numeric identity, verifies outer GitHub artifact integrity plus inner deterministic SVEF release-bundle provenance/evidence, then deploys the already-built `public/` directory. Candidate-domain release-bundle behavior from #205 remains unchanged; Production uses a separate explicit entry point backed by shared private verification logic.

**Tech Stack:** GitHub Actions, Node.js 22, Python 3.12, GitHub Actions REST API, GitHub Artifact Attestations/Sigstore, CycloneDX JSON, deterministic tar/gzip, existing VVIP release builder and quality gates.

## Global Constraints

- Production promotion remains `workflow_dispatch` only.
- `release_sha` is a lowercase 40-character Git SHA and must equal current `origin/main` both when sealed and when promoted.
- Build Production public bytes exactly once with `tools/vvip_public_release.py --mode production` into `$RUNNER_TEMP`.
- Promotion MUST NOT invoke `tools/vvip_public_release.py` or any application build/regeneration command.
- Candidate `createReleaseBundleManifest()` stays candidate-only.
- New Production entry point rejects candidate manifests; candidate API rejects Production manifests.
- Outer GitHub Actions artifact ZIP digest and inner deterministic release-bundle `tar.gz` digest are distinct identities and both are verified.
- Artifact authority is derived from GitHub metadata plus verified contents, never filename or caller-supplied digest alone.
- All external Actions remain pinned to immutable lowercase 40-character commit SHAs.
- Only the final deploy job gets `pages: write` and `id-token: write`.
- No SQL/schema/RLS, Supabase Production mutation, provider/DNS/secrets/payment/country/owner mutation, or real Production deployment is part of this PR.
- Any missing/expired/mismatched/ambiguous evidence fails closed.

---

### Task 1: RED contract suite for release-domain separation

**Files:**
- Modify: `tests/svef-release-bundle-postmerge-hardening.test.cjs`
- Modify later in GREEN: `scripts/tsrf/svef/release-bundle.cjs`

**Interfaces:**
- Existing: `createReleaseBundleManifest(options)` — candidate-only.
- New after GREEN: `createProductionReleaseBundleManifest(options)` — Production-only.
- Both return frozen `SVEF_RELEASE_BUNDLE_V1` manifests and use the same serializer.

- [ ] **Step 1: Add failing cross-mode tests**

Add assertions that:

```js
const {
  createProductionReleaseBundleManifest,
} = require('../scripts/tsrf/svef/release-bundle.cjs');
```

and prove:

```js
assert.throws(() => buildCandidateWithManifestMode('production'),
  (error) => error.code === 'SVEF_CANDIDATE_MANIFEST_INVALID');

assert.throws(() => buildProductionWithManifestMode('candidate'),
  (error) => error.code === 'SVEF_PRODUCTION_MANIFEST_INVALID');
```

Also prove Production mode fails closed unless `releaseEligible === true`, `configurationErrors` is `[]`, and `forbiddenFindings` is `[]`.

- [ ] **Step 2: Run focused RED**

Run through CI-triggered repository gates after committing only tests. Expected: Quality Gate/V14 fail because the Production API is missing.

- [ ] **Step 3: Commit RED**

Commit message:

```text
test(release): define Production bundle domain separation
```

---

### Task 2: RED workflow contracts for build-once and promote-without-rebuild

**Files:**
- Create: `tests/exact-artifact-production-promotion.test.cjs`
- Existing to remain compatible: `tests/release-workflow-hardening.test.cjs`
- Existing to update only if semantics changed intentionally: `tests/pages-production-artifact-isolation.test.cjs`
- GREEN targets later: `.github/workflows/production-release-artifact.yml`, `.github/workflows/pages.yml`

**Interfaces:**
- Builder workflow path: `.github/workflows/production-release-artifact.yml`
- Artifact name: `vvip-production-release-${release_sha}`
- Promotion inputs: `release_sha`, `artifact_id`

- [ ] **Step 1: Add failing builder workflow tests**

Tests require:

```js
assert.match(builder, /workflow_dispatch:/);
assert.doesNotMatch(builder, /\n\s{2}push\s*:/);
assert.match(builder, /release_sha:/);
assert.match(builder, /git rev-parse origin\/main/);
assert.match(builder, /--mode\s+production/);
assert.equal((builder.match(/tools\/vvip_public_release\.py/g) || []).length, 1);
assert.match(builder, /\$RUNNER_TEMP\/vvip-production-public/);
assert.doesNotMatch(builder, /deploy-pages|upload-pages-artifact/);
```

Require re-fetch/re-check of `origin/main` immediately before final artifact sealing/upload.

- [ ] **Step 2: Add failing promotion workflow tests**

Tests require `.github/workflows/pages.yml` to:

```js
assert.match(pages, /artifact_id:/);
assert.match(pages, /actions:\s*read/);
assert.doesNotMatch(pages, /tools\/vvip_public_release\.py/);
assert.doesNotMatch(pages, /npm\s+(?:run\s+)?build|pnpm\s+build|yarn\s+build/i);
assert.match(pages, /api\.github\.com\/repos\/\$\{\{\s*github\.repository\s*\}\}\/actions\/artifacts/);
assert.match(pages, /workflow_run/);
assert.match(pages, /digest/);
assert.match(pages, /gh\s+attestation\s+verify/);
```

Also require safe ZIP/tar inspection before extraction and forbid extraction into `$GITHUB_WORKSPACE`.

- [ ] **Step 3: Require least-privilege mechanically**

Verify only final deploy job owns:

```yaml
pages: write
id-token: write
```

Builder has no Pages authority. Promotion preflight has only `contents: read` and `actions: read`.

- [ ] **Step 4: Commit RED**

Commit message:

```text
test(release): define exact-artifact Production promotion contract
```

---

### Task 3: GREEN Production release-bundle domain

**Files:**
- Modify: `scripts/tsrf/svef/release-bundle.cjs`
- Test: `tests/svef-release-bundle-postmerge-hardening.test.cjs`

**Interfaces:**
- `createReleaseBundleManifest(options)` -> candidate domain.
- `createProductionReleaseBundleManifest(options)` -> Production domain.
- Private helper `createReleaseBundleManifestForMode(options, expectedMode, codes)` or equivalent.

- [ ] **Step 1: Refactor only shared verification**

Move common logic into a private expected-mode helper. Expected mode is trusted code, never accepted from caller options.

- [ ] **Step 2: Add Production entry point**

Production manifest validation must require:

```js
manifest.mode === 'production'
manifest.releaseEligible === true
Array.isArray(manifest.configurationErrors) && manifest.configurationErrors.length === 0
Array.isArray(manifest.forbiddenFindings) && manifest.forbiddenFindings.length === 0
```

Candidate error codes remain unchanged. Production uses explicit `SVEF_PRODUCTION_*` codes where domain-specific.

- [ ] **Step 3: Run focused tests**

Expected: new domain-separation tests PASS; all existing #204/#205 release-bundle tests stay PASS.

- [ ] **Step 4: Commit GREEN**

```text
feat(release): add fail-closed Production bundle domain
```

---

### Task 4: GREEN manual Production Release Artifact Builder

**Files:**
- Create: `.github/workflows/production-release-artifact.yml`
- Test: `tests/exact-artifact-production-promotion.test.cjs`

**Interfaces:**
- Input: `release_sha`.
- Output artifact name: `vvip-production-release-${release_sha}`.
- Inner files: `vvip-production-release-${release_sha}.tar.gz` and matching `.sha256`.

- [ ] **Step 1: Implement exact-current-main preflight**

Use immutable checkout/setup action SHAs. Validate input regex, fetch `origin/main`, require exact equality, checkout exact SHA, and record tree SHA.

- [ ] **Step 2: Build Production public bytes exactly once**

Use `production-build` environment and only public runtime values:

```bash
python tools/vvip_public_release.py \
  --source "$GITHUB_WORKSPACE" \
  --output "$RUNNER_TEMP/vvip-production-public" \
  --mode production \
  --source-sha "$RELEASE_SHA" \
  --include-cname
```

No second invocation is permitted.

- [ ] **Step 3: Produce deterministic evidence**

Generate canonical `source.json`, `materials.json`, CycloneDX `sbom.cdx.json`, and `release-bundle-manifest.json` using `createProductionReleaseBundleManifest()`.

- [ ] **Step 4: Seal deterministic inner tarball**

Create `public/` + `evidence/` tarball using sorted names, fixed timestamp, numeric owner/group, and `gzip -n`; write exact SHA-256 record.

- [ ] **Step 5: Generate GitHub attestation for inner tarball**

Use pinned `actions/attest` with the minimum required job permissions. Verify the produced attestation subject digest and exact source binding before upload.

- [ ] **Step 6: Race check and artifact upload**

Immediately before upload: re-fetch `origin/main`, require it still equals `release_sha`, then upload exactly the tarball and `.sha256` with a deterministic artifact name and explicit retention.

- [ ] **Step 7: Run workflow contract tests**

Expected: builder-related RED assertions become GREEN.

- [ ] **Step 8: Commit**

```text
feat(release): add sealed Production artifact builder
```

---

### Task 5: GREEN exact existing-artifact verifier and safe extractor

**Files:**
- Create: `scripts/release/verify-production-artifact.py`
- Create: `tests/test_verify_production_artifact.py`

**Interfaces:**

CLI inputs:

```text
--artifact-zip <path>
--github-artifact-digest sha256:<64hex>
--release-sha <40hex>
--repository-id <integer>
--expected-builder-workflow .github/workflows/production-release-artifact.yml
--output-public <path>
```

Exit 0 only after all local archive/evidence/hash checks succeed. GitHub metadata/run/attestation checks remain in workflow shell/`gh`; this verifier handles downloaded bytes and embedded evidence.

- [ ] **Step 1: RED archive-safety tests**

Cover absolute path, `..`, backslash ambiguity, symlink/hardlink/special entries, duplicate normalized names, unexpected outer ZIP files, wrong inner digest, unexpected inner tar files, undeclared public file, missing public file, file hash mismatch, wrong Production mode, source mismatch, SBOM/material digest mismatch.

- [ ] **Step 2: Implement outer ZIP digest validation**

Re-hash ZIP bytes and compare to GitHub REST `sha256:` digest.

- [ ] **Step 3: Implement safe ZIP inspection/extraction**

Allow exactly tarball + `.sha256`; extract only after validation to fresh temp/output roots.

- [ ] **Step 4: Implement inner tar digest and safe extraction**

Validate `.sha256`, inspect tar metadata before extraction, forbid links/special entries/path ambiguity, then extract.

- [ ] **Step 5: Validate evidence and public tree**

Check `source.json`, Production release-bundle manifest, SBOM/material hashes, embedded Production release manifest, and all public-file hashes; reject extras.

- [ ] **Step 6: Commit**

```text
feat(release): verify sealed Production artifact locally
```

---

### Task 6: GREEN pure Promotion workflow

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/release-workflow-hardening.test.cjs`
- Modify: `tests/pages-production-artifact-isolation.test.cjs`
- Test: `tests/exact-artifact-production-promotion.test.cjs`

**Interfaces:**
- Inputs: `release_sha`, `artifact_id` only.
- Uses verifier from Task 5.

- [ ] **Step 1: Preserve manual exact-main gate**

Keep current exact-SHA validation and add numeric `artifact_id` validation.

- [ ] **Step 2: Resolve artifact metadata from GitHub API**

Using `actions: read`, query `/actions/artifacts/{artifact_id}`; fail if expired, wrong repository, name, digest, workflow-run SHA, or repository ID.

- [ ] **Step 3: Resolve producing run and workflow identity**

Query run metadata using the returned run ID. Require `workflow_dispatch`, completed/success, exact `head_sha`, and approved builder workflow path.

- [ ] **Step 4: Download and verify outer artifact**

Download exact artifact ZIP by numeric ID. Pass the GitHub-reported digest and exact source data to `verify-production-artifact.py`.

- [ ] **Step 5: Verify attestation for inner tarball**

Before trusting extracted public bytes, run `gh attestation verify <inner-tarball> --repo "$GITHUB_REPOSITORY"` and fail on any verification error.

- [ ] **Step 6: Upload already-built public directory to Pages**

`actions/upload-pages-artifact` receives only the verifier-produced public directory. No application build command exists in this workflow.

- [ ] **Step 7: Deploy and preserve live smoke verification**

Deploy job keeps isolated Pages/OIDC permissions and existing post-deploy same-SHA/runtime dependency smoke checks.

- [ ] **Step 8: Commit**

```text
security(release): promote exact previously-built artifact
```

---

### Task 7: Whole-repository verification and PR readiness

**Files:**
- No new implementation scope unless tests expose a defect in Tasks 1-6.
- Update PR body only after evidence exists.

- [ ] **Step 1: Run focused release tests**

```bash
node --test \
  tests/svef-release-bundle-modern.test.cjs \
  tests/svef-release-bundle-postmerge-hardening.test.cjs \
  tests/release-workflow-hardening.test.cjs \
  tests/pages-production-artifact-isolation.test.cjs \
  tests/exact-artifact-production-promotion.test.cjs
python -m unittest -v tests/test_verify_production_artifact.py tests/test_vvip_public_release.py
```

Expected: zero failures.

- [ ] **Step 2: Run full VVIP quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected: exit 0.

- [ ] **Step 3: Verify exact-head GitHub CI**

Require on one final SHA:

- VVIP Quality Gate — PASS
- V14 Release Candidate — PASS
- CodeQL — PASS
- Dependency Review — PASS
- TIGER CleanGuard — PASS

- [ ] **Step 4: Review changed-file scope**

Allowed implementation scope only:

```text
.github/workflows/production-release-artifact.yml
.github/workflows/pages.yml
scripts/tsrf/svef/release-bundle.cjs
scripts/release/verify-production-artifact.py
tests/svef-release-bundle-postmerge-hardening.test.cjs
tests/exact-artifact-production-promotion.test.cjs
tests/test_verify_production_artifact.py
tests/release-workflow-hardening.test.cjs
tests/pages-production-artifact-isolation.test.cjs
docs/superpowers/specs/2026-08-12-exact-artifact-promotion-design.md
docs/superpowers/specs/2026-08-12-exact-artifact-promotion-digest-amendment.md
docs/superpowers/plans/2026-08-12-exact-artifact-promotion-implementation.md
```

Any unrelated file requires STOP and investigation.

- [ ] **Step 5: Review Copilot/human threads**

Resolve only evidence-backed findings. No self-approval.

- [ ] **Step 6: Mark #206 Ready and request human review**

Only after all exact-head checks are GREEN. Arm auto-merge behind required human approval.

- [ ] **Step 7: Post-merge verification**

Verify merge commit, current `main` SHA, zero unresolved review threads, and no unintended Production run.

---

### Task 8: Final #164 semantic closure audit

**Files:**
- No source changes expected.

- [ ] **Step 1: Re-audit #164 unique value**

Map old value to modern replacements:

```text
proof/evidence -> current main
exact-SHA manual promotion -> #201/#202
immutable actions -> #203
verified candidate release bundle -> #204/#205
exact previously-built Production artifact promotion -> #206
```

- [ ] **Step 2: Prove old workflow is obsolete/unsafe to merge wholesale**

Record that #164 remains divergent, includes automatic push-triggered release behavior and unrelated files, and is not merged.

- [ ] **Step 3: Close #164 WITHOUT MERGE only after #206 is merged and main verified**

Preserve branch/history and add a detailed supersession comment.
