# VVIP TIGER Continuity Checkpoint on Current Stack — Design

## Status

Approved continuity architecture carried forward from the existing continuity protocol. This slice does not redesign product behavior; it rebases durable project-state continuity onto the current verified execution cursor without rewinding the active stack.

## Problem

The approved continuity protocol exists in PR #173, but that PR is a sidecar based on PR #172. Subsequent verified work advanced through IDENTITY-01, COST-03, and COST-04, so the state recorded in PR #173 is stale as an execution cursor even though its continuity rules remain valid.

A new chat/session must not select the stale sidecar as the product source branch and must not restart work from an older PR.

## Goal

Create a documentation/governance checkpoint directly above PR #178 that:

1. preserves GitHub/repository state as implementation truth;
2. installs `docs/MASTER_PROJECT_STATE.md` on the current stack;
3. teaches `AGENTS.md` to read and maintain that state;
4. records PR #178 exact-head evidence and dependency chain;
5. marks old PR #173 as a valid-but-stale cursor sidecar rather than deleting history;
6. keeps all merge, Production, remote migration, provider, financial, and owner/L4 gates locked.

## Source precedence

`repository bytes/refs -> exact-head CI/security evidence -> current PR/commit metadata -> MASTER_PROJECT_STATE -> historical chat/prose`

## Startup contract

Every future broad session follows:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

The session must resolve the checkpoint ref, current active product PR, exact head SHA, and current checks from GitHub before modifying files.

## State semantics

Allowed state labels:

- `APPROVED`
- `IMPLEMENTED`
- `VERIFIED`
- `IN_PROGRESS`
- `BLOCKED`
- `DEFERRED`
- `STALE`

`IMPLEMENTED` never implies `VERIFIED`; `DEFERRED` never implies complete.

## Active cursor recorded by this checkpoint

- current product cursor: PR #178
- source branch: `feat/lean-global-cover-media-budget-20260808`
- exact source SHA: `81402daf4e093a3b4c728d191bded0b3582b697a`
- exact observed pull-request checks: VVIP Quality Gate `31277399213` PASS and Project Control Integrity `31277399214` PASS
- immediate base: PR #177 at `765fccc7acebfc930d49f7dddcc9e1e838e1224e`
- repository-level identity remediation anchor: PR #174 at `c218bf6f63d4db9f898947405c10bb6d9d5e91b3`

## Mutation boundary

This checkpoint may modify documentation, AGENTS guidance, and CI routing needed to obtain exact-head verification for the documentation branch.

It must not modify:

- application runtime behavior;
- SQL migrations;
- Supabase remote state;
- Production DB/Edge;
- provider configuration or credentials;
- billing or purchases;
- protected merge/production/owner decisions.

## Verification

The checkpoint is `IMPLEMENTED / VERIFICATION_PENDING` until the exact final head receives the repository checks that GitHub actually runs. Only then may the checkpoint itself be called `VERIFIED`.

## Handoff rule

When a later implementation materially advances the active cursor, update `docs/MASTER_PROJECT_STATE.md` again on the new line. Never use a new chat boundary as a reason to rebuild verified work.