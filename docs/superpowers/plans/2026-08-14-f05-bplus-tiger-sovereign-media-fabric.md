# F05 B+ — TIGER Sovereign Media Fabric Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the OWNER-approved F05 B+ media architecture without rebuilding PR36: local HEIC/HEIF decode, canonical JPEG/WebP generation, Media Passport, authoritative server derivative verification/rewrite, safe media identity/delivery contracts, decoder revocation, and global hardening.

**Architecture:** Reuse PR36 as the seven-photo crop/encode/session pipeline and reuse V13.1 media manifests/control-plane contracts as the server-authored identity foundation. Add only bounded F05 adapters around those foundations. The normal HEIC/HEIF path is `local probe/decode -> PR36 derivative -> Media Passport -> authenticated server derivative gate -> safe rewrite -> existing V13.1 manifest/object reference`, with no server-side HEIC conversion and no public/persistent HEIC original.

**Tech Stack:** JavaScript ES modules + browser UMD modules where PR36 requires them, Node.js `node:test`, Web Workers, WebCodecs `ImageDecoder` capability probe, Emscripten/WASM fallback, SHA-256 Web Crypto, existing V13.1 media contracts/manifests, existing static-delivery service worker, repository CI/security gates.

## Global Constraints

- OWNER rule remains advertising/discovery/direct-contact only; F05 cannot introduce marketplace checkout, escrow, delivery, settlement, commission/payout, warranty execution, or dispute resolution.
- Preserve PR36 exactly: 7 photos, 15 MiB/file, 60 MiB/selection, 40,000,000 decoded pixels, min 320x240, exact 4:3, max output 1600x1200, no upscale, WebP 0.82, JPEG 0.86, scheduler concurrency 2, photo timeout 20s, session timeout 120s, debounce 250ms.
- HEIC/HEIF decode lane concurrency is exactly 1.
- WASM maximum linear memory is exactly 384 MiB and is a hard ceiling, not an admission promise.
- Accept only HEVC/H.265-coded HEIC/HEIF primary still images. Deny sequences, video, AVIF-only, VVC, AVC, JPEG-in-HEIF, uncompressed HEIF and unsupported/ambiguous codecs.
- Original HEIC/HEIF bytes are never uploaded, persisted, published, moderated, cached, logged or used as server conversion input in the B+ normal path.
- Client Media Passport is diagnostic evidence, not security authority.
- Server accepts only candidate `image/jpeg` or `image/webp`, independently verifies it, safely rewrites it, and only rewritten bytes may become canonical media.
- Reuse `scripts/media/v13-media-contracts.js` and `scripts/media/v13-media-manifest.js`; do not create a second media identity/control-plane model.
- Reuse PR36 files; do not add a second editor/cropper/gallery.
- Do not mutate protected authentication root merely to initialize F05.
- No remote DB migration/apply, Production deployment, country activation, secret mutation, or global-launch claim is authorized by this implementation plan.
- F05A server-quarantine HEIC architecture is historical only and must not be copied/cherry-picked.
- Decoder runtime is same-origin, pinned, checksum-bound and revocable. No runtime `latest` URLs.
- `libheif v1.23.1` source tag commit `2c4bbb54c2738d4a5efbbe3e5fa1d5d76bb88eb0`, archive SHA-256 `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`.
- `libde265 v1.1.1` source tag commit `4dd701fffac01632ffd5cabc5ef10deb56accba1`, archive SHA-256 `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`.
- Written design and binding hardening addendum remain authoritative.

---

## File Map

### New client/pure modules
- `scripts/media/f05-heif-preflight.js` — bounded ISO-BMFF/brand parser.
- `scripts/media/f05-heif-policy.js` — HEVC still/resource/memory admission and stable errors.
- `scripts/media/f05-media-passport.js` — exact bounded Media Passport constructor/validator.
- `scripts/media/f05-decoder-policy.js` — active/revoked/expired decoder policy validation.
- `scripts/media/f05-heif-adapter.js` — native/WASM route selection contract and transferable ownership.
- `workers/media/f05-heif-worker.js` — isolated decode orchestration only.

