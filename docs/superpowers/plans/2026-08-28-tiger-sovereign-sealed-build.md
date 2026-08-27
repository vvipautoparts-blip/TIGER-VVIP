# TIGER Sovereign Sealed Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the next owner-approved Sovereign Constellation slice: fail-closed real container SBOM, Cryptographic Genome, Release Passport 2.0, vulnerability/attestation gates, and a Seoul-only Sealed Build workflow that produces a verified immutable OCI artifact without deploying Production runtime infrastructure.

**Architecture:** The Foundation phase on `main` already owns the immutable KMS-encrypted ECR repository and exact GitHub OIDC MediaBuildRole. This slice replaces the historical materials-only release evidence with split-authority release identity, generates a real CycloneDX 1.7 inventory from the built OCI image, blocks Critical/High findings, binds verified provenance/SBOM attestations to the exact manifest digest, and emits a Release Passport 2.0. The workflow may push the build artifact to the authoritative Seoul ECR repository but may not mutate Lambda, CloudFormation, CloudFront, WAF, ACM, Supabase, or Production browser configuration.

**Tech Stack:** Node.js 24, `node:test`, Docker/OCI, AWS ECR in `ap-northeast-2`, GitHub Actions OIDC, Syft 1.51.0, CycloneDX 1.7, GitHub artifact attestations, SHA-256 canonical evidence.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`

## Global Constraints

- Base authority is protected `main`; implementation begins from `ced38fdbcfce87b0bfae1121c8d85436564505f6` or a reviewed descendant only.
- First active Production Media build/runtime region is Seoul `ap-northeast-2`.
- The service Dockerfile must remain pinned to the reviewed Node.js 24 Lambda base image OCI digest.
- `package-lock.json` is dependency authority and build installation uses `npm ci`.
- Build once, push once, resolve one immutable OCI manifest digest; no rebuild between test and Production eligibility.
- Real SBOM means inventory of the built container, not only source/material files.
- CycloneDX SBOM must report `specVersion: 1.7`; any lower or unknown version fails closed.
- `CRITICAL` and `HIGH` vulnerability findings block eligibility. `MEDIUM` requires explicit policy/evidence; `LOW` is recorded.
- No unsupported SLSA level claim is permitted.
- GitHub-to-AWS uses OIDC only; no access key or secret key may be introduced.
- This slice may use only `TIGER-VVIP-GitHub-MediaBuild`; it must not use or modify `TIGER-VVIP-GitHub-ProductionDeploy`.
- The legacy `.github/workflows/media-finalizer-build.yml` remains quarantined and is not resurrected.
- No Lambda, CloudFormation deploy, WAF, CloudFront, ACM, Supabase mutation, Dark Bootstrap, canary, or Production endpoint mutation occurs in this plan.
- All third-party GitHub Actions are pinned by full commit SHA.
- No secret, JWT, authorization header, capability, signed URL, raw media, or secret value may enter Genome/Passport/SBOM release evidence.

---

### Task 1: Seal owner authority and RED supply-chain contracts

**Files:**
- Modify: `docs/owner-reference/TIGER-SOVEREIGN-CONSTELLATION-2026.md`
- Create: `tests/tiger-sovereign-sealed-build.test.cjs`
- Modify: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: Master Spec §§14–18, 23, 30, 32.
- Produces: exact repository contracts for the Genome, Passport 2.0, real SBOM validation, vulnerability gate, and replacement Sealed Build workflow.

- [ ] **Step 1: Record the owner execution decision**

Add an `## Current owner-approved execution slice` section to the owner reference stating:

```text
APPROVED / IN_EXECUTION
Foundation #339 is merged.
Current slice: real SBOM -> Cryptographic Genome -> Release Passport 2.0 -> Sovereign Sealed Build.
Branch: feat/tiger-sovereign-sealed-build-20260828.
This is a continuation of the existing Master Spec, not a new architecture.
Production mutation, Supabase live convergence, Dark Bootstrap and Global Edge live deployment remain outside this slice.
```

- [ ] **Step 2: Write RED workflow contracts**

Create `tests/tiger-sovereign-sealed-build.test.cjs` requiring a new workflow at `.github/workflows/tiger-media-sovereign-sealed-build.yml`. The test must assert at minimum:

