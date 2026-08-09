import pytest

try:
    from tools.srpc.decision import evaluate
except ModuleNotFoundError:
    evaluate = None

REQUIRED = {
    "source_exact": True,
    "byte_hash_match": True,
    "static_tests_pass": True,
    "staging_identity_valid": True,
    "ledger_precheck_valid": True,
    "schema_precheck_valid": True,
    "phase_b_only": True,
    "queue_execution_not_used": True,
    "ledger_postcheck_valid": True,
    "schema_postcheck_valid": True,
    "runtime_security_pass": True,
    "phase_a_regression_pass": True,
    "synthetic_residue_zero": True,
    "capsule_complete": True,
}


def require_engine():
    assert evaluate is not None, "tools.srpc.decision must exist"


def test_all_mandatory_evidence_reaches_evidence_complete():
    require_engine()
    result = evaluate(REQUIRED)
    assert result["state"] == "EVIDENCE_COMPLETE"
    assert result["missing"] == []


def test_any_false_mandatory_flag_blocks_evidence_complete():
    require_engine()
    evidence = dict(REQUIRED)
    evidence["runtime_security_pass"] = False
    result = evaluate(evidence)
    assert result["state"] == "STOP"
    assert result["missing"] == ["runtime_security_pass"]


def test_missing_flag_is_failure_not_unknown_pass():
    require_engine()
    evidence = dict(REQUIRED)
    del evidence["capsule_complete"]
    result = evaluate(evidence)
    assert result["state"] == "STOP"
    assert result["missing"] == ["capsule_complete"]


def test_one_attestation_is_not_enough():
    require_engine()
    evidence = dict(REQUIRED, provenance_attestation_valid=True, vvip_attestation_valid=False)
    result = evaluate(evidence)
    assert result["state"] == "EVIDENCE_COMPLETE"


def test_both_attestations_reach_eligible_for_security_review():
    require_engine()
    evidence = dict(REQUIRED, provenance_attestation_valid=True, vvip_attestation_valid=True)
    result = evaluate(evidence)
    assert result["state"] == "ELIGIBLE_FOR_SECURITY_REVIEW"
    assert result["attested"] is True


def test_machine_input_cannot_self_approve_security():
    require_engine()
    evidence = dict(
        REQUIRED,
        provenance_attestation_valid=True,
        vvip_attestation_valid=True,
        security_approved=True,
        fresh_ci_green=True,
        production_eligible=True,
    )
    result = evaluate(evidence)
    assert result["state"] == "ELIGIBLE_FOR_SECURITY_REVIEW"
    assert "SECURITY_APPROVED" not in result.values()
    assert "PRODUCTION_ELIGIBLE" not in result.values()
