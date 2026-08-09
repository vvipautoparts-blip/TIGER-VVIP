from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/smg-v1-proof.yml"


def workflow_text():
    assert WORKFLOW.exists(), "SMG workflow missing"
    return WORKFLOW.read_text(encoding="utf-8")


def test_trigger_is_control_plane_only():
    text = workflow_text()
    assert "feat/srpc-v1-control-plane-20260809" in text
    assert "workflow_dispatch" not in text


def test_permissions_are_read_only_for_merge_surfaces():
    text = workflow_text()
    assert "contents: read" in text
    assert "pull-requests: write" not in text
    assert "contents: write" not in text
    assert "deployments: write" not in text


def test_no_merge_or_production_primitives():
    text = workflow_text().lower()
    forbidden = ["gh pr merge", "/merges", "enable_auto_merge", "supabase db", "supabase migration", "supabase link", "psql", "production_secret", "deployments:"]
    for token in forbidden:
        assert token not in text, token


def test_checks_out_exact_h1():
    text = workflow_text()
    assert "1e7fb3c1e43415e5bfaee957b6ab553ae68bc139" in text
    assert "ref: 1e7fb3c1e43415e5bfaee957b6ab553ae68bc139" in text


def test_actions_are_full_sha_pinned():
    text = workflow_text()
    uses = re.findall(r"uses:\s*([^\s]+)", text)
    assert uses
    for item in uses:
        assert re.search(r"@[0-9a-f]{40}$", item), item


def test_runs_smg_tests_and_hash_check():
    text = workflow_text()
    assert "python -m pytest tests/smg -q" in text
    assert "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9" in text