```js
assert.match(workflow, /name:\s*TIGER Media Sovereign Sealed Build/);
assert.match(workflow, /environment:\s*media-build/);
assert.match(workflow, /id-token:\s*write/);
assert.match(workflow, /attestations:\s*write/);
assert.match(workflow, /ap-northeast-2/);
assert.match(workflow, /TIGER-VVIP-GitHub-MediaBuild/);
assert.match(workflow, /SOURCE_SHA/);
assert.match(workflow, /SOURCE_TREE/);
assert.match(workflow, /npm\s+ci/);
assert.match(workflow, /docker\s+build/);
assert.match(workflow, /docker\s+push/);
assert.match(workflow, /sha256:/);
assert.match(workflow, /syft_1\.51\.0_linux_amd64\.tar\.gz/);
assert.match(workflow, /2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f/);
assert.match(workflow, /cyclonedx-json/);
assert.match(workflow, /media-cell-genome\.cjs/);
assert.match(workflow, /media-cell-passport\.cjs/);
assert.doesNotMatch(workflow, /TIGER-VVIP-GitHub-ProductionDeploy/);
assert.doesNotMatch(workflow, /cloudformation\s+(?:deploy|create-change-set|execute-change-set)/i);
assert.doesNotMatch(workflow, /update-function-code|update-alias|create-function|lambda\s+/i);
assert.doesNotMatch(workflow, /cloudfront\s+|wafv2\s+|acm\s+/i);
```

Also assert `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, AWS credential configuration, and attestation actions are referenced only by full 40-character SHAs.

- [ ] **Step 3: Replace legacy materials-only expectations with RED v2 evidence expectations**

Update `tests/media-finalizer-release-evidence.test.cjs` so required materials are the split authorities:

```js
const REQUIRED_MATERIALS = [
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
];
```

Require `schemaVersion === 'tiger-release-passport-v2'`, a deterministic `genome.id`, real container SBOM identity, exact Seoul repository identity, scan counts/status, and verified provenance/SBOM attestations.

- [ ] **Step 4: Run RED tests**

Run:

```bash
node --test tests/tiger-sovereign-sealed-build.test.cjs tests/media-finalizer-release-evidence.test.cjs
```

Expected: FAIL because the replacement workflow and Genome helper do not yet exist and Passport remains v1.

- [ ] **Step 5: Commit the RED contract + owner record**

```bash
git add docs/owner-reference/TIGER-SOVEREIGN-CONSTELLATION-2026.md tests/tiger-sovereign-sealed-build.test.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "test: seal owner-approved Sovereign Sealed Build contract"
```

---

### Task 2: Implement deterministic Cryptographic Genome and Release Passport 2.0

**Files:**
- Create: `scripts/release/media-cell-genome.cjs`
- Modify: `scripts/release/media-cell-passport.cjs`
- Modify: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: `source`, `materials`, `image`, `database`, `sbom`, `scan`, and `attestations` evidence objects.
- Produces: `createMediaCellGenome(evidence) -> genome` and `createMediaCellPassport(evidence) -> passportV2`.

- [ ] **Step 1: Add failing Genome determinism tests**

Require the same canonical evidence to produce the same Genome ID regardless of object key insertion order, and any authoritative digest change to change the Genome ID.

Expected shape:

```js
{
  schemaVersion: 'tiger-cryptographic-genome-v1',
  algorithm: 'sha256',
  id: '<64 lowercase hex>',
  source: { commitSha, treeSha },
  image: { repository, manifestDigest, baseDigest },
  materials: { ...sorted material digests... },
  database: { migrationSetSha256 },
  sbom: { sha256, subjectDigest },
  attestations: {
    provenance: { verified: true, evidenceSha256 },
    sbom: { verified: true, evidenceSha256 },
  },
}
```

- [ ] **Step 2: Implement `media-cell-genome.cjs` minimally**

Use canonical JSON with recursively sorted object keys. Validate exact keys and SHA formats before hashing. Compute:

```js
const id = crypto.createHash('sha256').update(canonicalJson(authority)).digest('hex');
```

Reject unknown fields and secret-shaped keys/values using the same fail-closed secret policy as the Passport helper.

- [ ] **Step 3: Upgrade Passport to v2**

`createMediaCellPassport` must require the Genome and return only bounded non-secret release identifiers:

```js
{
  schemaVersion: 'tiger-release-passport-v2',
  genome: { schemaVersion, algorithm, id },
  source,
  materials,
  image,
  database,
  sbom,
  scan,
  attestations,
  deployment: {
    mode: 'sealed-build-only',
    runtimeRegion: 'ap-northeast-2',
    edgeControlRegion: 'us-east-1',
    regionalStack: null,
    edgeStack: null,
    lambdaVersion: null,
    cloudFrontDistribution: null,
    wafWebAcl: null,
  },
}
```

The null deployment fields are explicit evidence that this slice did not deploy runtime infrastructure; they are not readiness claims.

- [ ] **Step 4: Run focused tests**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: PASS for Genome and Passport 2.0 contracts.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/media-cell-genome.cjs scripts/release/media-cell-passport.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "feat: add TIGER Cryptographic Genome and Passport 2.0"
```

