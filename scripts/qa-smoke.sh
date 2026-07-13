#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke] validating PR29 replacement files"
for file in \
  index.html \
  auth-clerk-index.js \
  private-profile-p03.html \
  scripts/vvip-pr29-home-marketplace.js \
  scripts/vvip-pr30-resilience.js \
  styles/vvip-pr29-home-marketplace.css \
  scripts/vvip-p03-route-map.js \
  sw.js; do
  [[ -f "$file" ]] || {
    echo "[smoke][fail] missing required file: $file"
    exit 1
  }
done

echo "[smoke] validating legacy UI files are absent"
python3 <<'PY_FILES'
from pathlib import Path

legacy = [
    Path("scripts") / ("vvip-" + "discovery-shell.js"),
    Path("scripts") / ("vvip-" + "discovery-config.js"),
    Path("styles") / ("vvip-" + "discovery-shell.css"),
    Path("social" + "-ui.js"),
    Path("public" + "-profile.html"),
    Path("public" + "-profile-p03.html"),
]

remaining = [str(path) for path in legacy if path.exists()]
if remaining:
    raise SystemExit(
        "[smoke][fail] legacy files remain: " + ", ".join(remaining)
    )
PY_FILES

echo "[smoke] validating canonical index markers and assets"
python3 <<'PY_INDEX'
from pathlib import Path

text = Path("index.html").read_text(encoding="utf-8")
markers = [
    "data-vvip-pr29-app",
    "data-vvip-auth-gate",
    "data-vvip-unified-home",
    "data-vvip-marketplace-feed",
    "data-vvip-sector-filters",
    "data-vvip-listing-detail-sheet",
]

for marker in markers:
    if marker not in text:
        raise SystemExit(f"[smoke][fail] missing index marker: {marker}")

required_assets = [
    "styles/vvip-pr29-home-marketplace.css",
    "scripts/vvip-pr29-home-marketplace.js",
    "scripts/vvip-pr30-resilience.js",
]

for asset in required_assets:
    if asset not in text:
        raise SystemExit(f"[smoke][fail] index does not load: {asset}")

accessibility_contract = [
    'aria-label="البحث في إعلانات السوق"',
    "data-results-count",
    "data-empty-state",
    "data-reset-listings",
    "data-network-notice",
    "listing-skeleton",
]

for contract in accessibility_contract:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] missing home accessibility contract: {contract}")

forbidden_assets = [
    "vvip-" + "discovery-shell",
    "vvip-" + "discovery-config",
    "social" + "-ui",
]

for asset in forbidden_assets:
    if asset.lower() in text.lower():
        raise SystemExit(f"[smoke][fail] index loads legacy asset: {asset}")

styles = Path("styles/vvip-pr29-home-marketplace.css").read_text(
    encoding="utf-8"
).lower()
facebook_like_contract = [
    "--bg: #f0f2f5;",
    "--surface: #ffffff;",
    "--fb-blue: #1877f2;",
    "padding: 24px 16px 12px;",
    "aspect-ratio: 4 / 3;",
    "background: var(--fb-blue);",
    "grid-template-columns: repeat(3, minmax(0, 1fr));",
]
for contract in facebook_like_contract:
    if contract not in styles:
        raise SystemExit(
            f"[smoke][fail] missing Facebook-like home contract: {contract}"
        )
PY_INDEX

echo "[smoke] validating runtime hooks and nine listing seeds"
python3 <<'PY_RUNTIME'
from pathlib import Path
import re

text = Path("scripts/vvip-pr29-home-marketplace.js").read_text(
    encoding="utf-8"
)

hooks = [
    "data-sector-filter",
    "data-listing-card",
    "data-listing-details",
    "data-listing-interest",
    "data-listing-contact",
    "data-listing-private-share",
]

for hook in hooks:
    if hook not in text:
        raise SystemExit(f"[smoke][fail] missing runtime hook: {hook}")

