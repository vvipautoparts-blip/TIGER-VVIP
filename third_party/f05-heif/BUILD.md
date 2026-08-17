# F05 HEIF Decoder Reproducible Build Record

This directory records the pinned source and build evidence for the browser-only F05 HEIC/HEIF decoder.

## Build entry point

Run `scripts/media/build-f05-heif-wasm.sh` from an exact repository source head. The script requires `F05_SOURCE_HEAD_SHA` to be a 40-character commit SHA and `EMSDK` to point at the pinned emsdk checkout.

Pinned inputs:

- Emscripten 6.0.6 / emsdk commit `9981799f744be74ac67b1c1813ff172f63be0630`.
- libheif 1.23.1 source SHA-256 `0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a`.
- libde265 1.1.1 source SHA-256 `fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219`.
- HEVC decode only; AOM, WebCodecs-in-WASM, uncompressed HEIF, OpenJPEG, plugin loading, multithreading and unsafe eval are disabled.
- Initial WASM memory 64 MiB; hard maximum 384 MiB.

The promoted decoder was built from source head `3dd90cc10e27cc6ee6d9b361ead553783b3db33a`. Generated artifact hashes are recorded in `CHECKSUMS.sha256` and must match `workers/media/f05-heif-decoder.v1.manifest.json`.

Any rebuild changes the build manifest and artifact digest and therefore invalidates prior exact-head evidence until all F05 gates are rerun.
