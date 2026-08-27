# TIGER Sovereign Sealed Build + Cryptographic Genome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quarantined Media Finalizer build entrypoint with a fail-closed Seoul Sealed Build that produces a real container SBOM, verified attestations, a deterministic TIGER Cryptographic Genome, and Release Passport v2 without performing any Production deployment.

**Architecture:** The workflow builds exactly one container from an exact protected `main` SHA, pushes it once to the Seoul ECR repository, resolves the immutable OCI digest, verifies ECR enhanced continuous scanning, inventories that exact digest with Syft, converts and validates the inventory as CycloneDX 1.7 with the official CycloneDX CLI, creates GitHub attestations bound to the image digest, then derives a deterministic Genome and fail-closed passport from bounded evidence. The legacy Production deploy workflow remains quarantined; this phase grants build authority only.

**Tech Stack:** Node.js 24, GitHub Actions, GitHub OIDC, AWS ECR `ap-northeast-2`, Syft 1.51.0, CycloneDX CLI 0.30.0, CycloneDX 1.7, `actions/attest` v4.2.0, `aws-actions/configure-aws-credentials` v6.2.3.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`

## Global Constraints

- Exact protected `main` SHA and Git tree SHA are release authority.
- Seoul `ap-northeast-2` is the first Media Data Cell; the build workflow must reject another runtime/build region.
- No static AWS access keys or secret access keys.
- Build once, push once, deploy later by the exact OCI digest; this plan does not deploy Production.
- Real container SBOM is generated only after the immutable image digest exists.
- CycloneDX output is version 1.7 and must validate with CycloneDX CLI 0.30.0.
- Syft is pinned to 1.51.0; Linux amd64 tarball SHA-256 is `2a2e837a2c8d59ec9af5472ee22d3b04ee463c4e44476ecf993fd1e5ab6ebc7f`.
- CycloneDX CLI is pinned to 0.30.0; `cyclonedx-linux-x64` SHA-256 is `f89876326620f5fc78a9b27cc1af57d6ed13d019aab87490e1246a44a910babb`.
- `actions/checkout` is pinned to `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1).
- `actions/setup-node` is pinned to `820762786026740c76f36085b0efc47a31fe5020` (v7.0.0).
- `aws-actions/configure-aws-credentials` is pinned to `e6de054238d6b7531b4efff3b6587d9aade6a06c` (v6.2.3).
- `actions/attest` is pinned to `f7c74d28b9d84cb8768d0b8ca14a4bac6ef463e6` (v4.2.0).
- ECR scanning must be proven at runtime as `ENHANCED` with a matching `CONTINUOUS_SCAN` rule; repository `ScanOnPush` alone is not accepted as proof.
- `CRITICAL > 0` or `HIGH > 0` blocks eligibility.
- No SLSA level claim is emitted.
- Evidence must never contain JWTs, media capability tokens, Supabase privileged secrets, authorization headers, raw media, request bodies, signed storage URLs, AWS access keys, or private keys.
- Legacy `.github/workflows/media-finalizer-deploy.yml` stays fail-closed during this phase.

---

### Task 1: Define Release Evidence v2 Contracts First

**Files:**
- Modify: `tests/media-finalizer-release-evidence.test.cjs`
- Create: `tests/fixtures/media-finalizer/container-sbom-1.7.json`

**Interfaces:**
- Consumes: current `media-cell-sbom.cjs`, `media-cell-passport.cjs`, quarantined build workflow.
- Produces: executable contracts for `createMediaCellGenome(evidence)`, Passport v2, real SBOM validation, and the replacement workflow.

- [ ] **Step 1: Write failing tests for real inventory and Genome identity**

Add assertions equivalent to:

```js
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const SBOM_VERIFY_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom-verify.cjs');

assert.equal(fs.existsSync(GENOME_HELPER), true);
assert.equal(fs.existsSync(SBOM_VERIFY_HELPER), true);

const sbom = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const summary = validateContainerSbom(sbom, { expectedSpecVersion: '1.7' });
assert.equal(summary.npmPackages > 0, true);
assert.equal(summary.osPackages > 0, true);

const genome = createMediaCellGenome(validGenomeEvidence());
assert.match(genome.genomeId, /^sha256:[0-9a-f]{64}$/);
assert.equal(genome.schemaVersion, 'tiger-cryptographic-genome-v1');
```

