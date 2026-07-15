# PR36 Secure Seven-Photo Processing Design

Date: 2026-07-15
Baseline: `3611bfd0183398e639e50b761d92aeddf367ee4a`
Branch: `feat/pr36-secure-seven-photo-processing`
Status: owner-approved specification

## Outcome and boundaries

PR36 replaces the PR31 temporary photo behavior with a local-only workflow for up to seven still photos: selection, validation, 4:3 crop, zoom, pan, reorder, cover selection, confirm, and cancel. It performs no upload or real publishing. It adds no network, Supabase, SQL, migration, Clerk, service-role, payment, video, package, or production capability.

PR31 remains the listing-step owner. PR36 owns media resources through injected adapters. PR32 may persist sanitized display metadata only; PR33 consumes a count. The PR34 listing contract remains unchanged and metadata-only.

## Architecture

Small UMD-style modules under `scripts/media/` run in existing deferred-script pages and Node tests:

| Module | Single responsibility |
|---|---|
| `pr36-policy.js` | Frozen limits, errors, Arabic-first copy, metadata projection. |
| `pr36-signature.js` | Header-only JPEG/PNG/WebP detection and declared/detected MIME agreement. |
| `pr36-geometry.js` | Pure 4:3 crop, zoom/pan clamping, output size, no upscale. |
| `pr36-canvas-adapter.js` | Injected main-thread decode, orientation, draw, encode, cleanup. |
| `pr36-worker-adapter.js`, `pr36-media-worker.js` | Safely probed optional Worker/OffscreenCanvas path and deterministic fallback. |
| `pr36-scheduler.js` | FIFO concurrency two, deadlines, abort, stale suppression. |
| `pr36-session.js` | Transactional resource ownership, order, cover, disposal. |
| `pr36-controller.js` | Accessible RTL DOM, focus, keyboard, debounce, PR31 bridge. |

This is preferred over a PR31 monolith because resource ownership and races become testable, and over a mandatory worker because capable main-thread browsers must have a deterministic fallback.

## Fixed policy

- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`; filename/extension is never proof.
- Reject SVG, GIF, video, HEIC/HEIF, unknown, truncated, or MIME-mismatched content.
- Maximum source: 15 MiB each; selected transaction: 60 MiB; decoded image: 40,000,000 pixels.
- Minimum decoded dimensions: 320×240. Reject non-finite or uncertain dimensions/orientation.
- Output is exactly 4:3, no larger than 1600×1200, and never upscaled.
- Prefer verified WebP quality 0.82; otherwise verified JPEG quality 0.86.
- Concurrency: two. Photo deadline: 20 seconds. Non-extendable session deadline: 120 seconds. UI debounce: 250 ms.

Validation checks count, declared MIME, compressed sizes, and a bounded header window of at most 256 KiB before decode. The larger bounded window is required to locate JPEG frame dimensions and reject ambiguous duplicate frame headers; PNG and WebP dimensions remain header-validated as well. JPEG requires `ff d8 ff`; PNG requires its eight-byte signature; WebP requires RIFF plus WEBP. After decode, dimensions/pixels are checked again before allocating a final-size canvas. Canvas re-encoding strips source metadata. Null, empty, wrong-MIME, wrong-ratio, oversized, or unverifiable output fails closed.

## Interfaces and state

`createMediaSession({ validator, processor, scheduler, urls, ids, onChange })` exposes `select`, `beginEdit`, `previewEdit`, `confirmOperation`, `cancelOperation`, `remove`, `reorder`, `setCover`, `displaySnapshot`, `reset`, and `dispose`.

Every async result carries `{ sessionId, operationId, itemId, revision }`; mismatches are disposed and never rendered. Each operation has an `AbortController`. The scheduler clears all timers and never retries validation, security, scope, processing, timeout, cancellation, or test failures.

Provisional resources and committed resources have separate registries:

- Confirm atomically commits successful derivatives, revokes superseded URLs, closes decoded resources, clears the input/header buffers, and discards every original `File` reference.
- Cancel aborts queued/running jobs, terminates its worker, ignores/disposes late results, revokes every provisional URL, clears canvases/arrays/input, and restores the exact pre-operation snapshot.
- Remove, reset, shell close, timeout, `pagehide`, and disposal revoke owned URLs and drop applicable blobs/metadata.

Only processed in-memory `Blob` derivatives, at most seven preview URLs, and bounded metadata remain. Public metadata is `{ imageId, position, altText, mimeType, width, height, sizeBytes }` plus `coverImageId`; it contains no filename, bytes, URL, EXIF, identity, credential, or processing handle. URLs are presentation-only and never serialized or emitted.

## Worker fallback

Worker use requires successful probes for Worker, OffscreenCanvas, createImageBitmap, protocol, and output. A worker capability/runtime failure may fall back once to the main-thread adapter only while the job is current. This is not a retry of a rejected security decision. If both paths are uncertain, return `capability_unavailable`. The worker receives only transferred bytes, IDs, crop, and bounded policy and has no network, storage, cookie, filesystem, logging, DOM, upload, or publishing API.

## UI and accessibility

Arabic/RTL is default and mobile-first. The input advertises only the three accepted MIME types, while runtime validation remains authoritative. The ordered photo list provides edit, remove, cover, move-before, and move-after buttons; `Alt+Arrow` provides logical RTL keyboard reordering. The first confirmed image becomes cover.

The modal crop editor has labelled 4:3 preview, zoom, four pan controls, reset, cancel, confirm, focus trap/restoration, Escape cancel, live status/error, visible focus, 44×44 px targets, reduced-motion behavior, and no horizontal overflow from 320 CSS px. Zoom/pan updates debounce at 250 ms and pointer/key release flushes. Messages are calm, useful, honest, and never reveal filenames. Uncertain File/Blob/URL/decode/canvas/encode capability disables photos while preserving text drafting.

## Privacy, persistence, and performance

New media runtime must contain no `fetch`, XHR, beacon, WebSocket, Supabase/Clerk, browser storage, Cache API, cookie, filesystem, logging, unsafe HTML sink, upload, or publish path. PR32's existing localStorage use may retain sanitized text and bounded display metadata, but its migration discards legacy photo names and recursively rejects bytes, URLs, blobs, credentials, and processing state. No privileged action is queued offline.

The pipeline validates compressed totals before work, decodes at most two sources, allocates canvases only at final output size, closes decoded objects after draw, transfers/releases source buffers, and retains at most seven derivatives. Browser decoder memory is not fully measurable; no universal memory or poor-network-speed claim is made.

Stable error codes include `too_many_photos`, `source_too_large`, `selection_total_too_large`, `mime_not_allowed`, `signature_mismatch`, `unknown_format`, `decode_failed`, `dimensions_too_small`, `decoded_pixels_exceeded`, `orientation_uncertain`, `capability_unavailable`, `encode_failed`, `processing_timeout`, `session_timeout`, `cancelled`, and `stale_result`.

## Verification and rollback

Injected fake files, clocks, decoders, canvases, URLs, and workers prove limits, geometry, fallback, concurrency, deadlines, cancellation, stale suppression, disposal, order/cover, metadata, and accessibility. Static guards reject forbidden capabilities. Browser smoke covers real formats, offline processing, keyboard/RTL, cancellation, worker/fallback, and resource cleanup without retaining fixtures.

Four autonomous rounds are mandatory: architecture/spec; security/privacy; performance/accessibility; final scope/regression. Findings require named regression evidence. PASS requires fresh observed exits and exact scope equality.

Rollback reverses only paths in `CHANGED_FILES.freeze`. No tracked historical, backup, migration, or uncertain file is deleted, and no remote action occurs.
