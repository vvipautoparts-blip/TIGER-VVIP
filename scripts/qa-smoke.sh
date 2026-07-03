#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if command -v rg >/dev/null 2>&1; then
  SEARCH_CMD="rg"
else
  SEARCH_CMD="grep -E"
fi

search() {
  local pattern="$1"
  shift
  if [[ "$SEARCH_CMD" == "rg" ]]; then
    rg -n "$pattern" "$@"
  else
    grep -En "$pattern" "$@"
  fi
}

echo "[smoke] checking required files"
for file in index.html public-profile.html private-profile.html styles.css auth.js social-ui.js supabase/migrations/20260702_feed_posts_table.sql; do
  [[ -f "$file" ]] || { echo "[smoke][fail] missing $file"; exit 1; }
  echo "[smoke][ok] $file"
done

echo "[smoke] validating feed and profile anchors"
search "id=\"feed-list\"|id=\"comments-sheet\"|id=\"composer-modal\"|class=\"profile-hero\"|class=\"profile-tabs\"" public-profile.html private-profile.html >/dev/null

echo "[smoke] validating script references"
search "social-ui\.js" public-profile.html private-profile.html >/dev/null

echo "[smoke] validating css selectors"
search "\.mobile-frame|\.post-card|\.profile-hero|\.bottom-nav|\.comments-sheet" styles.css >/dev/null

echo "[smoke] validating js handlers"
search "initFeedInteractions|initProfileTabs|initProfileSnapshot|like-active|comments-sheet|composer-modal" social-ui.js >/dev/null

echo "[smoke][pass] all checks succeeded"
