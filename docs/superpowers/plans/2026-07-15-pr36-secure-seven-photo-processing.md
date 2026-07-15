# PR36 Secure Seven-Photo Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans task-by-task. Track every checkbox.

**Goal:** Add secure local seven-photo processing to the PR31 listing photo step.

**Architecture:** UMD modules isolate pure policy/geometry from injected decode, canvas, worker, scheduling, resource, and DOM adapters. PR31 receives bounded metadata; PR32 persists display metadata only; PR33 stays count-only; PR34 is unchanged.

**Tech Stack:** Plain JavaScript/HTML/CSS, Node built-in tests, Bash/Python QA; no dependency or package-manager change.

## Global constraints

Exactly enforce: seven photos; JPEG/PNG/WebP only; 15 MiB each; 60 MiB selection; 40,000,000 decoded pixels; minimum 320×240; exact 4:3; maximum 1600×1200; no upscale; WebP 0.82 then JPEG 0.86; concurrency 2; 20-second photo and 120-second session deadlines; 250 ms debounce. Abort and suppress stale results. Revoke every URL. Cancel leaves no operation resource/reference; success discards every original `File`. No upload, publish, network API, persistence of bytes/URLs, remote/privileged operation, video, package change, tracked deletion, or intermediate commit. Arabic-first RTL, keyboard/mobile accessible, offline-capable, fail closed.

## File map

Create `scripts/media/pr36-{policy,signature,geometry,canvas-adapter,worker-adapter,media-worker,scheduler,session,controller}.js`, `styles/vvip-pr36-media.css`, `tests/pr36/*.test.mjs`, `scripts/qa-pr36-secure-seven-photo-processing.sh`, and launch evidence listed in the manifest. Modify only PR31–PR33 scripts plus `index.html` and `private-profile-p03.html`. Do not modify the PR34 contract, service worker, package files, auth, Supabase, SQL, migrations, or PR35 runtime.

## Task 1 — Policy and hostile-input validation

**Files:** create `scripts/media/pr36-policy.js`, `scripts/media/pr36-signature.js`, `tests/pr36/fixtures.mjs`, `tests/pr36/policy-signature.test.mjs`.

**Interfaces:** `CONSTANTS`; `createMediaError(code)`; `validateSelection(files, existingCount)`; `detectSignature(bytes)`; `validateSource(file,{signal,readHeader})`; `projectMetadata(items,coverId)`.

- [ ] RED: tests accept only declared/signature-matching JPEG/PNG/WebP; reject spoofed SVG, GIF, HEIF, video, short/unknown headers, >15 MiB, >60 MiB, >7, and abort. Assert projection keys exactly `imageId,position,altText,mimeType,width,height,sizeBytes` and no filename/URL/bytes.
- [ ] Run `node --test tests/pr36/policy-signature.test.mjs`; expect module-not-found FAIL.
- [ ] GREEN: implement frozen exact limits, 256 KiB maximum header read for pre-decode format/dimension and ambiguous-JPEG validation, stable non-sensitive errors, sanitized 140-character alt text, seven-entry frozen projection.
- [ ] Rerun; expect all cases PASS.

## Task 2 — 4:3 geometry

**Files:** create `scripts/media/pr36-geometry.js`, `tests/pr36/geometry.test.mjs`.

**Interfaces:** `normalizeTransform(input)`; `fitCrop({sourceWidth,sourceHeight,zoom,panX,panY})`; `outputSize(crop)`.

- [ ] RED: table-test 320×240, landscape, portrait, 40 MP boundaries, zoom `[1,4]`, pan clamps, non-finite rejection; assert `width*3===height*4`, ≤1600×1200, and output ≤ crop.
- [ ] Run `node --test tests/pr36/geometry.test.mjs`; expect module-not-found FAIL.
- [ ] GREEN: calculate crop/output in integer 4:3 units, center by default, clamp source bounds, never upscale.
- [ ] Rerun; expect PASS.

## Task 3 — Canvas and optional worker boundaries

**Files:** create `pr36-canvas-adapter.js`, `pr36-worker-adapter.js`, `pr36-media-worker.js`; create `canvas-adapter.test.mjs`, `worker-adapter.test.mjs`.

