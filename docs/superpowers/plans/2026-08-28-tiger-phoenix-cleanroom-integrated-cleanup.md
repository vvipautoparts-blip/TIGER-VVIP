# TIGER PHOENIX CLEANROOM 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the single owner-approved cleanup-governance system that safely unifies repository housekeeping and environment/storage reclamation under Proof-of-Reclamation while preserving TIGER AION ∞ as the mandatory destructive-disposal gate.

**Architecture:** PHOENIX observes and content-addresses all accessible cleanup planes, classifies candidates, proves reclaim eligibility, and issues a trusted observation-bound Shadow Plan. Actual destructive storage/object disposal is delegated to the existing AION Digital Metabolism chain; afterward PHOENIX independently re-inventories state, detects collateral deletion, issues a Cleanup Passport, and reports any inaccessible remote plane as `BLOCKED_CAPABILITY` rather than claiming success.

**Tech Stack:** Node.js ESM/CommonJS tests, Bash, Git, Docker/BuildKit CLI, Supabase CLI, GitHub API/connector-compatible adapters, JSON/Markdown governance artifacts.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-phoenix-cleanroom-integrated-cleanup-design.md`

## Global Constraints

- Canonical authority: `docs/owner-control/TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md`.
- `NO PROOF OF RECLAMATION -> NO ENTRY TO DESTRUCTIVE DISPOSAL`.
- `NO AION DELETION CHAIN -> NO DESTRUCTIVE DISPOSAL`.
- Reuse `project-control/aion/metabolism.mjs`; do not create a second destructive authorization/deletion engine.
- Never auto-dispose `S0_SOVEREIGN`, protected `S1_EVIDENCE`, security-sensitive material, protected release identity/provenance, or `S4_STATEFUL_LOCAL`.
- `S2_REBUILDABLE` requires a regeneration proof before becoming reclaim-eligible.
- Generic cleanup does not authorize Production mutation, remote DB deletion, Git-history rewrite, credential/security remediation, or deletion of unique PR commits.
- A `FULL_SCOPE_SAFE` result cannot be GREEN while a declared plane is unobserved; inaccessible planes are `BLOCKED_CAPABILITY`.
- Destructive implementation slices use TDD RED -> GREEN and independent post-clean verification.
- Persistent/local/Codespace heavy operations require byte + inode headroom preflight.

---

### Task 1: Authority continuity and complete machine policy

**Files:**
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Modify: `project-control/owner/TIGER_PHOENIX_CLEANROOM_2026_OWNER_DECISION.json`
- Create: `project-control/cleanup/phoenix-cleanroom-policy.v1.json`
- Create: `scripts/cleanup/phoenix-policy.mjs`
- Test: `tests/phoenix-cleanroom-policy.test.cjs`

**Interfaces:**
- `loadCleanupPolicy(path: string): CleanupPolicy`
- `classifyCandidate(candidate: CleanupCandidate, policy: CleanupPolicy): ClassificationDecision`
- Classification is exactly one of `S0_SOVEREIGN`, `S1_EVIDENCE`, `S2_REBUILDABLE`, `S3_EPHEMERAL`, `S4_STATEFUL_LOCAL`.

- [ ] **Step 1: Write RED policy/continuity tests**

Require the owner router and master state to reference PHOENIX as `cleanup-governance CURRENT_ONLY`, AION as the non-superseded destructive gate, and all machine hard locks. Require unknown candidates to lock rather than default to ephemeral.

- [ ] **Step 2: Run RED**

Run: `node --test tests/phoenix-cleanroom-policy.test.cjs`

Expected: FAIL until runtime policy/classifier exists and continuity assertions match.

- [ ] **Step 3: Implement strict loader/classifier**

The loader rejects unknown schema keys, missing hard-lock classes, missing AION binding, duplicate rules, or policy digests that do not match the owner-decision input selected by the caller.

- [ ] **Step 4: Run GREEN + repository quality gate**

Run:
`node --test tests/phoenix-cleanroom-policy.test.cjs`
`bash scripts/quality-gate.sh`

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): bind cleanup policy to owner continuity`

---

### Task 2: Complete read-only observer and content-addressed before manifest

**Files:**
- Create: `scripts/cleanup/phoenix-observer.sh`
- Create: `scripts/cleanup/phoenix-observer.mjs`
- Create: `scripts/cleanup/phoenix-manifest.mjs`
- Test: `tests/phoenix-cleanroom-observer.test.cjs`
- Test: `tests/phoenix-cleanroom-manifest.test.cjs`

**Interfaces:**
- `observeLocalPlanes(options): Observation`
- `buildManifest(observation, policyIdentity): ContentAddressedManifest`
- Manifest contains `schema_version`, `environment_identity`, `observed_at`, `objects[]`, `protected_namespaces[]`, `plane_coverage[]`, and `manifest_digest`.

