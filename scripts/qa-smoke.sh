#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke] validating authoritative FUSION surface"

python3 <<'PY_FUSION'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re

ROOT = Path(".").resolve()
INDEX = Path("index.html")
if not INDEX.is_file():
    raise SystemExit("[smoke][fail] authoritative index.html is missing")

html = INDEX.read_text(encoding="utf-8")

required_markers = [
    "data-vvip-auth-gate",
    "data-vvip-fusion-authoritative",
    "data-vvip-unified-home",
    "data-vvip-marketplace-feed",
    "data-vvip-sector-filters",
    "data-listing-search",
    "data-fusion-composer-trigger",
    "data-fusion-account-trigger",
    "data-fusion-capability-menu",
    "data-vvip-listing-detail-sheet",
]
for marker in required_markers:
    if marker not in html:
        raise SystemExit(f"[smoke][fail] authoritative FUSION marker missing: {marker}")

required_files = [
    "auth-clerk-index.js",
    "scripts/vvip-pr30-resilience.js",
    "scripts/media/pr36-controller.js",
    "scripts/media/f05-heif-worker-client.js",
    "scripts/fusion/runtime-adapters.js",
    "scripts/fusion/marketplace-context.js",
    "scripts/fusion/f02-feed.js",
    "scripts/fusion/f04-search-fabric.js",
    "scripts/fusion/progressive-composer.js",
    "scripts/fusion/account-surface.js",
    "scripts/fusion/single-surface-controller.js",
    "scripts/runtime/vvip-marketplace-repository.js",
    "styles/fusion/f02-single-surface.css",
    "styles/fusion/progressive-composer.css",
    "sw-vvip-static.js",
    "scripts/runtime/vvip-static-delivery.js",
    "supabase/migrations/20260816090000_fusion_publication_entitlement.sql",
    "supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql",
    "docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-15.md",
]
for relative in required_files:
    if not Path(relative).is_file():
        raise SystemExit(f"[smoke][fail] required authoritative file missing: {relative}")

retired_index_assets = [
    "styles/vvip-pr31-create-listing-shell.css",
    "scripts/vvip-pr31-create-listing-shell.js",
    "vvip-discovery-shell",
    "vvip-discovery-config",
    "social-ui.js",
]
for retired in retired_index_assets:
    if retired.lower() in html.lower():
        raise SystemExit(f"[smoke][fail] authoritative index restored retired UI asset: {retired}")

if "href=\"#\"" in html or "href='#'" in html:
    raise SystemExit("[smoke][fail] fake hash-only link is presented as navigation")
if re.search(r"(?:href|src)\s*=\s*['\"]\s*javascript:", html, re.I):
    raise SystemExit("[smoke][fail] javascript URL is forbidden")

class SurfaceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.local_assets = []
        self.local_links = []
        self.buttons_without_action_contract = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag in {"script", "link"}:
            raw = data.get("src") if tag == "script" else data.get("href")
            if raw and not raw.startswith(("http://", "https://", "//", "data:")):
                self.local_assets.append(raw)
        if tag == "a":
            raw = data.get("href")
            if raw and not raw.startswith(("http://", "https://", "mailto:", "tel:", "#")):
                self.local_links.append(raw)
        if tag == "button":
            keys = {key for key, _ in attrs}
            if not any(key.startswith("data-") for key in keys):
                self.buttons_without_action_contract.append(sorted(keys))

parser = SurfaceParser()
parser.feed(html)

for raw in parser.local_assets + parser.local_links:
    parsed = urlsplit(raw)
    clean = parsed.path.lstrip("./")
    if not clean or clean.startswith("../"):
        raise SystemExit(f"[smoke][fail] unsafe local reference: {raw}")
    candidate = Path(clean)
    if not candidate.is_file():
        raise SystemExit(f"[smoke][fail] local reference does not resolve to a real file: {raw}")

if parser.buttons_without_action_contract:
    raise SystemExit(f"[smoke][fail] button without explicit action contract: {parser.buttons_without_action_contract}")

composer = Path("scripts/fusion/progressive-composer.js").read_text(encoding="utf-8")
composer_contracts = [
    "VVIP_PR36_MEDIA",
    "VVIP_AUTH",
    "requireAuth",
    "VVIPFusionMarketplaceContext",
    "createDraftWithMedia",
    "requestPublication",
    "VVIPActivationProvider",
    "entitlementReceipt",
    "data-fusion-progressive-form",
    "data-fusion-save-draft",
    "data-fusion-publish-request",
    "ليست طرفًا في البيع أو الدفع أو التوصيل",
]
for contract in composer_contracts:
    if contract not in composer:
        raise SystemExit(f"[smoke][fail] progressive composer contract missing: {contract}")

