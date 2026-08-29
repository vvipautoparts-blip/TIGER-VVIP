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
    "data-tiger-social-feed",
    "data-social-post-trigger",
    "data-nexus-sector",
    "data-nexus-intent",
    "data-nexus-pulse-vault",
    "data-fusion-account-trigger",
    "data-fusion-capability-menu",
    "data-nexus-sector-discovery",
    "data-nexus-sector-discovery-feed",
    "data-nexus-sector-filters",
    "data-nexus-sector-search",
]
for marker in required_markers:
    if marker not in html:
        raise SystemExit(f"[smoke][fail] authoritative NEXUS marker missing: {marker}")

if html.count("data-social-post-trigger") != 1:
    raise SystemExit("[smoke][fail] NEXUS must expose exactly one canonical creation trigger")

prohibited_index = [
    "data-social-marketplace-surface",
    "data-vvip-marketplace-feed",
    "data-vvip-sector-filters",
    "data-listing-search",
    "data-vvip-listing-detail-sheet",
    "data-synapse-intent-entry",
    "data-synapse-marketplace-rescue",
    "data-synapse-profile-intent-summary",
    'data-social-nav="marketplace"',
    "scripts/fusion/runtime-adapters.js",
    "scripts/fusion/marketplace-context.js",
    "scripts/fusion/f02-feed.js",
    "scripts/synapse/intent-domain.js",
    "scripts/synapse/intent-runtime-adapters.js",
    "scripts/synapse/living-surface-controller.js",
    "styles/tiger-synapse/living-surface.css",
]
for token in prohibited_index:
    if token in html:
        raise SystemExit(f"[smoke][fail] conflicting parallel surface remains in index: {token}")

required_files = [
    "auth-clerk-index.js",
    "scripts/vvip-pr30-resilience.js",
    "scripts/fusion/f03-capability-menu.js",
    "scripts/fusion/account-surface.js",
    "scripts/fusion/single-surface-controller.js",
    "scripts/social/runtime-adapters.js",
    "scripts/social/feed-read-model.js",
    "scripts/social/feed-controller.js",
    "scripts/social/post-composer.js",
    "scripts/social/core-shell.js",
    "scripts/nexus/living-sector-object.js",
    "scripts/nexus/sector-discovery.js",
    "scripts/nexus/pulse-runtime.js",
    "scripts/nexus/opportunity-radar.js",
    "scripts/nexus/pulse-surface.js",
    "scripts/nexus/bootstrap.js",
    "styles/nexus/nexus.css",
    "sw-vvip-static.js",
    "docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md",
]
for relative in required_files:
    if not Path(relative).is_file():
        raise SystemExit(f"[smoke][fail] required NEXUS file missing: {relative}")

physically_removed = [
    "scripts/fusion/progressive-composer.js",
    "styles/fusion/progressive-composer.css",
    "scripts/vvip-pr31-create-listing-shell.js",
    "styles/vvip-pr31-create-listing-shell.css",
    "scripts/vvip-pr32-draft-preview.js",
    "styles/vvip-pr32-draft-preview.css",
    "scripts/vvip-pr33-publish-readiness.js",
    "styles/vvip-pr33-publish-readiness.css",
    "scripts/runtime/vvip-my-listings.js",
    "scripts/nexus/pulse-vault.js",
    "tests/nexus/pulse-vault.test.cjs",
]
for relative in physically_removed:
    if Path(relative).exists():
        raise SystemExit(f"[smoke][fail] conflicting path must stay physically deleted: {relative}")

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
    clean = urlsplit(raw).path.lstrip("./")
    if not clean or clean.startswith("../") or not Path(clean).is_file():
        raise SystemExit(f"[smoke][fail] local reference is unsafe or missing: {raw}")
if parser.buttons_without_action_contract:
    raise SystemExit(f"[smoke][fail] button without explicit action contract: {parser.buttons_without_action_contract}")

composer = Path("scripts/social/post-composer.js").read_text(encoding="utf-8")
runtime = Path("scripts/social/runtime-adapters.js").read_text(encoding="utf-8")
sector_discovery = Path("scripts/nexus/sector-discovery.js").read_text(encoding="utf-8")
bootstrap = Path("scripts/nexus/bootstrap.js").read_text(encoding="utf-8")
auth = Path("auth-clerk-index.js").read_text(encoding="utf-8")
core_shell = Path("scripts/social/core-shell.js").read_text(encoding="utf-8")

for contract in ["sectorId", "intent", "CREATE_SOCIAL_POST"]:
    if contract not in composer:
        raise SystemExit(f"[smoke][fail] canonical composer contract missing: {contract}")
for contract in ["vvip_social_post_create", "p_sector_key", "p_intent_class"]:
    if contract not in runtime:
        raise SystemExit(f"[smoke][fail] canonical publication RPC contract missing: {contract}")
for contract in ["TIGERSocialRuntime", "TIGERSocialFeed", "sectorKey", "intentClass"]:
    if contract not in sector_discovery:
        raise SystemExit(f"[smoke][fail] sector discovery is not bound to Living Objects: {contract}")
for contract in ["vvip_nexus_sector_registry", "hydrateServerSectorRegistry"]:
    if contract not in bootstrap:
        raise SystemExit(f"[smoke][fail] server-authoritative sector registry contract missing: {contract}")

for source_name, source in [("auth", auth), ("core-shell", core_shell), ("sector-discovery", sector_discovery)]:
    for retired in ["CREATE_LISTING", "VVIP_PR29", "TIGERSynapseLivingSurfaceCurrent", "VVIP_FUSION_PUBLIC_LISTINGS", "F02_PREVIEW_LISTINGS"]:
        if retired in source:
            raise SystemExit(f"[smoke][fail] conflicting contract restored in {source_name}: {retired}")

owner = Path("docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md").read_text(encoding="utf-8")
for contract in [
    "CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK / NO_IN_TREE_ARCHIVE",
    "TIGER NEXUS 2026",
    "ONE FEED",
    "ONE OBJECT",
    "ONE PULSE",
    "NO_PARALLEL_PRODUCT",
]:
    if contract.lower() not in owner.lower():
        raise SystemExit(f"[smoke][fail] current owner authority contract missing: {contract}")

print("[smoke] authoritative TIGER NEXUS surface PASS")
PY_NEXUS

echo "[smoke] validating shell and JavaScript syntax"
bash -n scripts/qa-smoke.sh
node --check auth-clerk-index.js
node --check scripts/fusion/account-surface.js
node --check scripts/fusion/single-surface-controller.js
node --check scripts/social/runtime-adapters.js
node --check scripts/social/feed-read-model.js
node --check scripts/social/feed-controller.js
node --check scripts/social/post-composer.js
node --check scripts/social/core-shell.js
node --check scripts/nexus/sector-discovery.js
node --check sw-vvip-static.js

echo "VVIP_FUSION_SMOKE=PASS"
