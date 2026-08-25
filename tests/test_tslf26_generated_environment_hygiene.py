from __future__ import annotations

from tools import vvip_cleanroom


def test_root_local_virtualenv_is_generated_dependency_state() -> None:
    cases = (
        ".venv/lib/python3.12/site-packages/demo.py",
        "venv/bin/python",
        ".virtualenv/lib/site.py",
        ".tox/py312/bin/python",
        ".nox/tests/bin/python",
    )
    for path in cases:
        assert vvip_cleanroom.is_local_environment_path(path)
        assert not vvip_cleanroom.is_protected_path(path)
        assert (
            vvip_cleanroom.garbage_reason(path, tracked=False, ignored=False)
            == "dependency output"
        )


def test_nested_source_directory_named_venv_is_not_implicitly_generated() -> None:
    path = "src/venv/runtime.py"
    assert not vvip_cleanroom.is_local_environment_path(path)
    assert vvip_cleanroom.garbage_reason(path, tracked=True, ignored=False) is None
