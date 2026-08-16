from __future__ import annotations

import importlib.util
import json
import os
import re
import tempfile
import unittest
from unittest import mock
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "tools" / "vvip_public_release.py"
spec = importlib.util.spec_from_file_location("vvip_public_release", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


class PublicReleaseTests(unittest.TestCase):
    def fixture(self, root: Path, *, test_key: bool = False, fixture_data: bool = False) -> None:
        key = "pk_test_demo" if test_key else ""
        (root / "index.html").write_text(
            f'<html><head><script data-clerk-publishable-key="{key}" src="https://x.clerk.accounts.dev/a.js"></script>'
            '<script src="scripts/vvip-pr29-home-marketplace.js"></script></head>'
            '<body><a href="private-profile-p03.html" data-safe-nav data-nav-target="private-profile-p03.html">حسابي</a></body></html>',
            encoding="utf-8",
        )
        (root / "scripts").mkdir()
        (root / "scripts" / "vvip-production-marketplace.js").write_text("legacy", encoding="utf-8")
        (root / "scripts" / "vvip-safe-ux-guard.js").write_text("legacy", encoding="utf-8")
        (root / "scripts" / "vvip-p03-route-map.js").write_text("", encoding="utf-8")
        (root / "scripts" / "vvip-p03-profile.js").write_text("", encoding="utf-8")
        (root / "scripts" / "vvip-p03-sign-out.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime").mkdir()
        (root / "scripts" / "runtime" / "vvip-runtime-loader.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime" / "vvip-marketplace-repository.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime" / "vvip-marketplace-rollback.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime" / "vvip-my-listings.js").write_text("", encoding="utf-8")
        (root / "styles").mkdir()
        (root / "styles" / "vvip-production-marketplace.css").write_text("", encoding="utf-8")

        for name in module.PUBLIC_ROOT_FILES:
            path = root / name
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("", encoding="utf-8")
        for name in module.PUBLIC_SCRIPT_FILES:
            path = root / name
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("window.VVIPFusion = {};\n", encoding="utf-8")
        if fixture_data:
            (root / "scripts" / "fusion" / "f02-feed.js").write_text(
                "const listings = [1];\n", encoding="utf-8"
            )

        (root / "manifest.webmanifest").write_text(
            json.dumps({"start_url": "./index.html"}), encoding="utf-8"
        )
        (root / "tests").mkdir()
        (root / "tests" / "secret.sql").write_text("select 1", encoding="utf-8")
        (root / "docs").mkdir()
        (root / "docs" / "internal.md").write_text("private", encoding="utf-8")

    @staticmethod
    def production_env(clerk_key: str = "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5jb20k") -> dict[str, str]:
        return {
            "TIGER_CLERK_PUBLISHABLE_KEY": clerk_key,
            "TIGER_SUPABASE_URL": "https://example.supabase.co",
            "TIGER_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
            "TIGER_DEFAULT_COUNTRY_CODE": "JO",
        }

    @staticmethod
    def assert_local_html_refs_exist(testcase: unittest.TestCase, output: Path) -> None:
        ref_pattern = re.compile(r'(?:src|href)=["\']([^"\']+)["\']', re.IGNORECASE)
        broken: list[str] = []
        for html in output.rglob("*.html"):
            text = html.read_text(encoding="utf-8", errors="replace")
            for raw in ref_pattern.findall(text):
                value = raw.strip()
                if not value or value.startswith(("#", "//", "data:", "mailto:", "tel:", "javascript:")):
                    continue
                if re.match(r"^[a-z][a-z0-9+.-]*:", value, re.IGNORECASE):
                    continue
                relative = value.split("#", 1)[0].split("?", 1)[0]
                if not relative:
                    continue
                target = (html.parent / relative).resolve()
                try:
                    target.relative_to(output.resolve())
                except ValueError:
                    broken.append(f"{html.relative_to(output)} -> {value} [escape]")
                    continue
                if not target.is_file():
                    broken.append(f"{html.relative_to(output)} -> {value}")
        testcase.assertEqual(broken, [], "broken public artifact references: " + "; ".join(broken))

    def test_candidate_excludes_internal_paths_and_transforms_index(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source, test_key=True)
            manifest = module.build(source, output, mode="candidate", source_sha="abc")
            self.assertFalse((output / "tests").exists())
            self.assertFalse((output / "docs").exists())
            index = (output / "index.html").read_text(encoding="utf-8")
            self.assertNotIn("pk_test_demo", index)
            self.assertNotIn("vvip-pr29-home-marketplace.js", index)
            self.assertNotIn("private-profile-p03.html", index)
            self.assertNotIn("vvip-production-marketplace.js", index)
            self.assertIn('href="#marketplace"', index)
            self.assertIn("data-account-route", index)
            self.assertIn("runtime-config.js", index)
            self.assertIn("vvip-marketplace-repository.js", index)
            self.assertTrue((output / "scripts" / "fusion" / "progressive-composer.js").is_file())
            self.assertTrue((output / "sw-vvip-static.js").is_file())
            self.assertTrue((output / "scripts" / "vvip-safe-ux-guard.js").is_file())
            self.assertEqual(manifest["sourceSha"], "abc")

    def test_candidate_copies_only_approved_fusion_scripts_and_blocks_local_only_publish(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            fusion = source / "scripts" / "fusion"
            fusion.mkdir(exist_ok=True)
            approved = [path for path in module.PUBLIC_SCRIPT_FILES if path.startswith("scripts/fusion/")]
            for relative in approved:
                path = source / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("window.VVIPFusion = {};\n", encoding="utf-8")
            (source / "scripts" / "fusion" / "progressive-composer.js").write_text(
                'window.VVIPFusionPublishMode = "LOCAL_DRAFT_ONLY";\n', encoding="utf-8"
            )
            (source / "scripts" / "fusion" / "private-debug.js").write_text("private", encoding="utf-8")

            manifest = module.build(source, output, mode="candidate", source_sha="fusion-candidate")

            for relative in approved:
                self.assertTrue((output / relative).is_file(), relative)
            self.assertFalse((output / "scripts" / "fusion" / "private-debug.js").exists())
            self.assertFalse(manifest["releaseEligible"])
            self.assertIn(
                {"code": "LOCAL_DRAFT_ONLY_PUBLISHER", "path": "scripts/fusion/progressive-composer.js"},
                manifest["forbiddenFindings"],
            )

    def test_production_requires_real_public_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            missing_env = {name: "" for name in self.production_env()}
            with mock.patch.dict(os.environ, missing_env, clear=False):
                with self.assertRaises(RuntimeError):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_rejects_fixture_markers(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source, fixture_data=True)
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with self.assertRaisesRegex(RuntimeError, "STATIC_LISTING_FIXTURES"):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_rejects_local_draft_only_publisher(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            fusion = source / "scripts" / "fusion"
            fusion.mkdir(exist_ok=True)
            (fusion / "progressive-composer.js").write_text(
                'window.VVIPFusionPublishMode = "LOCAL_DRAFT_ONLY";\n', encoding="utf-8"
            )
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with self.assertRaisesRegex(RuntimeError, "LOCAL_DRAFT_ONLY_PUBLISHER"):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_build_succeeds_with_clean_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                manifest = module.build(source, output, mode="production", source_sha="abc")
            self.assertTrue(manifest["releaseEligible"])
            self.assertIn("runtime-config.js", manifest["files"])
            self.assertIn("sw-vvip-static.js", manifest["files"])
            self.assertIn("scripts/fusion/progressive-composer.js", manifest["files"])
            self.assertIn("scripts/vvip-safe-ux-guard.js", manifest["files"])
            self.assertFalse((output / "CNAME").exists())
            self.assert_local_html_refs_exist(self, output)

    def test_repository_candidate_artifact_is_reference_closed_and_has_no_local_only_publisher(self):
        source = MODULE_PATH.parents[1]
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "out"
            manifest = module.build(source, output, mode="candidate", source_sha="closure-test")
            self.assertTrue(manifest["releaseEligible"])
            self.assertNotIn(
                {"code": "LOCAL_DRAFT_ONLY_PUBLISHER", "path": "scripts/fusion/progressive-composer.js"},
                manifest["forbiddenFindings"],
            )
            self.assert_local_html_refs_exist(self, output)
            self.assertTrue((output / "sw-vvip-static.js").is_file())
            webmanifest = json.loads((output / "manifest.webmanifest").read_text(encoding="utf-8"))
            start_url = str(webmanifest.get("start_url") or "").split("#", 1)[0].split("?", 1)[0]
            start_path = start_url.removeprefix("./") or "index.html"
            self.assertTrue((output / start_path).is_file())

    def test_production_allows_defensive_clerk_dev_domain_guard(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            (source / "scripts" / "runtime" / "vvip-runtime-loader.js").write_text(
                'if (frontendApi.endsWith(".clerk.accounts.dev")) { throw new Error("blocked"); }\n',
                encoding="utf-8",
            )
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                manifest = module.build(source, output, mode="production", source_sha="abc")
            self.assertTrue(manifest["releaseEligible"])
            self.assertFalse(
                any(item["code"] == "CLERK_DEV_DOMAIN" for item in manifest["forbiddenFindings"])
            )

    def test_production_rejects_active_clerk_dev_domain_even_with_live_prefix(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            unsafe_live_key = "pk_live_ZGVtby5jbGVyay5hY2NvdW50cy5kZXYk"
            with mock.patch.dict(os.environ, self.production_env(unsafe_live_key), clear=False):
                with self.assertRaises(RuntimeError):
                    module.build(source, output, mode="production", source_sha="abc")


if __name__ == "__main__":
    unittest.main()
