# F05 — TIGER Sovereign Media Fabric (B+) Design

**Status:** OWNER B+ architecture approved / written-spec review pending

**Date:** 2026-08-14

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

**Verified predecessor:** F04 final head `02cfc8cf91cc9a221dc3a4f46f9aa0317eb2f272`

**Binding Owner marketplace invariant:** `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`

## 1. Owner decision

The OWNER approved **F05 B+ — TIGER Sovereign Media Fabric**.

The governing architecture is:

> **Privacy on Client + Authority on Server.**
>
> HEIC/HEIF decoding and transcoding remain local-first. The original HEIC/HEIF bytes are never sent to VVIP TIGER merely for media conversion and never become a publishable platform asset. The browser produces only a sanitized canonical WebP/JPEG derivative. The server does not trust the browser result: it performs an authoritative derivative verification and safe canonical rewrite before the asset may become publishable media.

The resulting end-to-end flow is:

`Untrusted Selection → Bounded Probe → Native/WASM Decode Adapter → Canonical Pixel Surface → PR36 Encode → Media Passport → Authoritative Server Derivative Gate → Canonical Media Storage/Delivery`

The earlier branch `feat/f05a-fusion-hybrid-media-intake-20260813` used a **server-quarantine HEIC route**. That architecture is **SUPERSEDED / HISTORICAL ONLY** and must not be merged, cherry-picked, copied, or reintroduced unless the OWNER explicitly replaces this decision.

## 2. Product principle — no UI clutter

F05 is infrastructure, not a new user workflow.

The ordinary advertiser sees only the existing photo action:

`إضافة صور → اختيار الصور → معاينة → نشر الإعلان`

The UI must not expose technical choices such as Native/WASM, HEVC, decoder packs, EXIF, sRGB, Media Passport, or storage verification. A successful image appears normally. A failed image produces one stable user-facing message family without implementation details.

F05 does not add checkout, escrow, delivery, settlement, marketplace commission, warranty execution, dispute resolution, customer-service intermediation, or any other transaction-party behavior. It only protects and normalizes media attached to platform advertisements.

## 3. Goals

F05 must:

1. preserve the existing PR36 seven-photo safety model instead of rebuilding it;
2. add secure HEVC-coded HEIC/HEIF still-image support;
3. keep original HEIC/HEIF conversion local-first and prevent server-side HEIC decode as a normal product path;
4. prevent any HEIC/HEIF original from becoming public/persistent listing media;
5. normalize decoded content to a metadata-free, display-oriented, 8-bit sRGB canonical pixel surface;
6. reuse the existing PR36 crop/encode/session pipeline for the final derivative;
7. create a bounded, non-sensitive Media Passport for auditability and verification;
8. require an authoritative server-side derivative gate before publication;
9. isolate canonical media storage and delivery from the application trust boundary;
10. support native HEIC/HEIF decoding when explicitly reported supported and a pinned WASM fallback otherwise;
11. provide a decoder kill switch and version revocation mechanism without requiring a full application rewrite;
12. provide supply-chain provenance, SBOM, pinned source/toolchain/build records and third-party compliance evidence;
13. operate safely on low-memory/mobile devices through admission control, bounded concurrency and hard memory ceilings;
14. retain offline conversion when the native decoder or exact fallback decoder pack is already installed;
15. remain adapter-based so future image formats can be added without replacing PR36, the UI, storage contract, or security model.

## 4. Non-goals

F05 does **not** add:

- server-side HEIC/HEIF conversion as a normal fallback;
- upload or persistence of original HEIC/HEIF bytes;
- HEIC/HEIF encoding;
- video, Live Photo video, timed HEIF sequences, animated media, `image/heic-sequence`, or `image/heif-sequence` support;
- AVIF, VVC, AVC, JPEG-in-HEIF, uncompressed-HEIF or other HEIF codec expansion; F05 accepts only an **HEVC/H.265-coded primary still image**;
- a second image editor, cropper, gallery, upload UI, or media workflow separate from PR36;
- client-side security authority over a publishable derivative;
- public media IDs derived directly from user filenames or cross-user content hashes;
- permanent storage of raw user EXIF/XMP/GPS/private metadata;
- a global-launch, 4M capacity, legal-compliance or production-safety claim merely because engineering unit tests pass.

