from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path

from tools import vvip_cleanroom


class CleanroomVirtualEnvironmentTests(unittest.TestCase):
    def init_repo(self, root: Path) -> None:
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Cleanroom Test"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "cleanroom@example.invalid"], cwd=root, check=True)
        (root / ".gitignore").write_text(".venv/\n.venv-*/\n", encoding="utf-8")
        (root / "index.html").write_text("<!doctype html><title>VVIP</title>\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=root, check=True)

    def test_virtualenv_paths_are_dependency_output(self) -> None:
        self.assertEqual(
            vvip_cleanroom.garbage_reason(
                ".venv/lib/python3.12/site-packages/example.py",
                tracked=False,
                ignored=True,
            ),
            "dependency environment output",
        )
        self.assertEqual(
            vvip_cleanroom.garbage_reason(
                ".venv-quality/bin/python",
                tracked=False,
                ignored=True,
            ),
            "dependency environment output",
        )

    def test_apply_removes_ignored_virtualenv_directories(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)

            for name in (".venv", ".venv-quality"):
                site_packages = root / name / "lib" / "python3.12" / "site-packages"
                site_packages.mkdir(parents=True)
                (site_packages / "generated.py").write_text("generated = True\n", encoding="utf-8")

            result = vvip_cleanroom.execute(root, "apply", enforce_scope=False)

            self.assertGreater(result.cleanup_changes, 0)
            self.assertFalse((root / ".venv").exists())
            self.assertFalse((root / ".venv-quality").exists())


if __name__ == "__main__":
    unittest.main()
