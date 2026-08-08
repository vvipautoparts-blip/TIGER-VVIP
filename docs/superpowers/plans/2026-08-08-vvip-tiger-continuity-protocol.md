# VVIP TIGER Continuity Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make project continuity durable and repository-backed so a fresh chat can continue VVIP TIGER from the exact verified stopping point without rebuilding context from scratch.

**Architecture:** Keep current GitHub state as implementation authority, add a single human-readable `docs/MASTER_PROJECT_STATE.md` ledger, and add a small `AGENTS.md` continuity section that forces read/verify/checkpoint behavior. No runtime or production surface is modified.

**Tech Stack:** Markdown governance files, Git/GitHub refs and Pull Requests, existing VVIP Quality Gate / Project Control workflows.

## Global Constraints

- GitHub/repository state is the implementation source of truth.
- `docs/MASTER_PROJECT_STATE.md` is the project-state source of truth but never overrides newer repository/test evidence.
- Chat history is temporary context only.
- Required work sequence: `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`.
- Do not start from zero or rebuild verified work merely because a new chat is opened.
- Keep `main`, Production DB, Production Edge, provider configuration, production deployment, real charges, and protected owner/L4 decisions locked.
- The continuity PR remains Draft and unmerged.

---

### Task 1: Establish the current Master Project State

**Files:**
- Create: `docs/MASTER_PROJECT_STATE.md`

**Interfaces:**
- Consumes: current GitHub repository/PR/CI metadata.
- Produces: canonical human-readable continuation cursor for future sessions.

- [ ] **Step 1: Record repository identity and default-branch anchor**

Record repository `vvipautoparts-blip/TIGER-VVIP`, default branch `main`, and exact audited main SHA.

- [ ] **Step 2: Record active execution cursor**

Record the newest verified active workstream, branch, PR, exact head SHA, immediate dependency/base chain, and current CI evidence.

- [ ] **Step 3: Record approved architecture and hard boundaries**

Capture only decisions that materially constrain continuation, especially federated identity sovereignty and protected production/merge gates.

- [ ] **Step 4: Record status matrix and unresolved work**

Classify relevant items as `APPROVED`, `IMPLEMENTED`, `VERIFIED`, `IN_PROGRESS`, `BLOCKED`, `DEFERRED`, or `STALE`.

- [ ] **Step 5: Record exact stopping point and next safe action**

The next action must be narrow, non-production, and based on the latest verified repository evidence.

- [ ] **Step 6: Commit**

```bash
git add docs/MASTER_PROJECT_STATE.md
git commit -m "docs(continuity): add master project state"
```

### Task 2: Bind agent startup and handoff behavior

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `docs/MASTER_PROJECT_STATE.md` and existing repository rules.
- Produces: mandatory agent continuity behavior for future repository sessions.

- [ ] **Step 1: Add a focused Project Continuity Protocol section**

Require agents to read `docs/MASTER_PROJECT_STATE.md` before broad work, use repository/test evidence precedence, and never treat historical chat as stronger than current GitHub state.

- [ ] **Step 2: Add startup sequence and status vocabulary**

Require `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT` and the canonical status labels from the design.

- [ ] **Step 3: Add checkpoint rule**

Require updating the Master Project State whenever the execution cursor materially changes.

- [ ] **Step 4: Preserve existing identity/security guidance**

Do not weaken or replace the federated identity, RLS, secret, quality-gate, or production-boundary rules already present.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs(continuity): bind agent handoff protocol"
```

### Task 3: Verify exact continuity head and open a Draft PR

**Files:**
- Verify: `docs/superpowers/specs/2026-08-08-vvip-tiger-continuity-protocol-design.md`
- Verify: `docs/superpowers/plans/2026-08-08-vvip-tiger-continuity-protocol.md`
- Verify: `docs/MASTER_PROJECT_STATE.md`
- Verify: `AGENTS.md`

**Interfaces:**
- Consumes: exact continuity branch head.
- Produces: auditable Draft PR and CI evidence.

- [ ] **Step 1: Review the final diff for scope**

Expected scope is documentation/governance only. No runtime, migration, provider, production, or application behavior files may appear.

- [ ] **Step 2: Open Draft PR stacked on the current active identity branch**

Base: `docs/federated-identity-sovereignty-20260808`.

Head: `docs/vvip-tiger-continuity-protocol-20260808`.

- [ ] **Step 3: Observe repository checks on the exact final head**

Do not claim `VERIFIED` until the checks that GitHub actually runs for the exact continuity SHA complete successfully.

- [ ] **Step 4: Update the Master Project State checkpoint if CI changes the closure status**

Record exact evidence instead of narrative assumptions.

- [ ] **Step 5: Leave PR Draft + OPEN + UNMERGED**

No merge or production authority is granted by this continuity slice.
