from __future__ import annotations

from pathlib import Path
import runpy
import unittest

ROOT = Path(__file__).parents[1]
PROMOTION_WORKFLOW = ROOT / ".github" / "workflows" / "pages.yml"
RELEASE_BUILDER = ROOT / "tools" / "vvip_public_release.py"


class ProductionPromotionSurfaceTests(unittest.TestCase):
    def test_exact_allowlist_requires_sovereign_runtime_and_excludes_retired_runtime(self):
        namespace = runpy.run_path(str(RELEASE_BUILDER))
        approved = set(namespace["_approved_exact_files"]())

        for path in (
            "scripts/runtime/vvip-runtime-loader.js",
            "scripts/runtime/vvip-marketplace-repository.js",
            "scripts/runtime/vvip-static-delivery.js",
            "sw-vvip-static.js",
        ):
            self.assertIn(path, approved)

        for path in (
            "sw.js",
            "scripts/runtime/vvip-marketplace-rollback.js",
            "scripts/runtime/vvip-my-listings.js",
            "scripts/vvip-production-marketplace.js",
            "styles/vvip-production-marketplace.css",
        ):
            self.assertNotIn(path, approved)

    def test_promotion_consumes_verified_prebuilt_artifact_instead_of_rebuilding_repository(self):
        text = PROMOTION_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("Verify attested inner evidence and emit already-built public bytes", text)
        self.assertIn("scripts/release/verify-production-artifact.py inner", text)
        self.assertIn("Upload already-built verified public bytes for GitHub Pages", text)
        self.assertNotIn("required_paths=(", text)
        self.assertNotIn("forbidden_paths=(", text)


if __name__ == "__main__":
    unittest.main()
