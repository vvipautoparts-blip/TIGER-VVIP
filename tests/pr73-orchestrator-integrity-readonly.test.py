from __future__ import annotations

import hashlib
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "docs/owner-control/orchestrator/state.json"
LOG = ROOT / "docs/owner-control/orchestrator/log.ndjson"
SCRIPT = ROOT / "scripts/orchestrator/vvip_master_orchestrator.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_required_artifacts(testcase: unittest.TestCase, state: Path, log: Path, script: Path) -> None:
    testcase.assertTrue(state.exists(), f"Required artifact missing: {state}")
    testcase.assertTrue(state.is_file(), f"Required artifact is not a file: {state}")
    testcase.assertTrue(log.exists(), f"Required artifact missing: {log}")
    testcase.assertTrue(log.is_file(), f"Required artifact is not a file: {log}")
    testcase.assertTrue(script.exists(), f"Required artifact missing: {script}")
    testcase.assertTrue(script.is_file(), f"Required artifact is not a file: {script}")


class TestOrchestratorIntegrityReadonly(unittest.TestCase):
    def test_integrity_check_read_only_and_idempotent(self) -> None:
        assert_required_artifacts(self, STATE, LOG, SCRIPT)

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

    def test_missing_artifact_reports_clear_assertion(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            fake_state = tmp_dir / "missing-state.json"
            fake_log = tmp_dir / "present-log.ndjson"
            fake_script = tmp_dir / "present-orchestrator.py"

            fake_log.write_text("{}\n", encoding="utf-8")
            fake_script.write_text("#!/usr/bin/env python3\n", encoding="utf-8")

            with self.assertRaises(AssertionError) as cm:
                assert_required_artifacts(self, fake_state, fake_log, fake_script)

            message = str(cm.exception)
            self.assertIn("Required artifact missing:", message)
            self.assertIn(str(fake_state), message)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestOrchestratorIntegrityReadonly)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.testsRun == 0:
        raise SystemExit("Regression guard: zero tests executed in pr73-orchestrator-integrity-readonly.test.py")
    raise SystemExit(0 if result.wasSuccessful() else 1)
