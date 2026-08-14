# F05 B+ — TIGER Sovereign Media Fabric Status

**Status:** ENGINEERING FOUNDATION PASS / DECODER ARTIFACT + REAL DEVICE + LEGAL GATES OPEN

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

**Verified predecessor:** F04 `02cfc8cf91cc9a221dc3a4f46f9aa0317eb2f272`

## OWNER invariant

F05 remains advertisement-media infrastructure only. It does not add checkout, escrow, delivery, settlement, marketplace commission/payout, warranty execution, dispute resolution, or any platform role in the underlying buyer/seller or provider/beneficiary transaction.

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

## CI evidence before this status-only commit

Source SHA `8d762d419934e22d6ee3d12e65b5d7abb6fdcce4`:

- VVIP Quality Gate #962 — SUCCESS;
- V14 Release Candidate #420 — SUCCESS;
- TIGER CleanGuard #484 — SUCCESS;
- Dependency Review #768 — SUCCESS;
- Project Control Integrity #915/#916 — SUCCESS;
- CodeQL #868 was still running at the last captured read and must not be reported PASS until confirmed.

A final F05 verdict must use the final post-status source SHA, not the evidence above.

## Open engineering gate — real decoder artifact

The current execution sandbox has `cmake 3.31.6` and `node v22.16.0`, but **does not contain Emscripten `emcc`**. Therefore the required pinned decoder artifact has not been built in this run:

- `workers/media/f05-heif-decoder.js` — not generated;
- `workers/media/f05-heif-decoder.wasm` — not generated;
- final artifact checksum — not invented;
- final SBOM/provenance for produced binary — not invented.

No placeholder WASM binary may be committed merely to make F05 appear complete.

Required build authority remains:

- libheif v1.23.1 / commit `2c4bbb54c2738d4a5efbbe3e5fa1d5d76bb88eb0` / source archive SHA-256 `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`;
- libde265 v1.1.1 / commit `4dd701fffac01632ffd5cabc5ef10deb56accba1` / source archive SHA-256 `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`.

## Open evidence gates

F05 is not `EXACT_HEAD_PASS` until all are complete:

1. real pinned Emscripten/WASM decoder build with 384 MiB hard maximum and decoder-only HEVC configuration;
2. generated JS/WASM integrity manifest, checksums, SBOM, reproducible build record and provenance;
3. integration of the real decoder through the F05 adapter into PR36 without advertising HEIC support before runtime availability;
4. fresh real browser/device HEIC tests, including forced WASM fallback, offline-with-pack, offline-without-pack, cancellation, memory rejection and zero original-media network/persistence;
5. fresh EXIF/GPS/color/orientation evidence on real fixtures;
6. required LGPL and HEVC/H.265 launch-scope legal/product review;
7. final exact-head VVIP Quality Gate, V14, CodeQL, Dependency Review, TIGER CleanGuard and Project Control Integrity all PASS on one final source SHA/artifact set.

## PRs

- Product Draft PR: #239 — stacked on exact-head F04.
- Verification-only Draft PR: #238 — targets `main` only to trigger full gates; **DO NOT MERGE**.

## Verdict

`F05_EXACT_HEAD_PASS = FALSE`

`GLOBAL_LAUNCH_ELIGIBLE = FALSE`

This status is intentionally fail-closed. Green CI on foundation contracts does not substitute for a real decoder artifact, real browser/device evidence or legal review.
