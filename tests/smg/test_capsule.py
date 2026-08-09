import json
import pytest

try:
    from tools.smg.capsule import build_authorization_capsule, validate_authorization_capsule
    IMPORT_ERROR = None
except Exception as exc:
    IMPORT_ERROR = exc


def _require_import():
    assert IMPORT_ERROR is None, f"SMG capsule missing: {IMPORT_ERROR}"


def valid_premerge():
    return {
        "ok": True,
        "state": "PREMERGE_PROOF_COMPLETE",
        "stop_code": None,
        "facts": {"head_sha":"1e7fb3c1e43415e5bfaee957b6ab553ae68bc139"}
    }


def test_capsule_never_self_authorizes():
    _require_import()
    capsule = build_authorization_capsule(valid_premerge(), "4cc292e626fea39f3b0e56b98781d521efef789d")
    assert capsule["owner_merge_authorized"] is False
    assert capsule["authority_scope"] == "MERGE_ONLY"
    assert capsule["production_authority"] == "NONE"
    assert capsule["state"] == "AWAITING_EXACT_OWNER_AUTHORIZATION"


def test_capsule_binds_exact_subject():
    _require_import()
    capsule = build_authorization_capsule(valid_premerge(), "4cc292e626fea39f3b0e56b98781d521efef789d")
    assert capsule["approved_head"] == "1e7fb3c1e43415e5bfaee957b6ab553ae68bc139"
    assert capsule["expected_main_base"] == "4cc292e626fea39f3b0e56b98781d521efef789d"
    assert capsule["migration"]["sha256"] == "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"


def test_capsule_rejects_bad_premerge():
    _require_import()
    with pytest.raises(ValueError, match="premerge"):
        build_authorization_capsule({"ok":False}, "4cc292e626fea39f3b0e56b98781d521efef789d")


def test_capsule_rejects_bad_base_shape():
    _require_import()
    with pytest.raises(ValueError, match="base"):
        build_authorization_capsule(valid_premerge(), "not-a-sha")


def test_validation_rejects_escalated_authority():
    _require_import()
    capsule = build_authorization_capsule(valid_premerge(), "4cc292e626fea39f3b0e56b98781d521efef789d")
    capsule["owner_merge_authorized"] = True
    with pytest.raises(ValueError):
        validate_authorization_capsule(capsule)


def test_canonical_serialization_is_deterministic():
    _require_import()
    c1 = build_authorization_capsule(valid_premerge(), "4cc292e626fea39f3b0e56b98781d521efef789d")
    c2 = build_authorization_capsule(valid_premerge(), "4cc292e626fea39f3b0e56b98781d521efef789d")
    assert json.dumps(c1, sort_keys=True, separators=(",",":")) == json.dumps(c2, sort_keys=True, separators=(",",":"))