## 5. Existing PR36 invariants retained

PR36 remains the canonical local image-processing/session contract. These values are unchanged:

- maximum photos: **7**;
- maximum source file: **15 MiB**;
- maximum selection: **60 MiB**;
- maximum decoded pixels: **40,000,000**;
- minimum source dimensions: **320 × 240**;
- output geometry: exact **4:3**;
- maximum output: **1600 × 1200**;
- no upscale;
- WebP quality **0.82**;
- JPEG fallback quality **0.86**;
- PR36 scheduler maximum concurrency: **2**;
- HEIC/HEIF decoder lane maximum concurrency: **1**;
- photo deadline: **20 seconds**;
- session deadline: **120 seconds**;
- edit debounce: **250 ms**;
- stale-result suppression, cancellation, object-URL cleanup, source release and metadata-only projection remain mandatory.

JPEG/PNG/WebP continue through the current PR36 path. F05 may add shared routing/admission hooks but must not weaken or replace the tested PR36 contracts.

No new arbitrary 4096-pixel clamp is introduced. The authoritative limits remain the 40 MP source ceiling and the existing <=1600×1200 canonical output.

## 6. Threat model

Every selected HEIC/HEIF byte is hostile until reduced to a server-verified canonical derivative.

Required defenses cover:

- false extensions and false declared MIME;
- malformed ISO-BMFF boxes, oversized lengths, integer overflow and truncation;
- incompatible or contradictory `ftyp` brands;
- HEIF/polyglot tricks;
- non-HEVC primary-image codecs hidden in a generic HEIF container;
- timed sequences, animation or video tracks disguised as still media;
- decompression bombs and oversized decoded planes;
- decoder integer overflow, OOB, assertion, DoS and allocation failure;
- malicious EXIF/XMP/GPS/private metadata;
- orientation double-application or ambiguity;
- unsupported or ambiguous color transforms;
- stale/wrong worker replies and worker crashes;
- WASM/runtime supply-chain substitution;
- low-memory device exhaustion;
- object URL or original-byte persistence;
- exfiltration through fetch/XHR/beacon/WebSocket/storage APIs;
- direct attacker calls to the upload API that bypass the browser media pipeline;
- spoofed `Content-Type`, dimensions, policy version or Media Passport fields;
- malicious JPEG/WebP derivatives submitted directly to the server;
- content-sniffing and public media path confusion;
- hash-based cross-user existence probing;
- revoked decoder versions continuing to run indefinitely offline.

## 7. Trust boundaries and data flow

### Boundary A — untrusted selection

The selection step may inspect file count and byte size. Filename extension is never authoritative.

Declared HEIC/HEIF MIME is advisory. Empty or generic MIME may proceed to bounded preflight; only a positive container result can enter the HEIF decode path.

### Boundary B — bounded ISO-BMFF preflight

A pure parser reads at most PR36 `maxHeaderBytes = 262144` bytes and walks box boundaries with overflow-safe arithmetic.

It must:

- require a valid `ftyp` structure;
- normalize compatible brands;
- identify the HEIC/HEIF still-image family;
- reject AVIF-only, unknown, contradictory or truncated containers;
- reject impossible/overflowing box sizes;
- never allocate memory based directly on an untrusted box length;
- never trust extension or filename;
- emit only bounded technical format facts.

Positive preflight permits decoder admission; it does not declare the file safe.

### Boundary C — memory and resource admission

Before full decode, F05 derives an estimated worst-case working-set from trusted parser/decoder metadata and current platform policy.

Admission must fail closed when the operation cannot stay within the configured safety envelope.

Rules:

- decoded pixels must be <= **40,000,000**;
- HEIF decode concurrency is **1**;
- WASM maximum linear memory is **384 MiB**;
- the 384 MiB value is a hard ceiling, not a claim that every 40 MP file will fit;
- integer-safe width/height/stride/plane calculations are mandatory;
- allocation/growth failure maps to `heif_memory_limit`;
- no second concurrent HEIF worker may be admitted to work around a memory rejection;
- where the pinned decoder safely supports tile-oriented processing, the adapter may exploit it internally without changing the canonical output contract.