### Existing client integration
- `scripts/media/pr36-policy.js` — retain constants; minimal HEIF routing hook only if required.
- `scripts/media/pr36-controller.js` — accept HEIC/HEIF and route through F05 adapter; no new UI workflow.
- `scripts/media/pr36-session.js` — reuse ownership/cancel/stale cleanup; modify only if an explicit adapter seam is required.
- `scripts/media/pr36-worker-adapter.js` — ordinary JPEG/PNG/WebP behavior remains unchanged.
- `sw-vvip-static.js` — admit/cache only checksum-bound F05 `.wasm` code assets under approved worker namespace.

### New server/pure boundary modules
- `scripts/media/server/f05-derivative-gate.js` — authoritative candidate validation.
- `scripts/media/server/f05-canonical-rewrite.js` — injected trusted JPEG/WebP rewrite port; no HEIC decoder.
- `scripts/media/server/f05-media-operation.js` — idempotency/replay/temp-lifecycle/residency/canonical commit contract.
- `scripts/media/server/f05-media-delivery-policy.js` — canonical object ID/header/media-origin policy.
- Existing `scripts/media/v13-media-contracts.js` and `scripts/media/v13-media-manifest.js` remain identity/manifest authority.

### Supply-chain records
- `third_party/f05-heif/SOURCE_MANIFEST.json`
- `third_party/f05-heif/BUILD.md`
- `third_party/f05-heif/SBOM.spdx.json`
- `third_party/f05-heif/PROVENANCE.json`
- `third_party/f05-heif/CHECKSUMS.sha256`
- license/notice files required by reviewed upstream distribution obligations.

### Tests
- `tests/media/f05-heif-preflight.test.cjs`
- `tests/media/f05-heif-policy.test.cjs`
- `tests/media/f05-decoder-policy.test.cjs`
- `tests/media/f05-heif-adapter.test.cjs`
- `tests/media/f05-media-passport.test.cjs`
- `tests/media/f05-pr36-integration.test.cjs`
- `tests/media/f05-derivative-gate.test.cjs`
- `tests/media/f05-media-operation.test.cjs`
- `tests/media/f05-static-delivery.test.cjs`
- `tests/media/f05-supply-chain.test.cjs`
- `tests/media/f05-real-fixtures.test.cjs`
- `tests/media/f05-owner-boundary.test.cjs`

---

### Task 1: Bound the HEIF container before decode

**Files:**
- Create: `tests/media/f05-heif-preflight.test.cjs`
- Create: `scripts/media/f05-heif-preflight.js`

**Interfaces:**
- Produces: `probeHeifHeader(bytes) -> { ok, code, family?, brands?, majorBrand? }`.
- No browser/network/storage dependency.

- [ ] **Step 1: Write failing parser tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const preflightPath = '../../scripts/media/f05-heif-preflight.js';

test('rejects truncated/overflow ISO-BMFF boxes', async () => {
  const { probeHeifHeader } = await import(preflightPath);
  assert.equal(probeHeifHeader(Uint8Array.of(0,0,0,32,0x66,0x74,0x79,0x70)).ok, false);
});