---

### Task 3: Validate real container SBOM and vulnerability evidence fail closed

**Files:**
- Create: `scripts/release/media-cell-supply-gate.cjs`
- Modify: `scripts/release/media-cell-sbom.cjs`
- Create: `tests/media-finalizer-supply-gate.test.cjs`

**Interfaces:**
- Consumes: Syft-generated CycloneDX JSON, exact OCI subject digest, and normalized ECR/Inspector finding counts.
- Produces: `{ sbomSha256, subjectDigest, componentCount, vulnerabilityDecision, findingsSha256 }` only when all supply locks pass.

- [ ] **Step 1: Write failing real-SBOM tests**

Fixtures must prove the gate rejects:

```text
SBOM specVersion != 1.7
SBOM with zero components
SBOM not bound to exact OCI subject digest
unknown scan state
any CRITICAL finding
any HIGH finding
MEDIUM finding without explicit reviewed exception evidence
secret-shaped evidence
```

and accepts a CycloneDX 1.7 container SBOM with runtime package inventory and zero Critical/High findings.

- [ ] **Step 2: Refocus `media-cell-sbom.cjs`**

Do not synthesize a materials-only SBOM as Production evidence. Retain deterministic material evidence as `buildMaterials`, but expose a validator for the real Syft CycloneDX document:

```js
validateRealContainerSbom(sbom, expectedManifestDigest)
```

It must require `bomFormat === 'CycloneDX'`, `specVersion === '1.7'`, non-empty `components`, container metadata/subject binding, and no secret material.

- [ ] **Step 3: Implement the supply gate**

Normalize scan severities to integers and fail closed:

```js
if (critical > 0) fail('SUPPLY_GATE_CRITICAL_BLOCK');
if (high > 0) fail('SUPPLY_GATE_HIGH_BLOCK');
if (medium > 0 && !validMediumException) fail('SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED');
```

`validMediumException` must require advisory identity, affected component, rationale, owner/security approval identity, expiry, and evidence digest. Do not embed free-form secrets.

- [ ] **Step 4: Run supply tests**

```bash
node --test tests/media-finalizer-supply-gate.test.cjs tests/media-finalizer-release-evidence.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/media-cell-sbom.cjs scripts/release/media-cell-supply-gate.cjs tests/media-finalizer-supply-gate.test.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "security: enforce real Media container supply gate"
```

---

### Task 4: Implement the replacement Seoul Sovereign Sealed Build workflow

**Files:**
- Create: `.github/workflows/tiger-media-sovereign-sealed-build.yml`
- Modify: `tests/tiger-sovereign-sealed-build.test.cjs`
- Read: `infra/media-finalizer/foundation/template.yaml`
- Read: `services/media-finalizer/Dockerfile`

**Interfaces:**
- Consumes: protected GitHub environment `media-build`, the live foundation outputs/configuration for ECR repository URI and `TIGER-VVIP-GitHub-MediaBuild`, exact `main` source SHA, Dockerfile pinned base digest.
- Produces: one immutable ECR manifest digest plus bounded SBOM/Genome/Passport/scan/attestation evidence artifacts. Produces no runtime deployment.

- [ ] **Step 1: Keep trigger fail closed**

The workflow is `workflow_dispatch` only until required repository and environment variables are explicitly configured. Require a `source_sha` input and reject any source that is not an exact commit on `refs/heads/main`:

```bash
git fetch --no-tags origin main
git merge-base --is-ancestor "$SOURCE_SHA" origin/main
test "$SOURCE_SHA" = "$(git rev-parse "$SOURCE_SHA")"
```

Then checkout exact SHA and record `SOURCE_TREE=$(git rev-parse 'HEAD^{tree}')`.

- [ ] **Step 2: Use only minimum workflow permissions**

Top-level permissions are `contents: read`; build job adds only:

