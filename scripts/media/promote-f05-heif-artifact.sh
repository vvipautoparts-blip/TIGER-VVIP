#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${F05_WASM_DIST:-${ROOT}/.tmp/f05-heif-dist}"
DEST="${ROOT}/workers/media"
: "${F05_EXPECTED_HEAD:?F05_EXPECTED_HEAD is required}"
: "${F05_HEAD_REF:?F05_HEAD_REF is required}"

case "${F05_HEAD_REF}" in
  feat/f05-hybrid-heic-local-media-isolated-*) ;;
  *) echo "F05 artifact promotion refused: unexpected branch" >&2; exit 1 ;;
esac

cd "${ROOT}"
CURRENT_HEAD="$(git rev-parse HEAD)"
if [[ "${CURRENT_HEAD}" != "${F05_EXPECTED_HEAD}" ]]; then
  echo "F05 artifact promotion refused: checkout SHA mismatch" >&2
  exit 1
fi

test -s "${DIST}/f05-heif-decoder.v1.js"
test -s "${DIST}/f05-heif-decoder.v1.wasm"
test -s "${DIST}/BUILD_MANIFEST.json"
test -s "${DIST}/CHECKSUMS.sha256"

MAGIC="$(od -An -tx1 -N4 "${DIST}/f05-heif-decoder.v1.wasm" | tr -d ' \n')"
if [[ "${MAGIC}" != "0061736d" ]]; then
  echo "F05 artifact promotion refused: invalid WASM magic" >&2
  exit 1
fi

(
  cd "${DIST}"
  sha256sum -c CHECKSUMS.sha256
)

python3 - "${DIST}/BUILD_MANIFEST.json" "${F05_EXPECTED_HEAD}" <<'PY'
import json, pathlib, re, sys
p=pathlib.Path(sys.argv[1]); expected=sys.argv[2]
data=json.loads(p.read_text(encoding='utf-8'))
if data.get('schemaVersion')!='F05_HEIF_BUILD_V1': raise SystemExit('invalid F05 manifest schema')
if data.get('sourceHeadSha')!=expected: raise SystemExit('manifest source head mismatch')
policy=data.get('policy') or {}
if policy.get('maximumMemoryBytes')!=402653184: raise SystemExit('invalid F05 max memory')
if policy.get('initialMemoryBytes')!=67108864: raise SystemExit('invalid F05 initial memory')
if policy.get('unsafeEval') is not False: raise SystemExit('unsafe eval policy mismatch')
if policy.get('hevcDecoderOnly') is not True: raise SystemExit('decoder scope mismatch')
for name in ('js','wasm'):
    digest=((data.get('artifacts') or {}).get(name) or {}).get('sha256','')
    if not re.fullmatch(r'[0-9a-f]{64}',digest): raise SystemExit('invalid artifact digest')
PY

mkdir -p "${DEST}"
cp "${DIST}/f05-heif-decoder.v1.js" "${DEST}/f05-heif-decoder.v1.js"
cp "${DIST}/f05-heif-decoder.v1.wasm" "${DEST}/f05-heif-decoder.v1.wasm"
cp "${DIST}/BUILD_MANIFEST.json" "${DEST}/f05-heif-decoder.v1.manifest.json"
cp "${DIST}/CHECKSUMS.sha256" "${DEST}/f05-heif-decoder.v1.checksums.sha256"

git fetch --no-tags origin "${F05_HEAD_REF}"
REMOTE_HEAD="$(git rev-parse FETCH_HEAD)"
if [[ "${REMOTE_HEAD}" != "${F05_EXPECTED_HEAD}" ]]; then
  echo "F05 artifact promotion refused: remote head changed during build" >&2
  exit 1
fi

git add \
  workers/media/f05-heif-decoder.v1.js \
  workers/media/f05-heif-decoder.v1.wasm \
  workers/media/f05-heif-decoder.v1.manifest.json \
  workers/media/f05-heif-decoder.v1.checksums.sha256

if git diff --cached --quiet; then
  echo "F05 decoder artifact already matches verified build"
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "build(f05): promote verified HEIF decoder artifact"
git push origin "HEAD:refs/heads/${F05_HEAD_REF}"
