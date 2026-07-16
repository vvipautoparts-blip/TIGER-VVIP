from __future__ import annotations

from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "docs/owner-control/orchestrator/state.json"
LOG = ROOT / "docs/owner-control/orchestrator/log.ndjson"
SCRIPT = ROOT / "scripts/orchestrator/vvip_master_orchestrator.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_integrity_check_read_only() -> None:
    before_state = sha(STATE)
    before_log = sha(LOG)

    subprocess.run(["python3", str(SCRIPT), "integrity-check"], check=True, cwd=str(ROOT))

    after_state = sha(STATE)
    after_log = sha(LOG)

    assert before_state == after_state, "integrity-check modified state.json; expected read-only behavior"
    assert before_log == after_log, "integrity-check modified log.ndjson; expected read-only behavior"
