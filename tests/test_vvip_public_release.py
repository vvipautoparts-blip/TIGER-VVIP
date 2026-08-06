from __future__ import annotations

import importlib.util
import os
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
        listing = "const listings = [1];" if fixture_data else "window.VVIP_PR29={};"
        (root / "index.html").write_text(
            f'<html><head><script data-clerk-publishable-key="{key}" src="https://x.clerk.accounts.dev/a.js"></script>'
            '<script src="scripts/vvip-pr29-home-marketplace.js"></script></head><body></body></html>',
            encoding="utf-8",
        )
        (root / "scripts").mkdir()
        (root / "scripts" / "vvip-production-marketplace.js").write_text(listing, encoding="utf-8")
        (root / "scripts" / "vvip-pr30-resilience.js").write_text("", encoding="utf-8")
        (root / "scripts" / "vvip-p03-route-map.js").write_text("", encoding="utf-8")
        (root / "scripts" / "vvip-p03-profile.js").write_text("", encoding="utf-8")
        (root / "scripts" / "vvip-p03-sign-out.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime").mkdir()
        (root / "scripts" / "runtime" / "vvip-runtime-loader.js").write_text("", encoding="utf-8")
        (root / "scripts" / "runtime" / "vvip-marketplace-repository.js").write_text("", encoding="utf-8")
        (root / "styles").mkdir()
        (root / "styles" / "vvip-production-marketplace.css").write_text("", encoding="utf-8")
        for name in module.PUBLIC_ROOT_FILES:
            path = root / name
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("", encoding="utf-8")
        (root / "tests").mkdir()
        (root / "tests" / "secret.sql").write_text("select 1", encoding="utf-8")
        (root / "docs").mkdir()
        (root / "docs" / "internal.md").write_text("private", encoding="utf-8")

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
            self.assertIn("runtime-config.js", index)
            self.assertIn("vvip-production-marketplace.js", index)
            self.assertEqual(manifest["sourceSha"], "abc")

    def test_production_requires_real_public_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            with self.assertRaises(RuntimeError):
                module.build(source, output, mode="production", source_sha="abc")

    def test_production_rejects_fixture_markers(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source, fixture_data=True)
            env = {
                "TIGER_CLERK_PUBLISHABLE_KEY": "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5jb20k",
                "TIGER_SUPABASE_URL": "https://example.supabase.co",
                "TIGER_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
            }
            with mock.patch.dict(os.environ, env, clear=False):
                with self.assertRaises(RuntimeError):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_build_succeeds_with_clean_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            env = {
                "TIGER_CLERK_PUBLISHABLE_KEY": "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5jb20k",
                "TIGER_SUPABASE_URL": "https://example.supabase.co",
                "TIGER_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
                "TIGER_DEFAULT_COUNTRY_CODE": "JO",
            }
            with mock.patch.dict(os.environ, env, clear=False):
                manifest = module.build(source, output, mode="production", source_sha="abc")
            self.assertTrue(manifest["releaseEligible"])
            self.assertIn("runtime-config.js", manifest["files"])
            self.assertFalse((output / "CNAME").exists())


if __name__ == "__main__":
    unittest.main()