test('extension and declared MIME are not authority', async () => {
  const { probeHeifHeader } = await import(preflightPath);
  assert.deepEqual(probeHeifHeader(new Uint8Array(0)), { ok:false, code:'heif_container_invalid' });
});
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/media/f05-heif-preflight.test.cjs`
Expected: FAIL because module/function does not exist.

- [ ] **Step 3: Implement minimal bounded parser**

```js
export const MAX_HEIF_HEADER_BYTES = 262144;
export function probeHeifHeader(input) {
  const bytes = input instanceof Uint8Array ? input.subarray(0, MAX_HEIF_HEADER_BYTES) : new Uint8Array();
  if (bytes.length < 16) return Object.freeze({ ok:false, code:'heif_container_invalid' });
  // Parse box sizes with safe integer arithmetic; require ftyp; normalize brands.
  // Accept HEIC/HEIF still-family brands only; reject AVIF-only/unknown/truncated.
}
```

- [ ] **Step 4: GREEN and fuzz-style malformed cases**

Run: `node --test tests/media/f05-heif-preflight.test.cjs`
Expected: PASS including size=0, size=1/64-bit, overflow, repeated/truncated `ftyp`, contradictory brands and polyglot fixtures.

- [ ] **Step 5: Commit**

`git commit -m "feat(f05): add bounded HEIF preflight"`

---

### Task 2: Enforce HEVC-still and memory admission before expensive work

**Files:**
- Create: `tests/media/f05-heif-policy.test.cjs`
- Create: `scripts/media/f05-heif-policy.js`

**Interfaces:**
- Consumes preflight/decoder metadata.
- Produces `admitHeifDecode(meta, runtime) -> frozen allow/deny`.

- [ ] **Step 1: RED tests**

```js
assert.equal(admitHeifDecode({codec:'hevc',width:8000,height:5000,isStill:true},{activeHeifWorkers:0}).ok, true);
assert.equal(admitHeifDecode({codec:'av1',width:1600,height:1200,isStill:true},{activeHeifWorkers:0}).code, 'heif_codec_unsupported');
assert.equal(admitHeifDecode({codec:'hevc',width:8001,height:5000,isStill:true},{activeHeifWorkers:0}).code, 'heif_dimensions_invalid');
assert.equal(admitHeifDecode({codec:'hevc',width:1600,height:1200,isStill:false},{activeHeifWorkers:0}).code, 'heif_sequence_denied');
assert.equal(admitHeifDecode({codec:'hevc',width:1600,height:1200,isStill:true},{activeHeifWorkers:1}).code, 'heif_memory_limit');
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/media/f05-heif-policy.test.cjs`
Expected: FAIL missing module.

- [ ] **Step 3: Implement constants and overflow-safe admission**

```js
export const F05_LIMITS = Object.freeze({
  maxDecodedPixels: 40_000_000,
  maxWasmMemoryBytes: 384 * 1024 * 1024,
  maxHeifConcurrency: 1,
  minWidth: 320,
  minHeight: 240
});
```

Working-set estimation must be conservative and must deny when arithmetic is unsafe or estimated required memory exceeds policy.

- [ ] **Step 4: GREEN**

Run focused tests; require zero failures.

- [ ] **Step 5: Commit**

`git commit -m "feat(f05): enforce HEIF codec and memory admission"`

---

### Task 3: Make decoder version integrity and revocation fail closed

**Files:**
- Create: `tests/media/f05-decoder-policy.test.cjs`
- Create: `scripts/media/f05-decoder-policy.js`

**Interfaces:**
- Produces `validateDecoderPolicy(descriptor, now, artifactDigest)`.

- [ ] **Step 1: RED tests**

```js
const active = {decoderPolicyVersion:'F05_DECODER_POLICY_V1',artifactVersion:'libheif-1.23.1-vvip1',artifactSha256:'a'.repeat(64),status:'ACTIVE',notBefore:'2026-08-14T00:00:00Z',expiresAt:'2026-08-15T00:00:00Z',minimumAppPolicyVersion:'F05_BPLUS_V1'};
assert.equal(validateDecoderPolicy(active, Date.parse('2026-08-14T12:00:00Z'), 'a'.repeat(64)).ok, true);
assert.equal(validateDecoderPolicy({...active,status:'REVOKED'}, Date.now(), 'a'.repeat(64)).code, 'heif_decoder_revoked');
assert.equal(validateDecoderPolicy(active, Date.parse('2026-08-16T00:00:00Z'), 'a'.repeat(64)).code, 'heif_decoder_policy_expired');
assert.equal(validateDecoderPolicy(active, Date.parse('2026-08-14T12:00:00Z'), 'b'.repeat(64)).code, 'heif_decoder_integrity_failed');
```

- [ ] **Step 2: RED, then minimal implementation**

Descriptor may disable/revoke only; unknown/malformed/expired states deny. No client role label can enable a decoder.

- [ ] **Step 3: GREEN and immutability tests**

Run: `node --test tests/media/f05-decoder-policy.test.cjs`

- [ ] **Step 4: Commit**

`git commit -m "feat(f05): add decoder revocation policy"`

---

### Task 4: Isolate native/WASM decoding behind one adapter

**Files:**
- Create: `tests/media/f05-heif-adapter.test.cjs`
- Create: `scripts/media/f05-heif-adapter.js`
- Create: `workers/media/f05-heif-worker.js`

**Interfaces:**
- `createHeifAdapter({ nativeProbe, nativeDecode, wasmDecode, policy })`.
- `process({ jobId, bytes, mimeType, signal })` returns canonical pixel surface.

- [ ] **Step 1: RED route-selection tests**

```js
assert.equal((await adapterWithNative.process(job)).decodeRoute, 'native');
assert.equal((await adapterWithoutNative.process(job)).decodeRoute, 'wasm');
await assert.rejects(() => adapterNativeFails.process(job), /heif_decode_failed/);
assert.equal(wasmCalledAfterNativeFailure, false);
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement pre-decode native probe**

