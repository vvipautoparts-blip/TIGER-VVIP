from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]

TARGET_FILES = [
    ROOT / "private-profile-p03.html",
    ROOT / "onboarding-p04.html",
    ROOT / "styles/vvip-pr38-onboarding.css",
    ROOT / "scripts/onboarding/pr38-account-types.js",
    ROOT / "scripts/onboarding/pr38-account-summary.js",
    ROOT / "scripts/onboarding/pr38-onboarding.js",
    ROOT / "tests/pr38-onboarding-account-types.test.py",
    ROOT / "tests/pr38-onboarding-account-types.runtime.test.cjs",
    ROOT / "docs/change-control/20260715-pr38-onboarding-account-types.json",
]

ALLOWED_ACCOUNT_TYPE_IDS = {
    "buyer-viewer",
    "buyer-standard",
    "individual-seller",
    "parts-shop",
    "maintenance-center",
    "electrical-hybrid-center",
    "general-service-center",
    "distributor",
    "importer",
    "wholesaler",
    "supplier",
    "retailer",
    "company-institution",
    "office",
    "broker",
    "service-provider",
    "personal-vip",
}


class IDAndInlineHandlerScanner(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids = []
        self.inline_handlers = []

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        if "id" in attr_map:
            self.ids.append(attr_map["id"])
        for key in attr_map:
            if key.lower().startswith("on"):
                self.inline_handlers.append((tag, key))


def read_text(path: Path) -> str:
    assert path.is_file(), f"missing file: {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8")


def assert_no_duplicate_ids(html: str, label: str) -> None:
    scanner = IDAndInlineHandlerScanner()
    scanner.feed(html)
    duplicates = sorted({i for i in scanner.ids if scanner.ids.count(i) > 1})
    assert not duplicates, f"duplicate IDs in {label}: {duplicates}"
    assert not scanner.inline_handlers, f"inline handlers in {label}: {scanner.inline_handlers}"


def test_static_contract() -> None:
    for file_path in TARGET_FILES:
        assert file_path.is_file(), f"required scope file missing: {file_path.relative_to(ROOT)}"

    onboarding_html = read_text(ROOT / "onboarding-p04.html")
    profile_html = read_text(ROOT / "private-profile-p03.html")
    account_types_js = read_text(ROOT / "scripts/onboarding/pr38-account-types.js")
    summary_js = read_text(ROOT / "scripts/onboarding/pr38-account-summary.js")
    onboarding_js = read_text(ROOT / "scripts/onboarding/pr38-onboarding.js")

    assert re.search(r"<html[^>]+lang=[\"']ar[\"'][^>]+dir=[\"']rtl[\"']", onboarding_html, re.I)
    assert "viewport" in onboarding_html.lower()
    assert "aria-live" in onboarding_html
    assert re.search(r"<fieldset[\s\S]*?<legend", onboarding_html, re.I), "fieldset/legend is required"

    assert "onboarding-p04.html" in profile_html, "profile entry to onboarding is required"
    assert "scripts/onboarding/pr38-account-types.js" in profile_html
    assert "scripts/onboarding/pr38-account-summary.js" in profile_html

    profile_script_order = [
        profile_html.find("scripts/onboarding/pr38-account-types.js"),
        profile_html.find("scripts/onboarding/pr38-account-summary.js"),
    ]
    assert all(position >= 0 for position in profile_script_order), "profile onboarding scripts missing"
    assert profile_script_order == sorted(profile_script_order), (
        "private profile must load account-types before account-summary"
    )

    script_order = [
        onboarding_html.find("scripts/onboarding/pr38-account-types.js"),
        onboarding_html.find("scripts/onboarding/pr38-account-summary.js"),
        onboarding_html.find("scripts/onboarding/pr38-onboarding.js"),
    ]
    assert all(position >= 0 for position in script_order), "onboarding scripts missing"
    assert script_order == sorted(script_order), "onboarding scripts must load in order"

    assert_no_duplicate_ids(onboarding_html, "onboarding-p04.html")
    assert_no_duplicate_ids(profile_html, "private-profile-p03.html")

    assert not re.search(r"(?:name|id|data-[\w-]*)=[\"'][^\"']*sector", onboarding_html, re.I), (
        "onboarding must not include sector controls"
    )

    for account_id in sorted(ALLOWED_ACCOUNT_TYPE_IDS):
        assert account_id in account_types_js, f"missing account type id: {account_id}"

    combined = "\n".join([account_types_js, summary_js, onboarding_js, onboarding_html])

    assert re.search(r"publishingPermission\s*[:=]\s*[\"']none[\"']", combined)
    assert re.search(r"official\s*[:=]\s*false", combined)
    assert "index.html" in onboarding_js

    forbidden = [
        r"service_role",
        r"sb_secret_",
        r"\beyJ[A-Za-z0-9_-]{10,}\.",
        r"session\.getToken",
        r"accessToken",
        r"\.from\(",
        r"\.rpc\(",
        r"innerHTML\s*=",
    ]
    for pattern in forbidden:
        assert not re.search(pattern, combined, re.I), f"forbidden pattern found: {pattern}"

    manifest = json.loads(read_text(ROOT / "docs/change-control/20260715-pr38-onboarding-account-types.json"))
    assert str(manifest.get("phase", "")).upper() == "P04"
    assert str(manifest.get("pr", "")).upper() == "PR38"
    assert manifest.get("baseline_commit") == "946b47b3b76327f80d68a850227b367445c5afdb"
    assert manifest.get("branch") == "feat/pr38-p04-onboarding-account-types"
    assert manifest.get("production_changes") is False
    assert manifest.get("clerk_dashboard_changes") is False
    assert manifest.get("supabase_changes") is False
    assert manifest.get("sql_changes") is False
    assert manifest.get("automatic_merge") is False

    for required_key in [
        "scope_files",
        "product_decisions",
        "tests_executed",
        "security_checks",
        "rollback_instructions",
    ]:
        assert required_key in manifest, f"missing manifest key: {required_key}"

    unchanged = subprocess.run(
        ["git", "diff", "--name-only", "--", "index.html", "auth-clerk-index.js"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    assert unchanged == "", "index.html and auth-clerk-index.js must remain unchanged"

    print("PR38 STATIC TEST PASS")


if __name__ == "__main__":
    test_static_contract()
