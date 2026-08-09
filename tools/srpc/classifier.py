from __future__ import annotations


def classify(ledger_present: bool, canonical: bool, accounted: bool) -> str:
    if not ledger_present and canonical:
        return "STATE_A"
    if not ledger_present and not canonical:
        return "STATE_B"
    if ledger_present and not canonical:
        return "STATE_E"
    if ledger_present and accounted:
        return "STATE_C"
    return "STATE_D"
