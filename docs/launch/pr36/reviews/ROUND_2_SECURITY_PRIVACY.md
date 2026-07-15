# PR36 autonomous review stage — review_2_security_privacy

Observed at: 2026-07-15T07:35:21Z (UTC)

Source of truth: owner-approved `docs/superpowers/specs/2026-07-15-pr36-secure-seven-photo-processing-design.md`, implementation plan, `CHANGE_CONTROL_MANIFEST.json`, and `CHANGED_FILES.freeze`.

Baseline: `3611bfd0183398e639e50b761d92aeddf367ee4a`

## Verdict

**PASS.** The complete current 49-path diff was reviewed. Seven Important security/privacy findings are corrected in the current tree, including three fixes made during this stage. No Critical or Important finding remains open. PASS is based on fresh observed zero exits from all PR36 tests, both full PR36 QA entry points, the guard self-test, and an independent historical smoke run.

No tracked deletion, test change, SQL, Supabase, Clerk mutation, service role, migration, package, lockfile, workflow, backup, deployment, commit, push, PR, merge, or remote operation was performed during this stage.

## Findings, root cause, and exact fixes

| ID | Severity | Finding and root cause | Exact fix | Regression evidence |
|---|---|---|---|---|
| R2-SP-01 | Important | Source magic bytes were initially checked without pre-decode dimensions, allowing decoder allocation before the 40 MP decision. | Bounded preflight (maximum 256 KiB) now parses PNG, WebP, and one unambiguous JPEG SOF; minimum dimensions and overflow-safe pixel limits run before decode, then decoded dimensions must equal preflight. | Frozen `policy-signature` malformed/bomb/ambiguous JPEG cases and `canvas-adapter` decoder-disagreement case pass. |
| R2-SP-02 | Important | The optional worker initially accepted underspecified jobs/results and could fallback after an untrusted malformed response. | Worker boundary validates IDs, transferred byte size/type, MIME, finite transforms, exact policy, output bounds, job correlation, and no-fallback security error codes; only a capability/runtime failure gets one current-job fallback. | Frozen `worker-adapter` malformed job/result, stale/malformed response, abort, validation, decode, and encode cases pass. |
| R2-SP-03 | Important | Confirmation could race a preview and confirmation failure could leave provisional ownership or expose an arbitrary adapter exception. | Confirmation cancels the previous generation, starts a fresh operation, suppresses stale completion, revokes provisional/new URLs on failure, clears source references, and maps unknown exceptions to stable generic codes. | Frozen `session` stale-preview/orphan-URL and failed-confirmation/data-leak cases pass. |
| R2-SP-04 | Important | Draft normalization initially admitted derivative-incompatible MIME/size and duplicate sanitized IDs. | Persistence accepts only bounded JPEG/WebP display metadata, derives count/position/cover, rejects duplicate/empty IDs, and omits filename, URL, Blob/File, bytes, credentials, and processing state. | Frozen `integration` metadata/legacy-name cases pass. |
| R2-SP-05 | Important | Both encode paths trusted `Blob.type` plus intended canvas dimensions. A faulty or compromised encoder result could therefore be accepted without proving its bytes and encoded dimensions. | Main-thread production Blobs and worker outputs now read at most 256 KiB of the derivative, verify JPEG/WebP signature, parse encoded dimensions, require exact intended 4:3 dimensions, zero the header buffer, and fail with `encode_failed` on uncertainty. | Frozen canvas/worker rejection tests pass; the full QA gate now statically requires independent main-thread signature verification and worker encoded-dimension verification. |
| R2-SP-06 | Important | Worker bitmap closure existed, but the OffscreenCanvas and encoded verification header had no explicit cleanup. | Worker `finally` now closes any live bitmap, zeroes the bounded encoded-header buffer, and resets canvas width/height to zero on success and failure. | Full QA gate statically requires header zeroing and canvas reset; worker and cancellation suites pass. |
| R2-SP-07 | Important | Replacement commit revoked an old committed URL while iterating mutations. If a later replacement validation failed, rollback could expose committed metadata backed by a revoked preview URL. | The session now validates every replacement target first, builds the next committed array without retiring resources, atomically assigns it, and only then revokes retired committed URLs. | Frozen session commit/edit/rollback/resource-balance tests pass; full QA requires the post-commit retirement invariant. |

