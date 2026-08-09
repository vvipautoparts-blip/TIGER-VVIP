import re
from .constants import REPOSITORY, PR_NUMBER, H1, MIGRATION_PATH, MIGRATION_SHA256

_SHA40 = re.compile(r"^[0-9a-f]{40}$")


def build_authorization_capsule(premerge, expected_base):
    if not isinstance(premerge, dict) or premerge.get("ok") is not True or premerge.get("state") != "PREMERGE_PROOF_COMPLETE":
        raise ValueError("premerge proof is not complete")
    if not isinstance(expected_base, str) or not _SHA40.fullmatch(expected_base):
        raise ValueError("expected base must be a 40-character lowercase hex SHA")
    capsule = {
        "schema": "https://vvip.tiger/smg/merge-authorization/v1",
        "repository": REPOSITORY,
        "pull_request": PR_NUMBER,
        "approved_head": H1,
        "expected_main_base": expected_base,
        "migration": {"path": MIGRATION_PATH, "sha256": MIGRATION_SHA256},
        "h1_checks": "GREEN",
        "srpc_staging": "VERIFIED",
        "srpc_attestation": "VERIFIED",
        "steel_shield_pin": "VERIFIED_GREEN",
        "owner_merge_authorized": False,
        "authority_scope": "MERGE_ONLY",
        "production_authority": "NONE",
        "state": "AWAITING_EXACT_OWNER_AUTHORIZATION",
    }
    validate_authorization_capsule(capsule)
    return capsule


def validate_authorization_capsule(capsule):
    required_exact = {
        "schema": "https://vvip.tiger/smg/merge-authorization/v1",
        "repository": REPOSITORY,
        "pull_request": PR_NUMBER,
        "approved_head": H1,
        "h1_checks": "GREEN",
        "srpc_staging": "VERIFIED",
        "srpc_attestation": "VERIFIED",
        "steel_shield_pin": "VERIFIED_GREEN",
        "owner_merge_authorized": False,
        "authority_scope": "MERGE_ONLY",
        "production_authority": "NONE",
        "state": "AWAITING_EXACT_OWNER_AUTHORIZATION",
    }
    for key, expected in required_exact.items():
        if capsule.get(key) != expected:
            raise ValueError(f"invalid {key}")
    base = capsule.get("expected_main_base")
    if not isinstance(base, str) or not _SHA40.fullmatch(base):
        raise ValueError("invalid expected_main_base")
    if capsule.get("migration") != {"path": MIGRATION_PATH, "sha256": MIGRATION_SHA256}:
        raise ValueError("invalid migration binding")
