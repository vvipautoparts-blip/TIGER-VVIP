# F05 B+ — TIGER Sovereign Media Fabric Status

**Status:** REAL PINNED DECODER ARTIFACT PROMOTED / RUNTIME + DEVICE + LEGAL GATES OPEN

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

## Promoted real decoder artifact

A real pinned Emscripten build has now been produced and promoted. No placeholder binary is used.

Build source head: `3dd90cc10e27cc6ee6d9b361ead553783b3db33a`.

Pinned toolchain/source contract:

- Emscripten `6.0.6` (`ce75e06884093bcefb86a6b8fd56a5d62a4cc245`);
- libheif `1.23.1`, source SHA-256 `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`;
- libde265 `1.1.1`, source SHA-256 `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`;
- HEVC decoder-only policy; AOM/WebCodecs/uncompressed/OpenJPEG disabled;
- initial memory 64 MiB; hard maximum 384 MiB;
- generated JS SHA-256 `c7df4459e108265b88706cf9345e1f6a936b545a2573462effc8caaf36cad92a`;
- generated WASM SHA-256 `37371c91a21267de724838fe62476c6e57b422b3a9ebf954bbcca0b99aa99d78`.

Promoted paths:

- `workers/media/f05-heif-decoder.v1.js`;
- `workers/media/f05-heif-decoder.v1.wasm`;
- `workers/media/f05-heif-decoder.v1.manifest.json`;
- `workers/media/f05-heif-decoder.v1.checksums.sha256`.

## Exact-head CI trigger integrity

The artifact-promotion commit `39b99b0cdc5adda3a64cfcf6d3d860254f71e7f4` was authored by `github-actions[bot]`. GitHub created the associated PR workflow suites with conclusion `action_required` and **zero jobs**, so those suites are not valid PASS/FAIL execution evidence and must not be counted as verification.

This status update intentionally creates a normal owner-authored successor SHA so the full PR gates can execute on a non-bot head. Final F05 evidence must be collected only from the exact successor SHA and must include real jobs.

## Remaining F05 evidence gates

F05 is not `EXACT_HEAD_PASS` until all are complete:

1. full exact-head VVIP Quality Gate, V14, CodeQL, Dependency Review, TIGER CleanGuard and Project Control Integrity with real jobs and PASS on one final source SHA/artifact set;
2. integration of the promoted decoder through the F05 adapter into the PR36 worker/runtime without advertising HEIC support before runtime availability;
3. fresh real browser/device HEIC tests, including forced WASM fallback, offline-with-pack, offline-without-pack, cancellation, memory rejection and zero original-media network/persistence;
4. fresh EXIF/GPS/color/orientation evidence on real fixtures;
5. malformed/truncated/bomb-style HEIF rejection and bounded resource tests around the real adapter;
6. required LGPL and HEVC/H.265 launch-scope legal/product review.

## PRs

- Product Draft PR: #239 — stacked on exact-head F04.
- Verification-only Draft PR: #238 — targets `main` only to trigger full gates; **DO NOT MERGE**.

## Verdict

`F05_EXACT_HEAD_PASS = FALSE`

`GLOBAL_LAUNCH_ELIGIBLE = FALSE`

This status is fail-closed. A promoted decoder artifact is necessary but does not substitute for exact-head CI, runtime integration, real device/browser evidence, adversarial media tests, or legal review.
