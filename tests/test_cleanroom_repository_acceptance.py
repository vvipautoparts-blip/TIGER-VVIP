from __future__ import annotations

import json
from pathlib import Path

from tools import vvip_cleanroom


def test_repository_cleanroom_non_scope_gates_are_accepted() -> None:
    """Expose deterministic cleanroom gate details when repository integrity fails.

    The isolated Quality Gate normalizes its snapshot branch to ``main`` before
    running the authoritative cleanroom verification. This companion test turns
    scope enforcement off so any non-scope failure is reported with the exact
    redacted gate details instead of only ``cleanroom result: FAIL``.
    """

    root = Path(__file__).resolve().parents[1]
    report = vvip_cleanroom.build_report(root, enforce_scope=False)
    failures = {
        name: gate
        for name, gate in report["gates"].items()
        if gate["status"] != "pass"
    }

    assert not failures, json.dumps(
        failures,
        ensure_ascii=False,
        sort_keys=True,
        indent=2,
    )
