from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

_SCHEMA_FILES = {
    "release": "release-manifest.schema.json",
    "preflight": "staging-preflight.schema.json",
    "staging": "staging-evidence.schema.json",
}


def _schema_root() -> Path:
    return Path(__file__).resolve().parents[2] / "scripts" / "release" / "srpc" / "schema"


def _load_schema(kind: str) -> dict:
    try:
        filename = _SCHEMA_FILES[kind]
    except KeyError as exc:
        raise ValueError(f"unknown evidence kind: {kind}") from exc
    path = _schema_root() / filename
    return json.loads(path.read_text(encoding="utf-8"))


def validate_document(kind: str, document: Any) -> None:
    validator = Draft202012Validator(_load_schema(kind))
    errors = sorted(validator.iter_errors(document), key=lambda error: list(error.absolute_path))
    if not errors:
        return
    error = errors[0]
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        location = "root"
    raise ValueError(f"{location}: {error.message}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SRPC evidence against a frozen schema")
    parser.add_argument("--kind", required=True, choices=sorted(_SCHEMA_FILES))
    parser.add_argument("document")
    args = parser.parse_args()
    path = Path(args.document)
    document = json.loads(path.read_text(encoding="utf-8"))
    validate_document(args.kind, document)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
