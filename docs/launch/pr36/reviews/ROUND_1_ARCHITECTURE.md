# PR36 Autonomous Review Round 1 — Architecture

Date: 2026-07-15 UTC
Baseline: `3611bfd0183398e639e50b761d92aeddf367ee4a`
Stage: `review_1_architecture`

## Verdict

**PASS — architecture/static/automated scope.** Fresh final verification observed zero exits for all PR36 tests, both PR36 QA entry points, and historical smoke. This verdict does not claim interactive browser, DevTools, screen-reader, or physical-device evidence.

## Scope and source reconciliation

The complete current diff (staged, unstaged, and untracked) was reviewed against `CHANGE_CONTROL_MANIFEST.json`, `CHANGED_FILES.freeze`, `DECISIONS.md`, the owner-approved design, implementation plan, PR31–PR35 current source, both canonical pages, all PR36 modules, frozen tests, QA scripts, and prior evidence.

The resulting ownership boundary is singular:

- PR31 owns listing-shell navigation, form state, and calls into PR36 through one controller reference.
- PR36 session state is the only live photo authority. It owns Files during validation, provisional and committed derivatives, object URLs, crop generations, order, cover, cancellation, and disposal.
- PR32 owns sanitized display-metadata persistence only. It cannot persist or restore photo bytes, URLs, Files, Blobs, workers, canvases, or processing state.
- PR33 consumes a count clamped to `0..7`; it does not own photo state.
- PR34 remains unchanged and metadata-only.

Both canonical pages load dependencies in the required order: signature → policy → geometry → canvas adapter → worker adapter → scheduler → session → controller → PR32 → PR31 → PR33. Redirect/history pages remain untouched.

## Validated findings and fixes

### R1-A01 — Important — Escape crossed crop and shell state machines

**Finding:** The controller and PR31 both listen for `keydown` on `document`. When Escape cancelled an open crop editor, the event continued to PR31's listener, which could also request closure of the entire listing shell. One user action therefore drove two owners and violated transactional crop cancellation.

**Root cause:** The crop handler prevented the default browser action but did not stop later listeners on the same event target.

**Exact fix:** `pr36-controller.js` now calls `stopImmediatePropagation()` before cancelling the crop operation. Escape restores only the pre-operation photo snapshot and focus; PR31 remains open.

**Regression evidence:** A new permitted QA contract guard failed before the fix at `[pr36] crop state-machine and capability-failure contracts` (exit 1), then the focused gate exited 0 after the controller change. Frozen `tests/pr36` were not changed.

### R1-A02 — Important — failed confirmation left a false retry state

**Finding:** `confirmOperation()` failure correctly cancelled and disposed provisional session state, but the controller left the crop editor visible with its retired `editingId`. A second confirmation could appear successful against no provisional operation, obscuring the original failure.

**Root cause:** Session rollback and UI transition were split across owners without a terminal failure transition in the controller.

**Exact fix:** Confirmation failure now cancels the operation, closes the editor, clears the preview/edit identity, restores focus, renders the canonical committed snapshot, and preserves the stable Arabic error as an assertive alert.

**Regression evidence:** The same RED QA guard and subsequent focused exit 0 cover the terminal failure transition; session and controller frozen suites remain green.

### R1-A03 — Important — capability failure produced a blank photo step

**Finding:** Missing modules, unsupported browser primitives, or controller construction failure returned silently from PR31 mounting. The photo step then exposed an empty region with no explanation, although the approved contract requires safe disablement with continued text drafting and transparent failure semantics.

**Root cause:** The integration boundary treated `null` as absence rather than a user-visible capability state.

**Exact fix:** PR31 now renders a status message stating in Arabic that secure image processing is unavailable and the draft may continue without photos. Missing APIs, a null browser session, and construction exceptions converge on this same fail-closed state; no exception details or filenames are exposed.

**Regression evidence:** The permitted QA guard requires both the stable marker and exact calm Arabic copy. It failed before the fix and passed afterward. No network, persistence, retry, or privileged fallback was added.

### R1-A04 — Important documentation reconciliation — stale 16-byte header requirement

**Finding:** The owner-approved design and plan retained an early “16-byte” phrase, while the frozen policy test, runtime constant, worker, and security behavior use a bounded 256 KiB pre-decode header window. Sixteen bytes cannot support the approved JPEG frame-dimension scan or duplicate-frame ambiguity rejection.

**Root cause:** Planning text was not updated after the JPEG pre-decode validation contract was strengthened.

**Exact fix:** The design and plan now specify the 256 KiB bound and its purpose. `DECISIONS.md` records D18, explicitly superseding the stale phrase. Runtime and frozen tests were not rewritten.

**Regression evidence:** `policy-signature.test.mjs` freshly validates `maxHeaderBytes: 262144`, bounded reads, declared dimensions, and ambiguous JPEG rejection.

## Maintainability, rollback, and failure contracts

The fixes preserve module ownership: no PR36 resource logic moved into PR31, and PR32/PR33 gained no live-state authority. Failure states converge on stable error codes/calm Arabic UI, never on raw exceptions or automatic retry. Rollback remains path-local: revert only manifest/freeze paths; no historical or tracked file is deleted. No package, lockfile, workflow, SQL, migration, Supabase, Clerk, service-role, deployment, backup, commit, push, PR, or merge action occurred.

Amanah and justice are preserved through evidence-qualified claims and deterministic outcomes. Privacy remains local-only and metadata-bounded. Accessibility improves through an explicit status message, alert semantics on terminal crop failure, and correct focus restoration. The architecture continues to avoid duplicate authority and retains a reversible static-page integration.

## Verification evidence

Baseline before review changes:

- `node --test tests/pr36/*.test.mjs` — exit 0, 8/8 files passed.
- `bash scripts/qa-pr36-secure-photo-processing.sh` — exit 0.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0.
- `bash scripts/qa-smoke.sh` — exit 0.

RED/GREEN:

- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --focused` — RED exit 1 at the new architecture contract section before fixes.
- Same command after fixes — GREEN exit 0 with `[pr36] focused gate passed` and 8/8 frozen PR36 test files passing.

Fresh final gate:

- `node --test tests/pr36/*.test.mjs` — exit 0, 8 passed, 0 failed/skipped/cancelled.
- `bash scripts/qa-pr36-secure-photo-processing.sh` — exit 0, `[pr36] full gate passed`.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0, `[pr36] full gate passed`.
- `bash scripts/qa-smoke.sh` — exit 0, `[smoke][pass] PR29 legacy eradication checks succeeded`.
- `git diff --check` — exit 0 with no output.
- Manifest/freeze/current-path equality, no-deletion check, protected-root check, JSON validation, and frozen-test integrity checks — exit 0.

## Residual risk

Interactive browser/DevTools, real decoder variance, worker execution/fallback, screen-reader behavior, physical 320 px layout, and live object-URL accounting remain outside this automated round and are not claimed. Persisted PR32 photo metadata intentionally cannot restore photo bytes after a page/session reset; it is historical display metadata, not a second live photo authority.

`PR36_REVIEW_1_ARCHITECTURE: PASS`
