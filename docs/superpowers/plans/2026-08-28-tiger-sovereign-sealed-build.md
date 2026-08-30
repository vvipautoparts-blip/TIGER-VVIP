# TIGER Sovereign Sealed Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner-approved Sovereign Sealed Build repository authority: deterministic Media migration identity, Cryptographic Genome, Release Passport 2.0, real CycloneDX 1.7 container SBOM validation, fail-closed vulnerability/attestation gates, and a Seoul-only reusable build workflow that cannot execute live until a later reviewed DB-convergence caller exists.

**Architecture:** The merged Sovereign Constellation Foundation owns the immutable KMS-encrypted Seoul ECR repository and `TIGER-VVIP-GitHub-MediaBuild`. This slice implements build/evidence authority only. The new Sealed Build workflow is reusable-only (`workflow_call`), has no `push` or `workflow_dispatch` trigger, and therefore has no live invocation path in this slice. A later DB-convergence plan must add the reviewed caller. The workflow builds once, pushes once, resolves one immutable OCI digest, validates a real container SBOM, blocks unresolved vulnerabilities, creates and verifies provenance/SBOM attestations, then emits the Genome and Passport 2.0 without deploying runtime infrastructure.

**Tech Stack:** Node.js 24, `node:test`, Docker/OCI, AWS ECR `ap-northeast-2`, GitHub Actions OIDC, Syft 1.51.0, CycloneDX 1.7, `actions/attest` 4.2.1 pinned by full SHA, GitHub CLI attestation verification, SHA-256 canonical evidence.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-sealed-build-design.md`

**Master Authority:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`

## Global Constraints

- Base authority is protected `main`; this implementation branch descends from merge commit `ced38fdbcfce87b0bfae1121c8d85436564505f6`.
- Repository implementation order and first-live-release order are distinct. This plan implements the Sealed Build authority but does not authorize a live Sealed Build run.
- The new build workflow is `workflow_call` only. It must contain no `push`, `pull_request`, `schedule`, or `workflow_dispatch` trigger.
- No caller for the new reusable Sealed Build workflow is created in this plan.
- A later caller must supply live DB-convergence evidence; until that caller is reviewed and merged, the build workflow is intentionally unreachable from the Actions UI/events.
- An eligible future live run must build the **current exact protected `main` head**, not any historical ancestor. `release_sha` must equal the fetched `origin/main` SHA at invocation time.
- First active Media build/runtime region is Seoul `ap-northeast-2`.
- ECR repository authority is `tiger-media-finalizer`; deployment identity is its immutable `sha256:` manifest digest, never a tag.
- The service Dockerfile remains pinned to the reviewed Node.js 24 Lambda base image OCI digest.
- `services/media-finalizer/package-lock.json` is dependency authority; installation uses `npm ci`.
- Build exactly once and push exactly once; no rebuild occurs after the digest is resolved.
- Real SBOM means inventory of the built container. Materials evidence remains separate and cannot be mislabeled as the OCI SBOM.
- The real SBOM must be CycloneDX `specVersion: 1.7`, non-empty, and explicitly bound to the exact OCI digest.
- `CRITICAL > 0` blocks. `HIGH > 0` blocks. Because no owner/security MEDIUM exception policy is implemented in this slice, `MEDIUM > 0` also fails closed with `SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED`. `LOW` is recorded.
- ECR scan evidence must prove `ENHANCED` scanning and completed scan state. Unknown, stale, inaccessible, or incomplete scan evidence is failure.
- No unsupported SLSA **level** claim is permitted. GitHub-generated SLSA provenance predicate may be used as provenance evidence without claiming a maturity level.
- GitHub-to-AWS uses OIDC only. No standing AWS access key/secret key is introduced.
- This slice uses only `TIGER-VVIP-GitHub-MediaBuild`; it must not use or modify `TIGER-VVIP-GitHub-ProductionDeploy`.
- Legacy `.github/workflows/media-finalizer-build.yml` and `.github/workflows/media-finalizer-deploy.yml` remain `SUPERSEDED` and fail closed.
- No Lambda, CloudFormation deployment, CloudFront, WAF, ACM, Route53, Secrets value mutation, Supabase mutation, Dark Bootstrap, canary, browser runtime, or Production endpoint mutation occurs.
- All third-party GitHub Actions are pinned by full 40-character commit SHA.
- No secret, JWT, authorization header, Clerk session, capability, signed storage URL, raw request body, raw media, private key, GitHub token, Supabase privileged secret, or AWS credential may enter release evidence.