- [ ] **Step 1: Write RED observer fixtures**

Cover bytes, inodes, Git refs/status, file/directory identities, Docker images/containers/volumes, BuildKit availability, Supabase-local presence, missing tools, malformed command output, and unavailable remote-plane markers.

- [ ] **Step 2: Write RED manifest integrity tests**

Require deterministic canonical ordering and SHA-256 digest drift when any object ID/path/digest/metadata/protected namespace changes.

- [ ] **Step 3: Implement read-only collection and canonical manifest**

Shell collection is read-only: no prune, stop, rm, Supabase destructive flags or Git mutation. Missing required observations are represented explicitly.

- [ ] **Step 4: Run focused GREEN + quality gate**

Run both test files then `bash scripts/quality-gate.sh`.

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): add content-addressed cleanup observation`

---

### Task 3: Deterministic Proof-of-Reclamation engine

**Files:**
- Create: `scripts/cleanup/proof-of-reclamation.mjs`
- Test: `tests/proof-of-reclamation.test.cjs`

**Interfaces:**
- `proveReclamation({candidate, classification, observationDigest, dependencies, regeneration, retention, policyDigest}): PoRDecision`
- Decision states: `RECLAIM_ELIGIBLE`, `MANUAL_REVIEW_REQUIRED`, `RETENTION_HOLD`, `STATEFUL_LOCK`, `SOVEREIGN_LOCK`, `SECURITY_LOCK`, `INSUFFICIENT_EVIDENCE`.

- [ ] **Step 1: Write RED cases for every state**

Mandatory cases: S0 lock; S4 lock; protected S1 lock/hold; security-sensitive lock; protected release identity lock; S2 without recipe blocked; S2 with exact declared recipe and no protected dependency eligible; safe S3 eligible; observation/policy digest missing blocked.

- [ ] **Step 2: Run RED**

Run: `node --test tests/proof-of-reclamation.test.cjs`

- [ ] **Step 3: Implement deterministic PoR**

AI-derived metadata may explain a decision but cannot change the decision state. `RECLAIM_ELIGIBLE` must carry `requires_aion_disposal_gate: true` for destructive targets.

- [ ] **Step 4: Run GREEN + quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): enforce proof-of-reclamation eligibility`

---

### Task 4: Trusted observation-bound Shadow Plan capsule

**Files:**
- Create: `scripts/cleanup/phoenix-shadow-plan.mjs`
- Test: `tests/phoenix-shadow-plan.test.cjs`

**Interfaces:**
- `createShadowPlan(trustedContext, manifest, porDecisions, now): ShadowPlanView`
- `consumeShadowTarget(trustedPlanContext, currentObservation, targetId, now): TrustedTargetLease`
- Serialized `ShadowPlanView` is evidence only; only branded in-process `trustedPlanContext` can produce a target lease.

- [ ] **Step 1: Write RED trust tests**

Reject JSON-cloned plan context, stale plan, different manifest digest, changed policy/owner-decision digest, wildcard target, unitemized target, target ID/digest replacement, and target disappearance/reappearance under the same path.

- [ ] **Step 2: Run RED**

Run: `node --test tests/phoenix-shadow-plan.test.cjs`

- [ ] **Step 3: Implement trusted context/canonical Shadow Plan**

Bind exact observation digest, source/environment, policy/owner decision digests, exact target IDs/digests, bounded freshness, PoR digest, expected effect, protected exclusions and recovery/regeneration refs.

- [ ] **Step 4: Re-observation test**

Prove that replacing a file/container/image between observation and consumption returns `TARGET_DRIFT_BLOCKED` and never yields a target lease.

- [ ] **Step 5: Run GREEN + quality gate and commit**

Commit: `feat(cleanroom): bind shadow plan to exact observation`

---

### Task 5: AION Digital Metabolism disposal adapter — no parallel delete path

**Files:**
- Create: `scripts/cleanup/phoenix-aion-disposal.mjs`
- Modify only if a compatibility bug is proven: `project-control/aion/metabolism.mjs`
- Test: `tests/phoenix-aion-disposal.test.cjs`
- Test: `tests/phoenix-delete-bypass-sentinel.test.cjs`

**Interfaces:**
- Consumes: `TrustedTargetLease` + approved AION authorization/recovery evidence.
- Produces: AION lifecycle ledger + `TIGER-AION-DISPOSAL-CERTIFICATE-1` reference.

- [ ] **Step 1: Write RED integration tests against the existing AION API**

Require exact stage order `DETECT, CLASSIFY, EXPLAIN, APPROVE, QUARANTINE, REHEARSE, VERIFY, DELETE, SEAL`, valid approval, and `rollback_plan_ref` at rehearsal.

- [ ] **Step 2: Write RED bypass sentinel**