behaviors = [
    ".concat(item.specs)",
    "تم تسجيل اهتمامك مبدئيًا.",
    "التواصل الرسمي داخل VVIP TIGER قيد التجهيز.",
    "المشاركة الخاصة قيد التجهيز داخل المنصة.",
    "إنشاء الإعلان قيد التجهيز ضمن VVIP TIGER.",
    "lastFocusedElement",
    'setAttribute("aria-hidden", "false")',
    'setAttribute("aria-hidden", "true")',
    "function updateInterestButtons",
    "state.interests.delete(id)",
    "function resetListings",
    "SEARCH_DEBOUNCE_MS = 180",
    "clearTimeout(searchTimer)",
]
for behavior in behaviors:
    if behavior not in text:
        raise SystemExit(f"[smoke][fail] missing home behavior: {behavior}")

ids = re.findall(
    r'\bid:\s*"((?:auto|materials|real)-[^" ]+)"',
    text,
)

if len(ids) != 9 or len(set(ids)) != 9:
    raise SystemExit(
        f"[smoke][fail] expected nine unique listing seeds, found {len(ids)}"
    )
PY_RUNTIME

echo "[smoke] validating account center contract"
python3 <<'PY_ACCOUNT'
from pathlib import Path
import re

html = Path("private-profile-p03.html").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-p03-profile.js").read_text(encoding="utf-8")
signout = Path("scripts/vvip-p03-sign-out.js").read_text(encoding="utf-8")

markers = [
    "data-vvip-account-center",
    "data-vvip-private-owner-only",
    "data-vvip-account-actions",
    "data-vvip-my-listings",
    "data-vvip-account-security",
    "data-vvip-tiger-care-entry",
    "data-network-notice",
    "scripts/vvip-pr30-resilience.js",
]
for marker in markers:
    if marker not in html:
        raise SystemExit(f"[smoke][fail] missing account marker: {marker}")

hooks = [
    "data-account-action",
    "data-preview-listing",
    "data-coming-soon",
    "data-scroll-target",
    "data-close-sheet",
    "data-account-nav",
]
for hook in hooks:
    if hook not in html + runtime:
        raise SystemExit(f"[smoke][fail] missing account action hook: {hook}")

required_copy = ["مركز الحساب الخاص", "إدارة حسابك وإعلاناتك داخل المنصة الموحدة."]
for text in required_copy:
    if text not in html:
        raise SystemExit(f"[smoke][fail] missing account copy: {text}")

account_behaviors = [
    "previewAllowed",
    "lastFocusedElement",
    "إنشاء الإعلان قيد التجهيز ضمن VVIP TIGER.",
    "تعديل الإعلان قيد التجهيز.",
    "إيقاف الإعلان قيد التجهيز.",
    "الإشعارات قيد التجهيز ضمن VVIP TIGER.",
]

for behavior in account_behaviors:
    if behavior not in runtime:
        raise SystemExit(f"[smoke][fail] missing account behavior: {behavior}")

signout_preview_contract = [
    "localPreviewAllowed",
    "if (localPreviewAllowed()) return;",
]

for contract in signout_preview_contract:
    if contract not in signout:
        raise SystemExit(f"[smoke][fail] sign-out guard blocks local preview: {contract}")

preview_guards = {
    "scripts/vvip-p03-profile.js": 'return isLocalHost && preview === "account";',
    "scripts/vvip-p03-sign-out.js": 'return isLocalHost && preview === "account";',
}

for file, contract in preview_guards.items():
    text = Path(file).read_text(encoding="utf-8")
    if contract not in text:
        raise SystemExit(f"[smoke][fail] preview is not localhost-only: {file}")

styles = Path("styles/vvip-p03-profile.css").read_text(encoding="utf-8")
facebook_like_contract = [
    "--ac-bg: #f0f2f5;",
    "--ac-surface: #ffffff;",
    "--ac-blue: #1877f2;",
]

for contract in facebook_like_contract:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing Facebook-like account contract: {contract}")