### Boundary D — isolated local decoder zone

The HEIC/HEIF bytes are transferred to a dedicated worker as a **Transferable ArrayBuffer**; the main-thread buffer becomes detached after ownership transfer.

The worker selects exactly one decode engine:

1. **Native:** only when `ImageDecoder.isTypeSupported()` exists and explicitly resolves true for `image/heic` or `image/heif` before untrusted decode begins.
2. **WASM:** used when the native capability probe is unavailable/false and the exact pinned fallback pack is authorized and available.

After a structural/security rejection or after native decode has begun and rejected the input, the same hostile bytes are not automatically retried through the other decoder.

### Boundary E — still-image/codec validation

Before committing decoded pixels, F05 must verify:

- valid primary image;
- primary compression codec is **HEVC/H.265**;
- still image only;
- no timed sequence / animation / video track;
- dimensions >= **320×240**;
- decoded pixels <= **40,000,000**;
- no unsupported/ambiguous orientation;
- decoder security limits remain enabled;
- auxiliary thumbnails/depth/alpha do not become independent listing media.

### Boundary F — canonical pixel surface

Native and WASM adapters output one internal contract:

`{ width, height, pixelsOrDisplayFrame, orientationApplied, colorSpace: "srgb", sourceKind: "heic"|"heif", decodeRoute: "native"|"wasm" }`

Requirements:

- orientation/mirror transforms applied exactly once;
- target output is 8-bit sRGB;
- HDR/wide-gamut input is converted to bounded sRGB;
- unsupported/ambiguous conversion fails closed;
- EXIF/XMP/GPS/ICC/NCLX source payloads are not copied into derivative metadata;
- alpha is handled deterministically; JPEG fallback composites alpha against the defined opaque background;
- decoder handles, temporary planes and buffers are released on success/failure/cancel.

### Boundary G — PR36 canonical derivative

The canonical pixel surface enters the existing PR36 geometry/encode path:

- exact 4:3 crop;
- <=1600×1200;
- no upscale;
- WebP 0.82;
- JPEG 0.86 fallback;
- output MIME only `image/webp` or `image/jpeg`;
- existing PR36 output ratio/dimension/size validation still applies.

No HEIC/HEIF original is passed into PR32/PR33/listing persistence.

### Boundary H — Media Passport

Each candidate derivative receives a bounded Media Passport before upload.

Required fields:

- `schemaVersion: "F05_MEDIA_PASSPORT_V1"`;
- `mediaPolicyVersion`;
- `processorVersion`;
- `sourceClass: "heic"|"heif"|"jpeg"|"png"|"webp"`;
- `decodeRoute: "native"|"wasm"|"pr36-native"`;
- `outputMime: "image/webp"|"image/jpeg"`;
- `width`;
- `height`;
- `sizeBytes`;
- `sha256` of the candidate derivative bytes;
- `metadataStripped: true`;
- `colorSpace: "srgb"`;
- `createdAt` in bounded UTC representation.

Forbidden fields:

- original filename;
- original local path;
- EXIF/XMP/GPS payloads;
- raw source bytes;
- user device identifiers;
- public URL;
- cross-user content identity.

The Media Passport is diagnostic evidence, **not security authority**.

### Boundary I — authoritative server derivative gate

This is the security authority before publication.

The server accepts only candidate JPEG/WebP derivative bytes through the normal authenticated advertisement-media path. It never treats the client Media Passport as proof.

The gate must independently verify:

- authenticated actor and authorized advertisement/media scope;
- upload request size limits;
- magic bytes / structural format;
- authoritative MIME;
- output is JPEG or WebP only;
- decoded dimensions <=1600×1200;
- exact 4:3 ratio;
- nonzero and bounded byte size;
- SHA-256 consistency with the supplied passport;
- accepted `mediaPolicyVersion` and processor policy;
- no forbidden embedded metadata or unsupported chunks;
- no script/document/polyglot interpretation;
- rate/abuse policy independent of client-side limits.

After validation, the server performs a **safe canonical image rewrite/re-encode** using its trusted JPEG/WebP image stack. This is deliberately lightweight compared with server HEIC decode. The rewritten bytes, not the original client candidate bytes, become the publishable canonical object.