Also mutate one authoritative digest and assert the Genome ID changes.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: FAIL because `media-cell-genome.cjs`, `media-cell-sbom-verify.cjs`, the v1.7 container fixture, and Passport v2 do not exist yet.

- [ ] **Step 3: Commit only the contract/fixture RED state**

```bash
git add tests/media-finalizer-release-evidence.test.cjs tests/fixtures/media-finalizer/container-sbom-1.7.json
git commit -m "test(media): define sealed build genome contracts"
```

### Task 2: Preserve Materials Evidence and Add Real Container SBOM Validation

**Files:**
- Modify: `scripts/release/media-cell-sbom.cjs`
- Create: `scripts/release/media-cell-sbom-verify.cjs`
- Test: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: a CycloneDX 1.7 JSON document generated from the exact OCI image inventory.
- Produces: `validateContainerSbom(bom, options) -> { componentCount, npmPackages, osPackages }`; keeps `createMediaCellSbom()` explicitly classified as materials evidence rather than Production container inventory.

- [ ] **Step 1: Rename the materials generator identity without pretending it is the container inventory**

Change its metadata property from `TIGER_MEDIA_CELL_SBOM_V1` to `TIGER_MEDIA_CELL_MATERIALS_V1` and update tests so its output path is `artifacts/media-cell/materials.cdx.json`.

- [ ] **Step 2: Implement the real SBOM validator**

Create a validator that fails with exact codes:

```js
if (bom?.bomFormat !== 'CycloneDX' || bom?.specVersion !== '1.7') fail('CONTAINER_SBOM_SCHEMA_INVALID');
if (!Array.isArray(bom.components) || bom.components.length === 0) fail('CONTAINER_SBOM_COMPONENTS_MISSING');
const purls = bom.components.map((x) => x?.purl || '');
const npmPackages = purls.filter((p) => p.startsWith('pkg:npm/')).length;
const osPackages = purls.filter((p) => p.startsWith('pkg:rpm/') || p.startsWith('pkg:apk/') || p.startsWith('pkg:deb/')).length;
if (npmPackages === 0) fail('CONTAINER_SBOM_NPM_INVENTORY_MISSING');
if (osPackages === 0) fail('CONTAINER_SBOM_OS_INVENTORY_MISSING');
```

Reject secret-shaped property names/values and return only bounded counts.

- [ ] **Step 3: Run the focused test**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: validator/materials tests PASS; Genome/Passport/workflow tests remain RED.

- [ ] **Step 4: Commit**

```bash
git add scripts/release/media-cell-sbom.cjs scripts/release/media-cell-sbom-verify.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "feat(media): validate real container SBOM evidence"
```

### Task 3: Implement the TIGER Cryptographic Genome

**Files:**
- Create: `scripts/release/media-cell-genome.cjs`
- Test: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: source SHA/tree, base and final image digests, material and migration SHA-256 maps, real SBOM SHA-256, and verified attestation IDs/evidence digests.
- Produces: deterministic `tiger-cryptographic-genome-v1` document with `genomeId = sha256(canonical payload without genomeId)`.

- [ ] **Step 1: Implement exact evidence schema**

Required top-level keys:

```js
['source', 'image', 'materials', 'dbMigrations', 'containerSbom', 'attestations']
```

Required release materials are exactly:

```text
services/media-finalizer/Dockerfile
services/media-finalizer/package-lock.json
infra/media-finalizer/foundation/template.yaml
infra/media-finalizer/foundation/guard.guard
infra/media-finalizer/regional/template.yaml
infra/media-finalizer/regional/guard.guard
infra/media-finalizer/edge/template.yaml
infra/media-finalizer/edge/guard.guard
```

Required DB migration bindings are exactly:

```text
supabase/migrations/20260816090001_sovereign_media_finalization.sql
supabase/migrations/20260826120000_synapse_proof_of_now.sql
supabase/migrations/20260827120000_sealed_media_identity_binding.sql
```

- [ ] **Step 2: Compute deterministic Genome ID**

