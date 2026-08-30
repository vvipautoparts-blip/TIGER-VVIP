# TIGER Sovereign Sealed Build — Design Specification

Date: 2026-08-28
Base authority: `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`
Base commit: `ced38fdbcfce87b0bfae1121c8d85436564505f6`
Implementation branch: `feat/tiger-sovereign-sealed-build-20260828`
Status: **OWNER APPROVED DESIGN — PRE-IMPLEMENTATION**

## 1. Decision

The next implementation slice after the merged Sovereign Constellation Foundation is **Sealed Build only**.

This slice implements the repository tooling and workflow authority needed to create a release-eligible, cryptographically bound Media Finalizer OCI artifact and its non-secret release evidence. It does **not** deploy Lambda, mutate CloudFormation runtime stacks, change CloudFront/WAF/ACM, modify Supabase, publish a Production endpoint, or perform Dark Bootstrap.

When live execution is later authorized, the Sealed Build artifact path is strictly ordered:

`exact main source -> sealed build -> immutable OCI digest -> real OCI SBOM -> vulnerability decision -> attestations -> Genome -> Release Passport 2.0 -> deployment eligibility`

Live runtime deployment begins only in later owner-approved slices after all applicable repository, AWS-bootstrap, and DB convergence preconditions are satisfied.

## 2. Why this boundary is authoritative

The Master Architecture defines two distinct orders that must not be conflated:

1. **Repository implementation order (§32):** real SBOM/Genome/Passport tooling -> Sealed Build workflow -> DB convergence gates -> Dark Bootstrap regional workflow -> Global Edge workflow.
2. **First live release execution order (§23):** repository gates -> DB rehearsal -> live DB convergence -> live Sealed Build -> immutable digest/SBOM/scan/attestations -> regional CREATE -> edge CREATE -> probes -> stable baseline.

This design implements the Sealed Build authority at the correct repository stage, but it does **not** authorize the live Sealed Build to run early. Live execution remains blocked until the Master Spec's preceding live-release gates are actually satisfied.

Combining build and deployment would enlarge the authority surface, weaken evidence isolation, and make it harder to prove that the exact artifact tested is the exact artifact later deployed. This design therefore keeps artifact creation and runtime mutation as separate trust domains.

## 3. Existing state and required replacement

The repository currently contains:

- a quarantined legacy `.github/workflows/media-finalizer-build.yml` entrypoint that intentionally exits non-zero and has no AWS OIDC write authority;
- `scripts/release/media-cell-sbom.cjs`, which generates deterministic CycloneDX 1.7 **materials evidence**, not a complete post-build OCI inventory;
- `scripts/release/media-cell-passport.cjs`, which emits `tiger-release-passport-v1` and still requires the superseded combined infrastructure paths;
- a Media Finalizer Dockerfile already pinned to Node.js 24 Lambda base image digest `sha256:f3c848893566f5efb8bf8c48798f0687a7196cf1808846cafbb4974706be3cdc` and using `npm ci`.

The existing helpers are historical inputs. They may be refactored or replaced, but no compatibility fallback may retain the obsolete single-stack material authority or `us-east-1` Media repository assumption.

## 4. Authority separation

### 4.1 Source authority

An eligible **live** Sealed Build must originate from an exact protected `main` commit and must prove:

- the requested `release_sha` is an exact 40-character commit SHA;
- `release_sha` resolves to the current protected `main` authority at invocation time;
- exact Git tree SHA is resolved from that commit;
- checkout uses that exact commit rather than a moving branch ref;
- no checkout drift occurs after identity capture;
- repository identity remains `vvipautoparts-blip/TIGER-VVIP`.

The active workflow introduced by this slice must **not** use an unconditional `push: main` trigger that could perform a live ECR build immediately after merge. Until the later live-release gate explicitly authorizes execution, the workflow is invoked only through a protected manual/reusable release path whose eligibility checks fail closed.

A repository rehearsal or PR contract test may validate workflow structure without AWS mutation. A manual diagnostic execution, if retained, must be explicitly non-release-eligible and cannot push an authoritative image or issue authoritative release attestations.

### 4.2 Build authority

The Sealed Build uses only the dedicated `TIGER-VVIP-GitHub-MediaBuild` AWS OIDC role created by the merged Foundation authority.

The workflow may use that role only to:

- authenticate to the exact Seoul ECR authority;
- describe the exact Media repository;
- push the single built image/manifests;
- resolve the immutable manifest digest;
- read the scan findings required by the release gate.

It must not receive permissions to mutate Lambda, CloudFormation, IAM, WAF, CloudFront, ACM, Secrets Manager values, Supabase, or unrelated ECR repositories.

