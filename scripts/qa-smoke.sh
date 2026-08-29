#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke] validating authoritative TIGER NEXUS surface"

python3 <<'PY_NEXUS'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re

INDEX = Path("index.html")
if not INDEX.is_file():
    raise SystemExit("[smoke][fail] authoritative index.html is missing")

html = INDEX.read_text(encoding="utf-8")

required_markers = [
    "data-vvip-auth-gate",
    "data-vvip-fusion-authoritative",
    "data-vvip-unified-home",
    "data-tiger-social-feed",
    "data-social-post-trigger",
    'data-nexus-create-context="marketplace"',
    "data-nexus-sector",
    "data-nexus-intent",
    "data-nexus-pulse-vault",
    "data-fusion-account-trigger",
    "data-fusion-capability-menu",
    "data-vvip-marketplace-feed",
    "data-vvip-sector-filters",
    "data-listing-search",
    "data-vvip-listing-detail-sheet",
]
for marker in required_markers:
    if marker not in html:
        raise SystemExit(f"[smoke][fail] authoritative surface marker missing: {marker}")

required_files = [
    "auth-clerk-index.js",
    "scripts/vvip-pr30-resilience.js",
    "scripts/media/pr36-controller.js",
    "scripts/media/f05-heif-worker-client.js",
    "scripts/fusion/runtime-adapters.js",
    "scripts/fusion/marketplace-context.js",
    "scripts/fusion/f02-feed.js",
    "scripts/fusion/account-surface.js",
    "scripts/fusion/single-surface-controller.js",
    "scripts/social/runtime-adapters.js",
    "scripts/social/post-composer.js",
    "scripts/social/core-shell.js",
    "scripts/nexus/living-sector-object.js",
    "scripts/nexus/pulse-vault.js",
    "scripts/nexus/social-runtime-guard.js",
    "scripts/nexus/bootstrap.js",
    "scripts/runtime/vvip-marketplace-repository.js",
    "styles/fusion/f02-single-surface.css",
    "styles/nexus/nexus.css",
    "sw-vvip-static.js",
    "scripts/runtime/vvip-static-delivery.js",
    "docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md",
    "docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md",
    "config/fusion/current-authority.json",
]
for relative in required_files:
    if not Path(relative).is_file():
        raise SystemExit(f"[smoke][fail] required current file missing: {relative}")

retired_files = [
    "scripts/fusion/progressive-composer.js",
    "styles/fusion/progressive-composer.css",
    "tests/fusion-progressive-composer.test.cjs",
    "tests/fusion-composer-integration.test.cjs",
]
for relative in retired_files:
    if Path(relative).exists():
        raise SystemExit(f"[smoke][fail] superseded Marketplace wizard remains in current tree: {relative}")

retired_index_assets = [
    "scripts/fusion/progressive-composer.js",
    "styles/fusion/progressive-composer.css",
    "data-marketplace-listing-trigger",
    "data-fusion-composer-trigger",
    "styles/vvip-pr31-create-listing-shell.css",
    "scripts/vvip-pr31-create-listing-shell.js",
    "vvip-discovery-shell",
    "vvip-discovery-config",
    "social-ui.js",
]
for retired in retired_index_assets:
    if retired.lower() in html.lower():
        raise SystemExit(f"[smoke][fail] authoritative index restored retired creation/runtime asset: {retired}")

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

composer = Path("scripts/social/post-composer.js").read_text(encoding="utf-8")
runtime = Path("scripts/social/runtime-adapters.js").read_text(encoding="utf-8")
nexus = Path("scripts/nexus/living-sector-object.js").read_text(encoding="utf-8")
bootstrap = Path("scripts/nexus/bootstrap.js").read_text(encoding="utf-8")

for contract in ["sectorId", "intent", "CREATE_SOCIAL_POST"]:
    if contract not in composer:
        raise SystemExit(f"[smoke][fail] NEXUS composer contract missing: {contract}")