```js
const payload = canonicalJson(validatedEvidence);
const genomeId = `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
return { schemaVersion: 'tiger-cryptographic-genome-v1', genomeId, ...validatedEvidence };
```

Unknown keys, secret-shaped data, unverified attestations, malformed SHAs, or missing paths must throw fail-closed codes.

- [ ] **Step 3: Run focused tests**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: Genome identity tests PASS; Passport/workflow tests remain RED.

- [ ] **Step 4: Commit**

```bash
git add scripts/release/media-cell-genome.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "feat(media): add cryptographic genome authority"
```

### Task 4: Upgrade Release Passport to v2

**Files:**
- Modify: `scripts/release/media-cell-passport.cjs`
- Test: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: a complete validated Genome plus scan state and bounded verification evidence.
- Produces: `tiger-release-passport-v2` containing Genome ID, exact OCI digest, real SBOM digest, scan severity counts, and attestation IDs without secrets.

- [ ] **Step 1: Replace v1 evidence shape with Passport v2**

The passport must expose:

```js
{
  schemaVersion: 'tiger-release-passport-v2',
  genomeId,
  source: { commitSha, treeSha },
  image: { repository, manifestDigest, baseDigest },
  containerSbom: { specVersion: '1.7', sha256, componentCount, npmPackages, osPackages },
  vulnerabilityGate: { scanType: 'ENHANCED', frequency: 'CONTINUOUS_SCAN', critical: 0, high: 0 },
  attestations: { provenance: { attestationId, verified: true }, sbom: { attestationId, verified: true } }
}
```

- [ ] **Step 2: Add fail-closed security tests**

Assert rejection of: unknown keys, secret-shaped keys/values, non-zero CRITICAL/HIGH, wrong scan type/frequency, mismatched Genome ID, and any unverified attestation.

- [ ] **Step 3: Run focused tests**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: helper tests PASS; workflow contract still RED.

- [ ] **Step 4: Commit**

```bash
git add scripts/release/media-cell-passport.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "feat(media): upgrade release passport to genome v2"
```

### Task 5: Add Read-Only Enhanced Scanning Proof Authority

**Files:**
- Modify: `infra/media-finalizer/foundation/template.yaml`
- Modify: `infra/media-finalizer/foundation/guard.guard`
- Modify: `tests/media-finalizer-sovereign-infra-contract.test.cjs`

**Interfaces:**
- Consumes: existing MediaBuildRole.
- Produces: read-only permission for `ecr:GetRegistryScanningConfiguration`; no permission to change registry scanning configuration.

- [ ] **Step 1: Add a failing contract test**

Assert the foundation contains `ecr:GetRegistryScanningConfiguration` and does not contain `ecr:PutRegistryScanningConfiguration`.

- [ ] **Step 2: Run contract test and confirm RED**

```bash
node --test tests/media-finalizer-sovereign-infra-contract.test.cjs
```

Expected: FAIL for missing read-only registry scanning evidence permission.

- [ ] **Step 3: Add only the read permission**

Add a separate IAM statement:

```yaml
- Sid: ReadRegistryScanningAuthority
  Effect: Allow
  Action:
    - ecr:GetRegistryScanningConfiguration
  Resource: '*'