## Verified External Pins

Use these exact reviewed identities:

```text
actions/checkout v6.1.0
  d23441a48e516b6c34aea4fa41551a30e30af803
actions/setup-node v6.5.0
  249970729cb0ef3589644e2896645e5dc5ba9c38
actions/upload-artifact v7.0.1
  043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
aws-actions/configure-aws-credentials v6.2.3
  e6de054238d6b7531b4efff3b6587d9aade6a06c
actions/attest v4.2.1
  508db95dd578ae2727ebd6217d5ba78e4fbda05d
Syft 1.51.0 linux amd64 archive SHA-256
  2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f
```

---

### Task 1: Normalize and prove RED contracts against the final approved design

**Files:**
- Modify: `tests/tiger-sovereign-sealed-build.test.cjs`
- Modify: `tests/media-finalizer-release-evidence-v2.test.cjs`
- Modify: `tests/media-finalizer-supply-gate.test.cjs`
- Modify: `tests/media-finalizer-release-evidence.test.cjs`
- Read: `docs/owner-reference/TIGER-SOVEREIGN-CONSTELLATION-2026.md`

**Interfaces:**
- Consumes: final Sealed Build design and existing pre-implementation RED tests already present on the branch.
- Produces: exact failing contracts for Tasks 2–5.

- [ ] **Step 1: Strengthen the workflow RED contract**

Update `tests/tiger-sovereign-sealed-build.test.cjs` so the missing workflow must eventually satisfy all of these:

```js
assert.match(workflow, /workflow_call:/);
assert.doesNotMatch(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /^\s*push:/m);
assert.doesNotMatch(workflow, /^\s*pull_request:/m);
assert.match(workflow, /release_sha:/);
assert.match(workflow, /db_convergence_state:/);
assert.match(workflow, /db_convergence_evidence_sha256:/);
assert.match(workflow, /environment:\s*media-build/);
assert.match(workflow, /artifact-metadata:\s*write/);
assert.match(workflow, /508db95dd578ae2727ebd6217d5ba78e4fbda05d/);
assert.match(workflow, /MAIN_SHA/);
assert.match(workflow, /test\s+"\$SOURCE_SHA"\s*=\s*"\$MAIN_SHA"/);
assert.doesNotMatch(workflow, /merge-base\s+--is-ancestor/);
assert.match(workflow, /--predicate-type\s+https:\/\/cyclonedx\.org\/bom/);
assert.match(workflow, /--signer-workflow/);
```

Also scan every other `.github/workflows/*.yml` and `*.yaml` file and assert none currently calls:

```text
uses: ./.github/workflows/tiger-media-sovereign-sealed-build.yml
```

That absence is intentional safety evidence for this repository slice.

- [ ] **Step 2: Correct Passport v2 RED states**

Update the v2 evidence test to require the exact design states:

```js
deployment: {
  mode: 'SEALED_BUILD_ONLY',
  regionalDeployment: 'NOT_EXECUTED',
  edgeDeployment: 'NOT_EXECUTED',
  lambdaVersion: 'NOT_AVAILABLE',
  cloudFrontDistribution: 'NOT_AVAILABLE',
  wafWebAcl: 'NOT_AVAILABLE',
  runtimeProbes: 'NOT_EXECUTED',
  rollbackEvidence: 'NOT_APPLICABLE_NO_DEPLOYMENT',
}
```

Database evidence must include:

```js
{
  migrationSetSha256: '<64 lowercase hex>',
  liveConvergence: 'NOT_EXECUTED_IN_SEALED_BUILD'
}
```

- [ ] **Step 3: Remove the unapproved MEDIUM bypass from RED tests**

Delete the test path that accepts `PASS_WITH_MEDIUM_EXCEPTION`. Replace it with:

```js
assert.throws(
  () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ medium: 1 }) }),
  /SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED/,
);
```

No medium exception object is accepted in this slice.

- [ ] **Step 4: Update the historical release-evidence test to v2 authority**

Keep its useful materials-SBOM compatibility checks, but remove any assertion that `tiger-release-passport-v1` is current. Require the v2 helper or delegate v2 Passport assertions to `media-finalizer-release-evidence-v2.test.cjs`. The old combined-stack material list must not remain Passport authority.

- [ ] **Step 5: Run RED and record the expected missing implementation**

```bash
node --test \
  tests/tiger-sovereign-sealed-build.test.cjs \
  tests/media-finalizer-release-evidence-v2.test.cjs \
  tests/media-finalizer-supply-gate.test.cjs \
  tests/media-finalizer-release-evidence.test.cjs
```

Expected: FAIL only because the new workflow/Genome/supply-gate/migration-set implementation is absent or Passport remains legacy. A syntax error is not acceptable RED.

- [ ] **Step 6: Commit only normalized RED contracts**

```bash
git add tests/tiger-sovereign-sealed-build.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs tests/media-finalizer-supply-gate.test.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "test: seal final Sovereign Sealed Build contracts"
```

---

### Task 2: Implement deterministic Media migration-set identity and Cryptographic Genome

**Files:**
- Create: `scripts/release/media-cell-migration-set.cjs`
- Create: `scripts/release/media-cell-genome.cjs`
- Modify: `tests/media-finalizer-release-evidence-v2.test.cjs`

**Interfaces:**
- Produces: `createMediaMigrationSet(root) -> { schemaVersion, migrations, sha256 }`.
- Produces: `createMediaCellGenome(evidence) -> genome`.
- Relevant migration authority is exactly:
  - `supabase/migrations/20260816090001_sovereign_media_finalization.sql`
  - `supabase/migrations/20260827120000_sealed_media_identity_binding.sql`

- [ ] **Step 1: Add failing migration identity tests**

Require deterministic ordered output:

```js
{
  schemaVersion: 'tiger-media-migration-set-v1',
  migrations: [
    { path: 'supabase/migrations/20260816090001_sovereign_media_finalization.sql', sha256: '<64hex>' },
    { path: 'supabase/migrations/20260827120000_sealed_media_identity_binding.sql', sha256: '<64hex>' },
  ],
  sha256: '<64hex>'
}
```

Changing either file digest must change the set digest.

- [ ] **Step 2: Implement `media-cell-migration-set.cjs`**

Use `fs.readFileSync` and `crypto.createHash('sha256')`. Sort paths lexically, canonicalize to JSON with recursively sorted object keys, and compute the set digest over the canonical object excluding the final `sha256` field. Missing migration files fail `MEDIA_MIGRATION_REQUIRED_FILE_MISSING`.

- [ ] **Step 3: Add failing Genome determinism and secret-rejection tests**

Genome input is exact-key evidence:

```js
{
  source,
  materials,
  image,
  database: { migrationSetSha256 },
  sbom: { specVersion, sha256, subjectDigest, path, componentCount },
  attestations: {
    provenance: { verified: true, evidenceSha256 },
    sbom: { verified: true, evidenceSha256 },
  }
}
```

Require identical evidence with different key insertion order to produce the same Genome ID and any authoritative digest change to produce a different ID.

- [ ] **Step 4: Implement `media-cell-genome.cjs` minimally**

Return:

```js
{
  schemaVersion: 'tiger-cryptographic-genome-v1',
  algorithm: 'sha256',
  id,
  source,
  materials,
  image,
  database,
  sbom,
  attestations,
}
```