### 4.3 Runtime authority

No runtime deployment role is assumed by this workflow. RegionalDeployRole and EdgeDeployRole remain outside this slice.

## 5. Workflow identity and activation

The quarantined legacy workflow remains quarantined. A new workflow is introduced with an unambiguous authority name, for example:

`.github/workflows/tiger-media-sovereign-sealed-build.yml`

The new workflow must not silently reuse the old workflow filename as the active authority.

Before live release activation, the workflow uses a protected invocation surface such as `workflow_dispatch` and/or `workflow_call`; it must not auto-build on ordinary `push` events. Release eligibility requires an exact `release_sha` that is independently verified against protected `main` plus the later live-release preconditions defined by the Master Spec.

The workflow uses:

- Ubuntu 24.04 GitHub-hosted runner unless a later reviewed supply-chain policy replaces it;
- Node.js 24;
- immutable full-SHA pins for third-party GitHub Actions;
- GitHub OIDC for AWS authentication;
- protected GitHub Environment `media-build`;
- `contents: read`, `id-token: write`, and only the minimum additional GitHub permissions required for the selected attestation mechanism.

No AWS access key or secret access key is stored or consumed.

## 6. Build-once contract

The live build sequence is fail-closed:

1. accept the explicitly requested `release_sha`;
2. verify that `release_sha` equals the current protected `main` authority and is eligible under the live-release gate;
3. checkout that exact commit;
4. capture and validate commit SHA and tree SHA;
5. verify the authoritative Dockerfile base image is digest-pinned;
6. verify `package-lock.json` exists and is authoritative;
7. run the repository-defined Media Finalizer tests required for build eligibility;
8. build the container exactly once;
9. identify the local image by a non-authoritative temporary build label derived from the commit SHA;
10. authenticate to the exact Seoul ECR repository;
11. push exactly that built image once;
12. resolve the ECR manifest digest from AWS/ECR authority;
13. from this point onward, all evidence references `repository@sha256:<digest>` only;
14. no rebuild is permitted between evidence generation and any later deployment.

A tag may be used as a transport convenience only if ECR immutability and subsequent digest resolution make the digest the sole deployment authority. A tag is never the release identity.

## 7. Real OCI SBOM

### 7.1 Materials evidence vs. runtime inventory

The current materials-oriented CycloneDX helper remains useful as build-material evidence, but it is not sufficient as the Production container SBOM.

The new Sealed Build must create a **real post-build OCI/container SBOM** after the immutable image digest exists. It must enumerate the runtime packages discoverable from the built OCI image, including OS packages and application dependencies where available.

### 7.2 Format

The authoritative OCI SBOM must:

- be CycloneDX 1.7;
- identify the exact `repository@sha256:<manifestDigest>` subject;
- be produced after image creation, not reconstructed solely from source lockfiles;
- use deterministic canonical JSON normalization before TIGER computes its evidence digest;
- be stored under a bounded artifact path such as `artifacts/media-cell/oci-sbom.cdx.json`;
- be hashed with SHA-256;
- contain no secret values, authorization material, JWTs, capabilities, signed URLs, or raw media;
- be attested to the exact OCI digest;
- have its attestation verified before deployment eligibility.

The existing materials SBOM may be retained separately as `materials-sbom` evidence and must not be mislabeled as the real OCI inventory.

## 8. Vulnerability gate

The image scan decision is part of release eligibility and is fail-closed.

Default policy:

- `CRITICAL` finding count > 0 -> `BLOCK`;
- `HIGH` finding count > 0 -> `BLOCK`;
- `MEDIUM` -> record and evaluate only under an explicit bounded owner/security policy;
- `LOW` -> record and monitor.

A scan must be complete before the build can become release-eligible. Missing, timed-out, unknown, stale, or inaccessible scan evidence is not GREEN.

Any future exception mechanism must require advisory identity, affected component, rationale, approval, expiry, and re-evaluation trigger. This slice does not create an automatic broad exception path.

The scan evidence stored by the Sealed Build contains bounded identifiers/counts/statuses and a digest of normalized findings evidence; it must not dump credentials or unrelated account information.

## 9. TIGER Cryptographic Genome

A new helper establishes the Cryptographic Genome as deterministic canonical evidence.

The Genome binds at minimum:

- Git commit SHA;
- Git tree SHA;
- base image OCI digest;
- final OCI image manifest digest;
- `services/media-finalizer/package-lock.json` SHA-256;
- `services/media-finalizer/Dockerfile` SHA-256;
- all three active split infrastructure template digests:
  - `infra/media-finalizer/foundation/template.yaml`;
  - `infra/media-finalizer/regional/template.yaml`;
  - `infra/media-finalizer/edge/template.yaml`;