**Interfaces:** `createCanvasAdapter({decode,createCanvas,draw,encode,probeWebP,closeDecoded,clearCanvas}).process(job)`; `selectProcessingAdapter({Worker,OffscreenCanvas,createImageBitmap,workerFactory,mainThread})`. Worker messages are `{type,jobId,bytes,mimeType,crop,policy}` and matching result/error.

- [ ] RED: prove decoded dimension/pixel checks, orientation uncertainty, WebP probe/JPEG fallback, wrong/empty output rejection, abort cleanup, worker capability failure, crash, malformed/stale reply, termination, one fallback, and no fallback after validation rejection.
- [ ] Run `node --test tests/pr36/{canvas-adapter,worker-adapter}.test.mjs`; expect module-not-found FAIL.
- [ ] GREEN: allocate only final canvas; validate post-encode MIME/size/ratio; close bitmap and zero canvas in `finally`. Probe worker safely, accept matching IDs only, terminate/remove listeners on settle, transfer/release buffers, fall back once while current.
- [ ] Run tests plus `! grep -RE 'fetch[[:space:]]*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|indexedDB|caches\.|document\.cookie' scripts/media/pr36-{canvas-adapter,worker-adapter,media-worker}.js`; expect PASS/no match.

## Task 4 — Scheduler and transactional session

**Files:** create `pr36-scheduler.js`, `pr36-session.js`, `scheduler.test.mjs`, `session.test.mjs`.

**Interfaces:** `createScheduler({maxConcurrency,jobTimeoutMs,sessionTimeoutMs,clock})` with `enqueue/cancelOperation/dispose`; `createMediaSession(...)` with `select/beginEdit/previewEdit/confirmOperation/cancelOperation/remove/reorder/setCover/displaySnapshot/reset/dispose`.

- [ ] RED: fake-clock tests prove FIFO maximum 2, 19,999 ms success, 20,000 ms timeout, 120,000 ms session timeout, queued/running abort, no timers; session tests prove atomic commit, exact rollback, source release, stale disposal, balanced URLs, removal/reset/pagehide/dispose, order, cover, and metadata without URL/bytes/name.
- [ ] Run `node --test tests/pr36/{scheduler,session}.test.mjs`; expect module-not-found FAIL.
- [ ] GREEN: separate committed/provisional registries; key results by session/operation/item/revision; clear file variables/header arrays in `finally`; revoke each URL exactly once; no retry.
- [ ] Rerun; expect concurrency maximum exactly 2, zero pending timers, and `created=revoked+live committed` PASS.

## Task 5 — Accessible controller

**Files:** create `pr36-controller.js`, `styles/vvip-pr36-media.css`, `controller-accessibility.test.mjs`.

**Interface:** `mountMediaController({root,session,clock,document,window}) -> {displaySnapshot,reset,dispose}`; emitted event detail is display metadata only.

- [ ] RED: source/DOM tests require explicit MIME accept, ordered list, Arabic labels, edit/remove/cover/move, Escape, focus trap/restore, `Alt+Arrow`, live regions, 250 ms debounce/release flush, RTL, 44 px targets, reduced motion, 320 px rule; forbid `innerHTML`, logging, or byte/URL event detail.
- [ ] Run `node --test tests/pr36/controller-accessibility.test.mjs`; expect module-not-found FAIL.
- [ ] GREEN: use `createElement`, `textContent`, fixed attributes/listeners; disable on uncertain capability; dispose listeners/timers; implement logical CSS.
- [ ] Rerun; expect PASS.

## Task 6 — PR31–PR33 integration

**Files:** modify PR31, PR32, PR33, `index.html`, `private-profile-p03.html`; create `tests/pr36/integration.test.mjs`.

**Contract:** PR31 mounts `VVIP_PR36_MEDIA`, exposes count/display metadata only, and resets on close/new/delete. PR32 stores at most seven metadata entries plus cover/count and discards legacy names. PR33 clamps count 0–7. Both pages load PR36 dependencies before PR31.

- [ ] RED: assert PR31 has no `localPhotos`, `createObjectURL`, photo-name fields; legacy names disappear; URL/blob/byte/credential-shaped draft fields disappear; both pages load scripts/style once; PR34 source is untouched.
- [ ] Run `node --test tests/pr36/integration.test.mjs`; expect FAIL on current PR31 ownership.
- [ ] GREEN: surgically replace the media section; recursively sanitize draft display metadata; preserve text draft; add ordered includes; change PR33 maximum 100 to 7.
- [ ] Run `node --test tests/pr36/integration.test.mjs && bash scripts/qa-pr33-accessibility.sh`; expect PASS.

