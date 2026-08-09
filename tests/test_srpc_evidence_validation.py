from __future__ import annotations

import pytest

try:
    from tools.srpc.validate_evidence import validate_document
except ModuleNotFoundError:
    validate_document = None


def require_validator():
    assert validate_document is not None, "tools.srpc.validate_evidence must exist"


def release_manifest() -> dict:
    return {
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
    }


def preflight() -> dict:
    return {
        "staging_identity": {
            "branch_name": "lc04-sovereign-staging-20260807",
            "project_ref": "m" * 20,
            "parent_project_ref": "z" * 20,
            "production_project_ref": "z" * 20,
            "healthy": True,
            "production_ref_equal": False,
        },
        "ledger_before": {"entries": [], "phase_b_present": False},
        "schema_before": {"canonical": True, "fingerprint": {}},
        "classification": {"state": "STATE_A"},
    }


def complete_evidence() -> dict:
    data = preflight()
    data.update(
        {
            "execution": {
                "mode": "APPLIED",
                "pending_queue_runner_used": False,
                "manual_ledger_write": False,
                "manual_sql_mutation": False,
            },
            "ledger_after": {"phase_b_present": True, "entry_count": 1},
            "schema_after": {"canonical": True, "fingerprint": {}},
            "runtime": {"status": "PASS"},
            "phase_a_regression": {"status": "PASS"},
            "synthetic_residue": {
                "country_rows": 0,
                "principal_rows": 0,
                "listing_rows": 0,
                "audit_rows": 0,
            },
            "advisors": {"material_security_findings": 0},
        }
    )
    return data


def test_valid_release_manifest_passes():
    require_validator()
    validate_document("release", release_manifest())


def test_release_manifest_rejects_production_target():
    require_validator()
    doc = release_manifest()
    doc["target"]["production_target"] = True
    with pytest.raises(ValueError, match="production_target"):
        validate_document("release", doc)


def test_preflight_schema_accepts_pre_ddl_evidence_without_postflight():
    require_validator()
    validate_document("preflight", preflight())


def test_complete_schema_rejects_preflight_only_document():
    require_validator()
    with pytest.raises(ValueError, match="execution"):
        validate_document("staging", preflight())


def test_complete_schema_accepts_full_staging_evidence():
    require_validator()
    validate_document("staging", complete_evidence())


def test_complete_schema_rejects_nonzero_residue():
    require_validator()
    doc = complete_evidence()
    doc["synthetic_residue"]["listing_rows"] = 1
    with pytest.raises(ValueError, match="listing_rows"):
        validate_document("staging", doc)


def test_preflight_rejects_staging_equal_to_production():
    require_validator()
    doc = preflight()
    doc["staging_identity"]["production_ref_equal"] = True
    with pytest.raises(ValueError, match="production_ref_equal"):
        validate_document("preflight", doc)
