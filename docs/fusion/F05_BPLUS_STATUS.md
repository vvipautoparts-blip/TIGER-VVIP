# F05 B+ — TIGER Sovereign Media Fabric Status

**Status:** ZERO-TRUST MEDIA SHIELD IMPLEMENTED / FINAL DEVICE + SERVER-PORT + LEGAL EVIDENCE OPEN

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

**Verified predecessor:** F04 `02cfc8cf91cc9a221dc3a4f46f9aa0317eb2f272`

## OWNER invariant

F05 remains advertisement-media infrastructure only. It does not add checkout, escrow, delivery, settlement, marketplace commission/payout, warranty execution, dispute resolution, or any platform role in the underlying buyer/seller or provider/beneficiary transaction.

The original HEIC/HEIF remains client-local for conversion. No failure path, OOM, timeout, offline state, decoder crash or decoder revocation may redirect the original to a server HEIC converter.

## Implemented foundation

- bounded HEIF/ISO-BMFF preflight;
- HEVC-still-only and conservative memory admission;
- 40 MP content ceiling separated from 384 MiB WASM memory ceiling;
- HEIF decode concurrency = 1;
- decoder policy confirmation/integrity/expiry/revoke-disable contract;
- Native/WASM adapter contract with no unsafe second-decoder retry after native decode begins;
- bounded non-sensitive Media Passport;
- authoritative server JPEG/WebP derivative verification and safe rewrite port contract;
- idempotent/residency-aware media operation contract;
- reuse of V13.1 asset/derivative manifests instead of a second media identity model;
- canonical media delivery policy: platform-generated public ID, HTTPS isolated media origin in Production, image-only MIME, `nosniff`, cookie-free ordinary public delivery;
- static-delivery admission for versioned F05 `.wasm` only under `/workers/media/` without broadening user-media caching;
- OWNER B+ design, hardening addendum, written-spec approval and implementation plan.

## TIGER Media Zero-Trust Shield hardening

The current F05 successor adds the hardening addendum `docs/superpowers/specs/2026-08-14-f05-zero-trust-media-shield-addendum.md`.

Implemented controls include:

- **One-Way Media Diode:** original HEIC/HEIF bytes never become an upload/conversion fallback;
- **Dual Sanitization Proof:** client JPEG/WebP bytes are parsed for privacy before leaving the Worker, then the server independently validates and rewrites them before publication;
- client JPEG metadata denial for EXIF/XMP/IPTC/comments/private or unknown APP segments;
- client WebP denial for EXIF/XMP/animation/unknown chunks with bounded malformed-structure handling;
- server final gate magic-byte authority, candidate/rewrite re-inspection, metadata/polyglot denial and bounded security-audit events;
- Worker timeout + forced termination + fresh Worker on the next operation;
- explicit OOM and WebAssembly runtime-trap classification without decoder fallback;
- runtime sRGB Canvas request plus explicit context-attribute mismatch rejection;
- Display-P3/wide-gamut/ICC golden-reference evidence kept open rather than inferred from labels;
- Fetch integrity metadata for the pinned WASM **plus** independent SHA-256 recomputation before instantiation;
- privacy-budget telemetry schema using only coarse operational buckets and policy versions;
- no telemetry filename/path, EXIF/GPS, raw bytes, user/listing/device IDs, public image hash or free-form stack traces.

## Promoted real decoder artifact

A real pinned Emscripten build has been produced and promoted. No placeholder binary is used.

Pinned toolchain/source contract:

- Emscripten `6.0.6`;
- libheif `1.23.1`, source SHA-256 `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`;
- libde265 `1.1.1`, source SHA-256 `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`;
- HEVC decoder-only policy; AOM/WebCodecs/uncompressed/OpenJPEG disabled;
- initial memory 64 MiB; hard maximum 384 MiB;
- generated JS SHA-256 `c7df4459e108265b88706cf9345e1f6a936b545a2573462effc8caaf36cad92a`;
- generated WASM SHA-256 `37371c91a21267de724838fe62476c6e57b422b3a9ebf954bbcca0b99aa99d78`;
- runtime Fetch integrity metadata `sha256-NzcckaISZ95ySDj+Ykdsble0IrOp6/lUu8yguZqpnXg=` plus independent digest comparison.

Promoted paths:

- `workers/media/f05-heif-decoder.v1.js`;
- `workers/media/f05-heif-decoder.v1.wasm`;
- `workers/media/f05-heif-decoder.v1.manifest.json`;
- `workers/media/f05-heif-decoder.v1.checksums.sha256`.

## Exact-head discipline

Every source change creates a new evidence head. Prior CI success is historical after the head moves. Final F05 evidence is valid only when all mandatory gates execute real jobs against one immutable final source SHA/artifact set.

A regression gate initially rejected the new Fetch `integrity` option because its old test required an exact two-option fetch object. That regression was corrected to require the same-origin WASM target, pinned Fetch integrity metadata and the independent SHA-256 recomputation. This was a test-contract update, not a weakening of the network boundary.

## Remaining F05 closure gates

F05 is not `EXACT_HEAD_PASS` until all are complete:

1. full exact-head VVIP Quality Gate, V14, CodeQL, Dependency Review, TIGER CleanGuard, Project Control Integrity and F05 WASM build PASS on one final source SHA/artifact set;
2. fresh real browser/device HEIC tests, including forced WASM fallback, genuine native route when available, offline-with-pack, offline-without-pack, cancellation, memory rejection/OOM recovery and zero original-media network/persistence;
3. real Display-P3/wide-gamut/ICC golden-reference color comparison on the final decoder artifact;
4. real EXIF/GPS/orientation privacy evidence on non-personal fixtures;
5. actual Production server image-stack wiring for `inspectCandidate` and `rewriteCanonical`, request-level byte limits and security-audit sink, followed by bypass tests against that deployed adapter;
6. Production telemetry sink/alerting and format-circuit-breaker policy without sensitive identifiers;
7. required LGPL and HEVC/H.265 launch-scope legal/product review.

## PRs

- Product Draft PR: #239 — stacked on exact-head F04.
- Verification-only Draft PR: #238 — targets `main` only to trigger full gates; **DO NOT MERGE**.

## Verdict

`F05_EXACT_HEAD_PASS = FALSE`

`GLOBAL_LAUNCH_ELIGIBLE = FALSE`

This verdict is deliberately fail-closed. The engineering hardening is materially stronger, but Production closure still requires real-device, real server-port, color-reference, operational and legal evidence.
