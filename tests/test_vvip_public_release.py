from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

MODULE_PATH = Path(__file__).parents[1] / "tools" / "vvip_public_release.py"
spec = importlib.util.spec_from_file_location("vvip_public_release", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


class PublicReleaseTests(unittest.TestCase):
    @staticmethod
    def production_env(clerk_key: str = "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5jb20k") -> dict[str, str]:
        return {
            "TIGER_CLERK_PUBLISHABLE_KEY": clerk_key,
            "TIGER_SUPABASE_URL": "https://example.supabase.co",
            "TIGER_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_example",
            "TIGER_DEFAULT_COUNTRY_CODE": "JO",
            "TIGER_MEDIA_FINALIZER_URL": "https://media.example.com/finalize",
        }

    def fixture(self, root: Path) -> None:
        for relative in module._approved_exact_files():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("", encoding="utf-8")
        (root / "index.html").write_text(
            "<html><head>"
            '<script data-clerk-publishable-key="pk_test_demo" src="https://x.clerk.accounts.dev/a.js"></script>'
            '<script src="scripts/vvip-pr30-resilience.js"></script>'
            '<script src="auth-clerk-index.js"></script>'
            '<script defer src="scripts/nexus/sector-discovery.js"></script>'
            '<script defer src="scripts/social/core-shell.js"></script>'
            "</head><body><button data-social-post-trigger>ماذا تعرض أو تحتاج؟</button></body></html>",
            encoding="utf-8",
        )
        (root / "manifest.webmanifest").write_text(
            json.dumps({"start_url": "./index.html"}), encoding="utf-8"
        )

    def test_release_allowlist_is_latest_only_nexus_graph(self):
        approved = set(module._approved_exact_files())
        self.assertIn("scripts/nexus/sector-discovery.js", approved)
        self.assertIn("scripts/nexus/bootstrap.js", approved)
        self.assertIn("scripts/nexus/pulse-surface.js", approved)
        for retired in (
            "scripts/runtime/vvip-marketplace-repository.js",
            "scripts/fusion/runtime-adapters.js",
            "scripts/fusion/marketplace-context.js",
            "scripts/fusion/f02-feed.js",
            "scripts/vvip-production-marketplace.js",
            "styles/vvip-production-marketplace.css",
        ):
            self.assertNotIn(retired, approved)

    def test_candidate_transforms_only_current_bootstrap_and_never_injects_parallel_marketplace_runtime(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            manifest = module.build(source, output, mode="candidate", source_sha="abc")
            index = (output / "index.html").read_text(encoding="utf-8")
            self.assertNotIn("pk_test_demo", index)
            self.assertNotIn("clerk.accounts.dev", index)
            self.assertIn("runtime-config.js", index)
            self.assertIn("scripts/runtime/vvip-runtime-loader.js", index)
            self.assertEqual(index.count("auth-clerk-index.js"), 1)
            self.assertEqual(index.count("scripts/vvip-pr30-resilience.js"), 1)
            self.assertIn("scripts/nexus/sector-discovery.js", index)
            self.assertNotIn("vvip-marketplace-repository.js", index)
            self.assertNotIn('href="#marketplace"', index)
            self.assertTrue((output / "scripts" / "nexus" / "sector-discovery.js").is_file())
            self.assertFalse((output / "scripts" / "runtime" / "vvip-marketplace-repository.js").exists())
            self.assertEqual(manifest["product"], "TIGER_NEXUS_2026")
            self.assertEqual(manifest["sourceSha"], "abc")

    def test_candidate_copies_only_exact_approved_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            extra = source / "scripts" / "fusion" / "parallel-debug.js"
            extra.parent.mkdir(parents=True, exist_ok=True)
            extra.write_text("parallel", encoding="utf-8")
            module.build(source, output, mode="candidate", source_sha="exact")
            self.assertFalse((output / "scripts" / "fusion" / "parallel-debug.js").exists())
            for relative in module._approved_exact_files():
                self.assertTrue((output / relative).is_file(), relative)

    def test_candidate_scans_current_nexus_publisher_for_local_only_marker(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            publisher = source / "scripts" / "social" / "post-composer.js"
            publisher.write_text('window.TIGERNexusPublishMode = "LOCAL_DRAFT_ONLY";\n', encoding="utf-8")
            manifest = module.build(source, output, mode="candidate", source_sha="publisher")
            self.assertFalse(manifest["releaseEligible"])
            self.assertIn(
                {"code": "LOCAL_DRAFT_ONLY_PUBLISHER", "path": "scripts/social/post-composer.js"},
                manifest["forbiddenFindings"],
            )

    def test_production_requires_real_public_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            missing = {key: "" for key in self.production_env()}
            with mock.patch.dict(os.environ, missing, clear=False):
                with self.assertRaises(RuntimeError):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_rejects_unsafe_media_finalizer_urls(self):
        values = (
            "",
            "http://media.example.com/finalize",
            "https://user@media.example.com/finalize",
            "https://media.example.com/finalize?x=1",
            "https://127.0.0.1/finalize",
            "https://localhost/finalize",
            "https://media.local/finalize",
            "https://media.example.com/a/../finalize",
            "https://media.example.com//finalize",
        )
        for value in values:
            with self.subTest(value=value), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / "src"
                output = Path(temp) / "out"
                source.mkdir()
                self.fixture(source)
                env = self.production_env()
                env["TIGER_MEDIA_FINALIZER_URL"] = value
                with mock.patch.dict(os.environ, env, clear=False):
                    with self.assertRaisesRegex(RuntimeError, "production media finalizer URL"):
                        module.build(source, output, mode="production", source_sha="a" * 40)

    def test_production_rejects_parallel_marketplace_brand_marker(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            (source / "index.html").write_text(
                "<html><head></head><body>VVIP TIGER MARKETPLACE</body></html>",
                encoding="utf-8",
            )
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with self.assertRaisesRegex(RuntimeError, "PARALLEL_MARKETPLACE_BRAND"):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_rejects_retired_github_pages_url(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            (source / "index.html").write_text(
                '<html><head></head><body>https://vvipautoparts-blip.github.io/TIGER-VVIP/</body></html>',
                encoding="utf-8",
            )
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with self.assertRaisesRegex(RuntimeError, "RETIRED_GITHUB_PAGES_URL"):
                    module.build(source, output, mode="production", source_sha="abc")

    def test_production_build_succeeds_with_clean_nexus_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            output = Path(temp) / "out"
            source.mkdir()
            self.fixture(source)
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                manifest = module.build(source, output, mode="production", source_sha="abc")
            self.assertTrue(manifest["releaseEligible"])
            self.assertEqual(manifest["product"], "TIGER_NEXUS_2026")
            self.assertIn("runtime-config.js", manifest["files"])
            self.assertIn("scripts/nexus/bootstrap.js", manifest["files"])
            self.assertIn("scripts/nexus/sector-discovery.js", manifest["files"])
            self.assertNotIn("scripts/runtime/vvip-marketplace-repository.js", manifest["files"])

    def test_configuration_only_validation_creates_no_public_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "must-not-exist"
            stdout = io.StringIO()
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with contextlib.redirect_stdout(stdout):
                    status = module.main([
                        "--mode", "production",
                        "--source-sha", "a" * 40,
                        "--output", str(output),
                        "--validate-config-only",
                    ])
            self.assertEqual(status, 0)
            self.assertEqual(stdout.getvalue(), "VVIP_PUBLIC_RELEASE_CONFIG=PASS\n")
            self.assertFalse(output.exists())

    def test_build_rejects_output_that_contains_source(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src"
            source.mkdir()
            self.fixture(source)
            with self.assertRaises(ValueError):
                module.build(source, source / "dist", mode="candidate", source_sha="abc")


if __name__ == "__main__":
    unittest.main()