- all three corresponding Guard policy digests;
- DB migration-set identity relevant to Media Finalizer, represented as a deterministic ordered migration manifest digest even when live DB convergence has not yet occurred;
- real OCI SBOM digest;
- provenance attestation identity/digest;
- SBOM attestation identity/digest.

The Genome identifier is the SHA-256 of canonical Genome JSON excluding only the identifier field itself. Any authoritative material change therefore creates a different Genome ID.

No timestamp participates in the Genome ID unless the timestamp is explicitly defined as authoritative material in a later revision. Operational timestamps may exist outside the deterministic identity envelope.

## 10. Release Passport 2.0

`Release Passport 2.0` replaces `tiger-release-passport-v1` for Sovereign Constellation release eligibility.

Its schema identifier is fixed as:

`tiger-release-passport-v2`

At Sealed Build stage the passport records only evidence that actually exists. Deployment fields that do not yet exist are represented with explicit typed states, not fabricated identifiers.

The passport contains or binds:

### 10.1 Source

- commit SHA;
- tree SHA;
- repository identity;
- source eligibility state.

### 10.2 Artifact

- Seoul ECR repository identity;
- immutable OCI manifest digest;
- pinned base image digest;
- Genome ID.

### 10.3 SBOM and scan

- CycloneDX version;
- real OCI SBOM SHA-256;
- SBOM subject digest;
- scan state;
- normalized scan-evidence SHA-256;
- vulnerability decision.

### 10.4 Attestations

- provenance verification state and bounded evidence identity;
- SBOM attestation verification state and bounded evidence identity.

### 10.5 Infrastructure material identity

- foundation template/Guard digests;
- Seoul regional template/Guard digests;
- Global Edge template/Guard digests.

### 10.6 DB state

- deterministic migration-set digest;
- live convergence state fixed to `NOT_EXECUTED_IN_SEALED_BUILD` in repository/rehearsal evidence and replaced only by actual live DB verification evidence during the later authorized release sequence.

### 10.7 Deployment state

At Sealed Build stage the following fields are present as explicit states, not fake values:

- regional deployment: `NOT_EXECUTED`;
- edge deployment: `NOT_EXECUTED`;
- Lambda version: `NOT_AVAILABLE`;
- CloudFront distribution: `NOT_AVAILABLE`;
- WAF WebACL: `NOT_AVAILABLE`;
- deployment mode: `SEALED_BUILD_ONLY`;
- runtime probes: `NOT_EXECUTED`;
- rollback evidence: `NOT_APPLICABLE_NO_DEPLOYMENT`.

This preserves a single Passport evolution path without pretending Sealed Build proves Production readiness.

## 11. Secret rejection

Genome, Passport, SBOM normalization, scan normalization, workflow logs, and uploaded evidence must reject or redact secret-shaped content.

At minimum the validator fails closed on:

- AWS access-key patterns;
- private keys;
- GitHub tokens;
- Supabase privileged secrets;
- JWT/Authorization header-shaped values;
- Clerk session tokens;
- media capability tokens;
- signed storage URLs;
- raw request bodies;
- raw media bytes.

Unknown top-level or security-sensitive schema keys are rejected rather than silently retained.

## 12. Attestation contract

The implementation must produce and verify two independent bindings to the exact final OCI digest during an authorized live Sealed Build:

1. provenance attestation;
2. real OCI SBOM attestation.

Repository tests/rehearsals must prove the contract without fabricating successful live attestation evidence.

The repository must not claim a SLSA level unless the selected builder, provenance format, and verification evidence explicitly satisfy that level. The default design records verified provenance without advertising a SLSA level.

A live build is not release-eligible unless both attestation verification results are true and their evidence identities are included in the Genome/Passport.

## 13. Evidence artifact layout

Release evidence is stored in a bounded workspace tree, for example:

```text
artifacts/media-cell/
├── source-identity.json
├── materials-manifest.json
├── materials-sbom.cdx.json
├── oci-sbom.cdx.json
├── scan-evidence.json
├── provenance-verification.json
├── sbom-attestation-verification.json
├── genome.json
└── release-passport-v2.json
```

The exact filenames may be adjusted during implementation only if repository tests encode one canonical layout. Duplicate competing authorities are not permitted.

GitHub workflow artifacts are evidence transport, not Production authority. The exact ECR OCI digest plus verified evidence is the artifact authority.

## 14. Failure semantics

The live workflow exits non-zero and produces no release-eligible Passport when any required condition fails, including:

