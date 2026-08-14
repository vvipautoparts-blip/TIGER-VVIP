# F05 B+ — Browser / Device Evidence Ledger

**Status:** IN PROGRESS — AUTOMATED HOSTILE EVIDENCE ACTIVE / REAL DEVICE EVIDENCE NOT RUN

**Branch:** `feat/f05-hybrid-heic-local-media-isolated-20260814`

## Binding safety boundary

F05 is an advertisement-media feature only. Original HEIC/HEIF bytes stay on the client device and are never uploaded for server conversion. Only a newly reconstructed JPEG/WebP derivative may leave the client. Any missing, ambiguous or unobserved evidence remains `NOT RUN` or `FAIL`; it is never promoted to PASS by inference.

## Automated evidence already observed

| Evidence | Status | Observation |
|---|---|---|
| Pinned libheif/libde265 WASM artifact integrity | PASS | Promoted checksum-bound decoder; F05 HEIF WASM Build passed on prior exact heads and is rerun on every successor head. |
| Real upstream HEVC/HEIC decode | PASS | Exact libheif v1.23.1 fixture `rainbow-451x461.heic` decodes through the pinned WASM to a 451x461 RGBA surface; primary top-level item is `hvc1`; sequence flag is false. |
| Real AVIF hostile fixture | PASS | Exact upstream `simple_osm_tile_alpha.avif` (`mif3` + `avif`) is rejected by preflight as `heif_codec_unsupported` before HEIF decode. |
| Real truncated HEIC hostile payload | PASS | Test derives a 4096-byte prefix from the exact upstream HEIC while preserving `ftypheic`; pinned WASM must not produce a usable RGBA surface. Added at source SHA `c71b6f25d63254d0aa4dcc6dde8cc0e01180e53d`; Quality #1011 and V14 #469 passed on that source SHA. |
| Sequence-brand policy | PASS (contract) | `hevc` / `avis` sequence brands are denied with `heif_sequence_denied`; real-device sequence fixture remains separate evidence. |
| Pixel/memory admission | PASS (contract) | 40 MP policy and 384 MiB WASM hard ceiling are enforced before expensive pixel decode; real bomb-style fixture remains separate evidence. |
| Worker timeout | PASS | Unresponsive HEIF Worker is terminated fail-closed and surfaced as `heif_decode_timeout`; no server conversion fallback exists. |
| Server derivative metadata/polyglot gate | PASS (contract) | Candidate and rewritten derivative are independently inspected; forbidden metadata or polyglot content is denied. Browser output metadata proof remains `NOT RUN`. |

## Real browser / device matrix

The following rows require observed execution. Do not convert them to PASS from static tests.

| Scenario | iPhone Safari | Android Chrome | Desktop Chromium | Evidence required |
|---|---|---|---|---|
| Select a real HEIC/HEIF still | NOT RUN | NOT RUN | NOT RUN | Successful preview/crop without original upload. |
| Forced WASM route | NOT RUN | NOT RUN | NOT RUN | `decodeRoute=wasm`, correct image, no fallback to server. |
| Native route, only when `ImageDecoder.isTypeSupported()` is genuinely true | NOT RUN | NOT RUN | NOT RUN | Native route observed before any native decode; native failure must not retry through WASM. |
| Crop / zoom / pan and exact 4:3 result | NOT RUN | NOT RUN | NOT RUN | Final derivative <=1600x1200 and no upscale. |
| Orientation correctness | NOT RUN | NOT RUN | NOT RUN | Visual orientation matches source intent. |
| Color / sRGB correctness | NOT RUN | NOT RUN | NOT RUN | No obvious color shift; output reports canonical sRGB path. |
| EXIF / GPS / XMP non-propagation | NOT RUN | NOT RUN | NOT RUN | Source contains metadata; reconstructed JPEG/WebP contains no forbidden source metadata. |
| Cancel / reset / pagehide | NOT RUN | NOT RUN | NOT RUN | Worker terminates, stale result suppressed, UI remains usable. |
| Offline with decoder pack available | NOT RUN | NOT RUN | NOT RUN | Local processing succeeds without original-media network traffic. |
| Offline without decoder pack | NOT RUN | NOT RUN | NOT RUN | Deterministic fail-closed UX; no server HEIC fallback. |
| Memory rejection | NOT RUN | NOT RUN | NOT RUN | Deterministic bounded denial, no crash/tab death. |
| Zero original HEIC network upload | NOT RUN | NOT RUN | NOT RUN | Network trace contains no original HEIC/HEIF request body. |
| Zero persistent original HEIC storage | NOT RUN | NOT RUN | NOT RUN | No original bytes in Cache Storage, IndexedDB, Local Storage or service-worker caches. |
| Existing JPEG/PNG/WebP regression | NOT RUN | NOT RUN | NOT RUN | Existing PR36 path remains unchanged. |

## Evidence capture fields

For every real-device run record:

- UTC timestamp;
- source git SHA;
- page URL / preview identity;
- device model and OS version;
- browser and browser version;
- input media type and byte size, without personal filename or metadata values;
- route (`native` or `wasm`);
- result MIME, dimensions and byte size;
- network observation: original-media upload = yes/no;
- persistent-storage observation: original-media persistence = yes/no;
- EXIF/GPS/XMP propagation = yes/no;
- cancellation/offline/memory scenario result when applicable;
- PASS / FAIL / NOT RUN with a short factual note.

Do not record user names, GPS coordinates, EXIF values, personal filenames, image contents or raw original-media bytes in logs/evidence.

## Final gate

F05 remains Draft until all required browser/device rows are observed, exact-head automated gates are green on one final source SHA/artifact set, and the required LGPL + HEVC/H.265 launch-scope legal/product review is recorded.
