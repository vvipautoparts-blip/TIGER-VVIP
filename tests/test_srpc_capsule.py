from __future__ import annotations

import gzip
import hashlib
import io
import json
import tarfile
from pathlib import Path

import pytest

try:
    from tools.srpc.capsule import build_capsule
except ModuleNotFoundError:
    build_capsule = None


def require_builder():
    assert build_capsule is not None, "tools.srpc.capsule must exist"


def write_inputs(root: Path) -> tuple[Path, bytes]:
    inputs = root / "inputs"
    inputs.mkdir(parents=True)
    migration_bytes = b"begin;\nselect 1;\ncommit;\n"
    (inputs / "migration.sql").write_bytes(migration_bytes)
    (inputs / "release-manifest.json").write_text(
        json.dumps(
            {
                "schema": "vvip.tiger/release-capsule/v1",
                "release_id": "global-launch-phase-b",
                "source": {
                    "repository": "vvipautoparts-blip/TIGER-VVIP",
                    "commit": "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0",
                    "migration_path": "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql",
                    "migration_sha256": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9",
                    "control_plane_commit": "a" * 40,
                },
                "target": {
                    "environment": "staging",
                    "resolved_project_ref": "m" * 20,
                    "production_target": False,
                },
                "execution": {
                    "scope": "single-migration",
                    "pending_queue_runner_used": False,
                    "manual_sql_mutation": False,
                },
                "verification": {"static_contract": "PASS"},
                "decision": {"state": "EVIDENCE_COMPLETE", "production": "BLOCKED"},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (inputs / "verification").mkdir()
    (inputs / "verification" / "runtime.json").write_text(
        '{"z":2,"a":1}', encoding="utf-8"
    )
    return inputs, migration_bytes


def test_capsule_build_is_deterministic(tmp_path: Path):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    first = build_capsule(inputs, tmp_path / "one")
    second = build_capsule(inputs, tmp_path / "two")
    assert first["sha256"] == second["sha256"]
    assert Path(first["archive"]).read_bytes() == Path(second["archive"]).read_bytes()


def test_capsule_preserves_migration_bytes_and_canonicalizes_json(tmp_path: Path):
    require_builder()
    inputs, migration_bytes = write_inputs(tmp_path)
    result = build_capsule(inputs, tmp_path / "capsule")
    output = Path(result["directory"])
    assert (output / "migration.sql").read_bytes() == migration_bytes
    assert (output / "verification" / "runtime.json").read_text(encoding="utf-8") == '{"a":1,"z":2}\n'


def test_archive_metadata_is_normalized(tmp_path: Path):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    result = build_capsule(inputs, tmp_path / "capsule")
    raw = Path(result["archive"]).read_bytes()
    assert raw[4:8] == b"\x00\x00\x00\x00"
    with gzip.GzipFile(fileobj=io.BytesIO(raw), mode="rb") as gz:
        tar_bytes = gz.read()
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:") as tf:
        members = tf.getmembers()
        assert members
        for member in members:
            assert member.mtime == 0
            assert member.uid == 0
            assert member.gid == 0
            assert member.uname == "root"
            assert member.gname == "root"


@pytest.mark.parametrize(
    "payload",
    [
        {"password": "hidden"},
        {"nested": {"access_token": "hidden"}},
        {"service_role_key": "hidden"},
        {"database_url": "postgresql://u:p@db.example/x"},
        {"private_key": "-----BEGIN PRIVATE KEY-----"},
    ],
)
def test_capsule_rejects_secret_bearing_json_keys(tmp_path: Path, payload: dict):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    (inputs / "bad.json").write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError, match="secret-bearing"):
        build_capsule(inputs, tmp_path / "capsule")


def test_capsule_rejects_private_database_uri_even_under_neutral_key(tmp_path: Path):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    (inputs / "bad.json").write_text(
        json.dumps({"note": "postgres://user:pass@private.example/db"}), encoding="utf-8"
    )
    with pytest.raises(ValueError, match="sensitive value"):
        build_capsule(inputs, tmp_path / "capsule")


def test_capsule_rejects_staging_manifest_marked_as_production(tmp_path: Path):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    manifest_path = inputs / "release-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["target"]["production_target"] = True
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="production_target"):
        build_capsule(inputs, tmp_path / "capsule")


def test_capsule_sidecar_matches_archive_digest(tmp_path: Path):
    require_builder()
    inputs, _ = write_inputs(tmp_path)
    result = build_capsule(inputs, tmp_path / "capsule")
    archive = Path(result["archive"])
    expected = hashlib.sha256(archive.read_bytes()).hexdigest()
    assert result["sha256"] == expected
    assert Path(result["sha256_file"]).read_text(encoding="utf-8") == expected + "\n"
