# TIGER PHOENIX CLEANROOM 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the single owner-approved cleanup system that safely unifies repository housekeeping and environment/storage reclamation under Proof-of-Reclamation.

**Architecture:** A read-only observer inventories cleanup planes; a deterministic classifier and Proof-of-Reclamation engine decide what may be reclaimed; a shadow planner previews the exact target set; a reclaimer executes only approved actions; a verifier and Cleanup Passport prove what changed and what remained protected. Owner authority and protected classes fail closed.

**Tech Stack:** Bash, Node.js/CommonJS tests, Git, Docker/BuildKit CLI, Supabase CLI where present, GitHub Actions configuration, JSON/Markdown owner-control artifacts.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-phoenix-cleanroom-integrated-cleanup-design.md`

## Global Constraints

- Canonical authority: `docs/owner-control/TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md`.
- `NO PROOF OF RECLAMATION -> NO AUTOMATIC DELETION`.
- Never auto-delete `S0_SOVEREIGN` or `S4_STATEFUL_LOCAL`.
- Never auto-delete protected `S1_EVIDENCE` before its retention/authority requirements are satisfied.
- `S2_REBUILDABLE` requires a regeneration proof before automatic reclaim.
- Generic cleanup does not authorize Production mutation, remote DB deletion, Git-history rewrite, credential rotation, or deletion of unique PR commits.
- Every destructive implementation slice must be TDD RED -> GREEN and must have post-clean verification.

---

### Task 1: Machine-readable cleanup policy and classification contract

**Files:**
- Create: `project-control/cleanup/phoenix-cleanroom-policy.v1.json`
- Create: `scripts/cleanup/phoenix-policy.mjs`
- Test: `tests/phoenix-cleanroom-policy.test.cjs`

**Interfaces:**
- Produces: `loadCleanupPolicy(path)` and `classifyCandidate(candidate, policy)`.
- Decision classes: `S0_SOVEREIGN`, `S1_EVIDENCE`, `S2_REBUILDABLE`, `S3_EPHEMERAL`, `S4_STATEFUL_LOCAL`.

- [ ] **Step 1: Write failing policy tests**

Test that owner authority, required migrations and Production configuration classify as `S0`; unknown Docker volumes classify `S4`; known caches classify `S2`/`S3`; unknown candidates fail closed.

- [ ] **Step 2: Run focused RED**

Run: `node --test tests/phoenix-cleanroom-policy.test.cjs`

Expected: FAIL because policy module does not exist.

- [ ] **Step 3: Implement policy loader/classifier**

Use strict JSON validation, exact allowlists/patterns and explicit reason codes. Unknown input returns a locked decision; it must never default to ephemeral.

- [ ] **Step 4: Run focused GREEN**

Run: `node --test tests/phoenix-cleanroom-policy.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run repository quality gate and commit**

Run: `bash scripts/quality-gate.sh`

Commit: `feat(cleanroom): add deterministic cleanup classification policy`

---

### Task 2: Read-only storage observer

**Files:**
- Create: `scripts/cleanup/phoenix-observer.sh`
- Create: `scripts/cleanup/phoenix-observer.mjs`
- Test: `tests/phoenix-cleanroom-observer.test.cjs`

**Interfaces:**
- Produces: normalized JSON containing filesystem bytes/inodes, Git state, Docker usage when available, common generated/cache directories and Supabase-local presence.
- Observer never deletes.

- [ ] **Step 1: Write RED tests using fixture command outputs**

Cover `df`, inode data, Docker unavailable, Docker available, and malformed command output. Missing tools must produce `UNAVAILABLE`, not a clean bill of health.

- [ ] **Step 2: Run RED**

Run: `node --test tests/phoenix-cleanroom-observer.test.cjs`

- [ ] **Step 3: Implement read-only collection**

Shell commands must be bounded/read-only. Do not invoke prune, stop, rm, Supabase destructive flags or Git mutation.

- [ ] **Step 4: Run GREEN and quality gate**

Run both focused test and `bash scripts/quality-gate.sh`.

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): add read-only storage observer`

---

### Task 3: Proof-of-Reclamation engine

**Files:**
- Create: `scripts/cleanup/proof-of-reclamation.mjs`
- Test: `tests/proof-of-reclamation.test.cjs`

**Interfaces:**
- Consumes: classified candidate + dependency evidence + regeneration evidence + retention state.
- Produces: `SAFE_AUTO_RECLAIM`, `SAFE_MANUAL_RECLAIM`, `RETENTION_HOLD`, `STATEFUL_LOCK`, `SOVEREIGN_LOCK`, or `INSUFFICIENT_EVIDENCE`.

- [ ] **Step 1: Write RED tests for every decision state**

Mandatory cases: S0 locked; S4 locked; S2 without regeneration proof blocked; S2 with declared recipe and no protected dependency allowed; protected S1 held; safe S3 allowed.

- [ ] **Step 2: Run RED**

Run: `node --test tests/proof-of-reclamation.test.cjs`

- [ ] **Step 3: Implement deterministic PoR**

No probabilistic/AI decision may authorize deletion. AI-derived metadata may be explanatory only.

- [ ] **Step 4: Run GREEN + full quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): enforce proof-of-reclamation`

---

### Task 4: Shadow cleanup planner

**Files:**
- Create: `scripts/cleanup/phoenix-shadow-plan.mjs`
- Test: `tests/phoenix-shadow-plan.test.cjs`

**Interfaces:**
- Consumes: observed candidates + PoR decisions.
- Produces: an ordered itemized plan with exact target identifiers, estimated bytes, risk, protected exclusions and regeneration notes.

