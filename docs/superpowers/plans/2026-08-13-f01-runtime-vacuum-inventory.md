# F01 Runtime Vacuum Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. No destructive deletion is authorized in F01.

**Goal:** Build a deterministic repository scanner that inventories runtime-relevant paths, classifies them as ACTIVE, MIGRATION_BRIDGE, TEST_ONLY, HISTORICAL_DOC, ORPHANED, or DELETE_CANDIDATE, and blocks unclassified runtime paths before F02/F15 cleanup work.

**Architecture:** F01 is inventory/evidence only. A small policy file defines runtime candidate roots/extensions and protected patterns. A Node 22 scanner walks the repository locally/CI, assigns classification plus reason/evidence state, and emits a deterministic report. Tests fail on unclassified runtime paths, unsafe automatic deletion, or classification of retained FUSION foundations as delete candidates.

**Tech Stack:** Node 22 built-ins, JSON policy, node:test, existing Quality Gate/CodeQL/CleanGuard.

## Global Constraints
- No file deletion in F01.
- No Production mutation, DB apply, deployment, money movement, or country activation.
- Preserve SOA, RLS, release security, financial ledger, country gates, audit, recovery, PR36 resource safety, Strangler architecture.
- Runtime pages from the legacy multi-page shell default to MIGRATION_BRIDGE until F02/F03 replacement evidence exists.
- DELETE_CANDIDATE never means approved deletion; F15 requires dependency/reference scan, reachability evidence, test coverage, bundle comparison, and rollback evidence.
- FUSION owner requirements traceability remains authoritative.

### Task 1 — Runtime policy and RED contract
**Create:** `config/fusion/runtime-vacuum-policy.json`, `tests/f01-runtime-vacuum-inventory.test.cjs`
- Test exact allowed classifications.
- Test scanner module must exist.
- Test known final/current entrypoints cannot be DELETE_CANDIDATE.
- Test legacy role-specific HTML is MIGRATION_BRIDGE when present.
- Test no runtime candidate is UNCLASSIFIED_RUNTIME.

### Task 2 — Deterministic inventory scanner
**Create:** `scripts/fusion/runtime-vacuum-inventory.cjs`
- Walk repository with fs/readdirSync only; no network/env secrets/writes.
- Ignore `.git` and dependency/build caches.
- Identify runtime candidates: top-level `.html/.js/.css`, service worker/manifest, `assets/**`, `public/**`, `supabase/functions/**`.
- Classify top-level non-index HTML as MIGRATION_BRIDGE unless policy explicitly protects it as ACTIVE.
- Classify PR36/media runtime as ACTIVE/protected.
- Never auto-assign ORPHANED from filename alone.
- Assign DELETE_CANDIDATE only for explicit policy patterns and include `requiresEvidence=true`.
- Export `buildRuntimeInventory(root, policy)` and `classifyRuntimePath(path, policy)`.

### Task 3 — Inventory evidence document
**Create:** `docs/fusion/F01_RUNTIME_VACUUM_INVENTORY.md`
- Explain categories and deletion gate.
- Record that F01 produces inventory only and F15 performs approved removals.
- List current high-risk bridge families: separate owner/admin surfaces, obsolete previews/demos, duplicate CSS/JS only after evidence.

### Task 4 — Verification
- Run `node --test tests/f01-runtime-vacuum-inventory.test.cjs`.
- Run existing repository Quality Gate.
- Exact-head CI: Quality Gate, V14, CodeQL, CleanGuard, Dependency Review, Project Control Integrity.
- Review diff: inventory/policy/test/docs only; no deletion or runtime mutation.
