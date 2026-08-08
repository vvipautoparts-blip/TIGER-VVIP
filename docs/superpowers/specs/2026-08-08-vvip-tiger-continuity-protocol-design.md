# VVIP TIGER Continuity Protocol Design

## Purpose

Prevent project continuity from depending on one long ChatGPT conversation. The repository must remain the durable authority for implementation truth while each chat is treated as a temporary work session.

## Approved operating model

VVIP TIGER uses three distinct continuity layers:

1. **GitHub / repository state — implementation source of truth.** Current files, refs, PRs, commits, checks, and test evidence override stale narrative.
2. **`docs/MASTER_PROJECT_STATE.md` — project-state source of truth.** It records the current verified cursor, dependency chain, statuses, hard boundaries, blockers, deferred work, and next safe action.
3. **Chat session — temporary work surface only.** A new chat must continue from repository truth and the Master Project State; it must not recreate the project from memory or start from zero.

## Precedence rule

When sources disagree, use this order:

1. current repository bytes and refs;
2. current exact-head CI/test/security evidence;
3. current PR/commit metadata;
4. `docs/MASTER_PROJECT_STATE.md`;
5. historical chat or prose.

No chat statement may override contradictory current repository evidence.

## Mandatory startup audit

Before any implementation mutation in a new work session:

1. identify repository and default branch;
2. resolve the active workstream, branch, PR, head SHA, and base/dependency chain;
3. inspect current CI/test/security status on the exact relevant SHA;
4. read `docs/MASTER_PROJECT_STATE.md`;
5. classify relevant work using the canonical states below;
6. determine the exact stopping point and next safe action;
7. only then modify files.

The required execution sequence is:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

## Canonical status vocabulary

Use only these state labels for continuity decisions:

- `APPROVED` — an architectural/business/security decision is accepted.
- `IMPLEMENTED` — repository code/docs implementing the item exist.
- `VERIFIED` — implementation has current evidence appropriate to the claim.
- `IN_PROGRESS` — active work exists but verification/closure is incomplete.
- `BLOCKED` — a required dependency, external proof, or protected gate is missing.
- `DEFERRED` — intentionally postponed; not equivalent to failure.
- `STALE` — prior evidence or narrative no longer binds the current source state.

`IMPLEMENTED` must never be presented as `VERIFIED` without evidence. `DEFERRED` must never be silently treated as complete.

## Master Project State contract

`docs/MASTER_PROJECT_STATE.md` must contain at least:

- repository and default branch;
- default-branch SHA at last audit;
- active execution cursor;
- active PR/branch/head/base chain;
- exact-head verification evidence;
- approved architecture and policy boundaries relevant to current work;
- implemented/verified/in-progress/blocked/deferred items;
- known conflicts or obsolete work;
- hard no-touch / protected boundaries;
- exact stopping point;
- next safe action;
- session checkpoint timestamp and evidence basis.

The document is a navigation and state ledger, not a substitute for Git history, CI logs, or code.

## Session checkpoint rule

Whenever a work session materially changes the current cursor, the Master Project State must be updated before the work is considered handed off. The checkpoint must reference exact branch/PR/SHA evidence where available.

A session may end with unresolved work, but unresolved work must be explicitly classified as `IN_PROGRESS`, `BLOCKED`, or `DEFERRED`.

## Safety boundaries

This protocol does not grant merge, production deployment, production database mutation, production edge-function mutation, provider-dashboard mutation, real charges, money movement, or sovereign L4 authority.

A general instruction to continue work without repeated confirmation authorizes ordinary repository continuation within existing project boundaries; it does not synthesize protected owner approvals where the repository requires an exact protected gate.

## Scope

This slice is documentation/governance only. It adds continuity guidance and a current project-state ledger. It does not alter application runtime, database schema, identity provider configuration, production infrastructure, or existing security policy semantics.

## Acceptance criteria

The continuity slice is acceptable when:

1. `docs/MASTER_PROJECT_STATE.md` exists and records the current verified project cursor;
2. `AGENTS.md` directs agents to read the Master Project State and follow the precedence/startup/checkpoint rules;
3. the protocol design and implementation plan are committed on an isolated documentation branch;
4. the resulting PR remains Draft and unmerged;
5. repository checks on the exact continuity head are observed before claiming the slice verified.