if not re.search(
    r"@media\s*\(min-width:\s*700px\).*?\.account-bottom-nav\s*\{\s*display:\s*none;",
    styles,
    re.S,
):
    raise SystemExit("[smoke][fail] account bottom nav is not mobile-only")
PY_ACCOUNT

echo "[smoke] validating PR30 resilience contracts"
python3 <<'PY_PR30'
from html.parser import HTMLParser
from pathlib import Path

runtime = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
required = [
    "function safeNavigate",
    "function isSafeTarget",
    "function showFeedback",
    "function guardAction",
    'window.addEventListener("error"',
    'window.addEventListener("unhandledrejection"',
    'window.addEventListener("offline"',
    'window.addEventListener("online"',
    "VVIP_RESILIENCE_RECOVERY",
    "حدث تعذر مؤقت. يمكنك المتابعة من السوق أو الرجوع للرئيسية.",
    "الاتصال ضعيف أو غير متاح. يمكنك متابعة التصفح المحلي مؤقتًا.",
    "window.VVIP_PR30",
    'preview === "home" && isIndex',
]
for contract in required:
    if contract not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR30 resilience contract: {contract}")

unsafe = [
    "java" + "script:",
    "da" + "ta:",
    "ht" + "tp:",
    "ht" + "tps:",
]
for token in unsafe:
    if f'ALLOWED_TARGETS.add("{token}' in runtime:
        raise SystemExit(f"[smoke][fail] unsafe navigation allowlist: {token}")

class Buttons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.unguarded = []

    def handle_starttag(self, tag, attrs):
        if tag != "button":
            return
        keys = {key for key, _ in attrs}
        guarded = {
            "data-coming-soon",
            "data-sector-filter",
            "data-sheet-close",
            "data-reset-listings",
            "data-account-action",
            "data-preview-listing",
            "data-close-sheet",
            "data-open-signout",
            "data-confirm-signout",
            "data-cancel-signout",
        }
        if not keys.intersection(guarded):
            self.unguarded.append(sorted(keys))

for page in [Path("index.html"), Path("private-profile-p03.html")]:
    parser = Buttons()
    parser.feed(page.read_text(encoding="utf-8"))
    if parser.unguarded:
        raise SystemExit(f"[smoke][fail] unguarded static button in {page}")

styles = Path("styles/vvip-pr29-home-marketplace.css").read_text(
    encoding="utf-8"
)
for contract in [".network-notice", ".listing-skeleton"]:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing resilience style: {contract}")
PY_PR30

echo "[smoke] validating auth preview and safe return path"
python3 <<'PY_AUTH'
from pathlib import Path

text = Path("auth-clerk-index.js").read_text(encoding="utf-8")

required = [
    'return isLocalHost && preview === "home";',
    "SAFE_RETURN_PATHS.has(returnTo)",
    "location.replace(returnTo)",
]

for contract in required:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] missing safe auth contract: {contract}")

allowed_returns = [
    '"index.html"',
    '"/index.html"',
    '"./index.html"',
    '"private-profile-p03.html"',
    '"/private-profile-p03.html"',
    '"./private-profile-p03.html"',
]
for value in allowed_returns:
    if value not in text:
        raise SystemExit(f"[smoke][fail] safe return allowlist misses: {value}")

preview_files = [
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
]
loopback_contract = [
    'location.hostname === "localhost"',
    'location.hostname === "127.0.0.1"',
    'location.hostname === "::1"',
    'location.hostname === "[::1]"',
    'location.hostname === "0.0.0.0"',
]
for file in preview_files:
    source = file.read_text(encoding="utf-8")
    for contract in loopback_contract:
        if contract not in source:
            raise SystemExit(
                f"[smoke][fail] incomplete localhost preview guard in {file}: {contract}"
            )

profile = Path("scripts/vvip-p03-profile.js").read_text(encoding="utf-8")
signout = Path("scripts/vvip-p03-sign-out.js").read_text(encoding="utf-8")
private_return = "index.html?return_to=private-profile-p03.html"
if private_return not in profile:
    raise SystemExit("[smoke][fail] private account auth return is not canonical")