Scan PHOENIX production scripts for direct destructive primitives. Allow only narrowly reviewed low-level adapter locations and prove those locations require a trusted target lease plus AION lifecycle evidence. Generic `--volumes` sweeps and wildcard deletes fail the test.

- [ ] **Step 3: Implement adapter by reusing `createLifecycleLedger`, `recordLifecycleStage`, and `issueDisposalCertificate`**

Do not duplicate AION stage/approval logic in PHOENIX.

- [ ] **Step 4: Run GREEN + existing AION tests + quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): route destructive disposal through AION`

---

### Task 6: Independent after-manifest verifier and Cleanup Passport

**Files:**
- Create: `scripts/cleanup/phoenix-verify.mjs`
- Create: `scripts/cleanup/phoenix-passport.mjs`
- Test: `tests/phoenix-cleanup-passport.test.cjs`

**Interfaces:**
- `verifyCleanup(beforeManifest, targetSet, afterManifest, aionCertificates): VerificationResult`
- `createCleanupPassport(input): TIGER_CLEANUP_PASSPORT_V1`

- [ ] **Step 1: Write RED collateral-deletion fixtures**

Create a fixture where the intended target disappears but a sibling protected object also disappears. Verification must return `FAILED_VERIFICATION` even if reclaimed bytes improve.

- [ ] **Step 2: Write RED coverage tests**

A full-scope passport with any declared plane `UNAVAILABLE`/`BLOCKED_CAPABILITY` cannot report `GREEN_FULL_SCOPE`; it reports `PARTIAL` or `BLOCKED` with the plane listed.

- [ ] **Step 3: Implement independent before/after diff**

Do not infer actual deletions from the executor log. Compute them from manifests and compare with the trusted target set.

- [ ] **Step 4: Implement passport fields**

Include before/after manifest roots, Shadow Plan evidence digest, PoR root, AION certificate refs, coverage map, before/after bytes/inodes, intended/actual objects, protected locks, unexpected deletion count and final status.

- [ ] **Step 5: Run GREEN + quality gate and commit**

Commit: `feat(cleanroom): independently verify cleanup results`

---

### Task 7: Preventive byte/inode headroom gate for heavy operations

**Files:**
- Create: `project-control/cleanup/storage-pressure-policy.v1.json`
- Create: `scripts/cleanup/phoenix-headroom.mjs`
- Create: `scripts/cleanup/phoenix-headroom.sh`
- Create: `scripts/cleanup/phoenix-heavy-entrypoints.mjs`
- Modify: `scripts/quality-gate.sh`
- Modify: only inventoried persistent/local Supabase/Docker/database rehearsal/build entrypoints that can materially grow disk usage.
- Test: `tests/phoenix-headroom.test.cjs`
- Test: `tests/phoenix-heavy-entrypoints.test.cjs`

**Interfaces:**
- `evaluateHeadroom({freeBytes,totalBytes,inodesFree,inodesTotal,operationClass}, policy): HeadroomDecision`
- States: `HEADROOM_GREEN`, `HEADROOM_CLEAN_FIRST`, `HEADROOM_BLOCK_HEAVY_OPERATION`.

- [ ] **Step 1: Inventory heavy entrypoints from repository scripts/workflows**

Create a machine-readable discovered list; classify hosted-ephemeral versus persistent/local execution.

- [ ] **Step 2: Write RED threshold tests**

Require minimum absolute/percentage free-space reserve, inode reserve, and per-operation headroom. Policy values are configurable and not hard-coded owner business constants.

- [ ] **Step 3: Write RED guard-coverage test**

Every inventoried persistent/local heavy entrypoint must call the shared preflight or have an explicit reviewed exemption record.

- [ ] **Step 4: Implement preflight and integrate smallest required call sites**

Preflight runs before heavyweight state creation and emits the exact reason/capacity measurements on block.

- [ ] **Step 5: Run GREEN + quality gate and commit**

Commit: `feat(cleanroom): block heavy work under unsafe storage pressure`

---

### Task 8: Codespace reproducibility and hidden-state checks

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `scripts/cleanup/phoenix-hidden-state-check.sh`
- Test: `tests/phoenix-devcontainer-contract.test.cjs`

**Interfaces:**
- Lean declared toolchain only; no Production credentials or hidden owner state.

- [ ] **Step 1: Inventory required runtimes/tools from current source and workflows**

- [ ] **Step 2: Write RED devcontainer/hidden-state contract**

Require pinned/declared runtimes and reject embedded credentials, opaque large generated content, or claims that a Codespace is disposable while unbacked critical state is detected.

- [ ] **Step 3: Implement minimal devcontainer and read-only hidden-state report**

- [ ] **Step 4: Rebuild in isolated environment and run repository gates**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): make Codespace environment reproducible`

---

### Task 9: Authenticated remote-plane adapters