Native authority is exactly `ImageDecoder.isTypeSupported(mime)` resolving true before bytes enter ImageDecoder. Constructor presence alone is insufficient.

- [ ] **Step 4: Transfer ownership**

Worker posting uses `worker.postMessage(message, [arrayBuffer])`; test that source ArrayBuffer is detached/ownership-transferred in browser-capable harness and never copied into persistent storage.

- [ ] **Step 5: Worker fail-closed lifecycle**

Wrong jobId, stale reply, worker crash, cancellation, timeout, policy expiry, memory rejection and digest mismatch terminate the operation. The same hostile bytes are not retried through a second decoder after decode begins.

- [ ] **Step 6: GREEN and commit**

`git commit -m "feat(f05): add isolated HEIF decode adapter"`

---

### Task 5: Bind canonical pixels to PR36 without a second editor

**Files:**
- Create: `tests/media/f05-pr36-integration.test.cjs`
- Modify minimally: `scripts/media/pr36-controller.js`
- Modify only if required by seam: `scripts/media/pr36-session.js`

**Interfaces:**
- HEIF adapter output enters the same PR36 transform/encode result contract used by ordinary images.

- [ ] **Step 1: RED integration contract**

Assert: HEIC/HEIF input is accepted only through F05; JPEG/PNG/WebP remain unchanged; output is only WebP/JPEG; exact 4:3; <=1600x1200; no upscale; seven-photo/byte/session rules unchanged.

- [ ] **Step 2: Verify RED before controller change**

- [ ] **Step 3: Add one routing seam**

Do not create a second cropper. F05 returns a canonical decodable source/pixel surface to existing PR36 geometry/encoder APIs.

- [ ] **Step 4: UX contract**

UI remains existing add-photo workflow. Add Arabic generic mapping for F05 errors without exposing WASM/native/codec details.

- [ ] **Step 5: GREEN PR36 regressions**

Run F05 integration plus all existing PR36 tests.

- [ ] **Step 6: Commit**

`git commit -m "feat(f05): route HEIF through PR36 media session"`

---

### Task 6: Create a bounded Media Passport that has no authority

**Files:**
- Create: `tests/media/f05-media-passport.test.cjs`
- Create: `scripts/media/f05-media-passport.js`

**Interfaces:**
- `createMediaPassport(candidate, processingContext)`.

- [ ] **Step 1: RED exact-schema tests**

```js
assert.deepEqual(Object.keys(passport).sort(), ['colorSpace','createdAt','decodeRoute','height','mediaPolicyVersion','metadataStripped','outputMime','processorVersion','schemaVersion','sha256','sizeBytes','sourceClass','width'].sort());
for (const forbidden of ['filename','path','gps','exif','deviceId','publicUrl','rawBytes']) assert.equal(forbidden in passport, false);
```

- [ ] **Step 2: Implement `F05_MEDIA_PASSPORT_V1`**

SHA-256 must be exactly 64 lowercase hex; output MIME JPEG/WebP only; ratio/dimensions/size mirror PR36 canonical candidate rules; result deeply frozen.