## Task 7 — Aggregate QA and evidence

**Files:** create `scripts/qa-pr36-secure-seven-photo-processing.sh`, `QA_EVIDENCE.md`, `FINAL_QA_REPORT.md`.

- [ ] Add syntax/tests, exact constants, forbidden network/storage/remote/video/logging/unsafe-sink guards, HTML order, exact manifest/freeze scope, PR33/PR34/PR35/smoke regressions, and whitespace. A `--self-test-guard` fixture containing `fetch("/forbidden")` must be rejected without modifying runtime.
- [ ] Run `bash scripts/qa-pr36-secure-seven-photo-processing.sh --self-test-guard`; expect self-test PASS after observing the fixture rejection.
- [ ] Run `bash scripts/qa-pr36-secure-seven-photo-processing.sh --focused`; expect exit 0 and `[pr36] focused gate passed`.
- [ ] Record UTC time, command, exit, totals, and limitations. `FINAL_QA_REPORT.md` says `NOT RUN` until final execution.

## Tasks 8–11 — Four autonomous reviews

- [ ] **Round 1 architecture/spec:** create `REVIEW_ROUND1_ARCHITECTURE_SPEC.md` and `REVIEW_RESOLUTION_LOG.md`; trace every requirement/interface, PR34 compatibility, ownership, fallback, and scope.
- [ ] **Round 2 security/privacy:** create `REVIEW_ROUND2_SECURITY_PRIVACY.md`; attack spoofing/polyglots, decode lies, races, stale replies, URL/source/DOM/event/storage leakage, offline behavior, and forbidden APIs.
- [ ] **Round 3 performance/accessibility:** create `REVIEW_ROUND3_PERFORMANCE_ACCESSIBILITY.md`; observe concurrency, deadlines, resource balance, exact outputs, debounce, 320 px, RTL keyboard/focus/live regions/44 px/reduced motion. Make no universal memory/network claim.
- [ ] **Round 4 final:** create `REVIEW_ROUND4_FINAL.md`; read full diff and earlier rounds, verify exact scope, complete language, no package/remote/persistence/deletion, one-commit rule, and honest evidence.

For every valid finding in every round: add a focused failing test, record RED, apply the narrow fix, record GREEN in `REVIEW_RESOLUTION_LOG.md`. A round passes only with zero unresolved blocking findings.

## Task 12 — Freeze, full regression, manual smoke, report, one commit

**Files:** create `CHANGED_FILES.freeze`, `MANUAL_BROWSER_EVIDENCE.md`, `FINAL_REPORT.md`; finalize QA reports.

- [ ] Freeze paths with `{ git diff --name-only 3611bfd0183398e639e50b761d92aeddf367ee4a; git ls-files --others --exclude-standard; } | sort -u`; after adding freeze, regenerate via temporary file. Require exact equality with sorted unique manifest paths and no deletions/forbidden roots.
- [ ] Run full regression: `bash scripts/qa-pr36-secure-seven-photo-processing.sh`; `node --test tests/pr36/*.test.mjs`; PR33, PR34, PR35 QA scripts; `bash scripts/qa-smoke.sh`; `git diff --check`. Every command must exit 0 or final status is FAIL and no commit/success claim is allowed.
- [ ] With `python -m http.server 800`, manually test both canonical pages: three formats; spoof/size/dimension/seven limits; crop/zoom/pan; exact ratio/no upscale; reorder/cover; keyboard/RTL/focus; all cancels/resets; offline; worker/fallback; timeout fixtures; DevTools zero media requests/persistent bytes and balanced URLs. Record browser/version without images.
- [ ] Validate JSON using `python3 -m json.tool docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json`; scan all five planning documents for unfinished-marker language and replace every match with an exact decision.
- [ ] Write exact commands/times/exits, four-round status, unresolved blockers, limitations, remote/persistence/deletion verdict, and rollback. PASS only from observed evidence.
- [ ] Only after PASS, create the single commit: `git add -- $(cat docs/launch/pr36/CHANGED_FILES.freeze)`, staged whitespace/scope comparison, then `git commit -m "feat: add secure local seven-photo processing"`. Never push, merge, open a PR, or contact a remote.
