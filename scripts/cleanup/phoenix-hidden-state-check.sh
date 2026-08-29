#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
blocked=0
report() { printf '%s\n' "$1"; }
report "PHOENIX_HIDDEN_STATE_CHECK=READ_ONLY"
report "ROOT=$ROOT"
for candidate in .env .env.local .env.production .env.staging .venv; do
  if [ -e "$candidate" ]; then
    report "UNBACKED_CRITICAL_STATE=$candidate"
    blocked=1
  fi
done
while IFS= read -r -d '' file; do
  [ -f "$file" ] || continue
  size="$(wc -c < "$file" | tr -d ' ')"
  if [ "$size" -ge 104857600 ]; then
    report "OPAQUE_LARGE_UNTRACKED=${file#./}:$size"
    blocked=1
  fi
done < <(git ls-files -z --others --exclude-standard -- . ':(exclude).env.example' 2>/dev/null || true)
if command -v docker >/dev/null 2>&1; then
  while IFS= read -r volume; do
    [ -z "$volume" ] || report "LOCAL_DOCKER_VOLUME_OBSERVED=$volume"
  done < <(docker volume ls --format '{{.Name}}' 2>/dev/null || true)
else
  report "DOCKER_VOLUME_PLANE=UNAVAILABLE"
fi
if [ "$blocked" -eq 0 ]; then
  report "PHOENIX_HIDDEN_STATE=GREEN"
  exit 0
fi
report "PHOENIX_HIDDEN_STATE=BLOCKED_UNBACKED_STATE"
exit 79