Server-side HEIC decode remains forbidden in this normal path.

### Boundary J — canonical storage and delivery

Canonical media storage uses platform-generated object identifiers, not filenames and not raw content hashes as public identities.

Requirements:

- storage path/object ID generated by the platform;
- no user filename in public object path;
- raw SHA may be retained privately for integrity/audit but is never a cross-user public identifier;
- public responses use authoritative image Content-Type;
- `X-Content-Type-Options: nosniff` on media delivery;
- media delivery is isolated from executable application/document paths;
- no HTML/SVG/script active content accepted by F05;
- immutable/versioned canonical objects preferred; replacement creates new identity/version rather than silently mutating bytes under an old digest;
- deletion lifecycle follows platform data-retention rules without creating a transaction/service role.

## 8. Decoder architecture

### Native decoder path

Only `ImageDecoder.isTypeSupported()` authorizes the native path. The mere existence of `ImageDecoder`, `createImageBitmap`, file extension, declared MIME, or `<img>` decode success elsewhere is insufficient.

Native output still passes F05 codec, dimensions, memory admission, still-image, color, orientation and derivative policies.

### WASM decoder path

The fallback is built from pinned upstream source and hosted same-origin.

Pinned initial source authority:

- `libheif v1.23.1`
  - tag commit: `2c4bbb54c2738d4a5efbbe3e5fa1d5d76bb88eb0`
  - release source archive SHA-256: `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`
- `libde265 v1.1.1`
  - tag commit: `4dd701fffac01632ffd5cabc5ef10deb56accba1`
  - release source archive SHA-256: `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`

Build/runtime requirements:

- decoder-only HEVC path;
- do not ship x265 or HEIC encoder capability;
- experimental libheif APIs disabled;
- upstream decoder security limits enabled and never disabled;
- no dynamic plugin discovery;
- no filesystem, socket or user-media persistence/network interface exposed to decoder code;
- same-origin checksum-bound decoder JS/WASM asset fetch is the only decoder-related runtime network access;
- single-threaded baseline; no SharedArrayBuffer requirement;
- WASM hard maximum linear memory **384 MiB**;
- one HEIC/HEIF decode worker active at a time;
- operation-scoped/ephemeral worker termination releases the WASM heap;
- `_free`/decoder-specific release APIs are called for owned allocations before worker termination where applicable;
- binary, glue, source manifest, toolchain manifest and build recipe are checksum-bound.

## 9. Decoder pack, offline behavior and revocation

The fallback decoder is lazy-loaded. JPEG/PNG/WebP-only users must not download it merely by opening the platform.

Static/runtime behavior:

- F05 assets are same-origin and versioned;
- `.wasm` is allowed only in the existing approved worker/static asset boundary;
- the first authorized online fallback use may install the exact decoder pack in the static cache;
- before WASM instantiation, the worker computes SHA-256 with `crypto.subtle.digest()` and compares it with the immutable F05 manifest;
- mismatch maps to `heif_decoder_integrity_failed`;
- no user-selected media bytes are written to Cache Storage, IndexedDB, localStorage or other persistent browser storage;
- if native support exists, no fallback pack is required;
- if native support is unavailable and the exact approved pack is cached, offline HEIC may work;
- if native support is unavailable, the pack is absent and the device is offline, F05 fails closed with `heif_decoder_unavailable_offline`; it does not upload HEIC or switch to a server converter.

### Decoder revocation / kill switch

F05 defines a signed/server-confirmed decoder policy descriptor containing at minimum:

- `decoderPolicyVersion`;
- allowed decoder artifact version/digest;
- status: `ACTIVE | REVOKED | DISABLED`;
- `notBefore`;
- `expiresAt`;
- minimum accepted application policy version.

Rules:

- the kill switch may **disable/revoke**, never silently grant a new decoder version;
- revoked decoder packs are not used for new operations;
- online clients refresh the descriptor before installing/using an expired pack;
- offline use is allowed only while the last confirmed descriptor is unexpired and the exact pack remains active;
- expired/revoked/unknown policy fails closed;
- kill-switch state contains no user media information.

## 10. Supply-chain and legal compliance

Engineering completion is not a legal conclusion.

F05 requires a release-blocking compliance package for the WASM fallback:

- exact upstream source archives and SHA-256 values;
- exact source tag/commit references;
- unmodified LGPL license/notices;
- pinned compiler/Emscripten/toolchain versions;
- build flags and deterministic/reproducible build instructions;
- SBOM covering libheif/libde265/compiler runtime components included in the artifact;
- SLSA-style provenance record linking source inputs, builder/toolchain, build recipe and produced artifact digest;
- corresponding source/build material sufficient to rebuild/replace the linked decoder retained as a distributable compliance artifact;
- no runtime `latest` URL or mutable dependency resolution;
- legal/product review of LGPL delivery obligations;
- legal/product review of HEVC/H.265 distribution/licensing implications in each launch scope.

If the compliance gate is incomplete, WASM fallback remains disabled in Production even if all engineering tests pass.

## 11. Adapter architecture — no future rebuild

F05 defines a stable adapter boundary so future supported image formats do not require replacing PR36 or the UI.

Logical contract:

`probe(source) → admission(meta) → decode(source, policy) → canonicalPixels → pr36Encode() → mediaPassport → serverDerivativeGate()`

Each future format adapter must supply only:

- bounded probe;
- safe decoder adapter;
- canonical pixel output;
- format-specific error mapping.

It may not redefine:

- photo count/size policies;
- PR36 geometry/output contract;
- Media Passport schema authority;
- server derivative verification;
- storage identity policy;
- Owner marketplace boundary.

## 12. Required runtime file boundaries

Client-side/new:

- `scripts/media/f05-heif-preflight.js` — bounded ISO-BMFF/brand probe;
- `scripts/media/f05-heif-policy.js` — HEVC/still/memory/admission/error policy;
- `scripts/media/f05-media-passport.js` — bounded candidate passport construction;
- `scripts/media/f05-decoder-policy.js` — decoder artifact policy/revocation validation;
- `workers/media/f05-heif-worker.js` — native/WASM orchestration;
- `workers/media/f05-heif-decoder.js` — generated/pinned decoder glue;
- `workers/media/f05-heif-decoder.wasm` — pinned binary;
- `third_party/f05-heif/` — source manifest, digests, licenses, SBOM, provenance and build recipe.

Existing/minimal integration:

- PR36 policy/worker/controller/session files only where needed to route HEIF into the canonical pixel/PR36 path;
- `sw-vvip-static.js` only for narrowly tested versioned `.wasm` code-asset handling.

Server/new or existing extension:

- one authoritative advertisement-media derivative verification module;
- one canonical image rewrite adapter using the server's trusted JPEG/WebP image stack;
- canonical media object-ID/storage contract;
- upload API integration tests proving direct bypass attempts fail closed.

Protected root:

- do not add a new script tag to protected `index.html` merely to initialize F05;
- integrate through the already-loaded PR36/media path and current protected authentication flow.

## 13. Server derivative gate contract

The server derivative gate is deliberately small and format-limited. It never receives HEIC/HEIF in F05 B+.

Input:

`{ authenticatedActor, adScope, candidateBytes, mediaPassport }`

Output on success:

`{ canonicalMediaId, canonicalMime, width, height, sizeBytes, sha256, policyVersion }`

Success requires the server itself to decode/rewrite JPEG/WebP and derive the returned metadata from rewritten bytes.

Failure returns stable non-sensitive codes and no partially public object.

No raw client candidate bytes are made public before rewrite completion.

## 14. Observability and privacy

F05 may emit privacy-safe operational metrics only:

- source class bucket;
- decode route: native/WASM;
- success/failure code family;
- decode duration bucket;
- output-byte-size bucket;
- memory-admission rejection count;
- decoder policy version;
- server derivative-gate rejection family;
- offline-pack availability outcome.

Never log or persist:

- filename/path;
- EXIF/XMP/GPS;
- raw media bytes;
- decoded pixels;
- exact local filesystem details;
- user-visible image hash as a global/cross-user identity;
- decoder stack trace to ordinary analytics.

## 15. Error semantics and UX

Stable internal error families include at minimum:

- `heif_container_invalid`;
- `heif_codec_unsupported`;
- `heif_sequence_denied`;
- `heif_dimensions_invalid`;
- `heif_memory_limit`;
- `heif_orientation_uncertain`;
- `heif_color_unsupported`;
- `heif_decode_failed`;
- `heif_decoder_integrity_failed`;
- `heif_decoder_unavailable_offline`;
- `heif_decoder_policy_expired`;
- `heif_decoder_revoked`;
- `media_passport_invalid`;
- `media_derivative_invalid`;
- `media_derivative_rewrite_failed`;
- existing PR36 cancellation/timeout/stale/encode errors.

The ordinary Arabic UI maps these to short, non-technical messages. Decoder internals, filenames, byte offsets, raw metadata and stack traces are not shown.

The default generic failure copy is equivalent to:

`تعذر معالجة هذه الصورة بأمان. اختر صورة أخرى.`

## 16. Research/evidence basis

F05 B+ is intentionally aligned with public evidence without claiming unpublished internals of other platforms.

Product-format evidence:

- eBay public seller documentation accepts HEIC/AVIF and multiple common image formats, supporting the product principle that sellers should not manually convert modern phone formats.
- Etsy public image guidance accepts HEIC and documents sRGB conversion/orientation concerns.
- Shopify public image guidance accepts HEIC and automatically optimizes/delivers appropriate image formats.
- Meta Marketplace keeps the seller workflow at a simple add-photos abstraction; F05 follows that no-clutter product principle without assuming Meta's unpublished backend architecture.

Security/standards evidence:

- OWASP File Upload Cheat Sheet: defense in depth, do not trust Content-Type alone, store safely, generate names, and use image rewriting where applicable. This is the basis for the authoritative server derivative gate.
- W3C WebCodecs: codec support is implementation-dependent; F05 therefore never assumes native HEIC support.
- MDN ArrayBuffer transfer semantics: Transferable ArrayBuffer ownership transfer is used to avoid retaining a duplicate main-thread copy.
- Emscripten settings: explicit maximum WASM memory is used instead of allowing an unbounded/default growth ceiling.
- SLSA provenance: provenance records are used to bind source/build inputs to produced decoder artifacts.
- libheif/libde265 release/security information: F05 pins exact source releases and does not use mutable `latest` runtime resolution.

Reference URLs for the design record:

- `https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html`
- `https://www.w3.org/TR/webcodecs/`
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer`
- `https://emscripten.org/docs/tools_reference/settings_reference.html`
- `https://slsa.dev/spec/v1.2/provenance`
- `https://github.com/strukturag/libheif`
- `https://github.com/strukturag/libde265`
- `https://www.ebay.com/help/listings/selling/adding-pictures-listings?id=4148`
- `https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop`
- `https://help.shopify.com/en/manual/online-store/images/theme-images`

## 17. TDD and verification strategy

F05 implementation proceeds RED → GREEN task-by-task.

Required automated test families:

1. ISO-BMFF/HEIC/HEIF parser including malformed length/overflow/truncation/polyglot cases;
2. unchanged JPEG/PNG/WebP PR36 regression;
3. HEVC-primary still-image enforcement and sequence/video/non-HEVC denial;
4. memory admission, 40 MP limit, 384 MiB ceiling and single HEIF concurrency;
5. `ImageDecoder.isTypeSupported()` native selection and no unsafe second-decoder retry;
6. WASM adapter integrity, decoder-policy revocation/expiry, worker crash and stale reply;
7. Transferable buffer ownership and source release;
8. orientation/color canonicalization;
9. metadata stripping/GPS non-propagation;
10. exact PR36 7/15MiB/60MiB/40MP/4:3/no-upscale/1600×1200 invariants;
11. cancellation, 20s photo timeout, 120s session timeout and worker termination;
12. lazy static `.wasm` cache behavior without user-media persistence;
13. offline with valid pack/native and offline-without-pack fail-closed behavior;
14. Media Passport exact schema/forbidden-field tests;
15. server derivative gate bypass tests: spoofed MIME, bad magic, wrong dimensions, wrong ratio, bad SHA, metadata-bearing/malformed/polyglot candidate, direct API bypass;
16. canonical rewrite output tests and storage-ID/public-header tests;
17. kill-switch revocation tests;
18. privacy-safe observability tests;
19. real HEIC fixtures covering orientation/color/metadata plus hostile/truncated/sequence cases;
20. repository-wide F00–F04 and PR36 regressions;
21. exact-head VVIP Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard and Project Control Integrity.

