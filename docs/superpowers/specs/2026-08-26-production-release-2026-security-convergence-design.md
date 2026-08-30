# TIGER VVIP Production Release 2026 Security Convergence Design

**Status:** OWNER-APPROVED DESIGN, pending written-spec review

**Date:** 2026-08-26

**Baseline commit:** `73dce62cab48b37f2e09f1e9feeafc1c800d76d8`

**Baseline tree:** `052dd8e5cb6ac6da6fb25244e926595fa0e3367b`

**Owner choice:** Option B — staged, fail-closed security convergence

## 1. Decision and objective

Recover the blocked Production release builder without weakening its fail-closed controls, then advance the release path toward the strongest practical 2026 software-supply-chain posture supported by the repository and available providers.

The work must preserve these binding invariants:

- no fallback URL, placeholder endpoint, legacy deployment path, or second runtime authority;
- no direct edits to `main` and no Production deployment before exact-head gates are GREEN;
- build public bytes exactly once from an owner-approved exact current `main` SHA and tree;
- do not rebuild during promotion;
- do not print credentials, tokens, publishable configuration values, or user data in logs;
- do not claim SLSA Build Level 3, AWS readiness, or Global Launch Ready without evidence that satisfies the corresponding standard and live-provider gates;
- keep the application static and page-based; do not add a framework, bundler, or root package manager.

## 2. Confirmed failure mechanism

Run #3 reached `Build Production public bytes exactly once` after checkout, source identity, runtime setup, dependency installation, Quality Gate, and Production regression tests succeeded.

The builder emitted:

```text
VVIP_PUBLIC_RELEASE=BLOCKED
REASON=production release blocked: production media finalizer URL must be an https URL without query or fragment
```

`tools/vvip_public_release.py` reads `TIGER_MEDIA_FINALIZER_URL`, but `.github/workflows/production-release-artifact.yml` does not export that protected environment variable into the build job. The builder therefore receives an empty value and correctly refuses to create Production bytes.

This is a configuration-contract wiring defect. It is not evidence of a Quality Gate, test-suite, deterministic archive, SBOM, or attestation defect. Whether the protected GitHub environment currently contains a correct value remains live-provider evidence to be verified after the wiring fix.

## 3. Architecture

### 3.1 Protected configuration contract

`production-build` remains the only GitHub Environment authorized to supply Production public configuration. The release workflow maps `vars.TIGER_MEDIA_FINALIZER_URL` to the job environment. The value is an environment variable rather than a secret because the same endpoint is embedded in `runtime-config.js` and intentionally becomes public.

The builder validates the endpoint with a canonical URL parser instead of relying only on a permissive regular expression. A Production media-finalizer URL is eligible only when all of the following hold:

- the scheme is exactly `https`;
- the hostname is a syntactically valid ASCII DNS name and is normalized to lowercase;
- credentials/userinfo are absent;
- query and fragment are absent;
- the port is absent or exactly `443`;
- IP literals, `localhost`, single-label hosts, `.local`, and malformed DNS labels are rejected;
- backslashes, control characters, dot-segments, and non-canonical path encodings are rejected;
- the supplied URL is already in canonical form, so two textual URLs cannot identify the same endpoint differently.

The deterministic builder does not call the endpoint. Network liveness is mutable and belongs to runtime/provider evidence, not to the reproducible artifact build. The exact accepted URL is embedded into `runtime-config.js`, covered by the release manifest file hashes, sealed into the archive, and bound to the signed provenance.

### 3.2 Early fail-closed validation

The workflow performs a configuration-only validation after Python setup and before installing verification dependencies. This produces stable error codes without printing values and avoids spending the full Quality Gate duration on a known-invalid Production contract.

The later, single public-byte build validates the same contract again. This is intentional defense in depth and does not violate build-once because the early step creates no public artifact bytes.

### 3.3 Test contract

Tests are written and observed RED before production changes.

Python tests cover:

- a canonical `https://host/path` endpoint succeeds;
- missing, `http`, userinfo, query, fragment, non-443 port, IP literal, local/single-label host, dot-segment, backslash, control character, and non-canonical host inputs fail closed;
- a clean Production build still embeds the accepted endpoint and remains release-eligible;
- configuration-only validation creates no output directory or artifact bytes.

Workflow contract tests cover:

- the builder job is bound to the protected `production-build` environment;
- `TIGER_MEDIA_FINALIZER_URL` comes from `vars.TIGER_MEDIA_FINALIZER_URL`;
- no fallback, literal URL, workflow input, or secret is accepted for this public endpoint;
- configuration validation precedes dependency installation and public-byte construction;
- all external actions remain pinned to resolvable full commit SHAs;
- permissions remain least privilege.

The existing exact-artifact, SBOM, promotion-isolation, and full Quality Gate suites remain mandatory.

## 4. 2026 supply-chain convergence

The current pipeline already has full-SHA action pins, exact source SHA/tree, build once, deterministic archive construction, SHA-256, CycloneDX, GitHub OIDC artifact attestations, pre-upload attestation verification, and repeated current-`main` checks. These controls are retained.

The next release-security increments are dependency ordered:

1. **Configuration-contract recovery:** implement and verify Sections 3.1–3.3.
2. **CycloneDX 1.7:** migrate the Production file-inventory SBOM schema and its deterministic identity tests to CycloneDX 1.7 while retaining SHA-256 UUIDv8 identity and canonical JSON.
3. **Hardened builder boundary:** extract the trusted build/seal/attest path into a reusable workflow with a minimal typed interface, immutable action pins, environment isolation, and provenance verification. The project may claim SLSA v1.2 Build Level 3 only after the reusable-builder topology and generated provenance are independently verified against every Level 3 requirement. Until then, reports state the achieved controls without a Level 3 label.
4. **Durable immutable release:** promote the already-built archive and checksum into an immutable GitHub Release, retaining the GitHub Artifact ID/digest and Sigstore-compatible release attestation. Promotion consumes verified bytes and never rebuilds them.
5. **AWS identity-bound delivery:** use GitHub OIDC with a subject-restricted, least-privilege AWS role; deploy an image by ECR digest rather than tag; verify the source/artifact attestation before mutation; and record the deployed digest and AWS resource identity.
6. **Protected public endpoint:** expose the finalizer through the approved AWS edge/API path with TLS, JWT authorization for external users, request-size and rate limits, CloudFront origin protection where applicable, WAF managed protections, structured redacted logs, alarms, and a dead-letter/failure-recovery policy appropriate to the invocation model.
7. **Progressive runtime proof:** execute readiness, negative-auth, media-policy, privacy-metadata, rollback, canary, and post-deploy smoke evidence. The exact deployed release, endpoint origin, certificate, DNS, WAF, Lambda/ECR digest, and runtime witness become the P14–P20 evidence inputs.

Each increment must be independently GREEN before the next mutable provider action. A provider/tool/access limitation is recorded as `BLOCKED_EXTERNAL`; it never becomes a fabricated pass.

## 5. Release flow

```text
owner-approved exact current main SHA/tree
  -> protected configuration validation
  -> Quality/Security gates
  -> exact-allowlist public build once
  -> deterministic CycloneDX SBOM and materials
  -> deterministic sealed archive + SHA-256
  -> OIDC provenance and SBOM attestations
  -> local identity verification
  -> immutable artifact/release preservation
  -> OIDC AWS promotion of verified digest
  -> canary and fresh runtime evidence
```

There is no rebuild, fallback, manual byte substitution, or legacy Pages authority in this flow.

## 6. Error handling and recovery

- Invalid or missing Production configuration exits before dependency installation with a stable non-secret error code.
- A changed `main` SHA at preflight, sealing, upload, or promotion invalidates the run.
- A malformed SBOM, manifest mismatch, attestation identity mismatch, unresolved action pin, missing artifact, or changed artifact digest blocks preservation or deployment.
- A failed runtime canary stops progression and invokes release-level rollback to the last verified immutable release. Rollback never restores retired code or creates a second authority.
- Retrying a failed run requires a new explicit dispatch. Retries are not used to relabel nondeterminism as success.

## 7. Scope boundaries

This design changes the Production release/configuration path and the directly dependent evidence. It does not redesign the Social Home, Marketplace behavior, payment model, Sales DNA, authentication authority, Supabase schema, or media-processing policy.

Infrastructure creation, DNS changes, credential changes, paid capacity, and Production deployment occur only when exact targets, provider identity, permissions, cost controls, and rollback evidence are available under the active owner launch directive.

## 8. Acceptance criteria

The configuration-contract recovery is complete only when:

1. focused Python and workflow tests were observed failing for the missing behavior and pass after the change;
2. the full local Quality Gate passes from the final branch tree;
3. a PR from the isolated branch has exact-head CI and security checks GREEN;
4. protected merge produces a new exact current `main` SHA/tree;
5. the Production builder either creates a deterministic sealed artifact from that exact SHA or reports a truthful external configuration/provider blocker;
6. any created artifact has matching manifest, checksum, CycloneDX SBOM, provenance, SBOM attestation, GitHub Artifact ID, and artifact digest;
7. no Production deployment occurs from a failed, rebuilt, unverified, or non-current artifact.

The full 2026 convergence is complete only when the later increments in Section 4 have their own exact-head, immutable-artifact, AWS, DNS/TLS, authorization, observability, canary, and runtime evidence. Repository inspection alone cannot satisfy those live-provider criteria.

## 9. Standards baseline

The design is benchmarked to the current 2026 guidance used for this decision:

- SLSA specification v1.2 Build track and provenance;
- GitHub Actions secure-use guidance, full-SHA pins, OIDC, artifact attestations, reusable-workflow SLSA guidance, and immutable releases;
- CycloneDX 1.7;
- OpenSSF Open Source Project Security Baseline controls for CI least privilege and trusted release inputs;
- Node.js 24 LTS on AWS Lambda Amazon Linux 2023;
- AWS Lambda public-endpoint, CloudFront origin protection, WAF, OIDC, and Well-Architected deployment guidance.

Newer versions may be adopted only after compatibility and migration evidence; “latest” never overrides LTS support, reproducibility, or a GREEN security gate.
