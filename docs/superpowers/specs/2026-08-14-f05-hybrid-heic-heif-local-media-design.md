# F05 — Hybrid HEIC/HEIF Local Media Fabric Design

**Status:** OWNER architecture B approved / written-spec review pending

**Date:** 2026-08-14

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

**Verified predecessor:** F04 final head `02cfc8cf91cc9a221dc3a4f46f9aa0317eb2f272`

**Binding Owner marketplace invariant:** `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`

## 1. Decision

The OWNER approved **Architecture B**:

> HEIC/HEIF processing is local-first. Use a browser-native image decoder when that capability is explicitly supported; otherwise use a pinned, same-origin WASM decoder in an isolated worker. The original HEIC/HEIF bytes are never sent to the platform server merely for media conversion and never become a publishable asset. Only a sanitized WebP/JPEG derivative may enter the existing PR36 media session.

The earlier branch `feat/f05a-fusion-hybrid-media-intake-20260813` used a **server-quarantine HEIC route**. That architecture is now **SUPERSEDED / HISTORICAL ONLY** and must not be merged or cherry-picked into F05.

## 2. Goals

F05 must:

1. preserve the existing PR36 seven-photo safety model;
2. add secure still-image HEIC/HEIF intake without making the server a media conversion dependency;
3. retain local/offline-capable processing after required runtime assets are installed;
4. ensure untrusted HEIC/HEIF originals never become public/persistent listing media;
5. convert decoded content to a metadata-free, display-oriented, sRGB WebP/JPEG derivative before it is accepted by PR36 metadata/session contracts;
6. fail closed on unsupported codecs, image sequences, malformed containers, unsafe dimensions, memory pressure, orientation ambiguity, color ambiguity, worker failure, stale responses, or integrity failures;
7. preserve the Owner rule that the platform remains advertising/discovery/direct-contact only.

## 3. Non-goals

F05 does **not** add:

- server-side HEIC conversion;
- upload/persistence of original HEIC/HEIF bytes;
- HEIC/HEIF encoding;
- video, Live Photo video, timed HEIF image sequences, animated media, or `image/heic-sequence` / `image/heif-sequence` support;
- AVIF expansion beyond existing product authority;
- marketplace checkout, escrow, delivery, transaction payment/settlement, marketplace commission/payout, warranty execution, or dispute resolution;
- protected authentication weakening;
- a global-launch or 4M capacity claim.

## 4. Existing PR36 invariants retained

The following PR36 limits remain authoritative and are not relaxed:

- maximum photos: **7**;
- maximum source file: **15 MiB**;
- maximum selection: **60 MiB**;
- maximum decoded pixels: **40,000,000**;
- minimum source dimensions: **320 × 240**;
- output geometry: exact **4:3**;
- maximum output: **1600 × 1200**;
- no upscale;
- WebP quality **0.82**, JPEG fallback quality **0.86**;
- photo deadline **20 seconds**;
- session deadline **120 seconds**;
- edit debounce **250 ms**;
- stale-result suppression, cancellation, URL cleanup, source release and metadata-only projection remain mandatory.

JPEG/PNG/WebP continue through the existing PR36 route unchanged except for shared regression-safe routing infrastructure.

## 5. Threat model

F05 treats every selected HEIC/HEIF byte as hostile. Required defenses cover:

- false filename extensions and false declared MIME;
- malformed ISO-BMFF boxes, oversized box lengths and truncated boxes;
- incompatible or misleading `ftyp` brands;
- container/polyglot tricks;
- timed sequences / animation / video tracks disguised as still images;
- decompression bombs and oversized decoded planes;
- decoder integer overflow, OOB, assertion/DoS and allocation failure;
- malicious EXIF/XMP/GPS/private metadata;
- orientation transform double-application or ambiguity;
- color-profile abuse / unsupported transforms;
- stale worker responses, wrong job IDs and worker crashes;
- WASM supply-chain substitution;
- object URL or original-byte persistence;
- media exfiltration through fetch/XHR/beacon/WebSocket/storage APIs.

## 6. Trust boundaries and data flow

### Boundary A — untrusted selection

The browser selection step may inspect count and file size. Filename extension is never an authority signal.

For HEIC/HEIF, declared MIME is advisory. The authoritative format decision comes from a bounded ISO-BMFF preflight probe. Empty or generic MIME may proceed to that probe, but only a positive HEIF/HEIC container result can enter the F05 decoder path.

### Boundary B — bounded container preflight

A pure parser reads at most the existing PR36 `maxHeaderBytes = 262144` bytes and walks box boundaries with overflow-safe arithmetic.

The probe must:

- require a valid ISO-BMFF `ftyp` structure;
- return normalized compatible brands;
- recognize the HEIC/HEIF still-image family;
- reject AVIF-only, unknown, truncated or contradictory containers;
- never allocate from untrusted box sizes;
- never trust extension or filename;
- emit no metadata other than bounded technical format facts.

