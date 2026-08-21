# TIGER-VVIP Shared Agent Board

> Shared coordination surface for human owner + ChatGPT + repository agents + DeepSeek review.
>
> Target branch: `feat/tiger-gate6-exact-sha-staging-20260820`
>
> This file is a coordination artifact only. It does **not** authorize merge, push to `main`, destructive Git operations, architecture replacement, or test bypasses.

## Operating Rules

1. Evidence first: every important claim should cite a file, symbol, command, test, CI check, commit SHA, or PR.
2. `main` is read-only unless the owner explicitly authorizes a change.
3. No force-push, reset-hard, branch deletion, destructive cleanup, or hidden test bypass.
4. Do not mark work GREEN if a relevant blocking check is still failing.
5. Do not expose secrets, tokens, private keys, credentials, or environment values.
6. Keep fixes minimal and reviewable; avoid overlapping edits across agents unless coordinated here.

## Agent Roles

### Agent 1 — Verification + Repair

Responsibilities:
- Reproduce verified failures.
- Apply minimal fixes.
- Run targeted tests, then broader quality gates.
- Report exact files changed and validation evidence.

Status: `ACTIVE / UPDATE REQUIRED`

Latest evidence:
- Branch:
- HEAD SHA:
- Files changed:
- Tests run:
- Remaining failures:
- Quality Gate:

### Agent 2 — Git / PR Forensics + Regression Investigation

Responsibilities:
- Inspect branch history, PRs, commits, divergence, and missing work.
- Detect regressions, duplicated implementations, stale branches, and SHA mismatches.
- Investigate first; do not repair until authorized.

Status: `ACTIVE / INVESTIGATION`

Latest evidence:
- Branch:
- HEAD SHA:
- Important PRs:
- Missing/unmerged commits:
- Regressions found:
- Deployment/SHA risks:

### Agent 3 — DeepSeek Architecture + Risk Review

Responsibilities:
- Independent architecture review.
- Cross-check Agent 1 and Agent 2 conclusions.
- Review auth/security boundaries, frontend/API/state coupling, deployment integrity, cache risks, and social feature consistency.
- Analysis first; no code changes unless separately authorized by the owner.

Status: `READY FOR REVIEW`

DeepSeek should report:
- CURRENT BRANCH
- CURRENT SHA
- ARCHITECTURE SUMMARY
- P0 / P1 / P2 RISKS
- AUTH / SECURITY RISKS
- SOCIAL UI RISKS
- API / STATE RISKS
- DEPLOYMENT / CACHE RISKS
- TEST BLIND SPOTS
- CONTRADICTIONS FOUND
- AREAS AGENTS 1/2 SHOULD RECHECK
- RECOMMENDED PRIORITY ORDER
- SAFE TO PROCEED: YES / NO
- EVIDENCE: file / symbol / SHA / test / command

### ChatGPT — Coordinator / Reviewer

Responsibilities:
- Compare evidence from all agents.
- Resolve contradictory recommendations.
- Prevent duplicated or conflicting work.
- Convert findings into an ordered execution plan.
- Keep merge/release decisions gated by verified evidence and owner approval.

## Shared Current-State Template

Update this section when a new verified state is available.

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Working branch: `feat/tiger-gate6-exact-sha-staging-20260820`
- Verified HEAD SHA:
- Main SHA:
- Worktree status:
- Active PR(s):
- Blocking check(s):
- Deployment SHA:
- Quality Gate: `UNKNOWN`
- Ready for owner review: `NO`

## Findings Queue

| ID | Severity | Owner | Evidence | Finding | Recommended action | Status |
|---|---|---|---|---|---|---|
| F-001 | TBD | TBD | TBD | Awaiting first synchronized reports | Collect evidence | OPEN |

## Conflict Protocol

If two agents disagree:

1. Do not choose by confidence or wording.
2. Record both claims.
3. Compare the exact SHA, file, symbol, test, CI check, and runtime evidence.
4. Prefer reproducible repository evidence over narrative summaries.
5. Escalate architecture, destructive changes, data deletion, or release decisions to the owner.

## DeepSeek Handoff Prompt

Use this exact instruction when connecting DeepSeek to the repository context:

> You are Agent 3 for TIGER-VVIP. Read `AGENT-BOARD.md` first. Work only as an independent Architecture + Risk Review agent. Do not modify code in the first pass. Verify claims from repository evidence, identify P0/P1/P2 risks, architecture contradictions, auth/security issues, frontend/API/state regressions, deployment SHA mismatch, cache risks, and test blind spots. Return findings in the Agent 3 format defined in `AGENT-BOARD.md`. Do not mark anything GREEN without reproducible evidence. Do not touch `main`, merge, force-push, reset, delete branches/files, or bypass tests.

## Owner Gate

The following require explicit owner approval before execution:

- Merge to `main`
- Production deployment
- Force-push / history rewrite
- Destructive cleanup or deletion
- Architecture replacement
- Security-policy relaxation
- Test disabling / bypass
- Data migration with destructive impact