- [ ] **Step 1: Add RED tests preventing broad unitemized deletion**

A plan containing a generic `--volumes` destructive sweep or an unclassified wildcard must be rejected.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement ordered safe plan generation**

Order: ephemeral residue -> package/tool caches -> stopped disposable containers -> bounded BuildKit cache -> unused rebuildable images -> separately proven repository governance cleanup.

- [ ] **Step 4: Run GREEN + quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): add shadow cleanup planning`

---

### Task 5: Safe reclaimer with dry-run default

**Files:**
- Create: `scripts/cleanup/phoenix-reclaim.sh`
- Create: `scripts/cleanup/phoenix-reclaim.mjs`
- Test: `tests/phoenix-reclaimer.test.cjs`

**Interfaces:**
- Consumes: signed/validated local shadow-plan data produced for the current observation.
- Produces: per-target action result; default mode is dry-run unless execution is explicitly selected by the calling cleanup workflow.

- [ ] **Step 1: Write RED tests**

Reject target drift, S0/S1-hold/S4 targets, wildcard destructive volume cleanup and plans from a different observation identity.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement minimal safe actions**

Start only with low-risk local filesystem residue and bounded Docker/BuildKit candidates. Stateful Supabase/volume destruction is not implemented in the generic reclaimer.

- [ ] **Step 4: Run GREEN and idempotence fixture**

Second execution over the same cleaned fixture must be a safe no-op.

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): add fail-closed safe reclaimer`

---

### Task 6: Cleanup verification and passport

**Files:**
- Create: `scripts/cleanup/phoenix-verify.mjs`
- Create: `scripts/cleanup/phoenix-passport.mjs`
- Test: `tests/phoenix-cleanup-passport.test.cjs`

**Interfaces:**
- Produces: `TIGER_CLEANUP_PASSPORT_V1` with before/after measurements, expected vs actual deletions, protected checks and final status.

- [ ] **Step 1: Write RED tests**

Passport must fail if protected fixtures changed or unexpected deletions are present.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement verifier/passport**

Result states: `GREEN`, `PARTIAL`, `BLOCKED`, `FAILED_VERIFICATION`. Never report GREEN if post-clean protected checks are unavailable.

- [ ] **Step 4: Run GREEN + quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): add cleanup verification passport`

---

### Task 7: Codespace reproducibility and hidden-state checks

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `scripts/cleanup/phoenix-hidden-state-check.sh`
- Test: `tests/phoenix-devcontainer-contract.test.cjs`

**Interfaces:**
- Provides: lean declared toolchain sufficient for normal TIGER development/rehearsal without embedding secrets.

- [ ] **Step 1: Inventory required tools from current workflows/scripts before writing the devcontainer contract**

Do not add large tooling merely because it existed manually in an old Codespace.

- [ ] **Step 2: Write RED contract**

Require a lean devcontainer and prohibit committed credentials/Production secrets.

- [ ] **Step 3: Implement minimal devcontainer and hidden-state check**

Hidden-state check reports critical uncommitted/unbacked state; it does not delete it.

- [ ] **Step 4: Verify rebuildability in an isolated environment and run quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): make development environment reproducible`

---

### Task 8: Actions retention and repository cleanup integration

**Files:**
- Modify: `.github/workflows/*.yml` only where retention evidence shows improvement is required.
- Create: `tests/phoenix-actions-retention.test.cjs`
- Create: `tests/phoenix-pr-cleanup-policy.test.cjs`

**Interfaces:**
- Actions artifacts are assigned evidence-aware retention.
- PR cleanup keeps the existing rule: age alone cannot retire unique work.

- [ ] **Step 1: Inventory all artifact uploads and cache use on the exact branch**

- [ ] **Step 2: Write RED tests for required retention bounds and PR unique-work preservation**

- [ ] **Step 3: Make the smallest workflow-policy changes needed**

Do not alter release semantics, secrets, Production authorization or artifact identity to save storage.

- [ ] **Step 4: Run exact-head repository gates**

- [ ] **Step 5: Commit**

Commit: `chore(cleanroom): govern evidence retention and cleanup integration`

---

### Task 9: Integrated owner cleanup command contract

**Files:**
- Create: `scripts/cleanup/tiger-cleanup.mjs`
- Test: `tests/tiger-cleanup-integrated.test.cjs`

**Interfaces:**
- `tiger-cleanup --mode full-safe` invokes observer -> classify -> PoR -> shadow -> optional reclaim -> verify -> passport.
- Scoped modes reuse the same safety pipeline; they do not bypass PoR.

- [ ] **Step 1: Write RED integration test**

Unscoped `full-safe` must inventory all locally accessible planes and preserve locks.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement orchestration only; keep component authority separated**

The orchestrator may not contain a second classifier or hidden delete allowlist.

- [ ] **Step 4: Run integration GREEN, idempotence and full quality gate**

- [ ] **Step 5: Commit**

Commit: `feat(cleanroom): integrate owner cleanup lifecycle`

---

### Task 10: Final exact-head verification and promotion review

**Files:**
- Update only evidence/status documentation required by existing repository governance after the exact final head is known.

- [ ] **Step 1: Run all PHOENIX focused tests on the exact final head**

- [ ] **Step 2: Run the complete existing required CI/security gates on the same SHA**

- [ ] **Step 3: Perform isolated safe-clean rehearsal with protected fake state and confirm `UNEXPECTED_DELETIONS=0`**

- [ ] **Step 4: Review generated Cleanup Passport and confirm no Production/remote-state claim**

- [ ] **Step 5: Request independent review and only then consider merge under existing main governance**

No Production activation, remote state deletion or broad volume cleanup is implied by merge readiness.
