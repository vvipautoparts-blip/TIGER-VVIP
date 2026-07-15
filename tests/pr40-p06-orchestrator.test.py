from __future__ import annotations

from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    ROOT / "scripts/orchestrator/vvip_master_orchestrator.py",
    ROOT / "scripts/orchestrator/p06_orchestrator_state.schema.json",
    ROOT / "scripts/orchestrator/p06_orchestrator_config.json",
    ROOT / "scripts/p06/p06-owner-control-readonly.js",
    ROOT / "styles/vvip-pr40-owner-orchestrator.css",
    ROOT / "docs/change-control/20260715-pr40-p06-owner-control-orchestrator.json",
]

REQUIRED_PHASE_STATES = {
    "pending",
    "planning",
    "red",
    "implementing",
    "green",
    "preview",
    "pr_open",
    "reviewing",
    "merged",
    "post_merge_verified",
    "completed",
    "blocked",
    "owner_approval_required",
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_p06_orchestrator_contract() -> None:
    for file_path in REQUIRED_FILES:
        assert file_path.is_file(), f"missing required P06 file: {file_path.relative_to(ROOT)}"

    owner_html = read(ROOT / "owner-control.html")
    assert re.search(r"<html[^>]+lang=[\"']ar[\"'][^>]+dir=[\"']rtl[\"']", owner_html, re.I)
    assert "data-owner-root" in owner_html
    assert "scripts/p06/p06-owner-control-readonly.js" in owner_html

    schema = json.loads(read(ROOT / "scripts/orchestrator/p06_orchestrator_state.schema.json"))
    enum_values = set(schema["properties"]["status"]["enum"])
    assert REQUIRED_PHASE_STATES.issubset(enum_values)

    cfg = json.loads(read(ROOT / "scripts/orchestrator/p06_orchestrator_config.json"))
    assert cfg.get("phase_queue", [None])[0] == "P06"
    assert cfg.get("integrity", {}).get("sha256_manifest") is True

    orch_py = read(ROOT / "scripts/orchestrator/vvip_master_orchestrator.py")
    for token in ["status", "resume", "dry-run", "emergency-stop", "integrity-check"]:
        assert token in orch_py, f"missing orchestrator command token: {token}"

    print("PR40 P06 STATIC TEST PASS")


if __name__ == "__main__":
    test_p06_orchestrator_contract()