Compute `id` as SHA-256 of canonical Genome authority excluding `id`. Reject unknown keys, invalid SHA formats, SBOM/image subject mismatch, unverified attestations, and secret-shaped keys/values.

- [ ] **Step 5: Run focused GREEN**

```bash
node --test tests/media-finalizer-release-evidence-v2.test.cjs
```

Expected: migration-set and Genome tests PASS; Passport tests may remain RED until Task 3.

- [ ] **Step 6: Commit**

```bash
git add scripts/release/media-cell-migration-set.cjs scripts/release/media-cell-genome.cjs tests/media-finalizer-release-evidence-v2.test.cjs
git commit -m "feat: add deterministic Media Genome authority"
```

---

### Task 3: Replace Release Passport v1 with fail-closed Passport 2.0

**Files:**
- Modify: `scripts/release/media-cell-passport.cjs`
- Modify: `tests/media-finalizer-release-evidence.test.cjs`
- Modify: `tests/media-finalizer-release-evidence-v2.test.cjs`

**Interfaces:**
- Consumes: evidence accepted by `createMediaCellGenome` plus scan evidence.
- Produces: `createMediaCellPassport(evidence) -> tiger-release-passport-v2`.

- [ ] **Step 1: Make Passport v2 tests fail on the current v1 helper**

Require:

```js
passport.schemaVersion === 'tiger-release-passport-v2'
passport.database.liveConvergence === 'NOT_EXECUTED_IN_SEALED_BUILD'
passport.deployment.mode === 'SEALED_BUILD_ONLY'
```

Require all deployment state strings from Task 1 exactly; do not use fabricated ARNs/IDs and do not use null as a substitute for the typed state contract.

- [ ] **Step 2: Implement Passport v2**

`createMediaCellPassport` calls `createMediaCellGenome(evidence)` and emits bounded non-secret fields only:

```js
{
  schemaVersion: 'tiger-release-passport-v2',
  genome: { schemaVersion, algorithm, id },
  source,
  materials,
  image,
  database: {
    migrationSetSha256: evidence.database.migrationSetSha256,
    liveConvergence: 'NOT_EXECUTED_IN_SEALED_BUILD',
  },
  sbom,
  scan,
  attestations,
  deployment: {
    mode: 'SEALED_BUILD_ONLY',
    regionalDeployment: 'NOT_EXECUTED',
    edgeDeployment: 'NOT_EXECUTED',
    lambdaVersion: 'NOT_AVAILABLE',
    cloudFrontDistribution: 'NOT_AVAILABLE',
    wafWebAcl: 'NOT_AVAILABLE',
    runtimeProbes: 'NOT_EXECUTED',
    rollbackEvidence: 'NOT_APPLICABLE_NO_DEPLOYMENT',
  },
}
```

Require `scan.status === 'COMPLETE'`, Critical/High/Medium counts are zero for release eligibility, both attestations are verified, and `sbom.subjectDigest === image.manifestDigest`.

- [ ] **Step 3: Remove v1 fallback behavior**

There is no `schemaVersion` switch and no compatibility branch producing v1. Historical test fixtures are updated rather than preserving a runtime fallback.

