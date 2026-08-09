import pytest

try:
    from tools.smg.premerge import evaluate_premerge
    from tools.smg.constants import H1, MIGRATION_SHA256
    IMPORT_ERROR = None
except Exception as exc:
    IMPORT_ERROR = exc


def _require_import():
    assert IMPORT_ERROR is None, f"SMG implementation missing: {IMPORT_ERROR}"


def green_checks():
    return [
        {"name":"V14 Release Candidate","status":"completed","conclusion":"success"},
        {"name":"VVIP Quality Gate","status":"completed","conclusion":"success"},
        {"name":"CodeQL","status":"completed","conclusion":"success"},
    ]


def subject():
    return (
        {"number":181,"state":"open","draft":True,"head_sha":"1e7fb3c1e43415e5bfaee957b6ab553ae68bc139","base_ref":"main","auto_merge":None},
        {"sha":"4cc292e626fea39f3b0e56b98781d521efef789d"},
    )


def test_exact_subject_is_premerge_proof_complete():
    _require_import()
    pr, main = subject()
    result = evaluate_premerge(pr, main, green_checks(), MIGRATION_SHA256, main["sha"])
    assert result["ok"] is True
    assert result["state"] == "PREMERGE_PROOF_COMPLETE"
    assert result["stop_code"] is None


@pytest.mark.parametrize("mutator,code",[
    (lambda pr,main,checks,digest: pr.update(head_sha="0"*40), "SMG-001 PR_HEAD_DRIFT"),
    (lambda pr,main,checks,digest: main.update(sha="1"*40), "SMG-002 MAIN_BASE_DRIFT"),
])
def test_identity_drift_fails_closed(mutator, code):
    _require_import()
    pr, main = subject()
    checks = green_checks()
    expected_base = main["sha"]
    digest = MIGRATION_SHA256
    mutator(pr,main,checks,digest)
    result = evaluate_premerge(pr, main, checks, digest, expected_base)
    assert result["ok"] is False
    assert result["stop_code"] == code


def test_migration_drift_fails_closed():
    _require_import()
    pr, main = subject()
    result = evaluate_premerge(pr, main, green_checks(), "0"*64, main["sha"])
    assert result["stop_code"] == "SMG-003 MIGRATION_BYTE_DRIFT"


@pytest.mark.parametrize("bad",[
    {"name":"CodeQL","status":"completed","conclusion":"failure"},
    {"name":"CodeQL","status":"in_progress","conclusion":None},
])
def test_non_green_check_fails_closed(bad):
    _require_import()
    pr, main = subject()
    result = evaluate_premerge(pr, main, [bad], MIGRATION_SHA256, main["sha"])
    assert result["stop_code"] == "SMG-004 H1_CHECKS_NOT_GREEN"


def test_auto_merge_fails_closed():
    _require_import()
    pr, main = subject()
    pr["auto_merge"] = {"enabled": True}
    result = evaluate_premerge(pr, main, green_checks(), MIGRATION_SHA256, main["sha"])
    assert result["stop_code"] == "SMG-009 AUTO_MERGE_DETECTED"
