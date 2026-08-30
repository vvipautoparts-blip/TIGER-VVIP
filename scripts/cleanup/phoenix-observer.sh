#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/phoenix-observer.mjs" "$ROOT"
