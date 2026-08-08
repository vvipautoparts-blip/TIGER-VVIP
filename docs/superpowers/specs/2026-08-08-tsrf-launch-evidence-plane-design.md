# TSRF Launch Evidence Plane Design

Date: 2026-08-08
Status: DESIGN APPROVED; IMPLEMENTATION NOT STARTED
Repository: `vvipautoparts-blip/TIGER-VVIP`
Parent release-candidate SHA: `238082e3f3b71301911380e2214ac04ef9f1f52d`
Implementation branch: `feat/tsrf-launch-evidence-plane-20260808`

## 1. Purpose

Build a repository-native, fail-closed TSRF evidence subsystem that converts existing exact-head CI and Staging verification outputs into cryptographically bound proof records without creating release authority.

This sub-project contains exactly three capabilities:

1. a strict Proof Capsule contract and validator;
2. deterministic Immutable Release DNA and `release_digest` generation;
3. a Staging-only Evidence Bridge that packages verified workflow/artifact facts into capsules bound to the exact source SHA and Release DNA.

This subsystem is evidence infrastructure only. It MUST NOT merge code, mutate Production, authorize Production, disable the Staging kill switch, enable L4, or represent an Owner decision.

## 2. Security Boundary

The Evidence Plane is intentionally non-authoritative.

It may assert only facts that it can derive or verify from repository state, trusted CI metadata, non-Production verification evidence, and content digests. It MUST NOT accept or emit fields such as:

- `authorized`
- `productionReady`
- `ownerApproved`
- `mergeAuthorized`
- `productionDbAuthorized`
- `productionActivationAuthorized`
- any equivalent authority-bearing alias

Owner authorization remains a separate sovereign ledger and is not inferred from a Proof Capsule.

The Proof Capsule contract permits only `LOCAL`, `STAGING`, or `NON_RUNTIME` evidence environments. `PRODUCTION` is rejected by this sub-project. The Staging Evidence Bridge itself accepts exactly `STAGING`.

Environment/class rules are explicit:

- `DB_REBUILD_PROOF_CAPSULE` may use `LOCAL` for isolated database rebuild/replay evidence.
- `JO_LEGAL_PROOF_CAPSULE` may use `NON_RUNTIME` because it is a document/legal evidence class rather than a runtime environment.
- `OTP_PROOF_CAPSULE`, `PR36_IMAGE_PROOF_CAPSULE`, `AI_SHADOW_PROOF_CAPSULE`, `OWNER_SOVEREIGNTY_PROOF_CAPSULE`, `BLACKBOX_PROOF_CAPSULE`, `PERFORMANCE_PROOF_CAPSULE`, and `RECOVERY_PROOF_CAPSULE` require `STAGING` for launch-grade PASS evidence.

If a target cannot be positively proven to be Staging, the Staging Evidence Bridge returns `BLOCKED` and no remote mutation is permitted.

## 3. Architecture

### 3.1 Proof Capsule Core

A small pure module will normalize and validate capsule inputs. It must be deterministic, side-effect free, strict about unknown fields, and independent of network clients.

Canonical capsule classes:

- `OTP_PROOF_CAPSULE`
- `DB_REBUILD_PROOF_CAPSULE`
- `PR36_IMAGE_PROOF_CAPSULE`
- `AI_SHADOW_PROOF_CAPSULE`
- `OWNER_SOVEREIGNTY_PROOF_CAPSULE`
- `BLACKBOX_PROOF_CAPSULE`
- `PERFORMANCE_PROOF_CAPSULE`
- `RECOVERY_PROOF_CAPSULE`
- `JO_LEGAL_PROOF_CAPSULE`

The core supports all nine class identifiers, but this implementation does not fabricate missing evidence. A class remains absent until its dedicated proof producer actually supplies valid evidence.

Every capsule must include:

- `capsule_version`
- `capsule_class`
- `release_digest`
- `source_sha`
- `source_tree`
- `environment`
- `test_version`
- `workflow_run_id`
- `runner_identity`
- `artifact_name`
- `artifact_sha256`
- `started_at`
- `completed_at`
- `generated_at`
- `kill_switch_state`
- `validation_results`
- `result`

All digests are lowercase 64-character SHA-256 values. `source_sha` is a full 40-character Git commit SHA. `source_tree` is a full 40-character Git tree SHA. Timestamps are UTC ISO-8601 values.

`kill_switch_state` is restricted to `TRUE` or `NOT_APPLICABLE`. `STAGING` requires `TRUE`; `LOCAL` and `NON_RUNTIME` require `NOT_APPLICABLE`. `FALSE` is never accepted by this sub-project.

`workflow_run_id` and `runner_identity` are trusted-context fields. In CI they MUST be derived from the workflow runtime context and MUST NOT be accepted from an arbitrary proof payload. Pure unit tests may inject them only through an explicitly trusted test dependency.

`result` is restricted to `PASS` or `BLOCKED`. Inconclusive, unknown, skipped, cancelled, stale, or partially verified inputs do not become PASS capsules.

