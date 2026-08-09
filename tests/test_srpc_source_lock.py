import hashlib
from pathlib import Path
import pytest

try:
    from tools.srpc.source_lock import verify_source
except ModuleNotFoundError:
    verify_source = None

H0 = "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0"
PATH = "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"

def require_verifier():
    assert verify_source is not None, "tools.srpc.source_lock must exist"

def test_accepts_exact(tmp_path: Path):
    require_verifier()
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    assert verify_source(tmp_path, H0, H0, PATH, digest)["status"] == "PASS"

def test_rejects_commit(tmp_path: Path):
    require_verifier()
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    with pytest.raises(ValueError, match="SRPC-001"):
        verify_source(tmp_path, "0" * 40, H0, PATH, digest)

def test_rejects_bytes(tmp_path: Path):
    require_verifier()
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"changed")
    with pytest.raises(ValueError, match="SRPC-003"):
        verify_source(tmp_path, H0, H0, PATH, "f" * 64)

import subprocess
import sys

SCRIPT = Path(__file__).parents[1] / "tools" / "srpc" / "source_lock.py"

def test_cli_exposes_only_runtime_inputs():
    result = subprocess.run([sys.executable, str(SCRIPT), "--help"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "--source-root" in result.stdout
    assert "--actual-commit" in result.stdout
    assert "--output" in result.stdout
    assert "--expected-hash" not in result.stdout
    assert "--expected-commit" not in result.stdout

def test_cli_rejects_expected_hash_override():
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--expected-hash", "0" * 64],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
