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
for file in index.html private-profile.html clerk-private-profile.html private-profile-p03.html public-profile.html public-profile-p03.html styles.css auth.js social-ui.js scripts/vvip-p03-route-map.js supabase/migrations/20260702_feed_posts_table.sql; do
  [[ -f "$file" ]] || { echo "[smoke][fail] missing $file"; exit 1; }
  echo "[smoke][ok] $file"
done

echo "[smoke] validating private profile anchors"
search "class=\"vvip-profile-hero\"|class=\"vvip-profile-tabs\"|data-profile-panel" private-profile-p03.html >/dev/null

echo "[smoke] validating private profile runtime"
search "scripts/vvip-p03-profile\.js" private-profile-p03.html >/dev/null

echo "[smoke] validating disabled legacy public profile guards"
search "data-vvip-public-profile-disabled|public_profile_disabled" public-profile.html public-profile-p03.html >/dev/null

echo "[smoke] validating route map has no public profile route"
if grep -RInE 'public-profile|publicProfile' scripts/vvip-p03-route-map.js >/dev/null 2>&1; then
  echo "[smoke][fail] route map still exposes public profile"
  exit 1
fi

echo "[smoke] validating no live public profile references"
LIVE_PUBLIC_REFS="$(
  grep -RInE 'public-profile|publicProfile' \
    --include='*.html' \
    --include='*.js' \
    --include='*.sh' \
    --exclude='public-profile.html' \
    --exclude='public-profile-p03.html' \
    --exclude='qa-smoke.sh' \
    --exclude-dir='.git' \
    --exclude-dir='node_modules' \
    --exclude-dir='approved' \
    --exclude-dir='backups' \
    --exclude-dir='docs' \
    . 2>/dev/null || true
)"

if [[ -n "$LIVE_PUBLIC_REFS" ]]; then
  echo "$LIVE_PUBLIC_REFS"
  echo "[smoke][fail] live public profile references remain"
  exit 1
fi

echo "[smoke] validating css selectors"
search "\.mobile-frame|\.post-card|\.profile-hero|\.bottom-nav|\.comments-sheet" styles.css >/dev/null

echo "[smoke] validating js handlers"
search "initFeedInteractions|initProfileTabs|initProfileSnapshot|like-active|comments-sheet|composer-modal" social-ui.js >/dev/null

echo "[smoke] validating no public-profile UX semantics in live private/runtime files"
SEMANTIC_PUBLIC_UX_REFS="$(
  grep -RInE 'الملف العام|البروفايل العام|رابط الملف العام|نسخ رابط الملف العام|مشاركة الملف العام|publicLink|data-view-as-public|data-copy-public|publicProfile|public-profile|public profile|view-as-public|listingCenteredDisabledProfile' \
    private-profile-p03.html \
    auth.js \
    scripts/vvip-p03-profile.js \
    social-ui.js \
    2>/dev/null || true
)"

if [[ -n "$SEMANTIC_PUBLIC_UX_REFS" ]]; then
  echo "$SEMANTIC_PUBLIC_UX_REFS"
  echo "[smoke][fail] public-profile UX semantics remain in live runtime"
  exit 1
fi

echo "[smoke] validating no retired audience terminology in live runtime"
python3 <<'PY_TERM'
from pathlib import Path

files = [
  Path("index.html"),
  Path("private-profile-p03.html"),
  Path("auth.js"),
  Path("auth-clerk-index.js"),
  Path("social-ui.js"),
  Path("scripts/vvip-p03-profile.js"),
  Path("scripts/vvip-p03-private-share.js"),
  Path("scripts/vvip-p03-route-map.js"),
]

forbidden = [
  "".join(chr(code) for code in [1586, 1575, 1574, 1585]),
  "".join(chr(code) for code in [1586, 1608, 1617, 1575, 1585, 1585]),
  "".join(chr(code) for code in [1575, 1604, 1586, 1608, 1575, 1585]),
  "visit" + "or",
  "visit" + "ors",
  "g" + "uest",
  "g" + "uests",
]

hits = []
for file in files:
  if not file.exists():
    continue
  text = file.read_text(encoding="utf-8", errors="ignore")
  lower = text.lower()
  for term in forbidden:
    if term.lower() in lower:
      hits.append(f"{file}: contains retired audience terminology")
      break

if hits:
  print("\n".join(hits))
  raise SystemExit(1)
PY_TERM

echo "[smoke][pass] listing-centered profile flow checks succeeded"
