# Exact-Artifact Promotion Digest Model Amendment

Date: 2026-08-12
Status: SECURITY CLARIFICATION TO OWNER-APPROVED DESIGN
Applies to: `2026-08-12-exact-artifact-promotion-design.md`

## Purpose

Make the release identity model explicit at both storage layers. GitHub Actions stores an uploaded artifact as a GitHub-managed ZIP archive whose REST metadata exposes a `digest` value. Inside that outer artifact, VVIP TIGER preserves its own deterministic, attested Production release bundle (`tar.gz`) with an independently computed SHA-256.

These are two different cryptographic identities and MUST NOT be conflated.

## Layer A — GitHub Actions artifact envelope

Trusted metadata is obtained from GitHub's Actions Artifact API using the operator-supplied numeric `artifact_id` only as a lookup key.

The promotion workflow SHALL derive and verify:

- artifact numeric `id` equals the requested `artifact_id`;
- artifact is not expired;
- artifact name equals `vvip-production-release-<release_sha>`;
- artifact REST `digest` exists and matches `sha256:<64 lowercase hex>`;
- artifact `workflow_run.id` is present;
- artifact `workflow_run.head_sha` equals `release_sha`;
- artifact `workflow_run.head_repository_id` equals the current repository id;
- the producing run endpoint reports `event == "workflow_dispatch"`, `status == "completed"`, `conclusion == "success"`, and workflow path `.github/workflows/production-release-artifact.yml`;
- the producing run is associated with this same repository and exact release SHA.

The workflow downloads the artifact ZIP from GitHub, computes SHA-256 over the downloaded ZIP bytes, and requires it to equal the hex portion of GitHub's REST `digest` before extraction.

The outer ZIP is therefore an integrity envelope and GitHub-origin binding. Its digest is not the SVEF release-bundle digest.

## Layer B — VVIP deterministic Production release bundle

The safely extracted outer ZIP SHALL contain exactly:

- `vvip-production-release-<release_sha>.tar.gz`
- `vvip-production-release-<release_sha>.sha256`

No extra file is permitted.

The `.sha256` file SHALL contain exactly one lowercase SHA-256 digest plus the expected tarball filename. Promotion recomputes SHA-256 over the inner `tar.gz` and requires equality before any tar extraction.

The inner tarball is the artifact-attestation subject. `gh attestation verify` SHALL verify that exact tarball against the current repository identity before its contents are trusted.

The deterministic tarball SHALL contain:

- `public/` — exact Production public bytes built once;
- `evidence/release-bundle-manifest.json` — canonical Production SVEF bundle manifest;
- `evidence/sbom.cdx.json` — canonical CycloneDX inventory;
- `evidence/materials.json` — deterministic source/material inventory;
- `evidence/source.json` — canonical exact source SHA/tree identity.

The embedded public `release-manifest.json` remains inside `public/` and must declare `mode: "production"`, exact source SHA, `releaseEligible: true`, and empty `configurationErrors` / `forbiddenFindings`.

## Extraction order

Promotion SHALL use this order and fail closed at every stage:

1. query artifact metadata;
2. query producing workflow run metadata;
3. download outer ZIP;
4. verify outer ZIP digest against GitHub REST `digest`;
5. inspect ZIP entries without extraction and reject unsafe/extra entries;
6. extract ZIP to a fresh `$RUNNER_TEMP` directory;
7. verify inner tarball SHA-256 against the included `.sha256` record;
8. verify GitHub artifact attestation for the exact inner tarball;
9. inspect tar entries without extraction and reject unsafe/extra/special entries;
10. extract tarball to a second fresh `$RUNNER_TEMP` directory;
11. verify Production release-bundle, source, SBOM, materials, embedded release manifest, and every public file hash;
12. only then pass the already-built `public/` directory to `actions/upload-pages-artifact`;
13. deploy that Pages artifact without rebuilding application bytes.

## Race resistance

The Production Release Artifact Builder SHALL verify `release_sha == origin/main` at the beginning of the build and re-fetch/re-verify `origin/main` immediately before sealing/uploading the final release artifact. If `main` moved during the build, the build stops and no releasable artifact is uploaded.

Production promotion SHALL independently require the same `release_sha` to equal current `origin/main`. A stale previously-built artifact is never promoted over a newer main.

## Trust rule

The trusted release identity is therefore:

`repository_id + builder_workflow_path + builder_run_id + artifact_id + outer_artifact_digest + release_sha + source_tree + inner_release_bundle_digest + attestation_identity`

Artifact filename, user-supplied digest, user-supplied workflow/run metadata, or a manifest eligibility flag alone is never sufficient authority.