- [ ] **Step 3: GREEN and commit**

`git commit -m "feat(f05): add bounded media passport"`

---

### Task 7: Add authoritative server derivative verification and rewrite

**Files:**
- Create: `tests/media/f05-derivative-gate.test.cjs`
- Create: `scripts/media/server/f05-derivative-gate.js`
- Create: `scripts/media/server/f05-canonical-rewrite.js`

**Interfaces:**
- `verifyAndRewriteCandidate({actor, adScope, candidateBytes, passport}, ports)`.
- Ports: `decodeCandidate`, `rewriteCanonical`, `sha256`, `authorizeAdMedia`.

- [ ] **Step 1: RED bypass tests**

Reject unauthenticated actor, wrong ad scope, spoofed Content-Type, bad magic, GIF/SVG/HTML/polyglot, dimensions >1600x1200, non-4:3, bad SHA, forbidden metadata/chunks, malformed candidate and client-only policy claims.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement cheap checks before decode**

Bound request bytes and signature first. Server never accepts HEIC/HEIF in this gate.

- [ ] **Step 4: Implement independent decode + rewrite**

```js
const decoded = await ports.decodeCandidate(candidateBytes);
const rewritten = await ports.rewriteCanonical(decoded, { mime: decoded.mime });
const canonicalSha256 = await ports.sha256(rewritten.bytes);
```

Returned width/height/MIME/hash derive from rewritten bytes, not passport.

- [ ] **Step 5: GREEN and commit**

`git commit -m "feat(f05): add authoritative derivative gate"`

---

### Task 8: Reuse V13.1 media identity, idempotency and residency instead of inventing a second backend

**Files:**
- Create: `tests/media/f05-media-operation.test.cjs`
- Create: `scripts/media/server/f05-media-operation.js`
- Reuse: `scripts/media/v13-media-contracts.js`
- Reuse: `scripts/media/v13-media-manifest.js`

**Interfaces:**
- `beginMediaOperation(context, request)` returns server-authored operation/asset identity.
- `commitCanonicalMedia(operation, rewritten, ports)` produces inputs valid for V13.1 asset/derivative manifests.

- [ ] **Step 1: RED idempotency/residency tests**

Same `(actor, adScope, operationId)` retry -> one canonical commit. Cross-actor or cross-ad replay -> deny. Missing required Data Residency Country -> deny. Operation ID is cryptographically random and never derived from filename/hash.

- [ ] **Step 2: Implement bounded state machine**

`reserved -> candidate_received -> verified -> rewritten -> committed` with terminal `rejected/expired`; no backward transition.

- [ ] **Step 3: Temporary candidate lifecycle**

Candidate object is private, non-public, not HEIC, max lifetime 24h, and cleanup is eligible immediately after canonical commit/failure.

- [ ] **Step 4: V13.1 manifest compatibility**

Use V13.1 `MEDIA_MIME_TYPES`, SHA-256, country/seal, server-authored asset/object reference and derivative purposes. Do not add parallel asset IDs or public paths.

- [ ] **Step 5: GREEN and commit**

`git commit -m "feat(f05): bind canonical media to V13 control plane"`

---

### Task 9: Isolate canonical media delivery and public headers

**Files:**
- Create: `scripts/media/server/f05-media-delivery-policy.js`
- Extend test: `tests/media/f05-media-operation.test.cjs`

**Interfaces:**
- `buildCanonicalDeliveryPolicy(object, deployment)`.

- [ ] **Step 1: RED tests**

Require platform-generated ID; reject filename/hash-as-public-ID; permit JPEG/WebP only; require dedicated media origin in Production; require `Content-Type` and `X-Content-Type-Options: nosniff`; no app cookies required for ordinary public-ad image delivery; deny HTML/SVG/JS/WASM in canonical image namespace.

- [ ] **Step 2: Implement pure policy object**

No CDN provider-specific code in core module.

- [ ] **Step 3: GREEN and commit**

`git commit -m "feat(f05): add canonical media delivery policy"`

---

### Task 10: Make fallback assets lazy, same-origin, offline-capable and integrity-bound

