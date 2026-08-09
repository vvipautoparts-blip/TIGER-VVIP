from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

try:
    from .constants import H0, MIGRATION_PATH, MIGRATION_SHA256
except ImportError:
    from constants import H0, MIGRATION_PATH, MIGRATION_SHA256


def verify_source(
    source_root: Path,
    actual_commit: str,
    expected_commit: str,
    migration_path: str,
    expected_sha256: str,
) -> dict:
    if actual_commit != expected_commit:
        raise ValueError(
            f"SRPC-001 SOURCE_COMMIT_MISMATCH expected={expected_commit} actual={actual_commit}"
        )

    target = source_root / migration_path
    if not target.is_file():
        raise ValueError(f"SRPC-002 MIGRATION_PATH_MISMATCH path={migration_path}")

    actual_sha256 = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual_sha256 != expected_sha256:
        raise ValueError(
            f"SRPC-003 BYTE_HASH_MISMATCH expected={expected_sha256} actual={actual_sha256}"
        )

    return {
        "status": "PASS",
        "source_commit": actual_commit,
        "migration_path": migration_path,
        "migration_sha256": actual_sha256,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify frozen SRPC Phase B source identity")
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--actual-commit", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    result = verify_source(
        Path(args.source_root),
        args.actual_commit,
        H0,
        MIGRATION_PATH,
        MIGRATION_SHA256,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