## Security and privacy boundary evidence

- Only processed in-memory JPEG/WebP derivative Blobs become committed media. Original `File` and source references are provisional and are cleared on success, cancellation, selection failure, confirmation failure, reset, pagehide, or disposal.
- Canvas re-encoding removes source metadata. Acceptance now independently verifies derivative bytes and dimensions; uncertain decode, geometry, canvas, or encoding fails closed.
- Source policy is declared MIME plus binary signature/structure agreement. Extensions and filenames are not trusted or rendered. SVG, GIF, video, HEIC/HEIF, unknown, mismatched, truncated, ambiguous, too-small, and over-pixel inputs fail closed.
- Bounds are seven images, 15 MiB per source/derivative, 60 MiB per selection, 40 MP decoded, maximum 1600×1200, exact 4:3, concurrency two, 20-second job deadline, and non-extendable 120-second processing session.
- Workers receive only bounded transferred bytes, IDs, transform, MIME, and fixed policy. Abort terminates the worker; scheduler and session generations suppress late/stale results. Object URLs are presentation-only and are revoked on replacement, cancel, remove, reset, pagehide, and dispose.
- The media runtime contains no fetch, XHR, beacon, WebSocket, storage, Cache API, cookie, logging, Supabase, Clerk, secret/token, upload, publish, service-role, or privileged/offline queue capability. Existing PR32 storage retains only sanitized bounded display metadata; it cannot persist image bytes or URLs.
- UI failures use stable generic Arabic messages. Raw exceptions, filenames, source bytes, URLs, identity, credentials, and processing handles are neither displayed nor emitted in metadata.
- The manifest/freeze comparison observed exact equality across 49 changed paths. `git diff --name-only --diff-filter=D` returned no path. Frozen `tests/pr36` remained untouched during this stage.

## Fresh regression evidence

All commands below were run on the corrected current tree and freshly observed at exit 0:

- `node --test tests/pr36/*.test.mjs` — 8 test files passed; 0 failed, cancelled, skipped, or todo.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — full gate passed; includes the PR36 suite, static privacy/capability and new lifecycle invariants, exact scope, PR33, PR34, 10 PR35 files, historical smoke, and whitespace.
- `bash scripts/qa-pr36-secure-photo-processing.sh` — the second full PR36 entry point passed independently with the same aggregate coverage.
- `bash scripts/qa-smoke.sh` — independent historical smoke passed; terminal result `[smoke][pass] PR29 legacy eradication checks succeeded`.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --self-test-guard` — synthetic forbidden `fetch()` fixture was detected and the guard self-test passed.
- `git diff --check` — no whitespace error.
- `git diff --name-only --diff-filter=D 3611bfd0183398e639e50b761d92aeddf367ee4a` — empty output; no tracked deletion.

## Residual risk

- Browser decoders and encoders remain platform components; their internal memory use and implementation vulnerabilities cannot be eliminated by JavaScript. PR36 limits compressed bytes, preflights pixels, caps concurrency/output, applies deadlines, closes resources, and fails closed, but does not claim a universal memory ceiling.
- JavaScript cancellation cannot forcibly interrupt every main-thread browser primitive. Generational stale suppression prevents a late result from being committed or rendered, and finalizers clean decoded/canvas resources when the primitive settles.
- Canvas re-encoding strips source metadata in normal conforming browsers; the bounded derivative verification proves format and dimensions, not a formal absence of every non-image ancillary segment emitted by a browser encoder. No original bytes are retained or transmitted.
- This review used automated/static evidence and makes no new manual-browser or cross-browser certification claim.

## Amanah and transparent failure semantics

Amanah is preserved by tying PASS only to the fresh zero exits above and stating browser limitations. Justice is preserved through deterministic limits and equal fail-closed handling. Privacy is preserved through local-only processing and metadata-only persistence. Accessibility remains intact because fixes do not alter keyboard, RTL, live-region, or calm Arabic error behavior. No insecure fallback, silent upload, privileged offline action, or data-bearing error path was introduced.

`VVIP_ETHICS_PRIVACY_PERFORMANCE_GATE: PASS`
