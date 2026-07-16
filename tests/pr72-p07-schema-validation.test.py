from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]


def validate(instance_path: Path, schema_path: Path) -> None:
    instance = json.loads(instance_path.read_text(encoding="utf-8"))
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: e.path)
    if errors:
        formatted = "\n".join(f"- {'.'.join(map(str, e.path))}: {e.message}" for e in errors)
        raise AssertionError(f"schema validation failed for {instance_path.name}:\n{formatted}")


def test_p07_dictionary_schema() -> None:
    validate(
        ROOT / "docs/owner-control/p07/P07_DATA_DICTIONARY.json",
        ROOT / "docs/owner-control/p07/schemas/P07_DATA_DICTIONARY.schema.json",
    )


def test_p07_evidence_manifest_schema() -> None:
    validate(
        ROOT / "docs/owner-control/p07/P07_EVIDENCE_MANIFEST.json",
        ROOT / "docs/owner-control/p07/schemas/P07_EVIDENCE_MANIFEST.schema.json",
    )


def test_coverage_matrix_shape() -> None:
    coverage = json.loads((ROOT / "docs/owner-control/p07/P07_COVERAGE_MATRIX.json").read_text(encoding="utf-8"))
    assert coverage.get("phase") == "P07"
    rows = coverage.get("coverage", [])
    assert len(rows) >= 37
    ids = {row.get("id") for row in rows}
    assert set(range(1, 38)).issubset(ids)