- [ ] **Step 4: Run both evidence suites**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/media-cell-passport.cjs tests/media-finalizer-release-evidence.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs
git commit -m "feat: enforce TIGER Release Passport 2.0"
```

---

### Task 4: Validate and bind the real container SBOM; enforce supply gate

**Files:**
- Modify: `scripts/release/media-cell-sbom.cjs`
- Create: `scripts/release/media-cell-supply-gate.cjs`
- Modify: `tests/media-finalizer-supply-gate.test.cjs`

**Interfaces:**
- Produces: `bindRealContainerSbom(sbom, { repository, manifestDigest }) -> boundSbom`.
- Produces: `validateRealContainerSbom(sbom, expectedManifestDigest) -> { specVersion, subjectDigest, componentCount, sha256 }`.
- Produces: `evaluateSupplyGate({ sbom, expectedManifestDigest, scan }) -> { decision, ... }`.

- [ ] **Step 1: Add RED tests for explicit image binding**

The bound SBOM must contain these metadata properties:

```text
tiger:oci_repository
tiger:oci_manifest_digest
tiger:oci_image_uri
```

`validateRealContainerSbom` requires `bomFormat === 'CycloneDX'`, `specVersion === '1.7'`, `components.length > 0`, and exact `tiger:oci_manifest_digest` equality.

- [ ] **Step 2: Preserve materials evidence without confusing it with OCI inventory**

Keep the existing deterministic materials helper available for historical/build-material evidence. Add separate real-SBOM binding/validation functions. Do not rename materials output to imply container inventory.

- [ ] **Step 3: Implement real-SBOM canonical hashing**

Canonicalize the bound SBOM and compute SHA-256 over canonical JSON. The returned digest becomes the Passport/Genome SBOM digest.

- [ ] **Step 4: Implement fail-closed scan normalization**

Accepted scan shape is exactly:

```js
{
  status: 'COMPLETE',
  scanMode: 'ENHANCED',
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  unknown: 0,
  findingsSha256: '<64 lowercase hex>',
}
```

Rules:

```js
if (scan.status !== 'COMPLETE') fail('SUPPLY_GATE_SCAN_INCOMPLETE');
if (scan.scanMode !== 'ENHANCED') fail('SUPPLY_GATE_SCAN_MODE_INVALID');
if (scan.critical > 0) fail('SUPPLY_GATE_CRITICAL_BLOCK');
if (scan.high > 0) fail('SUPPLY_GATE_HIGH_BLOCK');
if (scan.medium > 0) fail('SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED');
```

Unknown severity is recorded but must not be negative/non-integer. No medium exception object is accepted.

- [ ] **Step 5: Run supply GREEN**

```bash
node --test tests/media-finalizer-supply-gate.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/release/media-cell-sbom.cjs scripts/release/media-cell-supply-gate.cjs tests/media-finalizer-supply-gate.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs
git commit -m "security: enforce real OCI SBOM supply gate"
```

---

### Task 5: Implement the unreachable-by-default reusable Seoul Sealed Build workflow

**Files:**
- Create: `.github/workflows/tiger-media-sovereign-sealed-build.yml`
- Modify: `tests/tiger-sovereign-sealed-build.test.cjs`
- Read: `.github/workflows/media-finalizer-rehearsal.yml`
- Read: `infra/media-finalizer/foundation/template.yaml`
- Read: `services/media-finalizer/Dockerfile`

**Interfaces:**
- Consumes from a future reviewed caller: `release_sha`, `db_convergence_state`, `db_convergence_evidence_sha256`.
- Consumes protected `media-build` environment variable `TIGER_MEDIA_AWS_ACCOUNT_ID`.
- Produces one immutable ECR digest plus bounded evidence. Produces no runtime deployment.

- [ ] **Step 1: Define reusable-only trigger**

The top of the workflow is structurally equivalent to:

```yaml
name: TIGER Media Sovereign Sealed Build

on:
  workflow_call:
    inputs:
      release_sha:
        required: true
        type: string
      db_convergence_state:
        required: true
        type: string
      db_convergence_evidence_sha256:
        required: true
        type: string
```

No event/manual trigger exists and this plan adds no caller.

- [ ] **Step 2: Set minimum permissions and environment**

```yaml
permissions:
  contents: read

jobs:
  sealed-build:
    environment: media-build
    permissions:
      contents: read
      id-token: write
      attestations: write
      artifact-metadata: write
