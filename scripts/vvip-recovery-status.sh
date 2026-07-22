#!/usr/bin/env bash
# Read-only recovery snapshot after reset or SSH disconnect (no repo mutations).
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ATTENTION=0

note_ok() {
  echo "OK: $*"
}

note_attention() {
  echo "ATTENTION: $*"
  ATTENTION=1
}

echo "=== VVIP recovery status (read-only) ==="
echo "Workspace: ${ROOT_DIR}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo unknown)"
  note_ok "Git root: ${GIT_ROOT}"

  echo "Remotes:"
  git remote -v 2>/dev/null | while IFS= read -r line; do
    echo "  $line"
  done || note_attention "could not list remotes"

  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ -n "$BRANCH" ]]; then
    note_ok "Current branch: ${BRANCH}"
  else
    note_attention "detached HEAD or unknown branch"
    BRANCH="HEAD"
  fi

  HEAD_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  note_ok "HEAD: ${HEAD_SHA}"

  echo "Working tree:"
  git status --short --branch 2>/dev/null || note_attention "git status failed"

  UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [[ -n "$UPSTREAM" ]]; then
    note_ok "Upstream: ${UPSTREAM}"
    AHEAD_BEHIND="$(git rev-list --left-right --count "@{u}...HEAD" 2>/dev/null || echo "? ?")"
    read -r BEHIND AHEAD <<<"$AHEAD_BEHIND" || true
    echo "  behind upstream: ${BEHIND:-?}, ahead: ${AHEAD:-?}"
    if [[ "${BEHIND:-0}" != "0" && "${BEHIND:-?}" != "?" ]]; then
      note_attention "branch is behind upstream (fetch/rebase may be needed — owner decision)"
    fi
  else
    note_attention "no upstream tracking branch configured"
  fi

  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      echo "Pull requests (current branch):"
      gh pr list --head "$BRANCH" --json number,title,state,url --limit 5 2>/dev/null \
        | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f\"  #{x['number']} [{x['state']}] {x['title']} {x['url']}\") for x in d]" \
        2>/dev/null || note_attention "gh pr list failed"
      echo "Recent workflow runs (limit 5):"
      gh run list --limit 5 2>/dev/null | head -5 || note_attention "gh run list failed"
    else
      note_attention "GitHub CLI present but not authenticated (PR/checks list skipped)"
    fi
  else
    note_attention "GitHub CLI (gh) not installed — PR and Actions status skipped"
  fi
else
  note_attention "not inside a git work tree"
fi

if command -v supabase >/dev/null 2>&1; then
  note_ok "Supabase CLI: installed ($(command -v supabase))"
else
  note_ok "Supabase CLI: not found in PATH"
fi

CONFIG="${ROOT_DIR}/supabase/config.toml"
if [[ -f "$CONFIG" ]]; then
  PROJECT_ID="$(grep -E '^project_id[[:space:]]*=' "$CONFIG" 2>/dev/null | head -1 | sed -E 's/^project_id[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/' || true)"
  if [[ -n "$PROJECT_ID" ]]; then
    note_ok "supabase/config.toml project_id (public config field): ${PROJECT_ID}"
  else
    note_attention "supabase/config.toml present but project_id not parsed"
  fi
else
  note_attention "supabase/config.toml missing"
fi

MIG_DIR="${ROOT_DIR}/supabase/migrations"
if [[ -d "$MIG_DIR" ]]; then
  MIG_COUNT="$(find "$MIG_DIR" -maxdepth 1 -type f -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
  note_ok "supabase/migrations SQL files: ${MIG_COUNT}"
else
  note_attention "supabase/migrations directory missing"
fi

echo ""
if [[ $ATTENTION -eq 0 ]]; then
  echo "VVIP_RECOVERY_STATUS=PASS"
  exit 0
fi

echo "VVIP_RECOVERY_STATUS=ATTENTION"
exit 0
