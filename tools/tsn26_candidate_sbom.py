#!/usr/bin/env python3
"""Generate a deterministic CycloneDX 1.7 file-component SBOM for a candidate tree."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_bom(root: Path, source_sha: str) -> dict:
    root = root.resolve()
    components = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix()):
        relative = path.relative_to(root).as_posix()
        components.append(
            {
                "type": "file",
                "bom-ref": f"file:{relative}",
                "name": relative,
                "hashes": [{"alg": "SHA-256", "content": sha256_file(path)}],
            }
        )
    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.7",
        "version": 1,
        "metadata": {
            "component": {
                "type": "application",
                "bom-ref": f"tiger-vvip-candidate:{source_sha}",
                "name": "TIGER-VVIP Candidate",
                "version": source_sha,
            },
            "properties": [
                {"name": "tiger.source.sha", "value": source_sha},
                {"name": "tiger.sbom.scope", "value": "candidate-file-inventory"},
            ],
        },
        "components": components,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if len(args.source_sha) != 40 or any(c not in "0123456789abcdefABCDEF" for c in args.source_sha):
        raise SystemExit("source SHA must be exactly 40 hexadecimal characters")
    bom = build_bom(Path(args.root), args.source_sha.lower())
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(bom, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
