# PR36 autonomous review round 4 — final independent scope and regression

Date: 2026-07-15 (UTC)

Baseline: `3611bfd0183398e639e50b761d92aeddf367ee4a`

Branch: `feat/pr36-secure-seven-photo-processing`

## Verdict

**FAIL — automated/static scope passes, but release and commit readiness are withheld.**

Every required automated command in this review was freshly observed at exit `0`. The complete baseline-to-working-tree diff, approved design/plan/decisions, manifest/freeze, earlier autonomous reviews, all 52 frozen named Node contracts, both PR36 QA entry points, and historical smoke were reviewed. Three Important whole-branch findings are corrected and no unresolved Critical or Important product-code finding remains.

The binding source of truth also requires recorded interactive browser/DevTools smoke before a final PASS and commit. `MANUAL_BROWSER_EVIDENCE.md` truthfully remains `NOT RUN`; therefore this review does not claim release PASS, browser/device behavior, or commit readiness. No commit was created.

## Findings, root cause, exact fix, and regression evidence

| ID | Severity | Finding and root cause | Exact fix | Regression evidence |
|---|---|---|---|---|
| R4-F-01 | Important | Worker `decode_failed` and `encode_failed` replies entered the compatibility fallback. The fallback classification treated processing failures like worker capability/runtime failures, automatically repeating expensive decode/encode work and violating transparent no-retry semantics. | Added both codes to the worker adapter's non-fallback set. Only capability/runtime failure can use the one current-job main-thread fallback; validation, security, processing, cancellation, and stale failures preserve their original code without retry. | Frozen `worker-adapter.test.mjs` requires both codes to reject with zero main-thread calls. Fresh 52-contract suite and both full PR36 gates exited `0`. |
| R4-F-02 | Important | Controller mount called the external change hook during its initial empty render. PR31 consequently marked an untouched new shell dirty, creating a false unsaved-change state. | Made render notification explicit and invoked the initial render with notification disabled. User mutations and explicit resets continue to notify. | Frozen `controller-accessibility.test.mjs` requires zero callbacks after mount. Fresh suite and both full gates exited `0`. |
| R4-F-03 | Important | Empty-photo guidance promised that photos could be added when real upload was enabled. The inherited PR31 copy implied a future production action outside PR36's local-only, no-upload/no-publish boundary. | Replaced it with calm Arabic-first copy stating that the draft can continue without photos and that nothing is uploaded or published in this phase. | Frozen `integration.test.mjs` rejects the stale promise and requires the honest boundary copy. Fresh suite, both full gates, and historical smoke exited `0`. |

No additional systemic defect was validated in the final independent read. No cosmetic-only change was made.

## Requirement and delegation audit

- The frozen suite contains exactly 52 named contracts across eight executable test files; `tests/pr36` was not modified, deleted, weakened, skipped, or rewritten during this review. Node reports the eight files as top-level test entries; source enumeration accounts for the 52 named contracts.
- `index.html` and `private-profile-p03.html` each load the PR36 stylesheet once and the eight page-side modules once in dependency order: signature, policy, geometry, canvas adapter, worker adapter, scheduler, session, controller. `pr36-media-worker.js` is intentionally instantiated only as a Worker and is not duplicated as a page script.
- PR31 delegates byte/blob/URL ownership to PR36 and reads only the projected snapshot. PR32 accepts at most seven exact derivative metadata records, derives count from the accepted records, sanitizes IDs/alt text, rejects duplicate IDs, PNG/non-derivative MIME, invalid ratio/dimensions/size, and discards legacy name/count and attacker-shaped extra fields by reconstruction. PR33 consumes a count clamped to `0..7`. PR34 remains unchanged and metadata-only.
- Publish count is derived from accepted metadata and cannot exceed seven. There is no upload, publish, retry-on-validation, or production persistence path in the PR36 media runtime.
- The two PR36 QA scripts do not carry duplicate guard implementations: `qa-pr36-secure-photo-processing.sh` is a three-line strict delegating compatibility entry point to the canonical seven-photo gate. Both entry points were nevertheless executed independently as requested.

## Exact scope and production-boundary evidence