**Files:**
- Create: `tests/media/f05-static-delivery.test.cjs`
- Modify: `sw-vvip-static.js`

**Interfaces:**
- Existing static worker continues to ignore user media; only versioned code assets gain `.wasm` handling.

- [ ] **Step 1: RED tests**

Assert `.wasm` is accepted only under `/workers/`; candidate/user-image URLs are not cacheable by F05 path; offline-with-pack works; offline-without-pack returns `heif_decoder_unavailable_offline`; revoked/expired pack is not used for new operations.

- [ ] **Step 2: Minimal service-worker change**

Add `.wasm` to allowed static extension set without broadening approved prefixes. Do not cache uploaded images.

- [ ] **Step 3: Digest verification before instantiation**

`crypto.subtle.digest('SHA-256', wasmBytes)` must equal immutable manifest digest.

- [ ] **Step 4: GREEN and commit**

`git commit -m "feat(f05): cache pinned HEIF decoder assets safely"`

---

### Task 11: Pin the decoder build and produce compliance/provenance artifacts

**Files:**
- Create under `third_party/f05-heif/` the source manifest, checksums, build instructions, SBOM and provenance records.
- Binary/glue: `workers/media/f05-heif-decoder.wasm`, `workers/media/f05-heif-decoder.js` only after reproducible build succeeds.
- Test: `tests/media/f05-supply-chain.test.cjs`.

**Interfaces:**
- Build must be decoder-only HEVC, single-threaded, no dynamic plugins, no encoder, no experimental APIs, max WASM memory 384 MiB.

- [ ] **Step 1: RED manifest tests**

Assert exact libheif/libde265 tags/commits/source SHA-256 values; exact toolchain version; no `latest`; license files present; artifact digest matches manifest.

- [ ] **Step 2: Record deterministic build recipe**

Build recipe explicitly enables decoder security limits, disables plugins/encoders/experimental APIs and records all source/toolchain digests.

- [ ] **Step 3: Generate SBOM + SLSA-style provenance**

Records link source archives/toolchain/build flags to produced JS/WASM digest.

- [ ] **Step 4: Legal gate remains explicit**

Engineering may mark artifacts complete; Production WASM enablement remains blocked until LGPL/HEVC launch-scope review is recorded.

- [ ] **Step 5: GREEN and commit**

`git commit -m "build(f05): pin HEIF decoder supply chain"`

---

### Task 12: Add privacy-safe observability and moderation hook ordering

**Files:**
- Create: `tests/media/f05-owner-boundary.test.cjs`
- Extend: `scripts/media/server/f05-media-operation.js`

**Interfaces:**
- Metrics accept only bucketed operational fields.
- Moderation hook receives rewritten canonical image after media-security pass and before publication.

- [ ] **Step 1: RED privacy tests**

Deny filenames, EXIF/GPS, raw bytes, decoded pixels, exact local paths, auth/payment/contact/transaction secrets and public cross-user hashes from metrics/audit/worker messages.

- [ ] **Step 2: RED ordering test**

Security reject -> moderation never runs. Rewrite PASS -> moderation may run. Moderation reject -> publication denied. Moderation cannot override security reject.

- [ ] **Step 3: Implement minimal hooks and GREEN**

- [ ] **Step 4: Commit**

`git commit -m "feat(f05): add privacy-safe media policy hooks"`

---

### Task 13: Real fixtures, hostile fixtures and browser/device evidence harness

**Files:**
- Create: `tests/media/f05-real-fixtures.test.cjs`
- Create bounded non-personal fixtures under `tests/fixtures/media/f05/` with source provenance notes.
- Create: `docs/fusion/F05_BROWSER_DEVICE_EVIDENCE.md`.

**Interfaces:**
- Fixtures must not contain personal GPS/identity data unless synthetic and explicitly documented.

- [ ] **Step 1: Add valid HEVC HEIC fixtures**

Cover orientation, alpha, sRGB/wide-gamut conversion cases and ordinary phone-style dimensions.

- [ ] **Step 2: Add hostile/truncated/sequence/non-HEVC fixtures**

