from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
	ROOT / ".gitignore",
	ROOT / "private-profile-p03.html",
	ROOT / "public-profile-p05.html",
	ROOT / "edit-profile-p05.html",
	ROOT / "account-settings-p05.html",
	ROOT / "styles/vvip-pr39-profile.css",
	ROOT / "scripts/profile/pr39-profile-contract.js",
	ROOT / "scripts/profile/pr39-profile-controller.js",
	ROOT / "scripts/profile/pr39-profile-editor.js",
	ROOT / "scripts/profile/pr39-account-management.js",
	ROOT / "scripts/profile/pr39-profile-preview.js",
	ROOT / "tests/pr39-p05-profile-account-management.test.py",
	ROOT / "tests/pr39-p05-profile-account-management.runtime.test.cjs",
	ROOT / "docs/change-control/20260715-pr39-p05-profile-account-management.json",
]

FORBIDDEN_PATTERNS = [
	r"service_role",
	r"sb_secret_",
	r"\beyJ[A-Za-z0-9_-]{10,}\.",
	r"from\([\"']profiles[\"']\)\s*\.\s*update\(",
	r"\.rpc\(",
	r"user\.delete\(",
	r"supabase\s*\.\s*from\(",
]


class MarkupScanner(HTMLParser):
	def __init__(self) -> None:
		super().__init__()
		self.ids: list[str] = []
		self.inline_handlers: list[tuple[str, str]] = []

	def handle_starttag(self, tag: str, attrs):
		attr_map = dict(attrs)
		if "id" in attr_map:
			self.ids.append(attr_map["id"])
		for key in attr_map:
			if key.lower().startswith("on"):
				self.inline_handlers.append((tag, key))


def read(relative_path: str) -> str:
	path = ROOT / relative_path
	assert path.is_file(), f"missing file: {relative_path}"
	return path.read_text(encoding="utf-8")


def assert_html_contract(relative_path: str) -> None:
	html = read(relative_path)
	assert re.search(r"<html[^>]+lang=[\"']ar[\"'][^>]+dir=[\"']rtl[\"']", html, re.I), relative_path
	assert re.search(r"<meta[^>]+name=[\"']viewport[\"']", html, re.I), relative_path
	assert "aria-live" in html, f"aria-live missing in {relative_path}"

	scanner = MarkupScanner()
	scanner.feed(html)
	duplicates = sorted({item for item in scanner.ids if scanner.ids.count(item) > 1})
	assert not duplicates, f"duplicate IDs in {relative_path}: {duplicates}"
	assert not scanner.inline_handlers, f"inline handlers in {relative_path}: {scanner.inline_handlers}"


def test_pr39_static_contract() -> None:
	for path in REQUIRED_FILES:
		assert path.is_file(), f"required scope file missing: {path.relative_to(ROOT)}"

	public_html = read("public-profile-p05.html")
	private_html = read("private-profile-p03.html")
	edit_html = read("edit-profile-p05.html")
	settings_html = read("account-settings-p05.html")
	css = read("styles/vvip-pr39-profile.css")
	gitignore_text = read(".gitignore")
	contract_js = read("scripts/profile/pr39-profile-contract.js")
	controller_js = read("scripts/profile/pr39-profile-controller.js")
	editor_js = read("scripts/profile/pr39-profile-editor.js")
	management_js = read("scripts/profile/pr39-account-management.js")
	preview_js = read("scripts/profile/pr39-profile-preview.js")

	assert_html_contract("public-profile-p05.html")
	assert_html_contract("edit-profile-p05.html")
	assert_html_contract("account-settings-p05.html")

	assert "focus-visible" in css
	assert "prefers-reduced-motion" in css
	assert "!tests/pr39-p05-profile-account-management.test.py" in gitignore_text
	assert "!tests/pr39-p05-profile-account-management.runtime.test.cjs" in gitignore_text

	assert "OWNER_MODE" in contract_js
	assert "VISITOR_MODE" in contract_js
	assert "safe fallback".lower() in controller_js.lower() or "visitor" in controller_js.lower()

	assert "public-profile-p05.html" in private_html
	assert "edit-profile-p05.html" in private_html
	assert "account-settings-p05.html" in private_html

	for section_title in [
		"الملف والهوية العامة",
		"الخصوصية",
		"الجلسة والأمان",
		"اللغة والعرض",
		"نوع الحساب وصلاحية النشر",
		"Tiger Care",
		"التعطيل المؤقت للحساب",
		"الحذف متعدد الخطوات",
	]:
		assert section_title in settings_html, f"missing settings section: {section_title}"

	assert settings_html.count("data-pr39-deactivation") == 1
	assert settings_html.count("data-pr39-deletion") == 1
	assert settings_html.count("data-pr39-deactivation") >= 1
	assert settings_html.count("data-pr39-deletion") >= 1
	assert settings_html.count("data-step") >= 10, "multi-step flows should include enough guided steps"
	assert "data-confirm-phrase" in settings_html, "deletion flow must require typed confirmation phrase"
	assert "حذف حسابي" in settings_html, "deletion phrase contract missing"

	combined = "\n".join([
		public_html,
		private_html,
		edit_html,
		settings_html,
		contract_js,
		controller_js,
		editor_js,
		management_js,
		preview_js,
	])

	assert not re.search(r"(name|id|data-[\w-]*)=[\"'][^\"']*sector", combined, re.I)
	assert "publishingPermission" in combined
	assert re.search(r"none", combined), "publishingPermission none text required"

	pii_markers = ["data-public-email", "data-public-phone", "clerk_user_id", "supabase_id"]
	for marker in pii_markers:
		assert marker not in public_html, f"public profile must not expose marker: {marker}"

	for pattern in FORBIDDEN_PATTERNS:
		assert not re.search(pattern, combined, re.I), f"forbidden pattern found: {pattern}"

	assert "javascript:" not in combined.lower()
	assert "innerHTML =" not in combined

	assert "signOut" in controller_js or "signOut" in management_js
	assert "user.delete(" not in combined

	manifest = json.loads(read("docs/change-control/20260715-pr39-p05-profile-account-management.json"))
	assert str(manifest.get("phase", "")).upper() == "P05"
	assert str(manifest.get("pr", "")).upper() == "PR39"
	assert manifest.get("baseline") == "2ea13a3417004653324e2c27fedeeb779e8299cd"
	assert manifest.get("branch") == "feat/pr39-p05-profile-account-management"
	assert manifest.get("production_changes") is False
	assert manifest.get("sql_changes") is False
	assert manifest.get("rls_changes") is False
	assert manifest.get("migrations_changes") is False
	assert manifest.get("automatic_merge") is False
	assert manifest.get("destructive_account_actions") is False

	for key in [
		"owner_mode_contract",
		"visitor_mode_contract",
		"public_fields",
		"private_fields",
		"tests",
		"browser_scenarios",
		"rollback",
	]:
		assert key in manifest, f"missing manifest key: {key}"

	unchanged = subprocess.run(
		["git", "diff", "--name-only", "--", "index.html", "auth-clerk-index.js"],
		cwd=ROOT,
		text=True,
		capture_output=True,
		check=True,
	).stdout.strip()
	assert unchanged == "", "index.html and auth-clerk-index.js must remain unchanged"

	print("PR39 STATIC CONTRACT TEST PASS")


if __name__ == "__main__":
	test_pr39_static_contract()
