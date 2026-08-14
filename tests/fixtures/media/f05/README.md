# F05 real-media fixture provenance

## `rainbow-451x461.heic.base64`

- Purpose: deterministic test-only proof that the pinned local F05 libheif/libde265 WASM runtime decodes a real HEVC/HEIC still image to RGBA before PR36 processing.
- Upstream repository: `strukturag/libheif`
- Upstream release/tag: `v1.23.1`
- Upstream path: `tests/data/rainbow-451x461.heic`
- Upstream Git blob SHA-1: `6691f50f39bd69871a2abe284de2ef9f5243bc66`
- Exact decoded fixture size: `7080` bytes
- HEIF major brand: `heic`
- Primary item codec asserted by the F05 proof: `hvc1` / HEVC
- Display dimensions asserted by the F05 proof: `451 × 461`
- RGBA surface length asserted by the F05 proof: `831644` bytes

The repository stores the fixture as Base64 text because the GitHub write connector is text-oriented. The test reconstructs the original bytes and verifies the exact upstream Git blob SHA-1 before using them. Any byte drift therefore fails closed.

This fixture is test evidence only. It is never used as production content, never changes the product rule that the user's original HEIC remains on the user's device, and never enables server-side HEIC conversion or fallback.

## `simple_osm_tile_alpha.avif.base64`

- Purpose: deterministic hostile-input evidence that a real upstream AVIF image is classified as unsupported and rejected by F05 preflight before the HEIF decoder/WASM path is entered.
- Upstream repository: `strukturag/libheif`
- Upstream release/tag: `v1.23.1`
- Upstream path: `tests/data/simple_osm_tile_alpha.avif`
- Upstream Git blob SHA-1: `e3135d33ac351fbcd0f4a1316ad5db80d2a26929`
- FTYP major brand observed by the fixture proof: `mif3`
- Policy result asserted by the F05 proof: `heif_codec_unsupported`

The AVIF fixture is also stored as Base64 text. The test reconstructs the exact upstream bytes and verifies the upstream Git blob SHA-1 before exercising F05 preflight. This fixture is never decoded or accepted as production F05 input.

Licensing/provenance of the upstream project and test data remains subject to the upstream repository's license notices; this file records provenance and does not replace legal review of HEVC patent/licensing obligations.