**Files:**
- Create: `scripts/cleanup/remote/github-actions-artifacts.mjs`
- Create: `scripts/cleanup/remote/github-actions-cache.mjs`
- Create: `scripts/cleanup/remote/github-codespaces.mjs`
- Create: `scripts/cleanup/remote/github-prebuilds.mjs`
- Create: `scripts/cleanup/remote/capability.mjs`
- Test: `tests/phoenix-remote-planes.test.cjs`

**Interfaces:**
- Every adapter supports `capability()`, `observe()`, and—only when the authenticated environment exposes a safe supported mutation—`disposeWithAionEvidence()`.
- Capability states: `READ_WRITE`, `READ_ONLY`, `UNAVAILABLE`, `BLOCKED_CAPABILITY`.

- [ ] **Step 1: Write RED adapter/capability fixtures**

Cover live-object inventory IDs, pagination, unavailable API action, read-only connector, retention metadata, and mutation unavailable.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement adapters without shelling out to untrusted URLs**

Workflow YAML retention is configuration evidence only; it must not masquerade as live artifact/cache inventory.

- [ ] **Step 4: Prove a full-safe run cannot silently skip a remote plane**

With a missing Codespaces action, result must explicitly contain `codespaces: BLOCKED_CAPABILITY` and full completion must be false.

- [ ] **Step 5: Run GREEN + quality gate and commit**

Commit: `feat(cleanroom): observe remote cleanup planes fail closed`

---

### Task 10: Actions retention and repository/PR/branch governance integration

**Files:**
- Modify: `.github/workflows/*.yml` only where exact inventory shows retention improvement is needed.
- Create: `tests/phoenix-actions-retention.test.cjs`
- Create: `tests/phoenix-pr-cleanup-policy.test.cjs`

**Interfaces:**
- Evidence-aware retention and PR cleanup policy feed the common classification/PoR engine.

- [ ] **Step 1: Inventory all artifact uploads, retention values, cache configuration and current PR cleanup carriers**

- [ ] **Step 2: Write RED retention/unique-work tests**

Age alone cannot close a PR or delete a branch. A PR closure must cite ancestry, explicit successor, current retirement authority, or proven semantic replacement with no unique work loss.

- [ ] **Step 3: Make only evidence-supported workflow retention changes**

Do not alter release semantics, secret boundaries, Production authorization or artifact identity merely to save storage.

- [ ] **Step 4: Run exact-head repository gates**

- [ ] **Step 5: Commit**

Commit: `chore(cleanroom): govern retention and repository cleanup`

---

### Task 11: Integrated owner cleanup orchestrator

**Files:**
- Create: `scripts/cleanup/tiger-cleanup.mjs`
- Test: `tests/tiger-cleanup-integrated.test.cjs`

**Interfaces:**
- `tiger-cleanup --mode full-safe` orchestrates observe -> manifest -> classify -> PoR -> trusted shadow -> AION disposal -> re-observe -> verify -> passport -> report.
- Scoped modes reuse the identical safety pipeline.

- [ ] **Step 1: Write RED full-safe integration test**

Require every declared plane to appear in coverage, all protected locks to survive, all destructive targets to carry AION disposal evidence, and inaccessible remote planes to prevent full-green status.

- [ ] **Step 2: Write RED idempotence test**

Second execution over a clean fixture must be a safe no-op except for fresh observation/passport identity.

- [ ] **Step 3: Implement orchestration only**

The orchestrator contains no second classifier, no hidden delete allowlist, no AION approval logic and no direct destructive primitive.

- [ ] **Step 4: Run integration GREEN + full quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): integrate owner full-safe cleanup lifecycle`

---

### Task 12: Final exact-head verification and promotion review

**Files:**
- Update only evidence/status documentation required by repository governance after the exact final implementation head is known.

- [ ] **Step 1: Run all PHOENIX focused tests on the exact final head**

- [ ] **Step 2: Run existing AION metabolism tests and the destructive-bypass sentinel on the same head**

- [ ] **Step 3: Run complete required CI/security gates on that exact SHA**

- [ ] **Step 4: Perform isolated rehearsal**

Use protected fake state plus a deliberately replaceable target and collateral sibling. Confirm target-drift blocking, `UNEXPECTED_DELETIONS=0`, hard-lock preservation and AION certificate production for permitted disposal.

- [ ] **Step 5: Perform capability rehearsal**

Simulate at least one unavailable remote plane and prove the passport becomes `PARTIAL/BLOCKED`, never full GREEN.

- [ ] **Step 6: Review owner continuity and Cleanup Passport**

Confirm no Production/remote-state claim and PHOENIX/AION domains remain non-competing.

- [ ] **Step 7: Request independent write-access review and only then consider merge**

No Production activation, remote state deletion, credential/security remediation or broad volume cleanup is implied by merge readiness.
