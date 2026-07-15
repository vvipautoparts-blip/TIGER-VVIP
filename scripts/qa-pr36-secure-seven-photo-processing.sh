#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mode="${1:-full}"
runtime=(scripts/media/pr36-*.js)

if [[ "$mode" == "--self-test-guard" ]]; then
  fixture="$(mktemp)"
  trap 'rm -f "$fixture"' EXIT
  printf '%s\n' 'fetch("/forbidden")' > "$fixture"
  if ! grep -Eq 'fetch[[:space:]]*\(' "$fixture"; then
    echo "[pr36][fail] forbidden guard self-test did not detect fixture"
    exit 1
  fi
  echo "[pr36] forbidden guard self-test passed"
  exit 0
fi

echo "[pr36] syntax and focused Node tests"
for file in "${runtime[@]}" scripts/vvip-pr31-create-listing-shell.js scripts/vvip-pr32-draft-preview.js scripts/vvip-pr33-publish-readiness.js; do node --check "$file"; done
node --test tests/pr36/*.test.mjs

echo "[pr36] privacy and local-only capability guards"
if grep -REn 'fetch[[:space:]]*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|caches\.|document\.cookie|console\.|innerHTML|supabase|clerk|upload|publish' "${runtime[@]}"; then
  echo "[pr36][fail] forbidden media runtime capability"
  exit 1
fi

echo "[pr36] crop state-machine and capability-failure contracts"
grep -Fq 'event.stopImmediatePropagation(); session.cancelOperation(); closeEditor(ERROR_COPY.cancelled);' scripts/media/pr36-controller.js
grep -Fq 'closeEditor(ERROR_COPY[error.code] || ERROR_COPY.capability_unavailable, true); render();' scripts/media/pr36-controller.js
grep -Fq 'signature.detectSignature(header) !== mimeType' scripts/media/pr36-canvas-adapter.js
grep -Fq 'encodedSize.width !== crop.outputWidth || encodedSize.height !== crop.outputHeight' scripts/media/pr36-media-worker.js
grep -Fq 'if (outputHeader) outputHeader.fill(0);' scripts/media/pr36-media-worker.js
grep -Fq 'if (canvas) { canvas.width = 0; canvas.height = 0; }' scripts/media/pr36-media-worker.js
grep -Fq 'retired.forEach(revoke);' scripts/media/pr36-session.js
grep -Fq 'data-pr36-media-unavailable' scripts/vvip-pr31-create-listing-shell.js
grep -Fq 'معالجة الصور غير متاحة بأمان في هذا المتصفح، ويمكنك متابعة المسودة دون صور.' scripts/vvip-pr31-create-listing-shell.js

python3 -m json.tool docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json >/dev/null
python3 - <<'PY'
import json, subprocess
from pathlib import Path
m=json.loads(Path('docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json').read_text())
allowed=set(m['allowed_paths'])
changed=set(subprocess.run(['git','diff','HEAD','--name-only'],capture_output=True,text=True,check=True).stdout.splitlines())
changed.update(subprocess.run(['git','ls-files','--others','--exclude-standard'],capture_output=True,text=True,check=True).stdout.splitlines())
extra=sorted(changed-allowed)
if extra: raise SystemExit('[pr36][fail] undeclared changed paths: '+', '.join(extra))
freeze=Path('docs/launch/pr36/CHANGED_FILES.freeze').read_text().splitlines()
if freeze != sorted(set(freeze)):
    raise SystemExit('[pr36][fail] freeze is not sorted and unique')
if set(freeze) != allowed:
    raise SystemExit('[pr36][fail] manifest and freeze paths differ')
if changed != allowed:
    missing=sorted(allowed-changed)
    raise SystemExit('[pr36][fail] exact planned scope is incomplete: '+', '.join(missing))
for path in changed:
    if path.endswith('.sql') or path.startswith(('supabase/','migrations/','backups/')):
        raise SystemExit('[pr36][fail] forbidden path changed: '+path)
PY

if [[ "$mode" == "--focused" ]]; then echo "[pr36] focused gate passed"; exit 0; fi
bash scripts/qa-pr33-accessibility.sh
bash scripts/qa-pr34-hour1.sh
node --test tests/pr35/*.test.mjs
for file in scripts/pr35/*.js; do node --check "$file"; done
bash scripts/qa-smoke.sh
git diff --check
echo "[pr36] full gate passed"
