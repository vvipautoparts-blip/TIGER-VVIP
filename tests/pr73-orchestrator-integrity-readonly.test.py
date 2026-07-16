from __future__ import annotations

import hashlib
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "docs/owner-control/orchestrator/state.json"
LOG = ROOT / "docs/owner-control/orchestrator/log.ndjson"
SCRIPT = ROOT / "scripts/orchestrator/vvip_master_orchestrator.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class TestOrchestratorIntegrityReadonly(unittest.TestCase):
    def test_integrity_check_read_only_and_idempotent(self) -> None:
        status_before = subprocess.run(
            ["git", "status", "--porcelain"],
            check=False,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        self.assertEqual(status_before.returncode, 0, "git status should be available")
        baseline_status = status_before.stdout

        before_state = sha(STATE)
        before_log = sha(LOG)

        run1 = subprocess.run(["python3", str(SCRIPT), "integrity-check"], check=False, cwd=str(ROOT))
        self.assertEqual(run1.returncode, 0, "integrity-check first run must exit 0")

        run2 = subprocess.run(["python3", str(SCRIPT), "integrity-check"], check=False, cwd=str(ROOT))
        self.assertEqual(run2.returncode, 0, "integrity-check second run must exit 0")

        after_state = sha(STATE)
        after_log = sha(LOG)

        self.assertEqual(before_state, after_state, "integrity-check modified state.json; expected read-only behavior")
        self.assertEqual(before_log, after_log, "integrity-check modified log.ndjson; expected read-only behavior")

        status_after = subprocess.run(
            ["git", "status", "--porcelain"],
            check=False,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        self.assertEqual(status_after.returncode, 0, "git status should be available")
        self.assertEqual(status_after.stdout, baseline_status, "integrity-check must not change git status")


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestOrchestratorIntegrityReadonly)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.testsRun == 0:
        raise SystemExit("Regression guard: zero tests executed in pr73-orchestrator-integrity-readonly.test.py")
    raise SystemExit(0 if result.wasSuccessful() else 1)
