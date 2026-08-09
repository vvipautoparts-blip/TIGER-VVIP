import pytest

try:
    from tools.srpc.classifier import classify
except ModuleNotFoundError:
    classify = None


def require_classifier():
    assert classify is not None, "tools.srpc.classifier must exist"


@pytest.mark.parametrize(
    ("ledger_present", "canonical", "accounted", "expected"),
    [
        (False, True, False, "STATE_A"),
        (False, False, False, "STATE_B"),
        (True, True, True, "STATE_C"),
        (True, True, False, "STATE_D"),
        (True, False, True, "STATE_E"),
    ],
)
def test_classification_matrix(ledger_present, canonical, accounted, expected):
    require_classifier()
    assert classify(ledger_present, canonical, accounted) == expected