```

Update Guard to require the read action and forbid the mutation action.

- [ ] **Step 4: Run contract + existing infra tests**

```bash
node --test tests/media-finalizer-sovereign-infra-contract.test.cjs tests/media-finalizer-infra-workflow-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/media-finalizer/foundation/template.yaml infra/media-finalizer/foundation/guard.guard tests/media-finalizer-sovereign-infra-contract.test.cjs
git commit -m "fix(media): prove enhanced ECR scanning authority read-only"
```

### Task 6: Replace the Quarantined Sealed Build Workflow

**Files:**
- Modify: `.github/workflows/media-finalizer-build.yml`
- Modify: `tests/media-finalizer-release-evidence.test.cjs`

**Interfaces:**
- Consumes: protected `media-build` GitHub Environment variables `TIGER_AWS_REGION`, `TIGER_MEDIA_ECR_REPOSITORY`, `TIGER_MEDIA_BUILD_ROLE_ARN` and the exact `source_sha` input.
- Produces: immutable OCI digest + materials evidence + real CycloneDX 1.7 SBOM + scan evidence + provenance/SBOM attestation verification + Genome + Passport v2 as workflow artifacts. It performs no CloudFormation/Lambda/CloudFront mutation.

- [ ] **Step 1: Write the workflow contract RED first**

Tests must require:

```text
workflow_dispatch source_sha
permissions: contents read, id-token write, attestations write
environment: media-build
AWS region hard gate ap-northeast-2
allowed-account-ids: 211579682376
exact main SHA/tree verification
npm ci + npm audit high gate
one docker build command
one docker push command
ECR digest resolution
GetRegistryScanningConfiguration ENHANCED + CONTINUOUS_SCAN match
image-scan-complete waiter
CRITICAL/HIGH zero gate
Syft 1.51.0 checksum verification
CycloneDX CLI 0.30.0 checksum verification
Syft cyclonedx-json@1.6 from repository@digest
CycloneDX convert to v1_7 + validate --fail-on-errors
real SBOM npm + OS inventory validator
actions/attest for provenance and SBOM
`gh attestation verify` for both predicates
Genome generation
Passport v2 generation
artifact upload
no aws cloudformation/lambda/cloudfront/waf/iam/secretsmanager mutation
```

- [ ] **Step 2: Run focused test and confirm RED**

```bash
node --test tests/media-finalizer-release-evidence.test.cjs
```

Expected: FAIL because the workflow is still the quarantine stub.

- [ ] **Step 3: Implement the workflow**

Use only pinned actions and checksum-verified binaries. The Syft stage must scan the pushed digest, not an unbound local tag:

```bash
syft "$REPOSITORY_URI@$IMAGE_DIGEST" -o cyclonedx-json@1.6 > artifacts/media-cell/container-sbom-1.6.json
cyclonedx convert --input-file artifacts/media-cell/container-sbom-1.6.json --output-file artifacts/media-cell/container-sbom.cdx.json --output-format json --output-version v1_7
cyclonedx validate --input-file artifacts/media-cell/container-sbom.cdx.json --input-version v1_7 --fail-on-errors
node scripts/release/media-cell-sbom-verify.cjs artifacts/media-cell/container-sbom.cdx.json artifacts/media-cell/container-sbom-summary.json
```

The scan gate must read `get-registry-scanning-configuration` and reject any configuration that does not prove the exact repository is continuously covered by `ENHANCED` scanning.

- [ ] **Step 4: Run all Media Finalizer repository tests**

```bash
node --test tests/media-finalizer-*.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/tiger-synapse-proof-capture-origin.test.cjs
```

Expected: PASS locally/rehearsal where AWS mutation is not invoked.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/media-finalizer-build.yml tests/media-finalizer-release-evidence.test.cjs
git commit -m "feat(media): restore sovereign sealed build authority"
```

### Task 7: Exact-Head Repository Verification

**Files:**
- No new functional files unless a test/rehearsal defect is found.

**Interfaces:**
- Consumes: completed branch head.
- Produces: reviewable PR evidence only; no Production evidence.

- [ ] **Step 1: Run the complete local/rehearsal test command**

```bash
node --test tests/media-finalizer-*.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/tiger-synapse-proof-capture-origin.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Open a Draft PR from `feat/tiger-sovereign-sealed-build-genome-20260828` to protected `main`**

PR body must state explicitly: repository implementation only; AWS ECR/build has not run and Production is not proven.

- [ ] **Step 3: Require exact-head CI/rehearsal GREEN**

Required checks include CleanGuard, Zero-Residue, Dependency Review, Project Control Integrity, VVIP Quality Gate, V14 RC, Media Finalizer Rehearsal, Media Finalizer Infra Rehearsal, and CodeQL where triggered.

- [ ] **Step 4: Request independent review and address every finding**

Any new commit invalidates prior exact-head evidence and requires all gates again.

- [ ] **Step 5: Merge only after approval and exact-head GREEN**

Use `expected_head_sha` when merging. Do not run the Sealed Build yet unless the AWS Foundation prerequisites and protected GitHub Environment variables are proven live.

## Self-Review

- Spec coverage: §§14–18 are directly covered; §11/§12 build OIDC least privilege is preserved; §20 privacy constraints are enforced in helper validators and Passport v2. Production deployment, DB live convergence, Global Edge deployment, Dark Bootstrap, adaptive canary, and Phoenix DR remain intentionally outside this plan.
- Placeholder scan: no TODO/TBD/implementation placeholders remain.
- Type consistency: Genome evidence feeds Passport v2; SBOM validator returns the exact bounded counts Passport v2 consumes; workflow artifacts use the same paths asserted by tests.
