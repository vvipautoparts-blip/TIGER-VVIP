from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).parents[1] / "tools" / "vvip_public_release.py"
spec = importlib.util.spec_from_file_location("vvip_public_release_load_order", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


class ReleaseLoadOrderTests(unittest.TestCase):
    def test_runtime_dependencies_are_loaded_once_in_fail_closed_order(self):
        source = (
            '<html><head>'
            '<script defer src="scripts/runtime/vvip-my-listings.js"></script>'
            '<script defer src="scripts/runtime/vvip-marketplace-rollback.js"></script>'
            '</head><body></body></html>'
        )
        output = module._transform_index(source)
        scripts = [
            "runtime-config.js",
            "scripts/runtime/vvip-runtime-loader.js",
            "scripts/runtime/vvip-marketplace-repository.js",
            "auth-clerk-index.js",
            "scripts/vvip-pr30-resilience.js",
        ]
        positions = [output.index(script) for script in scripts]
        self.assertEqual(positions, sorted(positions))
        for script in scripts:
            self.assertEqual(output.count(script), 1, script)
        self.assertNotIn("scripts/vvip-marketplace-rollback.js", output)
        self.assertNotIn("scripts/vvip-production-marketplace.js", output)
        self.assertNotIn("scripts/runtime/vvip-my-listings.js", output)


if __name__ == "__main__":
    unittest.main()
