# Exact-Artifact Production Promotion — 2026 Design

Date: 2026-08-12
Status: OWNER-APPROVED DESIGN, IMPLEMENTATION NOT YET AUTHORIZED
Target: VVIP TIGER Production release supply chain
Base main SHA: `19859d101aae88f240d191be9c2304421fc167a9`

## 1. Objective

Replace the remaining rebuild-at-promotion gap with a two-stage, fail-closed release architecture:

1. build and verify a Production candidate exactly once;
2. preserve that exact candidate as an immutable GitHub Actions artifact with cryptographic identity and provenance;
3. later promote that same previously-built artifact to GitHub Pages without rebuilding it.

The Production promotion path must never regenerate application bytes. The artifact approved for release is the artifact deployed.

## 2. Security invariants

The implementation SHALL preserve all of the following invariants:

- Production promotion is manual only (`workflow_dispatch`).
- A release SHA is a full lowercase 40-character Git commit SHA.
- The release SHA must equal the current `origin/main` SHA at candidate creation and again at promotion time.
- Candidate build and Production promotion are distinct workflows or strictly distinct trust stages with separate authority.
- Candidate bytes are built exactly once.
- Production promotion does not invoke `tools/vvip_public_release.py`, a compiler, bundler, package build, or any equivalent byte-producing step.
- Production promotion only downloads, authenticates, re-verifies, extracts, and deploys the exact previously-built artifact.
- Artifact identity is bound to Git source SHA, Git source tree, release manifest, SBOM, materials, and artifact SHA-256.
- Any missing, expired, mismatched, malformed, untrusted, or unverifiable evidence stops the release.
- External GitHub Actions are referenced only by immutable lowercase 40-character commit SHAs.
- Repository-level permissions default to read-only; elevated permissions are scoped to the individual job that needs them.
- Only the final deployment job may receive `pages: write` and `id-token: write`.
- No workflow in this scope may mutate Supabase Production data/schema, provider configuration, DNS, secrets, payment state, country activation, or owner seeding.
- No old #164 workflow is copied wholesale.

## 3. Architecture

### 3.1 Stage A — Production Candidate Builder

Introduce a non-deploying candidate workflow dedicated to producing a release artifact.

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

- The candidate-build job may use the `production-build` environment solely to obtain public runtime configuration required to produce Production-ready public bytes.
- It receives no Pages deployment permission and no Production DB/provider mutation permission.

Candidate build:

- run the full quality/security gate;
- build the public Production artifact once into `$RUNNER_TEMP` outside the checkout tree;
- use the existing allow-list builder rather than copying the repository root;
- require the generated `release-manifest.json` to be Production mode, source-SHA bound, release eligible, with empty `configurationErrors` and `forbiddenFindings`;
- recursively verify that every declared file exists and its SHA-256 matches the manifest;
- reject symlinks, path traversal, special files, undeclared files, and duplicate normalized paths.

Evidence package:

- canonical release manifest;
- canonical SVEF release-bundle manifest;
- CycloneDX SBOM;
- deterministic materials inventory;
- source SHA and source tree;
- deterministic archive of the exact candidate bytes plus evidence;
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

The candidate workflow MUST NOT contain `deploy-pages`, `upload-pages-artifact`, Supabase deployment commands, DNS changes, or provider writes.

### 3.2 Stage B — Exact Artifact Production Promotion

Harden `.github/workflows/pages.yml` so it becomes a pure promotion workflow.

Trigger:

- `workflow_dispatch` only.

Required inputs:

- `release_sha`: exact approved current-main SHA;
- `artifact_id`: numeric GitHub Actions artifact identity from Stage A.

Optional future input only if GitHub API constraints require it:

- `candidate_run_id`: the exact candidate workflow run that produced the artifact.

If `artifact_id` alone can resolve and prove the producing run, `candidate_run_id` SHALL NOT be added because it increases operator surface without adding authority.

Promotion preflight SHALL verify, fail closed:

1. `release_sha` syntax;
2. `release_sha == origin/main` at promotion time;
3. artifact ID exists and is not expired;
4. artifact originates from the approved candidate workflow, not another workflow;
5. producing workflow run completed successfully;
6. producing workflow run `head_sha == release_sha`;
7. artifact name matches the release-SHA naming contract;
8. GitHub-reported artifact digest is present and valid when exposed by the API;
9. downloaded archive SHA-256 equals the trusted artifact digest/evidence digest;
10. provenance attestation validates for this repository and subject digest;
11. release-bundle manifest source SHA equals `release_sha`;
12. release-bundle manifest source tree matches the source tree recorded by the candidate evidence;
13. SBOM and materials digests equal the release-bundle manifest values;
14. candidate manifest is Production mode, release eligible, and contains zero configuration or forbidden findings;
15. every candidate file re-hashes to its declared digest;
16. no undeclared file, symlink, traversal, duplicate normalized path, special file, or archive escape is present.

Only after all checks succeed may the workflow prepare the already-built candidate directory for GitHub Pages upload.

### 3.3 No-Rebuild rule

The promotion workflow SHALL contain a mechanically testable prohibition against rebuilds.

At minimum, tests SHALL reject the presence of:

- `tools/vvip_public_release.py` invocation;
- npm/pnpm/yarn build commands;
- compiler/bundler invocation known to this repository;
- commands that regenerate `runtime-config.js`, `release-manifest.json`, or application files;
- a second candidate build command.

The workflow may install verification tooling only if that tooling does not mutate candidate bytes. Prefer standard runner tools and repository verification code already covered by tests.

## 4. Trust and permission model

### Candidate workflow

Top-level permissions:

- `contents: read`.

Only attestation-producing job/step receives the minimum additional permissions required by GitHub for artifact attestations. OIDC and attestation write permissions must not leak to unrelated jobs.

No `pages: write` permission anywhere in the candidate workflow.

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

`repository + candidate_workflow + artifact_id + artifact_digest + source_sha + source_tree + release_bundle_digest`

The artifact name is descriptive metadata only and MUST NOT be treated as sufficient authority.

No user-supplied digest, workflow name, source tree, or eligibility flag is trusted as authoritative. Those values are derived from GitHub metadata and verified artifact contents.

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

## 7. Determinism and reproducibility

The candidate package SHALL be deterministic for identical trusted inputs where platform tooling permits deterministic output:

- sorted archive paths;
- fixed timestamps;
- fixed numeric owner/group;
- gzip without timestamp metadata;
- canonical JSON for materials, SBOM-relevant inventory, and release-bundle manifest;
- deterministic path normalization.

The design does not require independently rebuilding during promotion to prove reproducibility, because rebuilding would violate the core promote-without-rebuild invariant. Reproducibility is a candidate-stage assurance property; promotion is an identity-preservation property.

## 8. Failure semantics

All security-relevant ambiguity results in STOP.

Examples:

- current main moved after candidate build -> stop; build a new candidate from the new main;
- artifact expired -> stop; build a new candidate;
- artifact metadata unavailable -> stop;
- digest unavailable where required by the implemented contract -> stop;
- artifact produced by wrong workflow -> stop;
- producing run not successful -> stop;
- source SHA mismatch -> stop;
- source tree mismatch -> stop;
- attestation invalid or missing -> stop;
- candidate release manifest ineligible -> stop;
- SBOM/material mismatch -> stop;
- file hash mismatch -> stop;
- archive contains unsafe entry -> stop;
- unexpected extra file -> stop.

There is no warning-only downgrade for these conditions.

## 9. TDD implementation contract

Implementation follows strict RED -> GREEN -> verification.

### RED tests first

Create focused tests that initially fail on current `main` because `pages.yml` still rebuilds during Production promotion.

The tests SHALL prove at least:

1. candidate workflow exists and is manual-only;
2. candidate workflow validates exact current-main SHA;
3. candidate is built exactly once outside the checkout tree;
4. candidate workflow emits cryptographically bound release evidence;
5. candidate workflow has no Production deployment authority;
6. promotion requires both exact SHA and artifact identity;
7. promotion verifies producing workflow/run/SHA and artifact digest;
8. promotion verifies provenance and release-bundle evidence;
9. promotion performs safe extraction and re-hashing;
10. promotion contains no application rebuild command;
11. only deploy job owns Pages/OIDC write permissions;
12. all external actions remain immutable-SHA pinned.

The RED run must be observed before workflow implementation changes.

### GREEN

Apply the minimum implementation necessary to satisfy the tests. Do not refactor unrelated release, runtime, SQL, product, payment, or identity code.

Run all applicable repository gates on the exact final head:

- VVIP Quality Gate;
- V14 Release Candidate;
- CodeQL;
- Dependency Review;
- TIGER CleanGuard;
- focused exact-artifact promotion tests;
- existing release-workflow hardening and artifact-isolation tests.

No completion claim is valid without fresh exact-head evidence.

## 10. Human approval and deployment policy

The PR implementing this design may be auto-merge armed only after all required checks are GREEN and review threads are resolved.

Human approval remains mandatory before merge.

Merging the PR does NOT authorize a Production deployment.

No candidate build or Production promotion run is to be executed against Production as part of PR testing. Workflow syntax and security contracts are validated without deploying.

A future real Production promotion remains a separate explicit owner action using an approved exact SHA and exact artifact identity.

## 11. #164 reconciliation rule

PR #164 remains open until the implementation of this design is merged and verified on `main`.

After verification, #164 may be closed WITHOUT MERGE only if a final semantic audit confirms all unique useful controls have modern replacements:

- proof/evidence controls already current;
- exact-SHA manual promotion from #201/#202;
- immutable external actions from #203;
- verified release bundle from #204/#205;
- exact previously-built artifact promotion from this design's implementation PR.

The #164 branch and history are preserved. Its stale automatic push-triggered workflow and unrelated divergent files are intentionally not retained.

## 12. Non-goals

This design does not:

- activate Production;
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

- candidate build is manual, exact-SHA, current-main bound, build-once, deterministic, and non-deploying;
- artifact has verified cryptographic identity and provenance;
- promotion consumes the exact existing artifact and never rebuilds application bytes;
- artifact/run/source/provenance/evidence relationships are independently verified fail-closed;
- least privilege is mechanically tested;
- no Production mutation occurs during PR validation;
- all applicable CI is GREEN on one exact final SHA;
- Copilot/reviewer findings are addressed or explicitly resolved with evidence;
- human approval is recorded on the exact final head before merge.