```yaml
permissions:
  contents: read
  id-token: write
  attestations: write
```

No `packages: write` is required because ECR authorization is AWS OIDC/IAM, not GitHub Packages.

- [ ] **Step 3: Pin established repository actions**

Use the repository-reviewed exact pins where applicable:

```yaml
actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f
aws-actions/configure-aws-credentials@e6de054238d6b7531b4efff3b6587d9aade6a06c
```

Attestation actions must also be full immutable SHAs resolved and reviewed before GREEN; tag-only action references are forbidden.

- [ ] **Step 4: Prove exact AWS identity and region before mutation**

Configure OIDC for `ap-northeast-2`, assume only the MediaBuildRole, and run `aws sts get-caller-identity`. Verify exact account and `assumed-role/TIGER-VVIP-GitHub-MediaBuild/` ARN pattern. Fail before Docker login on mismatch.

- [ ] **Step 5: Prove dependencies and source before building**

Run service tests from the exact source and install with:

```bash
cd services/media-finalizer
npm ci
npm test
```

If the service package has no `test` script, run the repository's exact Media Finalizer Node test set instead; do not silently skip testing.

- [ ] **Step 6: Build exactly once and push exactly once**

Use one local tag derived from the exact source SHA:

```bash
docker build --file services/media-finalizer/Dockerfile --tag "$ECR_URI:sha-$SOURCE_SHA" services/media-finalizer
docker push "$ECR_URI:sha-$SOURCE_SHA"
```

The workflow source must contain exactly one executable `docker build` and one executable `docker push` path. Resolve the remote manifest digest with AWS ECR and construct `IMAGE_URI="$ECR_URI@$MANIFEST_DIGEST"`. No later rebuild is allowed.

- [ ] **Step 7: Install Syft 1.51.0 with archive integrity verification**

Download only:

```text
https://github.com/anchore/syft/releases/download/v1.51.0/syft_1.51.0_linux_amd64.tar.gz
SHA256 2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f
```

Verify `sha256sum -c` before extraction/installation. Generate the SBOM from the exact pushed digest, not a mutable tag:

```bash
syft "registry:$IMAGE_URI" -o cyclonedx-json=/tmp/tiger-media/media-finalizer.cdx.json
```

Run the repository validator and require CycloneDX 1.7.

- [ ] **Step 8: Wait for authoritative scan evidence and enforce gate**

Poll only bounded ECR/Inspector scan status supported by the configured enhanced scanning path. Normalize counts to a canonical JSON evidence file and call `media-cell-supply-gate.cjs`. Timeout/unknown scan state is a failure, never PASS.

- [ ] **Step 9: Generate and verify attestations**

Create provenance and SBOM attestations for the exact OCI subject digest. Capture only attestation identity/verification evidence digests. Verify both before Genome creation. Do not claim a SLSA level.

- [ ] **Step 10: Generate Genome and Passport 2.0**

Hash source, split IaC/Guard files, Dockerfile, package lock, DB migration set, real SBOM, scan evidence, and attestation evidence. Generate canonical JSON files under `/tmp/tiger-media/` with mode 0600.

- [ ] **Step 11: Upload bounded release evidence**

Upload only:

```text
media-finalizer.cdx.json
cryptographic-genome.json
release-passport-v2.json
scan-evidence.json
attestation-evidence.json
source-evidence.env
```

Retention is bounded. Do not upload Docker credentials, AWS credentials, raw OIDC tokens, secrets, request data, or media.

- [ ] **Step 12: Prove the workflow did not deploy runtime infrastructure**

The final step must confirm the repository source stayed immutable and emit:

```text
TIGER_MEDIA_SEALED_BUILD=PASS
TIGER_MEDIA_RUNTIME_DEPLOYED=NO
TIGER_MEDIA_DARK_BOOTSTRAP=NOT_STARTED
```

- [ ] **Step 13: Run workflow source contracts locally**