```

- [ ] **Step 3: Pin all actions exactly**

Use only the SHA pins in `Verified External Pins`. `actions/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d` is used twice: provenance mode and SBOM mode.

- [ ] **Step 4: Verify future DB evidence input before AWS mutation**

Before OIDC authentication:

```bash
test "${DB_CONVERGENCE_STATE}" = "VERIFIED_LIVE"
printf '%s' "$DB_CONVERGENCE_EVIDENCE_SHA256" | grep -Eq '^[0-9a-f]{64}$'
```

This is defense-in-depth; the future caller remains responsible for deriving these values from the reviewed live DB gate.

- [ ] **Step 5: Require exact current protected main head**

After checkout/fetch:

```bash
SOURCE_SHA="${RELEASE_SHA}"
printf '%s' "$SOURCE_SHA" | grep -Eq '^[0-9a-f]{40}$'
git fetch --no-tags --prune origin '+refs/heads/main:refs/remotes/origin/main'
MAIN_SHA="$(git rev-parse refs/remotes/origin/main)"
test "$SOURCE_SHA" = "$MAIN_SHA"
git checkout --detach "$SOURCE_SHA"
test "$(git rev-parse HEAD)" = "$SOURCE_SHA"
SOURCE_TREE="$(git rev-parse 'HEAD^{tree}')"
test -z "$(git status --porcelain=v1 -uall)"
```

Do not use `merge-base --is-ancestor`; historical ancestors are not release eligible.

- [ ] **Step 6: Authenticate only as MediaBuildRole in Seoul**

Construct:

```text
arn:aws:iam::${TIGER_MEDIA_AWS_ACCOUNT_ID}:role/TIGER-VVIP-GitHub-MediaBuild
```

Use `aws-actions/configure-aws-credentials` with `aws-region: ap-northeast-2` and `allowed-account-ids`. Verify `aws sts get-caller-identity` account and assumed-role ARN before ECR login.

- [ ] **Step 7: Prove ECR and enhanced scan authority**

Require exact repository `tiger-media-finalizer` from `aws ecr describe-repositories`. Inspect `aws ecr get-registry-scanning-configuration` and fail unless registry scan type is `ENHANCED` and configuration applies to the Media repository. Do not change registry scanning configuration in this workflow.

- [ ] **Step 8: Install/test exact source**

```bash
cd services/media-finalizer
npm ci --omit=dev --ignore-scripts=false --no-audit --no-fund
npm audit --omit=dev --audit-level=high
npm ls --omit=dev --all
cd ../..
node --test tests/media-finalizer-*.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/tiger-synapse-proof-capture-origin.test.cjs
node --check services/media-finalizer/src/handler.js
node --check services/media-finalizer/src/canonicalize.js
node --check services/media-finalizer/src/identity.js
node --check services/media-finalizer/src/request.js
node --check services/media-finalizer/src/secret-provider.js
node --check services/media-finalizer/src/supabase-client.js
```

- [ ] **Step 9: Build once and push once**

```bash
docker build --pull=false --file services/media-finalizer/Dockerfile --tag "$ECR_URI:sha-$SOURCE_SHA" services/media-finalizer
docker push "$ECR_URI:sha-$SOURCE_SHA"
```

Resolve the authoritative digest using `aws ecr describe-images` and set:

```bash
IMAGE_URI="$ECR_URI@$MANIFEST_DIGEST"
```

The workflow source contains exactly one executable `docker build` and one executable `docker push`.

- [ ] **Step 10: Install verified Syft 1.51.0 and generate real OCI SBOM**

Download:

```text
https://github.com/anchore/syft/releases/download/v1.51.0/syft_1.51.0_linux_amd64.tar.gz
```

Verify archive SHA-256 exactly:

```text
2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f
```

Generate from `registry:$IMAGE_URI`, bind it using `bindRealContainerSbom`, validate it, and write canonical `oci-sbom.cdx.json` under `/tmp/tiger-media/`.

- [ ] **Step 11: Wait for scan and run supply gate**

Poll boundedly for scan completion. Normalize only severity counts/status and SHA-256 of canonical findings evidence. Unknown/timeout fails. Run `evaluateSupplyGate`; only `PASS` proceeds.

- [ ] **Step 12: Create two attestations with one reviewed action**

Provenance call:

```yaml
uses: actions/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d
with:
  subject-name: ${{ steps.image.outputs.ecr_uri }}
  subject-digest: ${{ steps.image.outputs.manifest_digest }}
  push-to-registry: true
