from .constants import H1, MIGRATION_SHA256, PR_NUMBER


def _stop(code, facts):
    return {"ok": False, "state": "STOPPED", "stop_code": code, "facts": facts}


def evaluate_premerge(pr, main, checks, migration_sha256, expected_base):
    facts = {
        "pr_number": pr.get("number"),
        "head_sha": pr.get("head_sha"),
        "base_ref": pr.get("base_ref"),
        "main_sha": main.get("sha"),
        "expected_base": expected_base,
        "migration_sha256": migration_sha256,
        "check_count": len(checks or []),
        "auto_merge": pr.get("auto_merge"),
    }
    if pr.get("number") != PR_NUMBER or pr.get("head_sha") != H1:
        return _stop("SMG-001 PR_HEAD_DRIFT", facts)
    if pr.get("base_ref") != "main" or main.get("sha") != expected_base:
        return _stop("SMG-002 MAIN_BASE_DRIFT", facts)
    if migration_sha256 != MIGRATION_SHA256:
        return _stop("SMG-003 MIGRATION_BYTE_DRIFT", facts)
    if not checks or any(c.get("status") != "completed" or c.get("conclusion") != "success" for c in checks):
        return _stop("SMG-004 H1_CHECKS_NOT_GREEN", facts)
    if pr.get("auto_merge") is not None:
        return _stop("SMG-009 AUTO_MERGE_DETECTED", facts)
    if pr.get("state") != "open":
        return _stop("SMG-008 PR_NOT_MERGEABLE", facts)
    return {"ok": True, "state": "PREMERGE_PROOF_COMPLETE", "stop_code": None, "facts": facts}
