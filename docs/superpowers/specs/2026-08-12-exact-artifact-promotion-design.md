# Exact-Artifact Production Promotion — 2026 Design

Date: 2026-08-12
Status: OWNER-APPROVED DESIGN, IMPLEMENTED IN DRAFT PR #206, NOT MERGED, NO PRODUCTION PROMOTION AUTHORIZED
Target: VVIP TIGER Production release supply chain
Base main SHA: `19859d101aae88f240d191be9c2304421fc167a9`

## 1. Objective

Replace the remaining rebuild-at-promotion gap with a two-stage, fail-closed release architecture:

1. build and verify a Production-ready release artifact exactly once;
2. preserve that exact artifact as an immutable GitHub Actions artifact with cryptographic identity and provenance;
3. later promote that same previously-built artifact to GitHub Pages without rebuilding it.

The Production promotion path must never regenerate application bytes. The artifact approved for release is the artifact deployed.

## 2. Security invariants

The implementation SHALL preserve all of the following invariants:

- Production promotion is manual only (`workflow_dispatch`).
- A release SHA is a full lowercase 40-character Git commit SHA.
- The release SHA must equal the current `origin/main` SHA at artifact creation and again at promotion time.
- Production artifact build and Production promotion are distinct workflows with separate authority.
- Production artifact bytes are built exactly once.
- The build-stage public artifact is generated with `tools/vvip_public_release.py --mode production` so Production runtime configuration and Production-only validation are applied before bytes are sealed.
- Production promotion does not invoke `tools/vvip_public_release.py`, a compiler, bundler, package build, or any equivalent byte-producing step.
- Production promotion only downloads, authenticates, re-verifies, extracts, and deploys the exact previously-built artifact.
- Artifact identity is bound to Git source SHA, Git source tree, release manifest, SBOM, materials, and artifact SHA-256.
- Any missing, expired, mismatched, malformed, untrusted, or unverifiable evidence stops the release.
- External GitHub Actions are referenced only by immutable lowercase 40-character commit SHAs.
- Repository-level permissions default to read-only; elevated permissions are scoped to the individual job that needs them.
- Only the final deployment job may receive `pages: write` and `id-token: write`.
- No workflow in this scope may mutate Supabase Production data/schema, provider configuration, DNS, secrets, payment state, country activation, or owner seeding.
- No old #164 workflow is copied wholesale.
- Existing #205 candidate-domain guarantees SHALL NOT be weakened to make Production artifact promotion work.

## 3. Architecture

### 3.1 Stage A — Production Release Artifact Builder

Introduce a non-deploying workflow dedicated to producing the exact Production-ready release artifact.

Trigger:

- `workflow_dispatch` only.

Required input:

- `release_sha`: exact current-main 40-character SHA.

Preflight:

1. validate SHA syntax;
2. fetch `origin/main`;
3. require `release_sha == origin/main`;
4. checkout the exact SHA;
5. require `git rev-parse HEAD == release_sha`;
6. record `git rev-parse HEAD^{tree}` as `source_tree`.

Build authority:

- The build job may use the `production-build` environment solely to obtain public runtime configuration required to produce Production-ready public bytes.
- It receives no Pages deployment permission and no Production DB/provider mutation permission.

Production artifact build:

- run the full quality/security gate;
- build the public artifact exactly once into `$RUNNER_TEMP` outside the checkout tree;
- invoke the existing allow-list builder with `--mode production`, `--source-sha "$release_sha"`, and the approved CNAME behavior;
- require `release-manifest.json` to have `mode === "production"`, exact source SHA, `releaseEligible === true`, empty `configurationErrors`, and empty `forbiddenFindings`;
- recursively verify that every declared file exists and its SHA-256 matches the manifest;
- reject symlinks, path traversal, special files, undeclared files, and duplicate normalized paths.

### 3.1.1 Candidate/Production release-domain separation

The current #205 SVEF API intentionally treats `createReleaseBundleManifest()` as a candidate-domain contract and requires `mode === "candidate"`. That invariant remains intact.

The implementation SHALL add an explicit Production-domain entry point rather than relaxing the candidate contract. Preferred minimal design:

- keep exported `createReleaseBundleManifest(options)` candidate-only and behaviorally unchanged;
- refactor shared verification internally into a private mode-parameterized helper;
- add exported `createProductionReleaseBundleManifest(options)` that requires `mode === "production"` and the same fail-closed evidence arrays;
- both public functions derive mode from trusted code, never from a caller-supplied free-form mode field;
- regression tests prove the candidate API still rejects Production manifests and the Production API rejects Candidate manifests.

This domain separation prevents a security fix for Production promotion from broadening the trust boundary established in #205.

Evidence package:

- canonical Production release manifest;
- canonical SVEF Production release-bundle manifest created through `createProductionReleaseBundleManifest()`;
- CycloneDX SBOM;
- deterministic materials inventory;
- source SHA and source tree;
- deterministic archive of the exact Production artifact bytes plus evidence;
- SHA-256 digest of that archive.

Provenance:

- generate GitHub Artifact Attestation / Sigstore-backed provenance for the exact archive subject;
- generate SBOM attestation where supported by the pinned GitHub action contract;
- verify that the attestation subject digest equals the archive digest and that resolved source dependency identifies the exact release SHA.

Artifact upload:

- upload one immutable release package using a deterministic name derived from the release SHA;
- use `if-no-files-found: error`;
- use an explicit retention period;
- preserve the resulting artifact identity and digest as evidence.

The builder workflow MUST NOT contain `deploy-pages`, `upload-pages-artifact`, Supabase deployment commands, DNS changes, or provider writes.

### 3.2 Stage B — Exact Artifact Production Promotion

Harden `.github/workflows/pages.yml` so it becomes a pure promotion workflow.

Trigger:

- `workflow_dispatch` only.

Required inputs:

- `release_sha`: exact approved current-main SHA;
- `artifact_id`: numeric GitHub Actions artifact identity from Stage A.

Optional future input only if GitHub API constraints require it:

- `builder_run_id`: the exact builder workflow run that produced the artifact.

If `artifact_id` alone can resolve and prove the producing run, `builder_run_id` SHALL NOT be added because it increases operator surface without adding authority.

Promotion preflight SHALL verify, fail closed:

1. `release_sha` syntax;
2. `release_sha == origin/main` at promotion time;
3. artifact ID exists and is not expired;
4. artifact originates from the approved Production Release Artifact Builder workflow, not another workflow;
5. producing workflow run completed successfully;
6. producing workflow run `head_sha == release_sha`;
7. artifact name matches the release-SHA naming contract;
8. GitHub-reported artifact digest is present and valid when exposed by the API;
9. downloaded archive SHA-256 equals the trusted artifact digest/evidence digest;
10. provenance attestation validates for this repository and subject digest;
11. Production release-bundle manifest source SHA equals `release_sha`;
12. Production release-bundle manifest source tree matches the source tree recorded by the builder evidence;
13. SBOM and materials digests equal the Production release-bundle manifest values;
14. embedded public `release-manifest.json` has `mode === "production"`, `releaseEligible === true`, and zero configuration or forbidden findings;
15. every public artifact file re-hashes to its declared digest;
16. no undeclared file, symlink, traversal, duplicate normalized path, special file, or archive escape is present.

Only after all checks succeed may the workflow prepare the already-built public directory for GitHub Pages upload.

### 3.3 No-Rebuild rule

The promotion workflow SHALL contain a mechanically testable prohibition against rebuilds.

At minimum, tests SHALL reject the presence of:

- `tools/vvip_public_release.py` invocation;
- npm/pnpm/yarn build commands;
- compiler/bundler invocation known to this repository;
- commands that regenerate `runtime-config.js`, `release-manifest.json`, or application files;
- a second public artifact build command.

The workflow may install verification tooling only if that tooling does not mutate public artifact bytes. Prefer standard runner tools and repository verification code already covered by tests.

## 4. Trust and permission model

### Production Release Artifact Builder

Top-level permissions:

- `contents: read`.

Only the attestation-producing job receives the minimum additional permissions required by GitHub for artifact attestations. OIDC and attestation write permissions must not leak to unrelated jobs.

No `pages: write` permission anywhere in the builder workflow.

### Promotion workflow

Top-level permissions:

- `contents: read`;
- `actions: read` if required to query/download the specific artifact and producing workflow metadata.

Verification/preflight jobs receive no Pages write or OIDC deployment authority.

Final deploy job only:

- `contents: read`;
- `pages: write`;
- `id-token: write`.

Deployment environment:

- `github-pages`.

Build environment:

- never attached to the deploy job.

## 5. Artifact identity model

The trusted release identity is a tuple, not a filename:

`repository + builder_workflow + artifact_id + artifact_digest + source_sha + source_tree + production_release_bundle_digest`

The artifact name is descriptive metadata only and MUST NOT be treated as sufficient authority.

No user-supplied digest, workflow name, source tree, release mode, or eligibility flag is trusted as authoritative. Those values are derived from GitHub metadata, trusted workflow code, and verified artifact contents.

## 6. Archive extraction safety

Before deployment, extraction SHALL be fail-closed:

- list archive entries before extraction;
- reject absolute paths;
- reject `..` traversal;
- reject backslash/cross-platform path ambiguity;
- reject symlink/hardlink/device/FIFO/special entries;
- reject duplicate normalized paths;
- extract only into a fresh `$RUNNER_TEMP` directory;
- re-enumerate the extracted tree and compare it to the manifest;
- never extract into `$GITHUB_WORKSPACE`.

The implementation uses a two-phase verifier: the GitHub artifact ZIP is authenticated and safely opened first, then the inner tarball is cryptographically attested before its contents are extracted or trusted. This preserves the intended trust ordering while preventing archive traversal and pre-attestation parsing of release payload bytes.

## 7. Determinism and reproducibility

The Production release package SHALL be deterministic for identical trusted inputs where platform tooling permits deterministic output:

- sorted archive paths;
- fixed timestamps;
- fixed numeric owner/group;
- gzip without timestamp metadata;
- canonical JSON for materials, SBOM-relevant inventory, and Production release-bundle manifest;
- deterministic path normalization.

The design does not require independently rebuilding during promotion to prove reproducibility, because rebuilding would violate the core promote-without-rebuild invariant. Reproducibility is a build-stage assurance property; promotion is an identity-preservation property.

## 8. Failure semantics

All security-relevant ambiguity results in STOP.

Examples:

- current main moved after artifact build -> stop; build a new Production release artifact from the new main;
- artifact expired -> stop; build a new artifact;
- artifact metadata unavailable -> stop;
- digest unavailable where required by the implemented contract -> stop;
- artifact produced by wrong workflow -> stop;
- producing run not successful -> stop;
- source SHA mismatch -> stop;
- source tree mismatch -> stop;
- attestation invalid or missing -> stop;
- embedded manifest is not Production mode -> stop;
- release manifest ineligible -> stop;
- SBOM/material mismatch -> stop;
- file hash mismatch -> stop;
- archive contains unsafe entry -> stop;
- unexpected extra file -> stop.

There is no warning-only downgrade for these conditions.

## 9. TDD implementation contract

Implementation follows strict RED -> GREEN -> verification.

### RED tests first

Create focused tests that initially fail on current `main` because `pages.yml` still rebuilds during Production promotion and no isolated Production artifact builder exists.

The tests SHALL prove at least:

1. Production Release Artifact Builder workflow exists and is manual-only;
2. builder validates exact current-main SHA;
3. Production artifact is built exactly once with `--mode production` outside the checkout tree;
4. existing candidate-domain `createReleaseBundleManifest()` remains candidate-only;
5. new Production-domain bundle entry point requires Production mode and fail-closed evidence arrays;
6. builder emits cryptographically bound release evidence;
7. builder has no Production deployment authority;
8. promotion requires both exact SHA and artifact identity;
9. promotion verifies producing workflow/run/SHA and artifact digest;
10. promotion verifies provenance and Production release-bundle evidence;
11. promotion performs safe extraction and re-hashing;
12. promotion contains no application rebuild command;
13. only deploy job owns Pages/OIDC write permissions;
14. all external actions remain immutable-SHA pinned.

The RED run must be observed before workflow or production-bundle implementation changes.

### GREEN

Apply the minimum implementation necessary to satisfy the tests. Do not refactor unrelated release, runtime, SQL, product, payment, or identity code.

Run all applicable repository gates on the exact final head:

- VVIP Quality Gate;
- V14 Release Candidate;
- CodeQL;
- Dependency Review;
- TIGER CleanGuard;
- focused exact-artifact promotion tests;
- candidate/Production release-domain separation tests;
- existing release-workflow hardening and artifact-isolation tests.

No completion claim is valid without fresh exact-head evidence.

## 10. Human approval and deployment policy

The PR implementing this design may be auto-merge armed only after all required checks are GREEN and review threads are resolved.

Human approval remains mandatory before merge.

Merging the PR does NOT authorize a Production deployment.

No Production Release Artifact Builder run using live Production environment values and no Production promotion run is to be executed as part of PR testing. Workflow syntax and security contracts are validated without deploying.

A future real Production artifact build and Production promotion remain separate explicit owner actions using an approved exact SHA and exact artifact identity.

## 11. #164 reconciliation rule

PR #164 remains open until the implementation of this design is merged and verified on `main`.

After verification, #164 may be closed WITHOUT MERGE only if a final semantic audit confirms all unique useful controls have modern replacements:

- proof/evidence controls already current;
- exact-SHA manual promotion from #201/#202;
- immutable external actions from #203;
- verified candidate release bundle from #204/#205;
- exact Production previously-built artifact promotion from this design's implementation PR.

The #164 branch and history are preserved. Its stale automatic push-triggered workflow and unrelated divergent files are intentionally not retained.

## 12. Non-goals

This design does not:

- activate Production;
- execute a real Production artifact build;
- deploy a real release;
- change Supabase schema/data/RLS;
- change Clerk or Supabase provider configuration;
- change DNS;
- write secrets;
- seed owner/country data;
- change product behavior or UI;
- merge or delete #164;
- upgrade unrelated dependencies.

## 13. Acceptance criteria

The implementation is accepted only when all are true:

- Production release artifact build is manual, exact-SHA, current-main bound, Production-mode, build-once, deterministic, and non-deploying;
- existing candidate release-bundle semantics remain fail-closed and unchanged for candidate callers;
- Production release-bundle semantics are explicitly domain-separated and fail closed;
- artifact has verified cryptographic identity and provenance;
- promotion consumes the exact existing Production artifact and never rebuilds application bytes;
- artifact/run/source/provenance/evidence relationships are independently verified fail-closed;
- least privilege is mechanically tested;
- no Production mutation occurs during PR validation;
- all applicable CI is GREEN on one exact final SHA;
- Copilot/reviewer findings are addressed or explicitly resolved with evidence;
- human approval is recorded on the exact final head before merge.
