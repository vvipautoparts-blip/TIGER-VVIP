# PR36 autonomous review round 3 — performance, weak-device, offline and accessibility

Date: 2026-07-15 (UTC)

Scope base: merge-base `3611bfd0183398e639e50b761d92aeddf367ee4a`

Branch reviewed: `feat/pr36-secure-seven-photo-processing`

## Verdict

**AUTOMATED PASS AFTER CORRECTION; INTERACTIVE BROWSER/ASSISTIVE-TECHNOLOGY REVIEW NOT RUN.**

Seven Important defects were reproduced and fixed across the complete current diff. No Critical defect was found, and no open Critical or Important defect remains in the automated/static scope. A supported interactive browser, screen reader, and physical weak/mobile device were not available in this environment, so this report does not claim observed visual crop feel, real accessibility-tree announcements, decoder memory measurements, or physical touch behavior.

No commit, push, PR creation, merge, deployment, network request, secret access, tracked deletion, historical deletion, backup deletion, or uncertain-file deletion was performed.

## Findings and corrections

| ID | Severity | Pre-fix defect and evidence | Correction | Regression evidence |
|---|---|---|---|---|
| R3-PA-01 | Important | Source validation and image processing shared the same two-worker loop. With two valid slow files followed by an invalid third file, both processing slots blocked before the invalid file was inspected; validation feedback reached the test's 25 ms failure boundary instead of returning the stable validation code. | `select()` now completes bounded local source validation for the whole selection before starting any decode/encode work. On validation failure, collected source/header references are cleared and processing count remains zero. | `session.test.mjs`: `all validation feedback completes before any image processing starts`. RED was the 25 ms `validation_not_immediate` boundary with two processors already entered; GREEN returns `mime_not_allowed` with processor count `0`. |
| R3-PA-02 | Important | `cancelOperation()` only marked queued entries. If both slots were active, a matching queued promise remained pending until unrelated active work settled. A caller requesting cancellation therefore did not receive prompt deterministic settlement. | Matching queued entries are removed and rejected immediately with `cancelled`; matching active entries are aborted; disposal retains the same bounded cleanup path. The configured concurrency is clamped to the hard ceiling of two. | `scheduler.test.mjs`: prompt queued cancellation while two unrelated slots are occupied; configured concurrency `99` still observes maximum `2`; active worker cancellation coverage remains green. The pre-fix queued-cancel regression stalled until the test command was terminated. |
| R3-PA-03 | Important | The scheduler's 120-second deadline began at controller construction. A user could browse for more than two minutes before opening the photo step and then receive an immediate session timeout, even though photo work had not begun. | Every scheduled job now carries the actual photo-session start time from the media session. Idle page time is excluded, while every job in the same photo session retains the same non-extendable 120-second origin and 20-second per-photo deadline. | `scheduler.test.mjs`: exact injected-clock boundaries and `idle page time does not consume the later photo-processing session`. The idle regression failed before the scheduler change and passed after it. |
| R3-PA-04 | Important | The crop editor was exposed as `aria-modal="true"` and explicitly wrapped Tab focus, trapping the application even though the photo step is an optional part of a browsable page. Every cover/reorder/remove action also destroyed and recreated every photo node. | The editor is a labelled non-modal group; Tab follows document order; Escape/cancel closes and restores origin focus. List rendering retains keyed photo nodes and applies one ordered DOM batch. Cover state exposes `aria-pressed`; status/errors switch deterministically between polite `status` and assertive `alert`. Closing clears the exact 250 ms timer and preview source. | `controller-accessibility.test.mjs`: no modal/Tab trap, keyed node reuse, labelled 4:3 crop preview, Arabic/RTL controls, keyboard actions, 44 px targets, reduced motion, and 320 px mobile rule. The controller contract was RED before correction because modal/Tab-trap source remained. |
| R3-PA-05 | Important | A scheduler deadline only called `AbortController.abort()`. If a browser primitive ignored abort or never settled, the public job promise also never settled. A focused fake-clock reproduction advanced exactly 20,000 ms and observed `STILL_PENDING`, defeating both the per-photo deadline and transparent timeout semantics. Queued work behind two such jobs also had no independent session-deadline timer. | The scheduler now rejects the public promise with `processing_timeout` or `session_timeout` at the exact deadline, aborts the underlying job, ignores late settlement, and gives every queued entry an independent timer tied to the same non-extendable session origin. The two active slots remain reserved until underlying work actually settles, so replacement work cannot exceed concurrency two. Cancellation/disposal likewise reject callers promptly while aborting underlying work. | The identical untracked fake-clock reproduction now prints `processing_timeout`. Frozen `scheduler.test.mjs` remains green, including FIFO, hard concurrency ceiling two, queued/running cancellation, exact deadlines, zero timer cleanup, and idle-page origin. |
| R3-PA-06 | Important | Controller lifecycle and edit-event paths were not symmetric: `input` and `change` listeners on the crop group survived `dispose()`, a release/change flush did not clear its pending 250 ms input timer, and confirm could race that timer. Cover, remove, button reorder, and `Alt+Arrow` reorder updated the visual list without a specific live-region announcement. | Disposal now removes every listener it adds. Release/change and confirm clear the pending timer before one immediate local edit, and stale/cancelled preview races do not overwrite a newer success with an assertive error. Each list mutation emits calm Arabic status text through the existing polite live region. The approved non-modal group, normal Tab order, Escape cancellation, and focus restoration remain unchanged. | Frozen controller/integration tests pass; syntax passes. Source review verifies paired listener add/remove operations, one timer owner, polite mutation announcements, RTL logical ordering, and no new modal/focus behavior. |
| R3-PA-07 | Important | Browser capability gating accepted a partial `URL` object and deferred failure until image processing. Main-thread processing also created and serialized a new WebP probe canvas for every derivative/edit and did not explicitly release that probe canvas, adding repeat CPU/allocation cost on weak devices. | Session creation now fails gracefully unless both object-URL methods and `AbortController` exist. WebP support is probed once per browser session, cached, and the probe canvas is reset to `0×0` in `finally`. This adds no network, persistence, retry, or invented connectivity behavior. | Frozen integration and canvas tests pass. Runtime forbidden-capability guards find no media network/storage API; syntax and both aggregate PR36 QA scripts pass. |