### 3.2 Immutable Release DNA

Release DNA is a canonical immutable projection of release-relevant source and build material. Its deterministic SHA-256 becomes `release_digest`.

Required Release DNA fields:

- `dna_version`
- `source_sha`
- `source_tree`
- `frontend_build_sha256`
- `backend_edge_build_sha256`
- `migration_digests`
- `ai_policy_sha256`
- `prompt_sha256`
- `model_config_sha256`
- `tool_registry_sha256`
- `rls_sha256`
- `security_config_sha256`
- `environment_class`

`prompt_sha256` and `model_config_sha256` are separate by design and MUST NOT be collapsed.

`migration_digests` is a sorted list of `{path, sha256}` records. Ordering is canonicalized before hashing.

For this sub-project, `environment_class` is exactly `STAGING_CANDIDATE`. Local and non-runtime proof capsules may bind to the same candidate Release DNA because they prove properties of that candidate; they do not redefine the target environment.

Mutable timestamps, workflow run IDs, approvals, human decisions, artifact retention metadata, and owner authorization data are excluded from Release DNA.

The release digest is:

`SHA256(canonical_json(release_dna_projection))`

Canonical JSON means UTF-8, lexicographically sorted object keys, stable array ordering defined by the contract, no insignificant whitespace, no platform-dependent path separators, and no floating-point values.

### 3.3 Staging Evidence Bridge

The bridge is an orchestration layer that accepts already-produced technical evidence and packages it into a capsule only after all bindings are verified.

The bridge must verify:

1. checked-out `HEAD` equals declared `source_sha`;
2. checked-out tree equals declared `source_tree`;
3. Release DNA recomputes to the supplied `release_digest`;
4. artifact bytes recompute to `artifact_sha256`;
5. workflow run ID and runner identity come from trusted CI context, not the proof payload;
6. timestamps are internally consistent and within the configured freshness window;
7. `environment` is exactly `STAGING`;
8. `kill_switch_state` is exactly `TRUE` for the current TSRF Staging phase;
9. validation results contain only allowlisted structured facts;
10. no authority-shaped or secret-shaped fields are present.

A failure in any check returns `BLOCKED`. The bridge never downgrades a failed check into a warning.

## 4. Proposed Repository Boundaries

Implementation should follow existing repository conventions and remain isolated:

- `scripts/tsrf/evidence/contracts.cjs` — constants, field allowlists, validators, canonicalization rules.
- `scripts/tsrf/evidence/release-dna.cjs` — deterministic Release DNA projection and digest calculation.
- `scripts/tsrf/evidence/proof-capsule.cjs` — capsule normalization, strict validation, immutable output.
- `scripts/tsrf/evidence/staging-bridge.cjs` — Staging-only binding/orchestration with injected filesystem/process metadata dependencies.
- `tests/tsrf-launch-evidence-plane.test.cjs` — pure contract and negative tests.
- `.github/workflows/tsrf-staging-evidence.yml` — read-only/Staging evidence workflow with exact-SHA checkout and artifact upload.

If existing repository naming or module layout requires a small adjustment during planning, the responsibility boundaries above remain fixed.

## 5. Data Flow

1. CI resolves the exact source SHA and checks out that SHA explicitly.
2. Git supplies the exact source tree hash.
3. Release DNA generator hashes the defined build/config/source surfaces.
4. The deterministic Release DNA projection produces `release_digest`.
5. A proof producer supplies its technical result and artifact but not trusted CI identity fields.
6. The orchestration layer obtains `workflow_run_id` and `runner_identity` from trusted workflow context.
7. The bridge independently hashes the artifact and verifies source/tree/release bindings.
8. The Proof Capsule core validates strict schema, freshness, environment, kill-switch state, and authority-field exclusion.
9. A canonical capsule JSON file is written to a temporary output directory outside the source tree.
10. CI uploads that capsule as an artifact named with both capsule class and exact source SHA.
11. The checked-out repository must remain clean after evidence generation.

No step writes to Production or grants execution authority.

## 6. Fail-Closed Rules

The implementation MUST reject at least the following cases:

- `environment=PRODUCTION`;
- any environment not allowed for the selected capsule class;
- source SHA mismatch;
- source tree mismatch;
- release digest mismatch;
- malformed or uppercase digest;
- artifact hash mismatch;
- missing artifact;
- stale evidence;
- future timestamps outside clock tolerance;
- `completed_at < started_at`;
- unknown capsule fields;
- duplicate or malformed validation-result keys;
- secret-shaped keys or values in structured metadata;
- authority-shaped fields or aliases;
- `kill_switch_state=FALSE`;
- `STAGING` with any kill-switch value other than `TRUE`;
- `LOCAL` or `NON_RUNTIME` with any kill-switch value other than `NOT_APPLICABLE`;
- caller-supplied workflow run identity in the Staging bridge;
- missing trusted workflow/run identity;
- unsupported capsule class;
- inconclusive/skipped/cancelled evidence represented as PASS;
- symlink/path traversal that escapes the repository or approved artifact directory;
- dirty source tree caused by evidence generation.

