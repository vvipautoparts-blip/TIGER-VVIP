# F05 Isolated Device Preview Design

**Status:** APPROVED BY OWNER — implementation authorized on 2026-08-14.

## Purpose

Create a temporary, independent browser/device preview for PR #239 so F05 HEIC/HEIF can be exercised on real iPhone Safari and Android Chrome before any merge or Production deployment.

## Binding safety boundaries

- The preview MUST NOT deploy to GitHub Pages, `tigerautoparts.shop`, `www.tigerautoparts.shop`, `main`, or any Production environment.
- PR #239 remains Draft and unmerged during device evidence collection.
- The preview is static delivery only. It MUST NOT introduce a server-side HEIC/HEIF conversion path, upload endpoint for original HEIC/HEIF, hidden fallback, checkout, payment, delivery, dispute, or other transaction-party behavior.
- Original HEIC/HEIF processing remains local in the browser Worker/WASM path. Only the existing application behavior may produce sanitized JPEG/WebP candidates.
- The preview source MUST be pinned to the exact PR head SHA used for the evidence record.
- The preview server MUST provide HTTPS and the isolation headers needed by F05 (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) and must serve the pinned WASM asset with a valid WebAssembly MIME type.
- The preview MUST be disposable and independent of Production credentials and Production deployment authority.

## Architecture

Use a dedicated temporary Replit web app as an isolated static preview host. The app mirrors the exact PR #239 head commit and serves that source without application-level backend processing. A minimal static server supplies the security/isolation response headers required by the browser Worker/WASM runtime and exposes one HTTPS preview URL for physical-device testing.

Replit is used only as a temporary preview origin. It is not adopted as TIGER VVIP Production infrastructure and does not alter the existing GitHub Pages Production deployment.

## Source integrity

At preview creation time, record:

- repository: `vvipautoparts-blip/TIGER-VVIP`;
- pull request: `#239`;
- branch: `feat/f05-hybrid-heic-local-media-isolated-20260814`;
- exact head SHA;
- preview URL;
- evidence timestamp.

The preview must display or expose enough non-sensitive build metadata to verify the exact source SHA being served. If the PR head moves, the prior preview evidence is stale and device tests must be rerun against a newly pinned preview.

## Required preview behavior

The preview must:

1. open over HTTPS on desktop and physical phones;
2. load F05 Worker and the pinned local decoder WASM successfully;
3. return COOP/COEP isolation headers;
4. make `SharedArrayBuffer` available where the target browser supports cross-origin isolation;
5. keep HEIC/HEIF bytes inside the client-side media path;
6. fail closed on unsupported/hostile inputs and on Worker timeout;
7. preserve existing JPEG/PNG/WebP behavior;
8. avoid any Production secret, Production deployment token, or Production environment mutation.

## Device evidence gate

The preview is not a launch authorization by itself. F05 remains incomplete until evidence is recorded for the target physical-device paths, including at minimum:

- iPhone Safari real HEIC selection and successful local processing;
- Android Chrome HEIC/HEIF path where device/browser input permits it;
- output image correctness/orientation;
- no original HEIC server upload/fallback observed;
- final output privacy/metadata inspection;
- exact-head CI gates after any code correction discovered by the device run.

## Completion language

Do not use the phrase `جاهز للانطلاق العالمي` as an engineering completion claim until the required device evidence, legal/HEVC launch-scope review, and exact-head release gates are actually complete. Until then, report the precise remaining blockers.