```bash
node --test tests/tiger-sovereign-sealed-build.test.cjs tests/media-finalizer-release-evidence.test.cjs tests/media-finalizer-supply-gate.test.cjs
```

Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add .github/workflows/tiger-media-sovereign-sealed-build.yml tests/tiger-sovereign-sealed-build.test.cjs
git commit -m "ci: add TIGER Sovereign Sealed Build"
```

---

### Task 5: Preserve quarantine and prove authority separation

**Files:**
- Read: `.github/workflows/media-finalizer-build.yml`
- Read: `.github/workflows/media-finalizer-deploy.yml`
- Modify: `tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs`
- Modify: `tests/tiger-sovereign-sealed-build.test.cjs`

**Interfaces:**
- Consumes: replacement workflow from Task 4 and existing quarantined historical workflows.
- Produces: repository proof that exactly one current Media build workflow has AWS mutation authority and no runtime deploy workflow is re-enabled.

- [ ] **Step 1: Add exclusivity tests**

Assert the legacy build/deploy workflows still contain `SOVEREIGN_CONSTELLATION_SUPERSEDED`, `exit 1`, no `id-token: write`, and no AWS/Docker mutation path. Assert the new workflow alone references `TIGER-VVIP-GitHub-MediaBuild`.

- [ ] **Step 2: Forbid cross-authority AWS commands**

The new Sealed Build workflow may use only STS and ECR/scan commands needed for build evidence. Explicitly reject command families for CloudFormation, Lambda, CloudFront, WAF, ACM, Secrets value mutation, Route53, and Supabase CLI mutation.

- [ ] **Step 3: Run authority tests**

```bash
node --test tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs tests/tiger-sovereign-sealed-build.test.cjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs tests/tiger-sovereign-sealed-build.test.cjs
git commit -m "security: prove sealed-build authority separation"
```

---

### Task 6: Exact-head verification and review handoff

**Files:**
- Read: all files changed by Tasks 1–5.

**Interfaces:**
- Consumes: completed repository implementation.
- Produces: exact-head repository evidence and a reviewable PR. It does not execute live Sealed Build or Production deployment unless the protected environment/configuration is intentionally invoked later.

- [ ] **Step 1: Run focused Node suite**

```bash
node --test \
  tests/media-finalizer-release-evidence.test.cjs \
  tests/media-finalizer-supply-gate.test.cjs \
  tests/tiger-sovereign-sealed-build.test.cjs \
  tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs \
  tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: PASS with zero skipped/todo tests relevant to this slice.

- [ ] **Step 2: Run repository security/quality gates available without AWS mutation**

Run the current VVIP Quality Gate, CleanGuard, Zero-Residue/full-history compatible checks, immutable-action contracts, and `git diff --check`. A missing/unavailable gate is reported as unavailable, never represented as GREEN.

- [ ] **Step 3: Inspect exact diff against protected main**

Confirm the diff contains only this slice: owner reference, plan, tests, release helpers, and replacement Sealed Build workflow. Confirm no access keys, secret bytes, legacy single-stack authority, ProductionDeploy role use, or runtime deploy commands were introduced.

- [ ] **Step 4: Push branch and require exact-head CI**

The review decision must bind to exact feature-branch commit SHA/tree. Any new commit invalidates previous exact-head evidence.

- [ ] **Step 5: Open PR to `main`**

PR title:

```text
feat: TIGER Sovereign Sealed Build and Release Passport 2.0
```

PR body must state explicitly:

```text
Repository implementation only.
No Production runtime deployment by this PR.
No Supabase live migration by this PR.
No Dark Bootstrap by this PR.
No Global Edge live mutation by this PR.
Live Sealed Build remains a later controlled execution after repository exact-head review and environment readiness.
```

- [ ] **Step 6: Stop before merge if any required exact-head check is not GREEN**

Do not merge on stale CI, partial evidence, or documentation-only confidence. Do not invoke the live Sealed Build until its protected `media-build` environment variables/role outputs are verified.

## Plan Self-Review

- Spec coverage in this slice: §14 immutable ECR identity, §15 build-once contract, §16 Cryptographic Genome, §17 real SBOM, §18 vulnerability gate, §21 repository security evidence relevant to build, §29 GitHub governance, §30 Release Passport 2.0, and implementation-order steps §32.4–5.
- Deliberately deferred: §9 live Supabase convergence, §23 live Dark Bootstrap, §24 shadow verification, §25 adaptive canary, §26 runtime rollback execution, §27 Phoenix DR, live regional/edge deploy workflows, and Production endpoint convergence.
- Authority separation: the historical build/deploy entrypoints remain quarantined; the replacement workflow has build authority only.
- Placeholder scan: no implementation placeholder is authorized to weaken a security gate. Any unresolved external action SHA, AWS environment variable, or live role output must fail closed until resolved; it cannot be replaced by a mutable tag or guessed value.
- Production truth: repository GREEN and even a successful Sealed Build are necessary but not sufficient for Production readiness.