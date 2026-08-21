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

## Owner-Approved Remaining Work Allocation — 2026-08-21

The owner approved the following coordination model for the remaining Convergence + Integration + Release work.

### Gemini — Primary Implementation Lane

Gemini is the primary code implementer for the remaining Social convergence slices. Work must stay isolated and reviewable; do not merge to `main` or Production.

Assigned implementation order:

1. Repost/Share + private Save/Bookmark semantics. Start from the current PR #301 / current integration truth, not stale PR text.
2. Profile timeline + safe public profile/author projection. Reconcile current PR #307 RED contract before implementation.
3. Follow/Unfollow + Mute/Snooze + Feed Preferences.
4. People/Post Search & Discovery.
5. Account/session/recovery/deactivation/deleted-user Social states.
6. Complete user-facing block/report/privacy controls after the underlying security contracts are verified.
7. Integrate already evidence-closed Messaging and Notifications into the current Social integration line without importing stale subsystems.
8. Integrate Gate 5 resilience/network behavior into the same integration line.
9. Integrate the canonical Social Media bridge into the same integration line.

For every slice Gemini must report:
- BASE SHA
- RESULT HEAD SHA
- exact files changed
- tests added/changed
- targeted test results
- broader regression results
- relevant CI/workflow results
- migrations/RLS/security changes, if any
- unresolved P0/P1/P2
- conflicts with PR #271 or newer authority
- SAFE FOR REVIEW: YES/NO

Do not start a later slice by silently overwriting unresolved RED/P0 work from an earlier slice. Prefer separate small PRs or clearly isolated commits until ChatGPT review accepts convergence.

### DeepSeek — Independent Architecture + Security Adversarial Review

DeepSeek remains independent from the primary implementation lane. It should not duplicate Gemini's implementation by default. Its job is to challenge every submitted slice before integration and to identify architectural/security regressions that normal tests may miss.

Mandatory review focus over the remaining work:

- Repost/Save privacy ceiling and authorization invariants.
- Profile/public projection, Clerk subject leakage, deleted/deactivated user tombstones, linkability and enumeration.
- Block/report/privacy enforcement across Feed, Comments, Media, Messaging, Realtime and Notifications.
- Messaging/Notifications integration correctness against Gate 3 / Gate 4 exact evidence.
- Gate 5 retry/offline/idempotency/cursor behavior and stale-state risks.
- Social Media canonicalization, private access, cache/service-worker residue and attachment authorization.
- Search/discovery visibility leakage and blocked/private/deactivated-user filtering.
- account/session/recovery state transitions and fail-closed behavior.
- cross-PR stale-code import, duplicated implementations and authority contradictions.

DeepSeek must return, per review:
- reviewed SHA(s)
- P0/P1/P2 findings
- exact file/symbol/test evidence
- exploit/regression scenario where applicable
- required recheck/fix
- SAFE TO INTEGRATE: YES/NO

DeepSeek must not mark a Gemini result GREEN solely because Gemini's report says PASS.

### ChatGPT — Integration Auditor + Final Release Gate Coordinator

ChatGPT does not race the implementation agents on the same code. ChatGPT starts audit as soon as each Gemini/DeepSeek report is available and independently verifies the repository evidence.

ChatGPT owns final coordination of:

10. Exact-SHA isolated HTTPS Preview + Staging evidence review. A Preview is not accepted without exact source binding, isolated staging backend, synthetic/non-production data and live HTTPS provider evidence.
11. Full post-convergence CI/security/rehearsal run on one final exact SHA. Required evidence must be tied to the same source; inherited GREEN from different heads is not sufficient.
12. Owner Passport / Candidate Ring readiness decision. Only after unresolved P0=0 and P1=0, required exact-SHA evidence is GREEN, and external provider/staging evidence is complete may ChatGPT recommend an owner merge/Production decision.

ChatGPT audit checklist for every incoming report:
- verify branch and exact SHA exist remotely;
- compare base/head and changed files;
- inspect patches for out-of-scope changes;
- verify tests actually exercise the claimed behavior;
- verify CI belongs to the claimed exact source where required;
- check migrations/RLS/grants/security-definer boundaries;
- detect duplicated/stale implementations across stacked PRs;
- confirm no `main`, Production, secrets, provider or real-money mutation occurred without owner authority;
- reject narrative PASS claims that lack reproducible evidence.

### Dependency / Collision Rules

- One primary writer per code area at a time.
- DeepSeek reviews first; it does not independently rewrite the same slice unless the owner separately authorizes a repair assignment.
- Messaging/Notifications integration must preserve Gate 3/Gate 4 invariants rather than reimplementing them from scratch.
- Media integration must preserve Gate 2 canonical server-side trust boundaries.
- Gate 5 integration must preserve durable server authority and idempotency; local/offline state cannot become security or financial authority.
- Preview/Release work waits for convergence evidence and does not bypass unresolved P0/P1.
- No agent may merge to `main`, deploy Production, mutate remote Production DB/provider state, weaken tests/security, or perform destructive Git operations under this allocation.

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