A positive preflight is permission to attempt decoding, not proof that the image is safe.

### Boundary C — isolated decoder worker

HEIC/HEIF bytes are transferred to a dedicated worker. The main-thread ArrayBuffer becomes detached when transferred.

The worker chooses one of two local decode engines:

1. **Native path:** only when a standards/browser API explicitly reports HEIC/HEIF support before untrusted decode begins.
2. **WASM fallback:** used when native capability is unavailable, not after a structural/security rejection.

A native decoder rejection after decode begins is fail-closed; the same hostile bytes are not automatically offered to a second decoder.

### Boundary D — still-image and resource validation

Before a WASM pixel allocation, the decoder adapter must inspect primary-image metadata and enforce:

- still image only;
- no timed sequence / animation / video track;
- valid primary image;
- dimensions >= 320 × 240;
- decoded pixels <= 40,000,000;
- integer-safe width/height calculations;
- bounded decoder security limits enabled and never disabled.

Auxiliary thumbnails/depth/alpha items may be ignored unless needed to decode the primary still image. They must never become independent listing media.

### Boundary E — canonical pixel surface

Both native and WASM engines produce the same internal contract:

`{ width, height, rgba/display-frame, orientationApplied, colorSpace: "srgb", sourceKind: "heic"|"heif" }`

Requirements:

- container orientation/mirror transforms are applied exactly once;
- uncertain orientation fails closed;
- target color space is 8-bit sRGB;
- HDR/wide-gamut input is converted to the bounded sRGB display target;
- unsupported/ambiguous color conversion fails closed;
- EXIF/XMP/GPS/ICC/NCLX source payloads are not propagated as derivative metadata;
- alpha, when present, is composited deterministically against white before an opaque JPEG fallback.

### Boundary F — PR36 derivative contract

Decoded pixels then use the existing PR36 geometry/encode policy:

- exact 4:3 crop;
- <=1600 × 1200;
- no upscale;
- WebP 0.82, JPEG 0.86 fallback;
- resulting MIME must be only `image/webp` or `image/jpeg`;
- derivative must pass PR36 output ratio/dimension/size checks;
- only derivative metadata enters PR32/PR33/listing draft state.

The original HEIC/HEIF File, byte arrays, decoder handles and worker memory are released after success, cancellation or failure.

## 7. Decoder architecture

### Native decoder

The worker feature-detects supported browser image-decoder APIs. Capability detection must occur before handing bytes to a native decoder. A mere global constructor existing is insufficient; the MIME must be explicitly reported supported.

Native decode output still passes every F05 dimension, still-image, color, orientation and derivative validation. Browser-native support never bypasses policy.

### WASM decoder

The fallback is built from pinned upstream source and hosted same-origin.

Pinned initial source authority for F05 implementation:

- `libheif v1.23.1`
  - tag commit: `2c4bbb54c2738d4a5efbbe3e5fa1d5d76bb88eb0`
  - release source archive SHA-256: `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`
- `libde265 v1.1.1`
  - tag commit: `4dd701fffac01632ffd5cabc5ef10deb56accba1`
  - release source archive SHA-256: `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`

Build requirements:

- decoder-only HEVC path; do not ship x265 or HEIC encoder functionality;
- experimental libheif APIs disabled;
- security limits enabled; no code path may disable them;
- no dynamic plugin discovery;
- no filesystem, socket, media-network or persistence API exposed to decoder code;
- single-threaded WASM baseline for broad browser compatibility; no SharedArrayBuffer requirement;
- explicit bounded maximum WASM memory; implementation plan must set and test the exact value before the binary is accepted;
- worker lifecycle is operation-scoped/ephemeral so terminating the worker releases the WASM heap;
- runtime binary, JS glue, source manifest and build recipe are checksum-bound.

## 8. Third-party and supply-chain compliance

`libheif` and `libde265` are LGPL-licensed libraries. F05 therefore requires a release-blocking third-party compliance package before any Production distribution:

- exact upstream source archives and SHA-256 values recorded;
- unmodified license texts/notices provided;
- deterministic build recipe recorded;
- runtime WASM kept as a replaceable same-origin asset with a stable adapter boundary;
- corresponding source/build material sufficient for rebuilding/replacing the linked decoder retained as a distributable compliance artifact;
- no `latest` URL or mutable dependency resolution in runtime;
- legal/product review records whether the final delivery mechanism satisfies LGPL obligations.

If this compliance gate is not satisfied, the WASM fallback cannot be Production-enabled even if engineering tests pass.

## 9. Runtime file boundaries

Preferred runtime layout:

