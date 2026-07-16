from __future__ import annotations

import importlib
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MISSING_JSONSCHEMA_MESSAGE = (
    "Missing development dependency.\n"
    "Run: python3 -m pip install -r requirements-dev.txt"
)


def load_validator_class(import_module=importlib.import_module):
    try:
        module = import_module("jsonschema")
    except ModuleNotFoundError as exc:
        if exc.name == "jsonschema":
            raise SystemExit(MISSING_JSONSCHEMA_MESSAGE) from exc
        raise
    return module.Draft202012Validator


def validate_data(instance: dict, schema: dict) -> None:
    validator_class = load_validator_class()
    validator = validator_class(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    if errors:
        formatted = "\n".join(f"- {'.'.join(map(str, e.path))}: {e.message}" for e in errors)
        raise AssertionError(f"schema validation failed:\n{formatted}")


def validate(instance_path: Path, schema_path: Path) -> None:
    instance = json.loads(instance_path.read_text(encoding="utf-8"))
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator_class = load_validator_class()
    validator = validator_class(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: e.path)
    if errors:
        formatted = "\n".join(f"- {'.'.join(map(str, e.path))}: {e.message}" for e in errors)
        raise AssertionError(f"schema validation failed for {instance_path.name}:\n{formatted}")


class TestP07SchemaValidation(unittest.TestCase):
    def test_p07_dictionary_schema(self) -> None:
        validate(
            ROOT / "docs/owner-control/p07/P07_DATA_DICTIONARY.json",
            ROOT / "docs/owner-control/p07/schemas/P07_DATA_DICTIONARY.schema.json",
        )

    def test_p07_evidence_manifest_schema(self) -> None:
        validate(
            ROOT / "docs/owner-control/p07/P07_EVIDENCE_MANIFEST.json",
            ROOT / "docs/owner-control/p07/schemas/P07_EVIDENCE_MANIFEST.schema.json",
        )

    def test_coverage_matrix_shape(self) -> None:
        coverage = json.loads((ROOT / "docs/owner-control/p07/P07_COVERAGE_MATRIX.json").read_text(encoding="utf-8"))
        self.assertEqual(coverage.get("phase"), "P07")
        rows = coverage.get("coverage", [])
        self.assertGreaterEqual(len(rows), 37)
        ids = {row.get("id") for row in rows}
        self.assertTrue(set(range(1, 38)).issubset(ids))

    def test_review_only_false_is_rejected_by_schema(self) -> None:
        dictionary = json.loads((ROOT / "docs/owner-control/p07/P07_DATA_DICTIONARY.json").read_text(encoding="utf-8"))
        schema = json.loads((ROOT / "docs/owner-control/p07/schemas/P07_DATA_DICTIONARY.schema.json").read_text(encoding="utf-8"))

        with tempfile.TemporaryDirectory() as tmp:
            bad_path = Path(tmp) / "bad-dictionary.json"
            bad = dict(dictionary)
            bad["review_only"] = False
            bad_path.write_text(json.dumps(bad, ensure_ascii=True), encoding="utf-8")

            with self.assertRaises(AssertionError) as cm:
                validate(bad_path, ROOT / "docs/owner-control/p07/schemas/P07_DATA_DICTIONARY.schema.json")

            self.assertIn("review_only", str(cm.exception))

    def test_missing_jsonschema_has_actionable_message(self) -> None:
        def _missing_jsonschema(_: str):
            raise ModuleNotFoundError("No module named 'jsonschema'", name="jsonschema")

        with self.assertRaises(SystemExit) as cm:
            load_validator_class(import_module=_missing_jsonschema)

        self.assertIn("Missing development dependency.", str(cm.exception))
        self.assertIn("python3 -m pip install -r requirements-dev.txt", str(cm.exception))


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestP07SchemaValidation)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.testsRun == 0:
        raise SystemExit("Regression guard: zero tests executed in pr72-p07-schema-validation.test.py")
    raise SystemExit(0 if result.wasSuccessful() else 1)