```

SBOM call adds:

```yaml
sbom-path: /tmp/tiger-media/oci-sbom.cdx.json
```

No SLSA level is emitted into TIGER Passport/Genome.

- [ ] **Step 13: Verify both attestations before Genome**

Authenticate remains valid for ECR, then run provenance verification:

```bash
gh attestation verify "oci://$IMAGE_URI" \
  --repo "$GITHUB_REPOSITORY" \
  --signer-workflow "github.com/vvipautoparts-blip/TIGER-VVIP/.github/workflows/tiger-media-sovereign-sealed-build.yml" \
  --source-digest "$SOURCE_SHA" \
  --source-ref 'refs/heads/main' \
  --format json
```

Run SBOM verification with the same identity constraints plus:

```text
--predicate-type https://cyclonedx.org/bom
```

Canonicalize/hash the two verification JSON results; these hashes become attestation evidence identities.

- [ ] **Step 14: Generate migration set, Genome and Passport v2**

Run the repository helpers in this order:

```text
media-cell-migration-set.cjs
media-cell-genome.cjs
media-cell-passport.cjs
```

Evidence files are written mode `0600` under `/tmp/tiger-media/`. Passport must remain `SEALED_BUILD_ONLY` and must not contain deployment identifiers.

- [ ] **Step 15: Upload bounded evidence only**

Upload exactly the bounded evidence directory using `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, `if-no-files-found: error`, `retention-days: 14`. Do not upload Docker config, AWS credentials, OIDC token, raw scan credentials, source secrets, request data, or media.

- [ ] **Step 16: Final immutable-source assertion**

```bash
test "$(git rev-parse HEAD)" = "$SOURCE_SHA"
test -z "$(git status --porcelain=v1 -uall)"
echo 'TIGER_MEDIA_SEALED_BUILD=PASS'
echo 'TIGER_MEDIA_RUNTIME_DEPLOYED=NO'
echo 'TIGER_MEDIA_DARK_BOOTSTRAP=NOT_STARTED'
```

- [ ] **Step 17: Run workflow contracts**

```bash
node --test tests/tiger-sovereign-sealed-build.test.cjs tests/media-finalizer-release-evidence-v2.test.cjs tests/media-finalizer-supply-gate.test.cjs
```

Expected: PASS.

- [ ] **Step 18: Commit**

```bash
git add .github/workflows/tiger-media-sovereign-sealed-build.yml tests/tiger-sovereign-sealed-build.test.cjs
git commit -m "ci: add unreachable-by-default Sovereign Sealed Build"
```

---

### Task 6: Prove no fallback, caller, or cross-authority mutation exists

**Files:**
- Read: `.github/workflows/media-finalizer-build.yml`
- Read: `.github/workflows/media-finalizer-deploy.yml`
- Modify: `tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs`
- Modify: `tests/tiger-sovereign-sealed-build.test.cjs`

**Interfaces:**
- Produces: repository proof of exactly one reusable build authority, zero active legacy build/deploy authority, and zero current caller for the new live build.

- [ ] **Step 1: Assert legacy quarantine remains exact**

Both historical workflows contain `SOVEREIGN_CONSTELLATION_SUPERSEDED`, `exit 1`, and no OIDC/AWS/Docker mutation authority.

- [ ] **Step 2: Assert no current workflow calls Sealed Build**

Scan all workflow files except the Sealed Build itself and fail if they contain:

```text
./.github/workflows/tiger-media-sovereign-sealed-build.yml
```

This is the repository proof that the live Sealed Build cannot execute in this slice.

- [ ] **Step 3: Reject prohibited command families**

The new workflow may use STS/ECR/read-only scan commands only. Tests reject CloudFormation, Lambda, CloudFront, WAFv2, ACM, Route53, Secrets Manager mutation, Supabase CLI mutation, and `TIGER-VVIP-GitHub-ProductionDeploy`.

