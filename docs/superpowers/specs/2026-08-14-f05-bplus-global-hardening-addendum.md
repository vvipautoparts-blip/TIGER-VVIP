# F05 B+ — Global Hardening Addendum

**Status:** BINDING PART OF F05 B+ WRITTEN DESIGN / written-spec review pending

**Parent design:** `docs/superpowers/specs/2026-08-14-f05-hybrid-heic-heif-local-media-design.md`

**Owner decision:** `docs/fusion/F05_BPLUS_OWNER_MEDIA_DECISION_2026.md`

This addendum closes operational/global gaps found during the post-write self-review. It adds no user-facing workflow and does not replace PR36.

## 1. Media residency and geographic routing

Canonical advertisement media must follow the platform's established four-layer geography architecture.

- **Data Residency Country** controls where canonical media bytes and private integrity/audit metadata may be stored when residency policy is active.
- **Active Market Country** may affect legal/content policy and publication eligibility, but does not silently redirect residency.
- Identity Country does not by itself select the media storage region.
- F05 must not activate a country or residency region; it consumes already-approved country/residency configuration.
- A missing/unknown required residency decision fails closed before permanent media commit.

No original HEIC/HEIF bytes are retained merely to satisfy residency; the normal B+ path never uploads them.

## 2. Candidate upload reliability without duplicate publication

The sanitized JPEG/WebP candidate upload to the authoritative server derivative gate must support safe retries without creating duplicate public objects.

Requirements:

- each media operation receives a cryptographically random **operation ID** scoped to authenticated actor + advertisement draft;
- retries reuse the same operation ID;
- operation ID is not derived from the image hash or filename;
- the server treats `(actor, ad scope, operation ID)` idempotently;
- a retry may resume/repeat candidate transfer, but only one canonical commit is produced for a successful operation;
- duplicate/replayed operation IDs outside the original actor/ad scope are rejected;
- an interrupted/failed candidate is never addressable as public media;
- partial candidate bytes have a bounded temporary lifetime and are garbage-collected automatically.

The implementation plan must use the existing upload/storage primitives where present rather than inventing a second upload product.

## 3. Temporary-object lifecycle

Client candidate bytes and server temporary candidate objects are not canonical media.

Server-side temporary objects must:

- be private/non-public;
- use platform-generated temporary identifiers;
- be inaccessible through the public media route;
- have a fixed maximum lifetime of **24 hours**;
- be deleted immediately after successful canonical rewrite/commit when technically possible;
- be eligible for scheduled cleanup well before the 24-hour maximum;
- never preserve original HEIC/HEIF bytes in the B+ path;
- never be used as a customer file vault or transaction document store.

A failed server rewrite leaves no publishable object.

## 4. Public media-origin isolation

Production canonical advertisement media is served from a **dedicated non-executable media origin/hostname** separated from the main authenticated application origin.

Required delivery properties:

- only approved canonical image MIME types are served;
- `X-Content-Type-Options: nosniff`;
- versioned/immutable object identifiers;
- long-lived immutable caching only for content-addressed/versioned canonical objects whose bytes will not mutate;
- no cookies required for ordinary public-ad image delivery;
- no HTML, SVG, JavaScript, WASM or document content is served from the canonical advertisement-media object namespace;
- access-controlled/private media, if introduced by a separately approved feature, uses a distinct authorization path and is not implied by F05.

If the deployment platform cannot provide the dedicated media origin, Production enablement of F05 public media remains blocked until an equivalent independently reviewed isolation control is approved.

## 5. Worker/runtime code isolation

F05 decoder runtime assets are code, not user media.

Requirements:

- decoder worker/glue/WASM loaded from the approved same-origin static worker namespace only;
- no third-party CDN runtime fetch for decoder code;
- CSP/worker policy must permit only the platform-controlled worker/static origins required by the existing application;
- no decoder implementation may require `unsafe-eval` merely for convenience; generated glue must be built/configured to avoid dynamic code execution where supported by the chosen toolchain;
- decoder manifest/digest verification occurs before WASM instantiation;
- decoder worker receives no authentication token, payment token, contact data, or marketplace transaction data;
- worker messages contain only operation IDs, bounded policy, media bytes transferred for the current operation, transform instructions and non-sensitive results/errors.

## 6. Content-safety/moderation hook

F05 does not build a moderation product, but it provides one stable policy hook **after canonical rewrite and before publication**.

The hook may consume only the canonical rewritten image and bounded advertisement context required by the platform's separately governed content policy.

Rules:

- moderation cannot resurrect an image that failed media/security validation;
- moderation rejection prevents publication but does not make VVIP TIGER a party to the sale/service transaction;
- media-security PASS and content-policy PASS are separate decisions;
- no raw HEIC/HEIF original is sent to moderation in the B+ normal path;
- F05 does not add human customer-service mediation, buyer/seller dispute handling, warranty decisions, pricing decisions or transaction execution.

## 7. Server abuse controls

Client-side limits do not protect a public API from direct callers. The authoritative server media path therefore independently enforces:

- authenticated authorization for the target advertisement draft;
- per-request byte ceilings;
- bounded concurrent candidate verifications per actor/account;
- request-rate controls;
- total in-flight temporary-byte quota;
- operation-ID replay/idempotency validation;
- canonical-object quota consistent with the seven-photo advertisement contract;
- fail-closed behavior before expensive decode/rewrite when cheap validation already rejects the request.

Exact production rate values belong to deployment/capacity policy and may be tuned without changing the F05 media security contract, provided they never weaken the seven-photo/byte/output invariants.

## 8. Privacy and audit separation

The Media Passport, decoder telemetry and server verification audit are private technical records.

- They are not shown in public advertisements.
- They are not used as a public cross-user media fingerprint service.
- Access follows the platform's authorization/audit model.
- Retention follows approved privacy/data-retention policy.
- Raw EXIF/GPS/private source metadata is never introduced merely for audit convenience.

## 9. Compatibility fallback

If HEIC/HEIF processing is unavailable, revoked, legally disabled, unsupported on a device, or rejected for resource safety:

- JPEG/PNG/WebP PR36 remains available;
- the UI provides a short normal image error, not an engineering control panel;
- the platform does not upload the HEIC original to a hidden server converter;
- the platform does not silently reduce security limits;
- an optional user action may allow choosing another image only.

## 10. Addendum closure tests

F05 cannot close without tests/evidence for these addendum requirements:

1. idempotent retry produces one canonical object;
2. cross-actor/ad operation-ID replay denied;
3. failed/partial candidate is never public and expires/cleans up within the 24-hour maximum;
4. required residency routing fails closed when configuration is absent;
5. public media route serves image-only canonical namespace with `nosniff` and no application cookies dependency;
6. decoder runtime comes only from approved same-origin worker/static namespace and digest mismatch blocks instantiation;
7. worker messages contain no auth/payment/contact/transaction secrets;
8. moderation hook occurs after canonical rewrite and cannot bypass security rejection;
9. direct API abuse controls execute independently of client PR36/F05 checks;
10. disabling HEIC leaves JPEG/PNG/WebP PR36 operational.

All parent-design exit criteria remain mandatory.