## 18. Browser/device evidence required for closure

Automated tests alone do not close F05.

Fresh F05 evidence on its final source SHA must cover current canonical PR36 pages/protected equivalents:

- real iPhone/Android-produced HEIC still where available;
- genuine native route on a supporting browser/device when available;
- forced WASM fallback route;
- low-memory/admission rejection path;
- crop/zoom/pan and exact 4:3 derivative;
- Arabic RTL keyboard/focus behavior;
- cancellation/reset/pagehide cleanup;
- worker termination and no stale result;
- offline conversion with native capability or approved cached decoder pack;
- explicit fail-closed behavior when offline and decoder pack is absent/expired/revoked;
- zero network requests carrying original HEIC/HEIF bytes;
- zero persistent original/media bytes in browser storage;
- no EXIF/GPS propagation into candidate derivative/Media Passport/listing metadata;
- balanced object URLs/resources;
- JPEG/PNG/WebP PR36 behavior unchanged;
- server accepts valid candidate derivative then emits a rewritten canonical object;
- direct malicious/bypass upload attempts are rejected before publication;
- public canonical media has correct image Content-Type and `nosniff` behavior.

The old PR36 `MANUAL_BROWSER_EVIDENCE.md = NOT RUN` is historical evidence only and cannot close F05.

## 19. Performance/capacity evidence

F05 does not equate a unit-test pass with mobile performance certification.

Required diagnostic matrix includes at minimum:

- source sizes near typical phone HEIC and near policy maxima;
- decoded pixel buckets through 40 MP;
- native vs WASM decode routes;
- low-memory admission/rejection cases;
- worker startup/termination overhead;
- peak observed browser memory where measurable;
- encode duration/output bytes;
- server JPEG/WebP verification/rewrite duration;
- concurrent ordinary JPEG/PNG/WebP jobs while HEIF lane remains concurrency 1.

Numbers are diagnostics until a separate launch/capacity gate promotes them to SLO evidence.

## 20. Rollback and emergency posture

F05 rollback must not require replacing PR36.

Rollback levers:

1. disable/revoke WASM decoder through decoder policy;
2. disable HEIC/HEIF intake while retaining JPEG/PNG/WebP PR36;
3. roll back F05 client routing modules;
4. retain authoritative JPEG/WebP server derivative gate because it strengthens all media uploads and does not require HEIC;
5. retain canonical storage/media-ID protections;
6. invalidate/remove obsolete decoder code assets from active static manifest/cache policy.

A decoder CVE therefore does not require disabling the entire marketplace or ordinary image support.

## 21. Exit criteria

F05 may be marked `EXACT_HEAD_PASS` only when all conditions below are true on one final source SHA/artifact set:

- B+ local native/WASM HEIC/HEIF still-image path implemented;
- F05A server-quarantine HEIC architecture inactive;
- original HEIC/HEIF never uploaded/persisted/published by the conversion path;
- primary image verified HEVC still; sequence/video/non-HEVC denied;
- PR36 limits and JPEG/PNG/WebP regressions pass;
- HEIF concurrency = 1;
- WASM memory cannot exceed 384 MiB and admission fails safely before unsafe work;
- Transferable ownership/source cleanup verified;
- canonical sRGB/orientation/metadata/privacy checks pass;
- Media Passport exact-schema tests pass;
- authoritative server derivative verification and canonical rewrite pass;
- direct API bypass/spoof/polyglot tests pass;
- canonical storage object-ID/public-header isolation passes;
- decoder integrity, expiry, revocation and offline rules pass;
- supply-chain SBOM/provenance/build/license artifacts complete;
- legal/product LGPL and HEVC launch-scope review recorded;
- fresh real HEIC browser/device evidence passes;
- privacy-safe observability verified;
- all required exact-head CI/security gates pass;
- no Production deploy, country activation, SQL/RLS mutation, protected-auth weakening, transaction intermediation, or final global-launch claim is made by the F05 PR.

Until every exit criterion is evidenced, F05 remains Draft and `GLOBAL_LAUNCH_ELIGIBLE` remains unchanged.