- [ ] **Step 4: Run authority tests**

```bash
node --test tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs tests/tiger-sovereign-sealed-build.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs tests/tiger-sovereign-sealed-build.test.cjs
git commit -m "security: prove sealed-build execution isolation"
```

---

### Task 7: Exact-head repository verification and review handoff

**Files:**
- Read: all files changed by Tasks 1–6.

**Interfaces:**
- Produces: exact-head repository evidence and a reviewable PR only. Does not execute the reusable workflow, live Sealed Build, Supabase mutation, or Production deployment.

- [ ] **Step 1: Run focused Node suite**

```bash
node --test \
  tests/media-finalizer-release-evidence.test.cjs \
  tests/media-finalizer-release-evidence-v2.test.cjs \
  tests/media-finalizer-supply-gate.test.cjs \
  tests/tiger-sovereign-sealed-build.test.cjs \
  tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs \
  tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: PASS with zero relevant skipped/todo tests.

- [ ] **Step 2: Run existing Media rehearsal/security test contract without AWS mutation**

Run the same local Node/security checks encoded by `.github/workflows/media-finalizer-rehearsal.yml`. Do not run the new reusable live workflow.

- [ ] **Step 3: Run repository quality/security gates available without AWS mutation**

Run VVIP Quality Gate, CleanGuard, Zero-Residue/full-history compatible checks, immutable-action contracts, and `git diff --check`. Missing/unavailable gates are reported as unavailable, never GREEN.

- [ ] **Step 4: Inspect exact diff against protected main**

Allowed scope: approved spec/plan/owner reference, RED tests, release helpers, and the reusable Sealed Build workflow. Reject secret material, old single-stack authority, active caller, ProductionDeploy role use, runtime deploy commands, or mutable action tags.

- [ ] **Step 5: Bind review to exact head SHA/tree**

Record exact feature-branch SHA and tree. Any later commit invalidates this evidence and must rerun gates.

- [ ] **Step 6: Open PR to `main` only after exact-head GREEN**

Title:

```text
feat: TIGER Sovereign Sealed Build and Release Passport 2.0
```

Body must state:

```text
Repository implementation only.
Reusable Sealed Build has no caller in this PR and cannot execute live from UI/events.
No live Sealed Build by this PR.
No Supabase live migration by this PR.
No Production runtime deployment by this PR.
No Dark Bootstrap by this PR.
No Global Edge live mutation by this PR.
A later reviewed DB-convergence slice must add the authorized caller.
```

- [ ] **Step 7: Stop before merge on any non-GREEN required check**

No stale evidence, partial CI, skipped gate, or documentation confidence substitutes for exact-head GREEN.

## Plan Self-Review

- **Spec coverage:** source authority, unreachable-by-default workflow, least-privilege OIDC, build-once/push-once, real OCI SBOM, deterministic migration identity, Genome, Passport 2.0, vulnerability gate, provenance/SBOM attestation and verification, secret rejection, typed non-deployment states, no fallback, and exact-head verification are all mapped to tasks.
- **Live-order protection:** the workflow is reusable-only and this slice intentionally creates no caller. This prevents repository implementation order from becoming an unauthorized live release.
- **Source-lock correction:** current protected `main` equality is required. Ancestor membership is explicitly insufficient.
- **External dependency integrity:** all action pins and Syft archive digest are fixed above; no unresolved tag placeholder remains.
- **Medium severity policy:** no exception mechanism is implemented. MEDIUM remains fail-closed until a separate owner/security policy is explicitly approved.
- **Deliberately deferred:** live DB convergence, caller workflow, AWS bootstrap mutation, live Sealed Build execution, Dark Bootstrap regional create, Global Edge create, runtime probes, stable baseline, adaptive canary, rollback execution, Phoenix DR, and endpoint convergence.
- **Production truth:** repository GREEN proves repository implementation only. It does not prove live build or Production readiness.
