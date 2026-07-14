#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_FILES=(
  scripts/listing/listing-contract.js
  scripts/listing/listing-repository.js
)
TEST_FILES=(scripts/listing/listing-contract.test.js)

echo "[pr34] shell syntax"
bash -n scripts/qa-smoke.sh
bash -n scripts/qa-pr34-hour1.sh
bash -n scripts/qa-pr33-accessibility.sh

echo "[pr34] JavaScript syntax"
for file in "${RUNTIME_FILES[@]}" "${TEST_FILES[@]}"; do
  node --check "$file"
done

echo "[pr34] focused contract behavior"
node --test scripts/listing/listing-contract.test.js

echo "[pr34] static security and scope guards"
python3 <<'PY_GUARDS'
from pathlib import Path
import re

files = [
    Path("scripts/listing/listing-contract.js"),
    Path("scripts/listing/listing-repository.js"),
    Path("scripts/listing/listing-contract.test.js"),
]
source = "\n".join(path.read_text(encoding="utf-8") for path in files)

guards = {
    "privileged database credential": r"service[_-]?role|SUPABASE_SERVICE|sb_secret_",
    "token or sensitive browser persistence": r"localStorage|sessionStorage|indexedDB|document\.cookie|setItem\s*\(",
    "remote Supabase command": r"supabase\s+(?:db|functions|migration|link|login|projects)|createClient\s*\(|supabase(?:Client)?\.from\s*\(",
    "network request": r"\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|WebSocket\s*\(",
    "sensitive payload field": r"access[_-]?token|refresh[_-]?token|authorization\s*:|client[_-]?secret|private[_-]?key",
    "image bytes persistence": r"data:image|objectURL|createObjectURL|arrayBuffer\s*\(|FileReader",
}

for label, pattern in guards.items():
    if re.search(pattern, source, re.IGNORECASE):
        raise SystemExit(f"[pr34][fail] forbidden {label} found")

repository = Path("scripts/listing/listing-repository.js").read_text(encoding="utf-8")
if "supabase_adapter_not_configured" not in repository:
    raise SystemExit("[pr34][fail] remote-ready interface does not fail closed")
if "PAGINATION_MAX_LIMIT" not in Path("scripts/listing/listing-contract.js").read_text(encoding="utf-8"):
    raise SystemExit("[pr34][fail] bounded pagination contract missing")
PY_GUARDS

echo "[pr34] PR33 accessibility regression"
bash scripts/qa-pr33-accessibility.sh

echo "[pr34] full smoke regression"
bash scripts/qa-smoke.sh

echo "[pr34] whitespace safety"
python3 <<'PY_WHITESPACE'
from pathlib import Path

roots = [Path("scripts/listing"), Path("docs/launch/pr34"), Path("docs/superpowers")]
files = [Path("scripts/qa-pr34-hour1.sh")]
for root in roots:
    files.extend(path for path in root.rglob("*") if path.is_file())
for path in files:
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.endswith((" ", "\t")):
            raise SystemExit(f"[pr34][fail] trailing whitespace: {path}:{number}")
PY_WHITESPACE
git diff --check

echo "[pr34] hour 1 focused gate passed"