Expected result is deterministic fail-closed code, not crash.

- [ ] **Step 3: Browser evidence checklist**

Record real native route when genuinely supported, forced WASM route, crop/zoom/pan, RTL keyboard/focus, cancel/reset/pagehide, stale suppression, offline-with-pack, offline-without-pack, zero HEIC network upload, zero persistent original bytes, no EXIF/GPS propagation, balanced object URLs/resources and unchanged JPEG/PNG/WebP behavior.

- [ ] **Step 4: Do not convert `NOT RUN` to PASS without observed evidence**

If browser/device environment is unavailable, F05 remains Draft and the blocker is recorded exactly.

- [ ] **Step 5: Commit evidence/fixtures**

`git commit -m "test(f05): add real and hostile HEIF evidence"`

---

### Task 14: Repository regression, performance diagnostics and exact-head closure

**Files:**
- Create/update: `docs/fusion/F05_BPLUS_STATUS.md`
- Update: `docs/fusion/GLOBAL_LAUNCH_READINESS_MATRIX_2026.md` only after evidence.

- [ ] **Step 1: Focused F05 suites**

Run all `tests/media/f05-*.test.cjs`; zero failures.

- [ ] **Step 2: PR36 + V13 media regressions**

Run all PR36 tests and V13.1 media contracts/manifests/card tests; zero failures.

- [ ] **Step 3: Repository quality gate**

Run `bash scripts/vvip-quality-gate.sh`; zero failures.

- [ ] **Step 4: Performance diagnostics**

Record native/WASM routes, source/pixel buckets through 40 MP, low-memory rejections, worker startup/termination, peak memory where measurable, encode time/output size, server JPEG/WebP verification/rewrite time. Diagnostics are not Production SLO certification.

- [ ] **Step 5: Create stacked Draft product PR**

Base = final F04 branch. State explicitly: no Production deploy, no protected-auth weakening, no remote DB apply, no country activation, no transaction intermediation.

- [ ] **Step 6: Create temporary main-targeted verification PR — DO NOT MERGE**

Trigger VVIP Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard and Project Control Integrity on exact source SHA.

- [ ] **Step 7: Fix every failing gate by root cause, not rerun guessing**

- [ ] **Step 8: Final truth update creates a new SHA, so rerun all exact-head gates on that final SHA**

- [ ] **Step 9: Close verification PR without merge after all gates PASS**

- [ ] **Step 10: F05 status rule**

Mark `EXACT_HEAD_PASS` only if engineering tests, real browser/device evidence, supply-chain artifacts, third-party/legal gate evidence required by the approved design, and exact-head CI are all present on the final artifact set. Otherwise state the exact remaining blocker; never claim global launch readiness.

---

## Plan Self-Review Checklist

- [ ] Every B+ trust boundary A-J maps to at least one task.
- [ ] Global Hardening Addendum: residency -> Task 8; idempotency/temp lifecycle -> Task 8; media-origin isolation -> Task 9; worker/CSP/static code boundary -> Tasks 3/4/10/11; moderation -> Task 12; abuse controls -> Tasks 7/8; privacy/audit -> Tasks 6/12; fallback -> Tasks 3/10/13.
- [ ] No task introduces server HEIC decode.
- [ ] No task introduces a second cropper/editor/gallery.
- [ ] No task creates a parallel media asset identity model instead of V13.1.
- [ ] No task expands listing count beyond seven.
- [ ] No task enables video/sequence media.
- [ ] No task treats client Passport as authority.
- [ ] No task authorizes Production, remote SQL/RLS apply, country activation, marketplace money movement or global launch.
- [ ] No placeholder/TBD language remains in implementation actions.

## Execution Mode

The OWNER has repeatedly directed continuous execution without unnecessary stops. Use **Inline Execution** with `superpowers:executing-plans`, preserving RED -> GREEN evidence and review checkpoints internally. Stop only for a genuine external/owner-only gate (for example legal sign-off, real device evidence unavailable, or a connector safety blocker) and record the exact blocker rather than bypassing it.
