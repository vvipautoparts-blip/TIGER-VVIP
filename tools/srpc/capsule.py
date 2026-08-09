from __future__ import annotations

import gzip
import hashlib
import io
import json
import shutil
import tarfile
from pathlib import Path
from typing import Any

_SECRET_KEYS = {
    "password",
    "access_token",
    "service_role_key",
    "database_url",
    "private_key",
}
_SENSITIVE_PREFIXES = (
    "postgresql://",
    "postgres://",
    "sb_secret_",
)


def _scan_json(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).lower()
            if normalized in _SECRET_KEYS:
                raise ValueError(f"secret-bearing JSON key rejected: {path}.{key}")
            _scan_json(child, f"{path}.{key}")
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            _scan_json(child, f"{path}[{index}]")
        return
    if isinstance(value, str):
        lowered = value.lower()
        if lowered.startswith(_SENSITIVE_PREFIXES):
            raise ValueError(f"sensitive value rejected at {path}")


def _canonical_json(raw: bytes, source: Path) -> bytes:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid JSON evidence: {source}") from exc
    _scan_json(value)
    if source.name == "release-manifest.json":
        target = value.get("target") if isinstance(value, dict) else None
        if not isinstance(target, dict) or target.get("production_target") is not False:
            raise ValueError("release-manifest production_target must be false for Staging capsule")
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def _safe_text_scan(raw: bytes, source: Path) -> None:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return
    lowered = text.lower()
    for prefix in _SENSITIVE_PREFIXES:
        if prefix in lowered:
            raise ValueError(f"sensitive value rejected in {source}")


def _copy_inputs(inputs_dir: Path, output_dir: Path) -> None:
    files = sorted(path for path in inputs_dir.rglob("*") if path.is_file())
    for source in files:
        relative = source.relative_to(inputs_dir)
        target = output_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        raw = source.read_bytes()
        if source.suffix.lower() == ".json":
            target.write_bytes(_canonical_json(raw, source))
        else:
            _safe_text_scan(raw, source)
            target.write_bytes(raw)


def _tar_bytes(directory: Path) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as tf:
        for source in sorted(path for path in directory.rglob("*") if path.is_file()):
            relative = source.relative_to(directory).as_posix()
            raw = source.read_bytes()
            info = tarfile.TarInfo(name=relative)
            info.size = len(raw)
            info.mode = 0o644
            info.mtime = 0
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            tf.addfile(info, io.BytesIO(raw))
    return buffer.getvalue()


def _gzip_bytes(tar_bytes: bytes) -> bytes:
    buffer = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, mtime=0, compresslevel=9) as gz:
        gz.write(tar_bytes)
    return buffer.getvalue()


def build_capsule(inputs_dir: Path, output_dir: Path) -> dict:
    inputs_dir = Path(inputs_dir)
    output_dir = Path(output_dir)
    if not inputs_dir.is_dir():
        raise ValueError(f"capsule input directory does not exist: {inputs_dir}")
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    _copy_inputs(inputs_dir, output_dir)

    archive = output_dir.parent / f"{output_dir.name}.tar.gz"
    archive_bytes = _gzip_bytes(_tar_bytes(output_dir))
    archive.write_bytes(archive_bytes)
    digest = hashlib.sha256(archive_bytes).hexdigest()
    sha256_file = output_dir.parent / f"{output_dir.name}.sha256"
    sha256_file.write_text(digest + "\n", encoding="utf-8")

    return {
        "directory": str(output_dir),
        "archive": str(archive),
        "sha256": digest,
        "sha256_file": str(sha256_file),
    }