## Performance-boundary evidence

- Queue concurrency has a hard runtime ceiling of **2**, including when an injected caller requests `99`. FIFO behavior and maximum active count are observed by `scheduler.test.mjs`; selection processing independently observes maximum `2` in `session.test.mjs`.
- Crop input debounce is exactly **250 ms** in the immutable policy and controller timer. It is cleared on replacement, cancel/close, and disposal.
- Per-photo timeout is exactly **20,000 ms**. The injected clock advances to `20,000` and observes `processing_timeout`.
- A photo session is exactly **120,000 ms**, uses one non-extendable start time for running and queued jobs, and is not consumed by idle browsing before the photo step. At the session boundary a new or still-queued job observes `session_timeout`.
- Validation completes before decode/encode begins. The regression's invalid third file returns with processing count `0`, even when the would-be processors never settle.
- Cancellation removes and rejects queued work immediately, aborts active work through `AbortSignal`, terminates worker processing, suppresses late worker results, clears controller debounce, and revokes provisional URLs. Main-thread browser primitives that cannot be synchronously interrupted are checked at each boundary and their late result cannot become observable.
- Operation number plus per-photo revision checks prevent cancelled, duplicate, or stale results from replacing newer state. Confirmation starts a fresh operation generation and the stale-preview regression observes no late orphan URL.
- List updates reuse keyed `<li>`/image/control nodes and perform one ordered `replaceChildren(...ordered)` batch instead of rebuilding all descendants. Crop input processing is debounced rather than rendered on every input event.
- Object URLs are revoked on replacement, cancel, remove, reset, failed/successful confirmation, pagehide, and disposal. Decoded bitmaps close and output/probe canvases clear in `finally`; workers terminate on settle/abort; validated source/header references clear on validation failure. WebP capability probing occurs once per session. No universal JavaScript heap or decoder-memory number is claimed without a real browser profiler.

## Offline and failure behavior

- Complete PR36 runtime searches and the focused forbidden-capability guard found no `fetch`, XHR, WebSocket, beacon, online/offline dependency, Supabase, Clerk, upload, or other network operation in the media path. Decode, crop, encode, ordering, cover selection, removal, cancellation, and metadata projection are local browser operations.
- Worker code is loaded as a same-origin static script; capability absence uses the local main-thread adapter. A single compatibility fallback is allowed only for a transient worker runtime/capability failure. Validation, security, scope, cancellation, and test failures are never retried.
- Offline processing does not imply fast processing on every device. The UI promises only local processing and gives bounded, calm Arabic timeout/capability messages. This review makes no promise that disconnected or poor networking becomes fast, because networking is not part of image processing.
- Failure is fail-closed and user-safe: validation leaves committed photos unchanged; processing/timeout/capability errors use stable codes and generic Arabic copy; raw errors, filenames, image bytes, identity, secrets, tokens, and object URLs are not rendered, logged, or persisted.

## Accessibility, RTL, touch and application-flow review

- Keyboard users have native focusable controls for crop sliders/buttons, cover selection, before/after reorder, edit, remove, confirm, and cancel. `Alt+ArrowLeft/Right` reorders a focused photo; Escape cancels the crop; focus returns to the invoking input/button.
- The crop controls no longer claim modality and do not intercept Tab. The application remains browsable; the photo step does not block the page or create an application focus trap.
- The selected-order list is labelled; crop preview and every control have calm Arabic labels; cover state is exposed with `aria-pressed`; normal progress is polite and errors are assertive. DOM order and Arabic `dir="rtl"` remain coherent.
- Cover, removal, button reorder, and `Alt+Arrow` reorder changes now produce specific Arabic live-region announcements. Stale/cancelled preview work cannot replace a newer success announcement with an error.
- CSS preserves visible focus, reduced-motion behavior, exact 4:3 previews, 44×44 px minimum targets, bounded width/overflow, and a two-column layout at 320 px. These are automated/static contract observations, not a claim of physical-device visual approval.

