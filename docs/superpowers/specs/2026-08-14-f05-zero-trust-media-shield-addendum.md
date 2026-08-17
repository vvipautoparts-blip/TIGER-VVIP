# F05 B+ Addendum — TIGER Media Zero-Trust Shield

**Status:** OWNER-DIRECTED HARDENING / IMPLEMENTATION ACTIVE

**Date:** 2026-08-14

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

## 1. Governing rule

F05 is hardened as a **one-way media diode**:

`Untrusted HEIC/HEIF bytes (client only) -> bounded local decode -> canonical pixels -> privacy-proved JPEG/WebP candidate -> untrusted server intake -> authoritative rewrite -> canonical publishable media`

The original HEIC/HEIF bytes never cross the network boundary for conversion, never become a server fallback payload, and never become publishable media. Failure, timeout, OOM, crash, decoder revocation, offline state, or color uncertainty must not weaken that rule.

The server treats every client-produced JPEG/WebP candidate as hostile even when the client has already sanitized it.

## 2. Eight shield layers

### Shield 0 — Bounded Intake

- Count, source bytes and bounded header scan are checked before expensive work.
- Extension and declared MIME are advisory only.
- ISO-BMFF parsing is overflow-safe and bounded.
- Only the HEIC/HEIF still family may advance.

### Shield 1 — Decoder Capsule

- Dedicated ephemeral Worker.
- HEIF concurrency exactly 1.
- 40 MP content ceiling and conservative memory admission.
- WASM hard maximum linear memory 384 MiB.
- 20-second operation timeout.
- OOM and WebAssembly runtime traps are classified separately.
- Timeout/crash/cancel terminates the Worker; the next operation receives a fresh Worker.
- A failed native decode is never retried through WASM with the same hostile bytes.
- No server HEIC conversion fallback exists.

### Shield 2 — Decoder Supply-Chain Fuse

- Same-origin, versioned decoder assets only.
- Fetch integrity metadata is pinned to the promoted WASM digest.
- The Worker independently recomputes SHA-256 before WASM instantiation.
- Decoder source/toolchain/artifact versions remain immutable and manifest-bound.
- Revoked/expired/unknown decoder policy fails closed.
- Kill switch may disable/revoke; it may never silently authorize an unpinned decoder.

### Shield 3 — Canonical Pixel + Color Boundary

- libheif outputs RGB/RGBA pixels, not a pass-through HEIF payload.
- Orientation is applied exactly once.
- Canvas contexts request sRGB and, where context attributes are introspectable, an explicit non-sRGB result is rejected.
- Metadata is never copied into the pixel surface.
- Wide-gamut/Display-P3/ICC fidelity remains an evidence gate: a real/golden wide-gamut fixture must prove acceptable canonical sRGB conversion before F05 closes.
- Do not add a second color-management dependency unless evidence demonstrates a real correctness gap.

### Shield 4 — Client Derivative Privacy Proof

Before a JPEG/WebP candidate may leave the HEIF Worker, its encoded bytes are parsed again.

JPEG:
- deny comments;
- deny EXIF/XMP/IPTC/private/unknown APP metadata;
- permit only tightly bounded technical APP segments required by ordinary image encoding.

WebP:
- deny EXIF and XMP chunks;
- deny animation chunks and animation flags;
- deny unknown chunks;
- permit bounded visual/color technical chunks only.

Malformed/truncated structures fail closed. A successful Canvas encode alone is not considered proof of sanitization.

### Shield 5 — Server Authority Gate

The server never trusts client Content-Type, extension, Media Passport or client privacy proof.

Before publication it must independently:

1. authorize actor + advertisement media scope;
2. enforce request/body byte limits before expensive decode;
3. determine JPEG/WebP from magic bytes;
4. verify candidate SHA against the diagnostic passport;
5. decode/inspect dimensions, exact 4:3 ratio, forbidden metadata and polyglot state;
6. reject anything other than JPEG/WebP;
7. safely rewrite/re-encode through a trusted server image stack;
8. re-detect and re-inspect the rewritten bytes;
9. derive canonical MIME/dimensions/hash from rewritten bytes only;
10. emit a bounded security-audit event for acceptance/rejection without original media, actor identifiers or user metadata.

No client field can override a failed server inspection.

### Shield 6 — Canonical Media Vault + Delivery

- Only server-rewritten bytes may become canonical media.
- Platform-generated opaque object identity; never original filename and never a public cross-user content hash.
- Dedicated Production media origin.
- Image-only authoritative MIME.
- `X-Content-Type-Options: nosniff`.
- No HTML/SVG/script media in the canonical image namespace.
- Ordinary public advertisement images do not require application cookies.
- Immutable/versioned canonical media is preferred.

### Shield 7 — Privacy-Budget Observability + Circuit Breakers

Telemetry is operational, not identifying.

Allowed:
- source class bucket;
- decode route;
- stable outcome/error family;
- coarse duration bucket;
- coarse source-size bucket;
- coarse decoded-pixel bucket;
- decoder/media policy versions.

Forbidden:
- filename/path;
- EXIF/XMP/GPS;
- raw bytes or decoded pixels;
- user/listing/device identifiers;
- public cross-user image hash;
- free-form decoder stack traces.

Operational rollout should support a **format circuit breaker**: a material spike in timeout/OOM/crash/privacy-gate failures for an affected browser/runtime cohort disables HEIC intake for that cohort while preserving normal JPEG/PNG/WebP PR36 media. The circuit breaker may reduce capability only; it must never redirect original HEIC to a server converter.

## 3. Dual Sanitization Proof

F05 uses two independent sanitization authorities:

- **Client privacy proof:** protects the user's original metadata before any candidate upload.
- **Server authoritative rewrite:** protects publication even if the browser/client is compromised or bypassed.

Neither substitutes for the other.

## 4. Two-key publication rule

A media object is publishable only after both independent classes of checks pass:

1. media security/normalization PASS;
2. any applicable content moderation/policy PASS.

Moderation cannot override a media-security rejection, and media-security success cannot override a moderation rejection.

## 5. Release evidence, not confidence

F05 must not be described as “100% vulnerability-free” or “bulletproof” in an absolute sense. Its Production target is:

- fail-closed;
- defense in depth;
- no single security authority on the client;
- bounded resource consumption;
- revocable decoder capability;
- auditable supply chain;
- privacy-minimized observability;
- exact-head reproducible CI;
- real-device and hostile-fixture evidence.

A new commit invalidates prior exact-head closure and requires the mandatory final gates again.

## 6. Remaining external closure gates

The following cannot be promoted to PASS by static unit tests alone:

- real iPhone/Android/Desktop browser evidence on the final source SHA;
- Display-P3/wide-gamut/ICC golden-reference color evidence;
- actual Production server image-stack wiring for `inspectCandidate` and `rewriteCanonical`, including request-level body limits and audit sink;
- Production telemetry sink and operational alert/circuit-breaker policy;
- LGPL and HEVC/H.265 launch-scope legal/product review;
- final exact-head Quality, V14, CodeQL, Dependency Review, CleanGuard, Project Control and required F05 WASM build evidence.

Until those are present, F05 remains Draft and no Production/global-launch claim is authorized.
