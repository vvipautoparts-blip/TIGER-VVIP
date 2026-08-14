#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="${F05_WASM_WORKDIR:-${ROOT}/.tmp/f05-heif-wasm}"
DIST="${F05_WASM_DIST:-${ROOT}/.tmp/f05-heif-dist}"
LIBHEIF_VERSION="1.23.1"
LIBHEIF_SHA256="0de0327f60fcd47de90d5654c6fe152232738d60d84fe084ec3e0f35e03b166a"
LIBDE265_VERSION="1.1.1"
LIBDE265_SHA256="fd48a927e94ed74fc7ce8829d222b9d8599fcbfe8b6448ba66705babc56ab219"
MAX_MEMORY="402653184"
INITIAL_MEMORY="67108864"

: "${EMSDK:?EMSDK must point to the activated pinned emsdk checkout}"
command -v emcc >/dev/null
command -v em++ >/dev/null
command -v emcmake >/dev/null
command -v emmake >/dev/null
command -v python3 >/dev/null

rm -rf "${WORK}" "${DIST}"
mkdir -p "${WORK}" "${DIST}"
cd "${WORK}"

curl -fsSL -o "libheif-${LIBHEIF_VERSION}.tar.gz" "https://github.com/strukturag/libheif/releases/download/v${LIBHEIF_VERSION}/libheif-${LIBHEIF_VERSION}.tar.gz"
echo "${LIBHEIF_SHA256}  libheif-${LIBHEIF_VERSION}.tar.gz" | sha256sum -c -
curl -fsSL -o "libde265-${LIBDE265_VERSION}.tar.gz" "https://github.com/strukturag/libde265/releases/download/v${LIBDE265_VERSION}/libde265-${LIBDE265_VERSION}.tar.gz"
echo "${LIBDE265_SHA256}  libde265-${LIBDE265_VERSION}.tar.gz" | sha256sum -c -

tar xzf "libheif-${LIBHEIF_VERSION}.tar.gz"
mkdir -p build
cp "libde265-${LIBDE265_VERSION}.tar.gz" build/

BUILD_SCRIPT="${WORK}/libheif-${LIBHEIF_VERSION}/build-emscripten.sh"
# Patch the pinned upstream script by exact token replacement. Refuse the build
# if the pinned upstream text changes, rather than applying a broad edit.
python3 - "${BUILD_SCRIPT}" "${MAX_MEMORY}" "${INITIAL_MEMORY}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
maximum = sys.argv[2]
initial = sys.argv[3]
text = path.read_text(encoding="utf-8")

link_old = 'emcc -Wl,--whole-archive "$LIBHEIFA" -Wl,--no-whole-archive'
link_new = 'em++ -Wl,--whole-archive "$LIBHEIFA" -Wl,--no-whole-archive'
if text.count(link_old) != 1:
    raise SystemExit("F05 build patch refused: expected exactly one upstream emcc final-link token")
text = text.replace(link_old, link_new, 1)

memory_old = '    -sALLOW_MEMORY_GROWTH'
memory_new = (
    '    -sALLOW_MEMORY_GROWTH '
    f'-sMAXIMUM_MEMORY={maximum} '
    f'-sINITIAL_MEMORY={initial}'
)
if text.count(memory_old) != 1:
    raise SystemExit("F05 build patch refused: expected exactly one upstream memory-growth token")
text = text.replace(memory_old, memory_new, 1)

path.write_text(text, encoding="utf-8")
PY

grep -Fq 'em++ -Wl' "${BUILD_SCRIPT}"
grep -Fq -- "-sMAXIMUM_MEMORY=${MAX_MEMORY}" "${BUILD_SCRIPT}"
grep -Fq -- "-sINITIAL_MEMORY=${INITIAL_MEMORY}" "${BUILD_SCRIPT}"

cd build
CORES="${CORES:-2}" \
ENABLE_LIBDE265=1 \
LIBDE265_VERSION="${LIBDE265_VERSION}" \
ENABLE_AOM=0 \
ENABLE_WEBCODECS=0 \
ENABLE_UNCOMPRESSED=0 \
ENABLE_OPENJPEG=0 \
USE_WASM=1 \
USE_ES6=1 \
USE_TYPESCRIPT=0 \
USE_UNSAFE_EVAL=0 \
"${BUILD_SCRIPT}" "${WORK}/libheif-${LIBHEIF_VERSION}"

test -s libheif.js
test -s libheif.wasm
if grep -Eq '(^|[^A-Za-z])(eval\(|new Function\()' libheif.js; then
  echo 'F05 unsafe dynamic execution detected in generated glue' >&2
  exit 1
fi

cp libheif.js "${DIST}/f05-heif-decoder.v1.js"
cp libheif.wasm "${DIST}/f05-heif-decoder.v1.wasm"
sha256sum "${DIST}/f05-heif-decoder.v1.js" "${DIST}/f05-heif-decoder.v1.wasm" > "${DIST}/CHECKSUMS.sha256"

JS_SHA="$(sha256sum "${DIST}/f05-heif-decoder.v1.js" | awk '{print $1}')"
WASM_SHA="$(sha256sum "${DIST}/f05-heif-decoder.v1.wasm" | awk '{print $1}')"
EMCC_VERSION="$(emcc --version | head -n 1 | sed 's/"/\\"/g')"
cat > "${DIST}/BUILD_MANIFEST.json" <<EOF
{
  "schemaVersion": "F05_HEIF_BUILD_V1",
  "libheif": {"version": "${LIBHEIF_VERSION}", "sourceSha256": "${LIBHEIF_SHA256}"},
  "libde265": {"version": "${LIBDE265_VERSION}", "sourceSha256": "${LIBDE265_SHA256}"},
  "emscripten": {"requestedVersion": "6.0.6", "versionLine": "${EMCC_VERSION}"},
  "policy": {"hevcDecoderOnly": true, "aom": false, "webcodecs": false, "uncompressed": false, "openjpeg": false, "unsafeEval": false, "initialMemoryBytes": ${INITIAL_MEMORY}, "maximumMemoryBytes": ${MAX_MEMORY}},
  "artifacts": {"js": {"name": "f05-heif-decoder.v1.js", "sha256": "${JS_SHA}"}, "wasm": {"name": "f05-heif-decoder.v1.wasm", "sha256": "${WASM_SHA}"}}
}
EOF

cat "${DIST}/BUILD_MANIFEST.json"
cat "${DIST}/CHECKSUMS.sha256"