## RED/GREEN and commands actually observed

Final fresh gate run from the report-bearing worktree:

- `node --test tests/pr36/*.test.mjs` — exit 0; 8 passed, 0 failed, 0 skipped, duration 1,893.902 ms.
- `bash scripts/qa-pr36-secure-photo-processing.sh` — exit 0; PR36 8/8, PR34 1/1, PR35 10/10, embedded historical smoke, syntax/privacy/scope/whitespace gates passed; terminal line `[pr36] full gate passed`.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0; PR36 8/8, PR34 1/1, PR35 10/10, embedded historical smoke, syntax/privacy/scope/whitespace gates passed; terminal line `[pr36] full gate passed`.
- `bash scripts/qa-smoke.sh` — exit 0; terminal line `[smoke][pass] PR29 legacy eradication checks succeeded`.

- Baseline `node --test tests/pr36/*.test.mjs` — exit 0; 8/8 test files passed before new regressions.
- Baseline `bash scripts/qa-pr36-secure-photo-processing.sh` — exit 0; terminal line `[pr36] full gate passed`.
- Baseline `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0; terminal line `[pr36] full gate passed`.
- Baseline `bash scripts/qa-smoke.sh` — exit 0; terminal line `[smoke][pass] PR29 legacy eradication checks succeeded`.
- RED `node --test tests/pr36/scheduler.test.mjs tests/pr36/session.test.mjs tests/pr36/controller-accessibility.test.mjs` — controller failed on the modal/Tab contract; queued cancellation left the command pending until terminated; the validation race reached its 25 ms failure boundary.
- RED `node --test tests/pr36/scheduler.test.mjs` after adding the idle-page clock case — exit 1 before the deadline-origin correction.
- RED untracked fake-clock deadline reproduction against a never-settling job — exit 0 as a diagnostic, observed result `STILL_PENDING` instead of `processing_timeout`.
- GREEN identical fake-clock deadline reproduction — exit 0, observed result `processing_timeout`.
- GREEN `node --test tests/pr36/scheduler.test.mjs tests/pr36/session.test.mjs tests/pr36/controller-accessibility.test.mjs` — exit 0; 3/3 files passed.
- Post-fix focused `node --test tests/pr36/scheduler.test.mjs tests/pr36/controller-accessibility.test.mjs tests/pr36/integration.test.mjs` — exit 0; 3/3 files passed, 0 failures.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --self-test-guard` — exit 0; synthetic forbidden capability was detected; terminal line `[pr36] forbidden guard self-test passed`.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --focused` — exit 0; focused Node, syntax, privacy/local-only capability, JSON, manifest/freeze and scope guards passed; terminal line `[pr36] focused gate passed`.
- `bash scripts/qa-pr33-accessibility.sh` — exit 0; existing accessibility regression passed.
- `bash scripts/qa-smoke.sh` — exit 0; repository smoke and embedded PR33 accessibility passed; terminal line `[smoke][pass] PR29 legacy eradication checks succeeded`.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0; PR36 focused checks, PR33 accessibility, PR34 gate, 10/10 PR35 files, JavaScript syntax, full smoke and whitespace checks passed; terminal line `[pr36] full gate passed`.
- `git diff --check` — exit 0 with no output.
- Targeted searches for networking/connectivity APIs, modal/Tab traps, deadline constants, debounce, concurrency, memory ownership, and object-URL lifecycle were inspected. PR36 networking/connectivity matches were absent; deadline/debounce/concurrency matches were limited to the fixed policy/runtime/tests documented above.

## Artifact and ethics audit

- No suspected artifact was deleted. The classifications and preservation decisions in `../STALE_ARTIFACT_AUDIT.md` remain unchanged. Existing round placeholders, historical PR34/PR35 evidence, backups, migrations, SQL, redirect shims, and uncertain legacy files remain preserved for owner review.
- Amanah: the automated PASS is limited to commands and source boundaries actually observed; interactive/browser/device claims are explicitly withheld.
- Justice: validation, cancellation, timeout, stale-result, capability, and failure outcomes use deterministic stable codes; exceptions and retries remain bounded.
- Ihsan: Arabic status/error text is calm, useful, local-processing-specific, and does not promise speed the implementation cannot guarantee.
- Privacy: source images, filenames, private identity, credentials, tokens, secrets, raw exceptions, and object URLs do not cross persistence/network/logging boundaries.
- Auditability: root causes, corrections, RED/GREEN evidence, commands, results, limitations, and artifact preservation are recorded here. All working-tree changes remain uncommitted as requested.

`VVIP_ETHICS_PRIVACY_PERFORMANCE_GATE: PASS (AUTOMATED/STATIC SCOPE; INTERACTIVE REVIEW NOT RUN)`