if private_return not in signout:
    raise SystemExit("[smoke][fail] sign-out auth guard races canonical return")
PY_AUTH

echo "[smoke] validating route availability"
python3 <<'PY_ROUTES'
from pathlib import Path
import re

text = Path("scripts/vvip-p03-route-map.js").read_text(encoding="utf-8")

def block(name):
    match = re.search(
        rf"\b{name}\s*:\s*\{{(?P<body>.*?)\n\s*\}}",
        text,
        re.S,
    )
    if not match:
        raise SystemExit(f"[smoke][fail] missing route: {name}")
    return match.group("body")

expected = {
    "home": ("index.html", True),
    "marketplace": ("index.html#marketplace", True),
    "search": ("index.html#search", True),
    "account": ("private-profile-p03.html", True),
    "private": ("private-profile-p03.html", True),
    "create": (None, False),
    "listingDetails": (None, False),
}

for name, (href, available) in expected.items():
    route = block(name)
    expected_flag = f"available: {str(available).lower()}"
    if expected_flag not in route:
        raise SystemExit(f"[smoke][fail] wrong availability: {name}")
    if href and f'href: "{href}"' not in route:
        raise SystemExit(f"[smoke][fail] wrong href: {name}")

public_token = "public" + "Profile"
public_path = "public" + "-profile"
if public_token in text or public_path in text:
    raise SystemExit("[smoke][fail] public profile route remains")
PY_ROUTES

echo "[smoke] validating service worker cache"
python3 <<'PY_SW'
from pathlib import Path

text = Path("sw.js").read_text(encoding="utf-8")
required = [
    "/scripts/vvip-pr29-home-marketplace.js",
    "/styles/vvip-pr29-home-marketplace.css",
    "/scripts/vvip-p03-profile.js",
    "/scripts/vvip-p03-sign-out.js",
    "/styles/vvip-p03-profile.css",
]
for asset in required:
    if asset not in text:
        raise SystemExit(f"[smoke][fail] service worker misses: {asset}")

legacy = [
    "vvip-" + "discovery-shell",
    "vvip-" + "discovery-config",
    "social" + "-ui",
    "public" + "-profile",
]
for token in legacy:
    if token in text:
        raise SystemExit(f"[smoke][fail] service worker caches legacy: {token}")

hardening = [
    "const CACHE_PREFIX",
    "key.startsWith(CACHE_PREFIX)",
    "new URL(event.request.url)",
    "url.origin !== self.location.origin",
    'event.request.mode === "navigate"',
    "ASSET_PATHS.has(url.pathname)",
    "url.search",
    "function shouldBypass",
    '"clerk"',
    '"supabase"',
    '"token"',
    '"auth"',
    'return caches.match("/index.html")',
    "/scripts/vvip-pr30-resilience.js",
]
for contract in hardening:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] service worker hardening missing: {contract}")

forbidden_cache_patterns = [
    "cache.put(event.request",
    "keys.filter(function (key) { return key !== CACHE_NAME;",
]
for pattern in forbidden_cache_patterns:
    if pattern in text:
        raise SystemExit(f"[smoke][fail] unsafe service worker pattern remains: {pattern}")

if '"/private-profile-p03.html"' in text:
    raise SystemExit("[smoke][fail] service worker precaches private account HTML")
PY_SW

echo "[smoke] validating Firebase legacy redirects"
python3 <<'PY_FIREBASE'
from pathlib import Path
import json

config = json.loads(Path("firebase.json").read_text(encoding="utf-8"))
redirects = config.get("hosting", {}).get("redirects", [])
actual = {
    (item.get("source"), item.get("destination"), item.get("type"))
    for item in redirects
}
expected = {
    ("/public-profile.html", "/index.html", 301),
    ("/public-profile-p03.html", "/index.html", 301),
    ("/public-profile", "/index.html", 301),
    ("/public-profile-p03", "/index.html", 301),
}