Errors returned to callers must use stable bounded codes and must not echo secrets or raw untrusted payloads.

## 7. TDD Contract

Implementation begins with failing tests. No production module is written before the RED test exists for that behavior.

Minimum positive tests:

- deterministic Release DNA produces the same digest regardless of input object key order;
- exact source/tree/artifact bindings produce a valid STAGING capsule;
- a LOCAL `DB_REBUILD_PROOF_CAPSULE` requires `NOT_APPLICABLE` kill-switch state;
- migration digest input is canonicalized deterministically;
- capsule output is deeply immutable or otherwise non-mutable by consumers;
- trusted CI identity is injected outside the untrusted proof payload;
- repository remains unchanged by evidence generation.

Minimum negative tests:

- Production environment rejected;
- invalid environment/class combination rejected;
- mismatched source SHA rejected;
- mismatched source tree rejected;
- mismatched release digest rejected;
- artifact tampering rejected;
- stale evidence rejected;
- unknown field rejected;
- authorization-shaped field rejected;
- false kill switch rejected;
- caller-forged workflow/runner identity rejected by the Staging bridge;
- unsupported class rejected;
- malformed timestamp rejected;
- path traversal/symlink escape rejected;
- missing proof artifact rejected;
- inconclusive result cannot become PASS.

The workflow contract must also be tested to ensure exact-SHA checkout, read-only repository permissions, no Production credential dependency, external temporary evidence output, trusted workflow identity derivation, and artifact names bound to the exact source SHA.

## 8. CI and Evidence Artifact Contract

The Staging evidence workflow must use least privilege. Repository permission is `contents: read` unless a strictly necessary additional read permission is identified during implementation planning.

It must not require Production secrets. It must not contain Production deployment commands, `supabase db push` to a remote Production target, migration promotion, branch merge, or L4 activation.

Canonical evidence artifact naming:

`tsrf-<capsule-class-lower>-<source_sha>`

The artifact payload contains:

- canonical Proof Capsule JSON;
- canonical Release DNA JSON;
- a small manifest containing SHA-256 values for both files.

The manifest is evidence metadata only and carries no authorization state.

## 9. Interaction with Existing Release Candidate

The parent RC `238082e3f3b71301911380e2214ac04ef9f1f52d` remains a historical green candidate and is not rewritten.

Any commit created on `feat/tsrf-launch-evidence-plane-20260808` is a new SHA and therefore requires fresh quality/security gates before it can become a new candidate. Previous PASS results may be referenced as historical evidence but MUST NOT be presented as proof for the new SHA.

The current V14 release artifact digest `37b41c9d6fa2d52d1618a30797f4990923a77d27cbfe16e0b452306cb44d1afc` is evidence associated with the parent RC only; it is not automatically inherited by a later source SHA.

## 10. Explicit Non-Goals

This sub-project does not:

- merge PR #162 or any successor PR;
- modify `main`;
- write to Production DB;
- deploy or activate Production;
- disable the Staging kill switch;
- enable L4 tools;
- implement Owner Step-Up authorization;
- claim `OWNER_SOVEREIGNTY_PROOF_CAPSULE` PASS without its separate proof phase;
- complete the deferred PR36 real `.jpg` browser E2E;
- perform Blackbox/Red Team, performance, recovery, or Jordan legal proof;
- import the old AI-14/AI-15 proof-system stack wholesale.

Those remain separate gated work items.

## 11. Completion Criteria for This Sub-Project

This Evidence Plane sub-project is complete only when one new exact SHA satisfies all of the following:

- Proof Capsule contract tests PASS;
- Release DNA deterministic tests PASS;
- Staging Bridge positive and negative tests PASS;
- workflow contract tests PASS;
- Quality Gate PASS;
- CodeQL PASS;
- Dependency Review PASS;
- CleanGuard PASS;
- Project Control Integrity PASS;
- Steel Shield reports `CRITICAL=0 HIGH=0`;
- evidence generation leaves repository clean;
- at least one real existing proof source is packaged into a valid capsule without fabricating any missing proof class;
- if no target can be proven to be Staging, the Staging Bridge demonstrates `BLOCKED` rather than fabricating a STAGING PASS.

Even after these criteria pass, the outcome is `EVIDENCE_PLANE_GREEN`, not Production authorization.

## 12. Sovereign Locks Preserved

Throughout this sub-project:

- `MAIN = LOCKED`
- `PRODUCTION_DB = LOCKED`
- `PRODUCTION_DEPLOYMENT = LOCKED`
- `L4 = DISABLED`
- `STAGING_KILL_SWITCH = TRUE`
- `MERGE_AUTHORIZATION = SEPARATE_OWNER_GATE`
- `PRODUCTION_DB_PROMOTION_AUTHORIZATION = SEPARATE_OWNER_GATE`
- `PRODUCTION_ACTIVATION_AUTHORIZATION = SEPARATE_OWNER_GATE`

The Evidence Plane can prove technical facts. It cannot convert those facts into sovereign authorization.