- `release_sha` is not the eligible protected `main` authority;
- required prior live-release gates are absent or false;
- commit/tree resolution fails;
- base image is not digest-pinned;
- lockfile missing or changed outside source identity;
- tests fail;
- image build fails;
- ECR push fails;
- manifest digest cannot be resolved exactly;
- OCI SBOM generation/validation fails;
- scan is incomplete or blocked by CRITICAL/HIGH policy;
- attestation generation fails;
- attestation verification fails;
- Genome canonicalization/validation fails;
- Passport validation fails;
- secret-shaped material is detected;
- a workflow step attempts a prohibited runtime mutation.

There is no fallback to the quarantined legacy build authority, a public registry, another AWS region, a mutable image tag, or an older evidence schema.

## 15. Repository test contracts

Implementation must be driven by RED -> GREEN repository contracts.

Tests must prove at minimum:

- the legacy workflow remains quarantined;
- the new workflow is a separate authority;
- the new workflow does not unconditionally auto-run a live ECR build on `push: main`;
- release eligibility requires an exact `release_sha` verified against protected `main`;
- third-party actions are pinned by full SHA;
- AWS authentication is OIDC-only;
- only `media-build` environment/build role semantics are accepted;
- Seoul `ap-northeast-2` and the exact ECR authority are used;
- no Lambda/CloudFormation/WAF/CloudFront deployment commands exist in Sealed Build;
- Dockerfile base image is pinned by OCI digest;
- build occurs once;
- final authority resolves to OCI digest;
- real OCI SBOM contract is distinct from materials SBOM;
- CycloneDX 1.7 is enforced;
- vulnerability gate blocks CRITICAL/HIGH;
- Genome changes when any authoritative digest changes;
- Genome is deterministic for identical evidence;
- Passport v2 rejects missing/unknown/secret/unverified evidence;
- Passport v2 cannot fabricate deployment evidence;
- attestation verification is mandatory for live eligibility;
- repository rehearsal cannot masquerade as successful live attestation;
- evidence normalization is deterministic.

## 16. Non-goals

This slice explicitly does not:

- execute a live Production ECR build merely because the workflow file exists or is merged;
- create or update Production Lambda;
- execute regional or edge CloudFormation change sets;
- create CloudFront/WAF/ACM resources;
- alter live Supabase schema/data/policies;
- change browser runtime configuration;
- run Dark Bootstrap;
- run weighted canary;
- establish the first stable Lambda baseline;
- claim Production readiness;
- enable a superseded workflow;
- add Kubernetes/EKS, Redis, RabbitMQ, service mesh, or unrelated infrastructure.

## 17. Implementation boundary and file families

The implementation plan may modify/create only files needed for this release-evidence/build authority, expected to include:

- new Sealed Build workflow under `.github/workflows/`;
- `scripts/release/` Genome/Passport/SBOM/evidence helpers;
- focused repository contract tests under `tests/`;
- Media Finalizer Dockerfile/package metadata only if required to satisfy the approved deterministic build contract;
- owner/current-state references only after exact-head evidence justifies a status update.

It must not modify Production runtime configuration or deploy infrastructure.

## 18. Success criteria

This design slice is complete only when a feature-branch exact head proves through repository CI that:

- the Sealed Build workflow contract is fail-closed and least-privilege;
- the workflow cannot perform an unauthorized early live build simply from merge/push;
- Genome/Passport 2.0 helpers are deterministic and strict;
- real OCI SBOM and vulnerability/attestation contracts are encoded and testable;
- the old workflow remains disabled;
- no deployment authority is introduced;
- all applicable repository security/quality gates are GREEN on the exact head.

Even then, the state is **REPOSITORY VERIFIED / NOT LIVE BUILT / NOT DEPLOYED** until the later live release sequence explicitly executes the DB convergence and Sealed Build steps under the Master Spec.

## 19. Next slice after this design

Only after this slice is implemented, reviewed, and exact-head GREEN does repository implementation proceed to the next Master Spec authority in order:

1. protected DB convergence gates;
2. Dark Bootstrap-aware Seoul regional deployment workflow;
3. Global Edge deployment workflow;
4. runtime/shadow/adaptive-canary contracts;
5. observability/security evidence;
6. exact-head review before any AWS bootstrap.

The later **live** release sequence remains separately ordered by §23: live DB convergence precedes the live Sealed Build, and only verified Sealed Build evidence precedes regional/edge runtime creation.

No later slice may be pulled forward merely to accelerate appearance of deployment progress.

## 20. Owner rule

This design is subordinate to the Sovereign Constellation Master Architecture and carries no authority to weaken it. Any future implementation conflict requires explicit owner-approved architectural revision. Silent fallback to legacy `us-east-1`, single-stack, unauthenticated-origin, mutable-tag, fabricated-canary, standing-credential, or premature-live-build behavior is forbidden.
