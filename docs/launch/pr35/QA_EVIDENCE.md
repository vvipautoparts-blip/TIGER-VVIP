# PR35 Final QA Evidence

Evidence date: 2026-07-14 UTC
Baseline: `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`
Branch: `feat/pr35-owner-control-tiger-care-foundation`
Fresh verification completed: `2026-07-14T19:07:55Z`

This is executable local evidence only. It does not claim production deployment,
remote persistence, SQL application, email delivery, or manual browser and
assistive-technology validation.

## Fresh focused results

| Gate | Exact command | Exit |
|---|---|---:|
| Shell syntax | `bash -n scripts/qa-pr35-owner-control-tiger-care.sh scripts/qa-smoke.sh` | 0 |
| JavaScript syntax | `for file in scripts/pr35/*.js scripts/vvip-pr30-resilience.js; do node --check "$file" || exit $?; done` | 0 |
| All PR35 unit tests | `node --test tests/pr35/*.test.mjs` | 0 |
| Authorization and delegation | `node --test tests/pr35/policy-scope.test.mjs tests/pr35/assignment-repository.test.mjs` | 0 |
| Tiger Care state machine, routing, SLA, and IDOR | `node --test tests/pr35/tiger-care.test.mjs tests/pr35/routing-sla.test.mjs` | 0 |
| Audit immutability | `node --test tests/pr35/audit.test.mjs` | 0 |
| XSS and prototype pollution | `node --test tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs` | 0 |
| Weak network and offline policy | `node --test tests/pr35/drafts-network.test.mjs tests/pr35/production-boundary.test.mjs` | 0 |
| Accessibility and RTL | `node --test tests/pr35/ui-behavior.test.mjs` | 0 |
| Aggregate PR35 QA | `bash scripts/qa-pr35-owner-control-tiger-care.sh` | 0 |
| Historical smoke | `bash scripts/qa-smoke.sh` | 0 |
| Whitespace | `git diff --check` | 0 |
| Changed-file/manifest | `actual=$(mktemp /tmp/pr35-actual.XXXXXX); { git diff --name-only HEAD; git ls-files --others --exclude-standard; } \| sort -u \| grep -v '^AGENTS.override.md$' > "$actual"; diff -u docs/launch/pr35/CHANGED_FILES.allowlist "$actual"; diff -u docs/launch/pr35/CHANGED_FILES.final "$actual"; test "$(wc -l < "$actual")" -eq 58` | 0 |
| Protected paths | `grep -Ei '^(supabase\|migrations\|database\|schema\|rls\|storage)/\|(^\|/)migrations/' "$actual"` with any match treated as failure | 0 |
| Four-review resolution | four review files checked non-empty; Round 4 log entry and named Round 2–4 regressions checked with `test` and `grep -q` | 0 |
| Secrets and remote mutation | implementation/QA scan for private-key or secret assignments, Supabase/Clerk mutation commands, and PR35 runtime remote endpoints, with any match treated as failure | 0 |

The complete unit invocation reported 10 test files passed, 0 failed, 0
cancelled, 0 skipped, and 0 todo. Focused invocations separately exercised the
security-critical domains rather than inferring their result from the aggregate.

## Repository boundary gates

The exact changed-file check compares the sorted union of
`git diff --name-only HEAD` and `git ls-files --others --exclude-standard`, with
the temporary owner-provided `AGENTS.override.md` excluded, to both
`CHANGED_FILES.allowlist` and `CHANGED_FILES.final`. The protected-path check
rejects changes under `supabase/`, `migrations/`, `database/`, `schema/`,
`rls/`, and `storage/`. The secrets and remote-mutation guard scans the PR35
runtime and QA surfaces for service-role/private-key material and mutation or
deployment command patterns. Each final command and exit code is repeated in
`FINAL_REPORT.md` after post-documentation verification.

The final boundary run completed at `2026-07-14T19:07:55Z` and produced:
changed-file/manifest count 58, exit 0;
protected-path exit 0; secrets/remote-mutation exit 0; four-review resolution
exit 0; and `git diff --check` exit 0.

## Evidence interpretation

- Authorization tests cover default deny, active assignment windows, scope
  ancestry, cross-scope denial, owner-only owner control, no self-elevation,
  permission/delegation ceilings, and privileged offline denial.
- Tiger Care tests cover validated categories/priorities/statuses, deterministic
  transitions, requester isolation, internal-note projection, cancellation,
  routing, escalation, and SLA calculation.
- Security tests cover append-only hash-chained audits, required reasons,
  sensitive metadata rejection, bounded untrusted text, HTML/event-handler URL
  rejection, unsafe keys, and prototype-pollution attempts.
- Weak-network tests cover timeouts, cancellation, bounded retry/backoff with
  jitter, idempotency/deduplication, session-only user queues, terminal sent
  entries, and no privileged offline queue.
- Source-contract accessibility checks cover Arabic-first RTL, English LTR
  readiness, focus restoration, dialog/menu semantics, live status, 44px
  targets, reduced motion, and responsive layout. Manual screen-reader/device
  testing remains a known limitation.

## Copilot five-finding closure verification

Verified at: 2026-07-14T21:32:32Z

- `node --test tests/pr35/ui-behavior.test.mjs` — PASS after confirmed RED phase.
- `node --test tests/pr35/drafts-network.test.mjs` — PASS.
- `node --test tests/pr35/*.test.mjs` — PASS.
- `bash "$ROOT/projected-pr35-qa.sh" "$(pwd -P)" "$EXPECTED_BASE" "$RUN_ID" "$RUN_DIR"` — PASS.
- `bash scripts/qa-smoke.sh` — PASS.
- `git diff --check` — PASS.
- Production SQL applied: NO.
- Remote Supabase changed: NO.
- Clerk changed: NO.