The fresh baseline/manifest/freeze audit observed:

```text
current 49 allowed 49 freeze 49
extra []
missing []
manifest_freeze_delta []
freeze_sorted_unique True
deletions []
forbidden_boundary_paths []
manifest_deletions []
```

The complete diff contains no SQL, Supabase, Clerk mutation, service role, migration, package, lockfile, workflow, backup, deployment, or other production-boundary path. There is no tracked deletion. Suspect, historical, backup, migration, and uncertain artifacts remain preserved. No network, remote, privileged, upload, publish, payment, or video capability was added to the media runtime.

## Fresh regression evidence

| UTC interval | Command | Observed result |
|---|---|---|
| 07:46:26–07:46:27 | `node --test tests/pr36/*.test.mjs` | exit `0`; 8 executable files, 8 pass, 0 fail/cancel/skip/todo; exactly 52 named contracts in the frozen sources. |
| 07:46:27–07:46:31 | `bash scripts/qa-pr36-secure-seven-photo-processing.sh` | exit `0`; PR36 syntax/contracts/privacy/scope plus PR33, PR34, PR35 Node/syntax, historical smoke, and whitespace passed; terminal line `[pr36] full gate passed`. |
| 07:46:31–07:46:35 | `bash scripts/qa-pr36-secure-photo-processing.sh` | exit `0`; delegated full gate independently reran the same required coverage; terminal line `[pr36] full gate passed`. |
| 07:46:35–07:46:36 | `bash scripts/qa-smoke.sh` | exit `0`; historical PR29–PR35 checks passed; terminal line `[smoke][pass] PR29 legacy eradication checks succeeded`. |
| 07:46:36 | `git diff --check` | exit `0`; no output. |

Before the full run, both QA guard self-tests were also freshly executed through their respective entry points and each exited `0` after observing the forbidden `fetch` fixture.

## Amanah, justice, privacy, accessibility, and failure semantics

Errors retain stable non-sensitive codes and calm Arabic-first copy; raw exceptions, filenames, object URLs, bytes, credentials, or identities are not projected into draft metadata or change events. Cancellation, stale results, validation failures, decode/encode failures, and timeouts fail closed without automatic retry. Automated contracts cover RTL ordering, keyboard operations, Escape/focus restoration, live regions, 44 px targets, reduced motion, 320 px layout rules, bounded local metadata, concurrency two, deadlines, and URL cleanup.

These are code/test observations, not claims about every browser, decoder, assistive technology, device-memory profile, or poor network. No universal performance claim is made.

## Residual risk, rollback, and commit readiness

Residual release risk is the unobserved real-browser boundary: real JPEG/PNG/WebP decode and encoding, hostile/limit fixtures, worker startup/fallback, offline operation, DevTools network/storage inspection, object-URL balance, timeouts, 320 px rendering, RTL keyboard/focus, screen-reader announcements, and pagehide cleanup have not been interactively observed. This is material because injected Node/static contracts cannot prove browser primitive behavior.

Rollback is path-bounded: revert only the 49 paths in `CHANGED_FILES.freeze` to baseline `3611bfd0183398e639e50b761d92aeddf367ee4a`; do not delete tracked historical files and do not touch remote or production state.

Commit readiness: **NOT READY** until the required manual-browser checklist is executed and recorded with browser/version and honest DevTools observations, followed by another exact-scope and full zero-exit regression run. This review performed no commit, push, PR, merge, deployment, or remote action.

`VVIP_ETHICS_PRIVACY_PERFORMANCE_GATE: FAIL (AUTOMATED/STATIC PASS; REQUIRED MANUAL BROWSER EVIDENCE NOT RUN)`


## Scope-order resume V7 — final independent verification

Timestamp: `20260715T092452Z`

- Architecture and integration review: PASS.
- Security and privacy review: PASS.
- Independent policy and geometry audit: PASS.
- Performance and accessibility review: PASS.
- Complete PR36 Node suite: PASS.
- Canonical PR36 QA: PASS.
- Extended PR36 QA: PASS.
- Historical smoke: PASS.
- Frozen PR36 tests remained unchanged.
- Automatic merge remained disabled.

Result: **PASS**