for contract in ["vvip_social_post_create", "p_sector_key", "p_intent_class"]:
    if contract not in runtime:
        raise SystemExit(f"[smoke][fail] NEXUS runtime publication contract missing: {contract}")
for contract in ["OFFER", "NEED", "SERVICE", "OPPORTUNITY", "NEXUS_SECTOR_REQUIRED", "NEXUS_INTENT_REQUIRED"]:
    if contract not in nexus:
        raise SystemExit(f"[smoke][fail] Living Sector Object contract missing: {contract}")
for contract in ["vvip_nexus_sector_registry", "VVIP_FUSION_SECTOR_REGISTRY", "hydrateServerSectorRegistry"]:
    if contract not in bootstrap:
        raise SystemExit(f"[smoke][fail] server-authoritative sector registry contract missing: {contract}")

for retired in [
    "LOCAL_DRAFT_ONLY",
    "localStorage.setItem",
    "localStorage.getItem",
    "prepareForPublication",
    "requestPublication",
    "entitlementReceipt",
]:
    if retired in composer:
        raise SystemExit(f"[smoke][fail] superseded publication authority restored in NEXUS composer: {retired}")

repository = Path("scripts/runtime/vvip-marketplace-repository.js").read_text(encoding="utf-8")
for contract in ["vvip_marketplace_submit_for_review", "LISTING_SUBMIT_FAILED", "submitForReview"]:
    if contract not in repository:
        raise SystemExit(f"[smoke][fail] trusted Marketplace review infrastructure missing: {contract}")
for retired in [
    "vvip_marketplace_prepare_publication",
    "PUBLICATION_PREPARE_FAILED",
    "prepareForPublication",
    "vvip_marketplace_request_publication",
    "requestPublication",
    "ENTITLEMENT_RECEIPT_REQUIRED",
    "entitlementReceipt",
    "entitlement_receipt",
]:
    if retired in repository:
        raise SystemExit(f"[smoke][fail] superseded publication authority restored in repository: {retired}")

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
    Path("scripts/fusion/account-surface.js"),
    Path("scripts/fusion/single-surface-controller.js"),
    Path("scripts/social/runtime-adapters.js"),
    Path("scripts/social/post-composer.js"),
    Path("scripts/social/core-shell.js"),
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

owner = Path("docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md").read_text(encoding="utf-8")
for contract in [
    "CURRENT_ONLY / OWNER_BINDING / FIRST_REFERENCE / NO_FALLBACK / NO_IN_TREE_ARCHIVE",
    "TIGER NEXUS 2026",
    "Living Sector Object",
    "OFFER / NEED / SERVICE / OPPORTUNITY",
    "PULSE_2",
    "PULSE_10",
    "PULSE_25",
    "PULSE_45",
    "not a party",
]:
    if contract.lower() not in owner.lower():
        raise SystemExit(f"[smoke][fail] latest owner authority contract missing: {contract}")

manifest = Path("config/fusion/current-authority.json").read_text(encoding="utf-8")
for retired in ['"supersededDecisions"', '"LEGACY_']:
    if retired in manifest:
        raise SystemExit(f"[smoke][fail] current authority restored in-tree legacy registry material: {retired}")

print("[smoke] authoritative TIGER NEXUS surface PASS")
PY_NEXUS

echo "[smoke] validating shell scripts and JavaScript parse cleanly"
bash -n scripts/qa-smoke.sh
node --check auth-clerk-index.js
node --check scripts/fusion/runtime-adapters.js
node --check scripts/fusion/marketplace-context.js
node --check scripts/fusion/f02-feed.js
node --check scripts/fusion/account-surface.js
node --check scripts/fusion/single-surface-controller.js
node --check scripts/social/runtime-adapters.js
node --check scripts/social/post-composer.js
node --check scripts/social/core-shell.js
node --check scripts/runtime/vvip-marketplace-repository.js
node --check scripts/fusion/verify-current-authority.cjs
node --check sw-vvip-static.js

echo "VVIP_FUSION_SMOKE=PASS"
