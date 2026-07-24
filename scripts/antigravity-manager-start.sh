#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

export PATH="$HOME/.local/bin:$PATH"

bash scripts/antigravity-manager-verify.sh

echo
echo "VVIP TIGER ANTIGRAVITY MANAGER"
echo "Workspace: $ROOT"
echo "Mode: READ-ONLY PLANNING"
echo
echo "After Antigravity opens, send:"
echo
echo "استخدم مهارة vvip-delivery-manager واقرأ"
echo "@docs/ai/VVIP_ANTIGRAVITY_MANAGER_PROMPT.md"
echo "ثم جهز خطة المهمة فقط."
echo

CACHE="$HOME/.gemini/antigravity-cli/cache/last_conversations.json"

if [ -f "$CACHE" ] && \
  python3 - "$CACHE" "$ROOT" <<'PYCACHE'
import json
import sys
from pathlib import Path

cache_path = Path(sys.argv[1])
root = sys.argv[2]

try:
    data = json.loads(
        cache_path.read_text(encoding="utf-8")
    )
except Exception:
    raise SystemExit(1)

raise SystemExit(
    0 if data.get(root) else 1
)
PYCACHE
then
  exec agy --continue
else
  exec agy --new-project
fi
