from __future__ import annotations

from pathlib import Path
import re
import unittest

WORKFLOW = Path(__file__).parents[1] / ".github" / "workflows" / "pages.yml"


class ProductionPromotionSurfaceTests(unittest.TestCase):
    def test_live_verifier_requires_sovereign_runtime_and_forbids_legacy_runtime(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        required = re.search(r"required_paths=\(\n(?P<body>.*?)\n\s*\)", text, re.DOTALL)
        forbidden = re.search(r"forbidden_paths=\(\n(?P<body>.*?)\n\s*\)", text, re.DOTALL)
        self.assertIsNotNone(required, "required production surface must be explicit")
        self.assertIsNotNone(forbidden, "forbidden production surface must be explicit")
        required_body = required.group("body")
        forbidden_body = forbidden.group("body")

        for path in (
            "scripts/runtime/vvip-runtime-loader.js",
            "scripts/runtime/vvip-marketplace-repository.js",
        ):
            self.assertIn(path, required_body)
            self.assertNotIn(path, forbidden_body)

        for path in (
            "scripts/runtime/vvip-marketplace-rollback.js",
            "scripts/runtime/vvip-my-listings.js",
            "scripts/vvip-production-marketplace.js",
            "styles/vvip-production-marketplace.css",
        ):
            self.assertNotIn(path, required_body)
            self.assertIn(path, forbidden_body)

        self.assertIn("VVIP_POST_DEPLOY_FORBIDDEN_PRESENT", text)


if __name__ == "__main__":
    unittest.main()