missing = expected - actual
if missing:
    raise SystemExit(f"[smoke][fail] missing Firebase legacy redirects: {sorted(missing)}")
PY_FIREBASE

echo "[smoke] validating forbidden live terminology and navigation"
python3 <<'PY_TERMS'
from pathlib import Path

files = [
    Path("index.html"),
    Path("private-profile-p03.html"),
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-p03-route-map.js"),
    Path("styles/vvip-pr29-home-marketplace.css"),
    Path("sw.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
    Path("styles/vvip-p03-profile.css"),
    Path("styles/vvip-visual-trust-layer.css"),
]

forbidden = [
    "".join(chr(code) for code in [1586, 1575, 1574, 1585]),
    "".join(chr(code) for code in [1586, 1608, 1575, 1585]),
    "".join(chr(code) for code in [1575, 1604, 1586, 1608, 1575, 1585]),
    "visit" + "or",
    "visit" + "ors",
    "g" + "uest",
    "g" + "uests",
    "view" + "-as",
    "view" + " as",
    "public" + " profile",
    "public" + "-profile",
    "".join(chr(code) for code in [1575, 1604, 1589, 1601, 1581, 1577, 32, 1575, 1604, 1593, 1575, 1605, 1577]),
]

missing_pages = [
    "home" + ".html",
    "market" + ".html",
    "create" + "-listing.html",
    "listing" + "-details.html",
]

for file in files:
    if not file.exists():
        continue
    text = file.read_text(encoding="utf-8", errors="ignore").lower()
    for term in forbidden + missing_pages:
        if term.lower() in text:
            raise SystemExit(
                f"[smoke][fail] forbidden live term or path in {file}"
            )
PY_TERMS

echo "[smoke] validating retired static policies"
python3 <<'PY_POLICY'
from pathlib import Path

files = [
    Path("index.html"),
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
]

terms = [
    "7 " + "photos",
    "7 " + "صور",
    "120 " + "days",
    "120 " + "يوم",
    "4 " + "posts",
    "4 " + "منشورات",
    "4 " + "months",
    "4 " + "أشهر",
]

for file in files:
    text = file.read_text(encoding="utf-8", errors="ignore").lower()
    for term in terms:
        if term.lower() in text:
            raise SystemExit(f"[smoke][fail] retired policy in {file}")
PY_POLICY

echo "[smoke] validating sanitized client recovery logging"
python3 <<'PY_LOGGING'
from pathlib import Path

files = [
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-pr30-resilience.js"),
]

unsafe_fragments = [
    ", error",
    ", event.reason",
    "error.stack",
    "error.message",
]

for file in files:
    source = file.read_text(encoding="utf-8", errors="ignore")
    for fragment in unsafe_fragments:
        if fragment in source:
            raise SystemExit(
                f"[smoke][fail] unsanitized client recovery logging in {file}"
            )
PY_LOGGING

echo "[smoke] validating no database-scope diff"
python3 <<'PY_DIFF'
import subprocess

changed = subprocess.run(
    ["git", "diff", "HEAD", "--name-only"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

untracked = subprocess.run(
    ["git", "ls-files", "--others", "--exclude-standard"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

changed.extend(untracked)

backup_paths = [name for name in untracked if name.startswith("backups/")]
if backup_paths:
    raise SystemExit(
        "[smoke][fail] repository backup remains untracked: "
        + ", ".join(backup_paths)
    )

forbidden_roots = ("backups/", "approved/", "docs/")
for name in changed:
    if name.startswith(forbidden_roots):
        raise SystemExit(f"[smoke][fail] forbidden PR30 scope changed: {name}")

blocked_roots = ["supa" + "base/", "migra" + "tions/"]
for name in changed:
    lowered = name.lower()
    if lowered.endswith("." + "sql") or any(root in lowered for root in blocked_roots):
        raise SystemExit(f"[smoke][fail] database-scope file changed: {name}")
PY_DIFF

echo "[smoke][pass] PR29 legacy eradication checks succeeded"