- `scripts/media/f05-heif-preflight.js` — pure bounded ISO-BMFF signature/brand probe;
- `scripts/media/f05-heif-policy.js` — still-image/type/resource policy shared by tests/adapters;
- `workers/media/f05-heif-worker.js` — isolated native/WASM decode orchestration;
- `workers/media/f05-heif-decoder.js` — generated/pinned decoder glue;
- `workers/media/f05-heif-decoder.wasm` — pinned decoder binary;
- `third_party/f05-heif/` — notices, source manifest, checksums and reproducible build recipe;
- PR36 policy/worker/controller files — minimal integration only;
- `sw-vvip-static.js` — only the narrowly tested static-cache change needed to admit versioned `.wasm` worker assets.

Do not add a new script tag to protected `index.html` merely to initialize F05. Integration should occur through the already-loaded PR36 media controller/worker path so authentication markup is not weakened.

## 10. Offline behavior

The F05 worker/glue/WASM assets are same-origin static assets.

The existing static delivery worker may be changed only to:

- allow `.wasm` under the already-approved `/workers/` prefix;
- bind a new cache version to the F05 artifact set;
- precache the exact versioned worker/glue/WASM assets during app-shell installation if the implementation tests prove this is required for cold-offline HEIC support.

No user-selected image bytes may enter Cache Storage, IndexedDB, localStorage or any persistent browser store.

Offline success means: after the application shell is installed, a user can select and convert a valid HEIC/HEIF still image with network unavailable, while DevTools shows zero requests carrying selected media bytes.

## 11. Error semantics

F05 introduces stable, non-sensitive error families, mapped to Arabic UI copy without leaking decoder internals. At minimum:

- `heif_container_invalid`
- `heif_codec_unsupported`
- `heif_sequence_denied`
- `heif_dimensions_invalid`
- `heif_memory_limit`
- `heif_orientation_uncertain`
- `heif_color_unsupported`
- `heif_decode_failed`
- `heif_decoder_integrity_failed`
- existing PR36 cancellation/timeout/stale/encode errors.

Decoder library stack traces, filenames, raw metadata and byte offsets must not be exposed to the listing UI or persisted.

## 12. TDD and verification strategy

F05 implementation must proceed RED -> GREEN task-by-task.

Required test families:

1. ISO-BMFF/HEIC/HEIF signature and brand parser, including malformed length/overflow/truncation cases;
2. routing and unchanged JPEG/PNG/WebP PR36 regression;
3. still-image-only enforcement and sequence/video denial;
4. native-capability selection and no unsafe second-decoder fallback;
5. WASM adapter contract, integrity failure, memory failure, worker crash and stale reply;
6. orientation and color canonicalization;
7. metadata stripping / GPS non-propagation;
8. exact PR36 7/15MiB/60MiB/40MP/4:3/no-upscale/1600×1200 invariants;
9. cancellation, timeout, worker termination and source-byte release;
10. offline static-asset cache behavior without user-media persistence;
11. controller accept/input behavior and Arabic accessible error copy;
12. real HEIC fixtures, including orientation/color/metadata cases plus hostile/truncated/sequence fixtures;
13. repository-wide F00–F04 and PR36 regressions;
14. exact-head Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard and Project Control Integrity.

## 13. Browser evidence required for F05 closure

Automated unit tests alone do not close F05.

F05 closure requires observed browser evidence for both canonical PR36 pages or their current protected equivalents:

- real HEIC still selection;
- native route where genuinely available;
- forced WASM fallback route;
- crop/zoom/pan and exact derivative ratio;
- Arabic RTL keyboard/focus behavior;
- cancellation/reset/pagehide cleanup;
- worker termination and no stale result;
- offline conversion after app-shell asset installation;
- zero network requests containing selected image bytes;
- zero persistent original/media bytes;
- no EXIF/GPS propagation into emitted derivative/listing metadata;
- balanced object URLs/resources;
- JPEG/PNG/WebP PR36 behavior remains unchanged.

The old PR36 `MANUAL_BROWSER_EVIDENCE.md = NOT RUN` is historical evidence, not a substitute. F05 must record fresh evidence for its own final head.

## 14. Exit criteria

F05 may be marked `EXACT_HEAD_PASS` only when all of the following are true on one final source SHA:

- local native/WASM hybrid HEIC/HEIF still-image pipeline implemented;
- old F05A server-quarantine architecture is not active;
- original HEIC/HEIF is never uploaded/persisted/published by the conversion path;
- PR36 safety limits and JPEG/PNG/WebP regressions pass;
- sequence/video denied;
- derivative metadata/privacy checks pass;
- real HEIC browser evidence passes;
- offline behavior passes;
- WASM source/binary integrity and third-party compliance artifacts are complete;
- all required exact-head CI/security gates pass;
- no Production deploy, country activation, SQL/RLS mutation, protected-auth weakening or global-launch claim is made by the F05 PR.

Until then F05 remains Draft.