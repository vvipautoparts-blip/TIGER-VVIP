# PR35 Integration Preliminary Evidence

Status: preliminary only; no final PASS claim
UTC timestamp: `2026-07-14T18:57:58Z`
Baseline HEAD: `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`

## Fresh commands

- `node --test tests/pr35/drafts-network.test.mjs tests/pr35/ui-behavior.test.mjs`: exit `0`; focused Round 4 queue-replay and delayed-Clerk regressions passed.
- `bash scripts/qa-pr35-owner-control-tiger-care.sh`: exit `0`; categorized contracts/hostile input, authorization abuse/scopes, Tiger Care/IDOR, audit/logging, accessibility/RTL/reduced-motion, weak-network/offline, syntax, review-only SQL boundary, historical smoke, exact allowlist, and whitespace checks completed at the timestamp above.
- The aggregate gate's nested `bash scripts/qa-smoke.sh` invocation exited `0`; historical PR29–PR33 protections completed, including retired-file, route, logging, and database-scope checks.
- After the evidence, manifest, resolution log, and final report were reconciled, `bash scripts/qa-pr35-owner-control-tiger-care.sh && test "$(git rev-parse HEAD)" = c71ecbddd00d91f5ee5414e86e74cbbbdb168d84 && git diff --check` exited `0`; completion was observed at `2026-07-14T18:58:46Z` and confirmed the unchanged baseline HEAD.

## Corrections made during integration

- Audit metadata now rejects common sensitive-field name variants, including access/refresh tokens, API keys, session identifiers, and cookies.
- Requester cancellation now follows owner isolation and is allowed only before staff acknowledgment; cross-user attempts fail as not found.
- The aggregate QA script includes regression samples proving the narrow smoke correction still rejects unauthorized documentation, migration SQL, and non-allowlisted review SQL paths.
- Production identity-dependent mounting now waits for bounded Clerk initialization; the Owner Control document declares the existing Clerk runtime before PR35 bootstrap.
- Successful session-queue entries are terminal and remain observable without being resent on later flush cycles.

These are observations from the uncommitted worktree. They do not represent final approval, production verification, browser-device QA, remote enforcement, SQL application, or post-merge verification.
