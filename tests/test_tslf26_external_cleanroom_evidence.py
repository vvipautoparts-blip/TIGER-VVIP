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
    (root / ".gitignore").write_text("reports/\n", encoding="utf-8")
    (root / "index.html").write_text(
        "<!doctype html><title>VVIP</title>\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "."], cwd=root, check=True)
    subprocess.run(["git", "commit", "-qm", "fixture"], cwd=root, check=True)


def test_verify_can_write_reports_outside_repository_without_mutating_worktree() -> None:
    with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as evidence:
        root = Path(directory)
        evidence_root = Path(evidence)
        _init_repo(root)

        result = vvip_cleanroom.execute(
            root,
            "verify",
            enforce_scope=False,
            report_dir=evidence_root,
        )

        assert result.accepted
        assert (evidence_root / "vvip-cleanroom-report.json").is_file()
        assert (evidence_root / "VVIP_CLEANROOM_REPORT.md").is_file()
        status = subprocess.run(
            ["git", "status", "--porcelain=v1", "-uall"],
            cwd=root,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
        ).stdout
        assert status == ""
