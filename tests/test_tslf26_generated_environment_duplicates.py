from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from tools import vvip_cleanroom


def _init_repo(root: Path) -> None:
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "Cleanroom Test"], cwd=root, check=True)
    subprocess.run(
        ["git", "config", "user.email", "cleanroom@example.invalid"],
        cwd=root,
        check=True,
    )
    (root / ".gitignore").write_text(".venv/\n", encoding="utf-8")
    (root / "index.html").write_text(
        "<!doctype html><title>VVIP</title>\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "."], cwd=root, check=True)
    subprocess.run(["git", "commit", "-qm", "fixture"], cwd=root, check=True)


def test_report_excludes_local_environment_internal_duplicates() -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        _init_repo(root)
        duplicate_a = root / ".venv" / "lib" / "a" / "LICENSE"
        duplicate_b = root / ".venv" / "lib" / "b" / "LICENSE"
        duplicate_a.parent.mkdir(parents=True)
        duplicate_b.parent.mkdir(parents=True)
        duplicate_a.write_text("same dependency license\n", encoding="utf-8")
        duplicate_b.write_text("same dependency license\n", encoding="utf-8")

        report = vvip_cleanroom.build_report(root, enforce_scope=False)
        duplicate_paths = {
            path
            for group in report["exact_duplicates"]
            for path in group["paths"]
        }

        assert not any(path.startswith(".venv/") for path in duplicate_paths)
        assert any(
            item["path"] == ".venv" and "dependency output" in item["classifications"]
            for item in report["inventory"]
        )
