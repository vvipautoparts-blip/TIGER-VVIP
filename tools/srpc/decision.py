from __future__ import annotations

REQUIRED_EVIDENCE = (
    "source_exact",
    "byte_hash_match",
    "static_tests_pass",
    "staging_identity_valid",
    "ledger_precheck_valid",
    "schema_precheck_valid",
    "phase_b_only",
    "queue_execution_not_used",
    "ledger_postcheck_valid",
    "schema_postcheck_valid",
    "runtime_security_pass",
    "phase_a_regression_pass",
    "synthetic_residue_zero",
    "capsule_complete",
)


def evaluate(evidence: dict) -> dict:
    missing = [name for name in REQUIRED_EVIDENCE if evidence.get(name) is not True]
    if missing:
        return {
            "state": "STOP",
            "evidence_complete": False,
            "attested": False,
            "eligible_for_security_review": False,
            "missing": missing,
        }

    provenance_valid = evidence.get("provenance_attestation_valid") is True
    vvip_valid = evidence.get("vvip_attestation_valid") is True
    attested = provenance_valid and vvip_valid

    if not attested:
        return {
            "state": "EVIDENCE_COMPLETE",
            "evidence_complete": True,
            "attested": False,
            "eligible_for_security_review": False,
            "missing": [],
        }

    return {
        "state": "ELIGIBLE_FOR_SECURITY_REVIEW",
        "evidence_complete": True,
        "attested": True,
        "eligible_for_security_review": True,
        "missing": [],
    }
