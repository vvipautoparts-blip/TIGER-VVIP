#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OPERATION="${1:-}"
[ -n "$OPERATION" ] || { echo "HEADROOM_OPERATION_REQUIRED" >&2; exit 64; }
ARGS=(--root "$ROOT" --operation "$OPERATION")
[ -z "${PHOENIX_PROJECTED_GROWTH_BYTES:-}" ] || ARGS+=(--projected-growth-bytes "$PHOENIX_PROJECTED_GROWTH_BYTES")
[ -z "${PHOENIX_PROJECTED_INODE_GROWTH:-}" ] || ARGS+=(--projected-inode-growth "$PHOENIX_PROJECTED_INODE_GROWTH")
[ -z "${PHOENIX_OPERATION_CATEGORY:-}" ] || ARGS+=(--category "$PHOENIX_OPERATION_CATEGORY")
exec node "$ROOT/scripts/cleanup/phoenix-headroom-gate.mjs" "${ARGS[@]}"