for retired in [
    "LOCAL_DRAFT_ONLY",
    "localStorage.setItem",
    "localStorage.getItem",
    "vvip.fusion.composer.draft",
    "prepareForPublication",
]:
    if retired in composer:
        raise SystemExit(f"[smoke][fail] retired local or publication authority restored: {retired}")

if "readAsDataURL" in composer or "data:image" in composer:
    raise SystemExit("[smoke][fail] progressive composer attempts to persist raw image data")

repository = Path("scripts/runtime/vvip-marketplace-repository.js").read_text(encoding="utf-8")
for contract in ["vvip_marketplace_request_publication", "PUBLICATION_REQUEST_FAILED", "ENTITLEMENT_RECEIPT_REQUIRED"]:
    if contract not in repository:
        raise SystemExit(f"[smoke][fail] trusted publication repository contract missing: {contract}")
for retired in ["vvip_marketplace_prepare_publication", "PUBLICATION_PREPARE_FAILED", "prepareForPublication"]:
    if retired in repository:
        raise SystemExit(f"[smoke][fail] superseded publication authority restored: {retired}")
if "PUBLICATION_TRANSPORT_UNAVAILABLE" in repository:
    raise SystemExit("[smoke][fail] retired publication transport stub restored")

controller = Path("scripts/fusion/single-surface-controller.js").read_text(encoding="utf-8")
adapters = Path("scripts/fusion/runtime-adapters.js").read_text(encoding="utf-8")
feed = Path("scripts/fusion/f02-feed.js").read_text(encoding="utf-8")
combined = controller + "\n" + adapters + "\n" + feed + "\n" + composer

if "VVIP_FUSION_SECTOR_REGISTRY" not in combined:
    raise SystemExit("[smoke][fail] dynamic sector registry contract is missing")

for token in ["automotive", "materials", "real-estate"]:
    if f'data-sector-filter="{token}"' in html:
        raise SystemExit(f"[smoke][fail] fixed legacy sector button restored: {token}")

resilience = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
for contract in ["function safeNavigate", "function isSafeTarget", 'window.addEventListener("offline"', 'window.addEventListener("online"']:
    if contract not in resilience:
        raise SystemExit(f"[smoke][fail] resilience contract missing: {contract}")

active_runtime = [
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr30-resilience.js"),
    Path("scripts/fusion/runtime-adapters.js"),
    Path("scripts/fusion/marketplace-context.js"),
    Path("scripts/fusion/f02-feed.js"),
    Path("scripts/fusion/progressive-composer.js"),
    Path("scripts/fusion/account-surface.js"),
    Path("scripts/fusion/single-surface-controller.js"),
    Path("scripts/runtime/vvip-marketplace-repository.js"),
]
native_dialog = re.compile(r"(?<![A-Za-z0-9_])(?:window\.)?(?:alert|confirm|prompt)\s*\(")
for file in active_runtime:
    source = file.read_text(encoding="utf-8", errors="ignore")
    if native_dialog.search(source):
        raise SystemExit(f"[smoke][fail] native browser dialog in active runtime: {file}")

worker = Path("sw-vvip-static.js").read_text(encoding="utf-8")
if 'CACHE_NAME = "vvip-static-v2"' not in worker:
    raise SystemExit("[smoke][fail] current bounded static cache version is not v2")

owner = Path("docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-15.md").read_text(encoding="utf-8")
for contract in ["FUSION 2026", "maximum 7 images", "CANCELLED", "OpenSooq-style search", "Latest-decision-wins", "GLOBAL_LAUNCH_ELIGIBLE = TRUE"]:
    if contract.lower() not in owner.lower():
        raise SystemExit(f"[smoke][fail] latest owner authority contract missing: {contract}")

print("[smoke] authoritative FUSION surface PASS")
PY_FUSION

echo "[smoke] validating shell scripts and JavaScript parse cleanly"
bash -n scripts/qa-smoke.sh
node --check auth-clerk-index.js
node --check scripts/fusion/runtime-adapters.js
node --check scripts/fusion/marketplace-context.js
node --check scripts/fusion/f02-feed.js
node --check scripts/fusion/progressive-composer.js
node --check scripts/fusion/account-surface.js
node --check scripts/fusion/single-surface-controller.js
node --check scripts/runtime/vvip-marketplace-repository.js
node --check sw-vvip-static.js

echo "VVIP_FUSION_SMOKE=PASS"
