#!/usr/bin/env python3
"""Fail-closed verifier for sealed VVIP TIGER Production release artifacts.

Security boundary is deliberately split in two phases:

* ``outer`` authenticates the downloaded GitHub Actions artifact ZIP against the
  GitHub-reported digest, safely extracts only the inner tarball + checksum, and
  verifies the inner tarball digest. It never extracts inner release bytes.
* the workflow then verifies the inner tarball's GitHub/Sigstore attestation.
* ``inner`` safely extracts and verifies the attested tarball, its evidence, and
  every public byte before exposing a Pages-ready directory.

No phase builds or mutates application bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path
from typing import Any

SHA40_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GITHUB_DIGEST_RE = re.compile(r"^sha256:([0-9a-f]{64})$")
CHECKSUM_RE_TEMPLATE = r"^([0-9a-f]{{64}})  {filename}\n$"
MAX_OUTER_BYTES = 512 * 1024 * 1024
MAX_OUTER_ARCHIVE_MEMBER_BYTES = MAX_OUTER_BYTES
MAX_OUTER_CHECKSUM_BYTES = 4 * 1024
MAX_INNER_MEMBER_BYTES = 256 * 1024 * 1024
MAX_INNER_TOTAL_BYTES = 512 * 1024 * 1024
MAX_INNER_ENTRIES = 10_000
MAX_JSON_BYTES = 16 * 1024 * 1024
EXPECTED_EVIDENCE_FILES = frozenset(
    {
        "evidence/source.json",
        "evidence/materials.json",
        "evidence/sbom.cdx.json",
        "evidence/release-bundle-manifest.json",
    }
)
BUNDLE_FIELDS = frozenset(
    {
        "bundle_version",
        "source_sha",
        "source_tree",
        "candidate_manifest_sha256",
        "candidate_content_sha256",
        "sbom_sha256",
        "materials_sha256",
        "created_by",
    }
)
RELEASE_MANIFEST_FIELDS = frozenset(
    {
        "schemaVersion",
        "mode",
        "sourceSha",
        "releaseEligible",
        "configurationErrors",
        "forbiddenFindings",
        "files",
    }
)


class VerificationError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def fail(code: str, message: str) -> None:
    raise VerificationError(code, message)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _assert_sha40(value: str) -> str:
    if not isinstance(value, str) or not SHA40_RE.fullmatch(value):
        fail("VVIP_RELEASE_SHA_INVALID", "release_sha must be a lowercase 40-character Git SHA")
    return value


def _safe_relative(value: str, code: str) -> str:
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        fail(code, "archive path is empty or platform-ambiguous")
    raw = value
    while raw.startswith("./"):
        raw = raw[2:]
    if raw == ".":
        return "."
    if not raw or raw.startswith("/"):
        fail(code, "archive path is absolute or empty")
    parts = raw.split("/")
    if any(part in {"", ".", ".."} or ":" in part for part in parts):
        fail(code, "archive path contains traversal or ambiguous segments")
    normalized = "/".join(parts)
    if normalized != raw:
        fail(code, "archive path normalization changed the input")
    return normalized


def _fresh_directory(path: Path, code: str) -> Path:
    path = Path(path)
    if path.exists() or path.is_symlink():
        fail(code, "output directory must not already exist")
    parent = path.parent
    if not parent.is_dir() or parent.is_symlink():
        fail(code, "output parent must be an existing real directory")
    path.mkdir(mode=0o700)
    return path


def _strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def _parse_json_bytes(data: bytes, code: str) -> Any:
    if len(data) > MAX_JSON_BYTES:
        fail(code, "JSON evidence exceeds the bounded size limit")
    try:
        return json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_strict_object,
            parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"invalid constant: {value}")),
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        fail(code, f"invalid JSON evidence: {exc}")


def _canonicalize(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > 9_007_199_254_740_991:
            fail("VVIP_CANONICAL_VALUE_INVALID", "canonical integer exceeds JavaScript safe range")
        return value
    if isinstance(value, float):
        fail("VVIP_CANONICAL_VALUE_INVALID", "canonical evidence forbids floating-point values")
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            fail("VVIP_CANONICAL_VALUE_INVALID", "canonical object keys must be strings")
        return {key: _canonicalize(value[key]) for key in sorted(value)}
    fail("VVIP_CANONICAL_VALUE_INVALID", "canonical evidence contains unsupported value type")


def _canonical_json_bytes(value: Any) -> bytes:
    normalized = _canonicalize(value)
    return json.dumps(normalized, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _zip_mode(info: zipfile.ZipInfo) -> int:
    return (info.external_attr >> 16) & 0xFFFF


def _assert_zip_regular(info: zipfile.ZipInfo) -> None:
    if info.is_dir():
        fail("VVIP_OUTER_ENTRY_TYPE_INVALID", "outer artifact may contain regular files only")
    mode = _zip_mode(info)
    if mode:
        file_type = stat.S_IFMT(mode)
        if file_type not in (0, stat.S_IFREG):
            fail("VVIP_OUTER_ENTRY_TYPE_INVALID", "outer artifact contains a non-regular entry")


def _outer_member_limit(normalized: str, archive_name: str, checksum_name: str) -> int:
    if normalized == archive_name:
        return MAX_OUTER_ARCHIVE_MEMBER_BYTES
    if normalized == checksum_name:
        return MAX_OUTER_CHECKSUM_BYTES
    fail("VVIP_OUTER_ENTRY_SET_INVALID", "outer artifact contains an unexpected file")


def _copy_zip_member_bounded(
    archive: zipfile.ZipFile,
    info: zipfile.ZipInfo,
    destination: Path,
    limit: int,
) -> None:
    copied = 0
    with archive.open(info, "r") as source, destination.open("xb") as target:
        while True:
            chunk = source.read(min(1024 * 1024, limit - copied + 1))
            if not chunk:
                break
            copied += len(chunk)
            if copied > limit:
                fail("VVIP_OUTER_ENTRY_SIZE_INVALID", "outer artifact member exceeded its bounded size while extracting")
            target.write(chunk)
    if copied != info.file_size:
        fail("VVIP_OUTER_ENTRY_SIZE_INVALID", "outer artifact member size does not match ZIP metadata")


def verify_outer_artifact(
    *,
    artifact_zip: Path,
    github_artifact_digest: str,
    release_sha: str,
    extract_root: Path,
) -> Path:
    release_sha = _assert_sha40(release_sha)
    artifact_zip = Path(artifact_zip)
    if artifact_zip.is_symlink() or not artifact_zip.is_file():
        fail("VVIP_OUTER_ARCHIVE_INVALID", "GitHub artifact ZIP must be a real regular file")
    size = artifact_zip.stat().st_size
    if size <= 0 or size > MAX_OUTER_BYTES:
        fail("VVIP_OUTER_ARCHIVE_INVALID", "GitHub artifact ZIP size is outside the allowed range")

    match = GITHUB_DIGEST_RE.fullmatch(str(github_artifact_digest))
    if not match:
        fail("VVIP_GITHUB_DIGEST_INVALID", "GitHub artifact digest must be sha256:<64 lowercase hex>")
    if _sha256_file(artifact_zip) != match.group(1):
        fail("VVIP_OUTER_DIGEST_MISMATCH", "downloaded GitHub artifact bytes do not match GitHub digest")

    archive_name = f"vvip-production-release-{release_sha}.tar.gz"
    checksum_name = f"vvip-production-release-{release_sha}.sha256"
    expected_names = {archive_name, checksum_name}

    try:
        archive = zipfile.ZipFile(artifact_zip, "r")
    except (zipfile.BadZipFile, OSError) as exc:
        fail("VVIP_OUTER_ARCHIVE_INVALID", f"invalid GitHub artifact ZIP: {exc}")

    with archive:
        infos = archive.infolist()
        if len(infos) != 2:
            fail("VVIP_OUTER_ENTRY_SET_INVALID", "outer artifact must contain exactly two files")
        names: list[str] = []
        seen: set[str] = set()
        for info in infos:
            normalized = _safe_relative(info.filename, "VVIP_OUTER_PATH_INVALID")
            if normalized in seen:
                fail("VVIP_OUTER_ENTRY_SET_INVALID", "outer artifact contains duplicate normalized names")
            seen.add(normalized)
            names.append(normalized)
            _assert_zip_regular(info)
        if set(names) != expected_names:
            fail("VVIP_OUTER_ENTRY_SET_INVALID", "outer artifact file set is not exact")

        limits: dict[str, int] = {}
        for info, normalized in zip(infos, names):
            limit = _outer_member_limit(normalized, archive_name, checksum_name)
            if info.file_size <= 0 or info.file_size > limit:
                fail("VVIP_OUTER_ENTRY_SIZE_INVALID", "outer artifact member expanded size is outside the allowed range")
            limits[normalized] = limit

        root = _fresh_directory(Path(extract_root), "VVIP_OUTER_OUTPUT_INVALID")
        try:
            for info, normalized in zip(infos, names):
                destination = root / normalized
                _copy_zip_member_bounded(archive, info, destination, limits[normalized])
        except Exception:
            shutil.rmtree(root, ignore_errors=True)
            raise

    inner_path = root / archive_name
    checksum_path = root / checksum_name
    try:
        checksum_text = checksum_path.read_text(encoding="ascii")
    except (UnicodeDecodeError, OSError) as exc:
        shutil.rmtree(root, ignore_errors=True)
        fail("VVIP_INNER_CHECKSUM_INVALID", f"inner checksum is unreadable: {exc}")
    checksum_match = re.fullmatch(
        CHECKSUM_RE_TEMPLATE.format(filename=re.escape(archive_name)),
        checksum_text,
    )
    if not checksum_match:
        shutil.rmtree(root, ignore_errors=True)
        fail("VVIP_INNER_CHECKSUM_INVALID", "inner checksum record has unexpected syntax or filename")
    if _sha256_file(inner_path) != checksum_match.group(1):
        shutil.rmtree(root, ignore_errors=True)
        fail("VVIP_INNER_DIGEST_MISMATCH", "inner release bundle does not match its sealed checksum")

    return inner_path


def _inspect_tar(archive: tarfile.TarFile) -> dict[str, tarfile.TarInfo]:
    members = archive.getmembers()
    if len(members) > MAX_INNER_ENTRIES:
        fail("VVIP_INNER_ENTRY_SET_INVALID", "inner release bundle has too many entries")

    result: dict[str, tarfile.TarInfo] = {}
    total_size = 0
    for member in members:
        normalized = _safe_relative(member.name, "VVIP_INNER_PATH_INVALID")
        if normalized == ".":
            if not member.isdir():
                fail("VVIP_INNER_ENTRY_TYPE_INVALID", "inner root entry must be a directory")
            continue
        if normalized in result:
            fail("VVIP_INNER_PATH_INVALID", "inner release bundle contains duplicate normalized paths")
        if not (member.isdir() or member.isfile()):
            fail("VVIP_INNER_ENTRY_TYPE_INVALID", "inner release bundle contains a link or special entry")
        if not (
            normalized in {"public", "evidence"}
            or normalized.startswith("public/")
            or normalized.startswith("evidence/")
        ):
            fail("VVIP_INNER_ENTRY_SET_INVALID", "inner release bundle contains an unexpected top-level entry")
        if member.isfile():
            if member.size < 0 or member.size > MAX_INNER_MEMBER_BYTES:
                fail("VVIP_INNER_ENTRY_SET_INVALID", "inner file exceeds bounded size")
            total_size += member.size
            if total_size > MAX_INNER_TOTAL_BYTES:
                fail("VVIP_INNER_ENTRY_SET_INVALID", "inner release bundle exceeds bounded expanded size")
        result[normalized] = member
    return result


def _extract_tar_safely(archive: tarfile.TarFile, members: dict[str, tarfile.TarInfo], root: Path) -> None:
    for normalized in sorted(members, key=lambda item: (item.count("/"), item)):
        member = members[normalized]
        destination = root.joinpath(*normalized.split("/"))
        if member.isdir():
            destination.mkdir(mode=0o700, parents=True, exist_ok=True)
            continue
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if destination.exists() or destination.is_symlink():
            fail("VVIP_INNER_PATH_INVALID", "inner extraction target already exists")
        source = archive.extractfile(member)
        if source is None:
            fail("VVIP_INNER_ENTRY_TYPE_INVALID", "inner regular file has no readable content")
        with source, destination.open("xb") as target:
            shutil.copyfileobj(source, target, length=1024 * 1024)


def _read_required(path: Path, code: str) -> bytes:
    if path.is_symlink() or not path.is_file():
        fail(code, f"required evidence is missing: {path.name}")
    data = path.read_bytes()
    if not data:
        fail(code, f"required evidence is empty: {path.name}")
    return data


def _assert_exact_keys(value: Any, keys: set[str] | frozenset[str], code: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != set(keys):
        fail(code, "evidence object has an unexpected field set")
    return value


def _validate_materials(value: Any, release_sha: str, source_tree: str) -> list[dict[str, str]]:
    obj = _assert_exact_keys(
        value,
        {"schema", "source_sha", "source_tree", "materials"},
        "VVIP_MATERIALS_INVALID",
    )
    if (
        obj["schema"] != "VVIP_PRODUCTION_MATERIALS_V1"
        or obj["source_sha"] != release_sha
        or obj["source_tree"] != source_tree
        or not isinstance(obj["materials"], list)
        or not obj["materials"]
    ):
        fail("VVIP_MATERIALS_INVALID", "materials evidence is not bound to exact source")

    records: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in obj["materials"]:
        record = _assert_exact_keys(raw, {"path", "sha256"}, "VVIP_MATERIALS_INVALID")
        path_value = _safe_relative(record["path"], "VVIP_MATERIALS_INVALID")
        digest = record["sha256"]
        if path_value in seen or not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
            fail("VVIP_MATERIALS_INVALID", "materials evidence contains duplicate or invalid records")
        seen.add(path_value)
        records.append({"path": path_value, "sha256": digest})
    if records != sorted(records, key=lambda item: item["path"]):
        fail("VVIP_MATERIALS_INVALID", "materials evidence is not deterministically sorted")
    return records


def _validate_sbom(value: Any, release_sha: str, source_tree: str, declared_files: dict[str, str]) -> None:
    if not isinstance(value, dict) or value.get("bomFormat") != "CycloneDX" or value.get("specVersion") != "1.6":
        fail("VVIP_SBOM_INVALID", "CycloneDX SBOM header is invalid")
    metadata = value.get("metadata")
    if not isinstance(metadata, dict):
        fail("VVIP_SBOM_INVALID", "CycloneDX metadata is missing")
    component = metadata.get("component")
    if not isinstance(component, dict) or component.get("name") != "VVIP-TIGER" or component.get("version") != release_sha:
        fail("VVIP_SBOM_INVALID", "CycloneDX component is not source bound")
    properties = metadata.get("properties")
    if not isinstance(properties, list):
        fail("VVIP_SBOM_INVALID", "CycloneDX source properties are missing")
    prop_map: dict[str, str] = {}
    for item in properties:
        if not isinstance(item, dict) or set(item) != {"name", "value"}:
            fail("VVIP_SBOM_INVALID", "CycloneDX property is malformed")
        name = item["name"]
        value_item = item["value"]
        if not isinstance(name, str) or not isinstance(value_item, str) or name in prop_map:
            fail("VVIP_SBOM_INVALID", "CycloneDX properties are ambiguous")
        prop_map[name] = value_item
    if prop_map.get("vvip:source_sha") != release_sha or prop_map.get("vvip:source_tree") != source_tree:
        fail("VVIP_SBOM_INVALID", "CycloneDX source properties do not match trusted source")

    components = value.get("components")
    if not isinstance(components, list):
        fail("VVIP_SBOM_INVALID", "CycloneDX file inventory is missing")
    observed: dict[str, str] = {}
    for item in components:
        if not isinstance(item, dict) or item.get("type") != "file" or not isinstance(item.get("name"), str):
            fail("VVIP_SBOM_INVALID", "CycloneDX file component is malformed")
        name = _safe_relative(item["name"], "VVIP_SBOM_INVALID")
        hashes = item.get("hashes")
        if not isinstance(hashes, list):
            fail("VVIP_SBOM_INVALID", "CycloneDX file hashes are missing")
        sha_values = [
            entry.get("content")
            for entry in hashes
            if isinstance(entry, dict) and entry.get("alg") == "SHA-256"
        ]
        if len(sha_values) != 1 or not isinstance(sha_values[0], str) or not SHA256_RE.fullmatch(sha_values[0]):
            fail("VVIP_SBOM_INVALID", "CycloneDX file SHA-256 is invalid or ambiguous")
        if name in observed:
            fail("VVIP_SBOM_INVALID", "CycloneDX contains duplicate file components")
        observed[name] = sha_values[0]
    if observed != declared_files:
        fail("VVIP_SBOM_INVALID", "CycloneDX file inventory does not equal release manifest")


def verify_inner_bundle(*, inner_tar: Path, release_sha: str, output_public: Path) -> dict[str, Any]:
    release_sha = _assert_sha40(release_sha)
    inner_tar = Path(inner_tar)
    output_public = Path(output_public)
    if inner_tar.is_symlink() or not inner_tar.is_file():
        fail("VVIP_INNER_ARCHIVE_INVALID", "inner release bundle must be a real regular file")
    if output_public.exists() or output_public.is_symlink():
        fail("VVIP_INNER_OUTPUT_INVALID", "verified public output must not already exist")
    parent = output_public.parent
    if not parent.is_dir() or parent.is_symlink():
        fail("VVIP_INNER_OUTPUT_INVALID", "verified public output parent must be a real directory")

    try:
        archive = tarfile.open(inner_tar, mode="r:gz")
    except (tarfile.TarError, OSError) as exc:
        fail("VVIP_INNER_ARCHIVE_INVALID", f"invalid inner release archive: {exc}")

    temp_root = Path(tempfile.mkdtemp(prefix="vvip-verified-inner-", dir=parent))
    try:
        with archive:
            members = _inspect_tar(archive)
            _extract_tar_safely(archive, members, temp_root)

        evidence_files = {
            relative
            for relative, member in members.items()
            if member.isfile() and relative.startswith("evidence/")
        }
        if evidence_files != EXPECTED_EVIDENCE_FILES:
            fail("VVIP_EVIDENCE_ENTRY_SET_INVALID", "inner evidence file set is not exact")

        public_root = temp_root / "public"
        evidence_root = temp_root / "evidence"
        if not public_root.is_dir() or not evidence_root.is_dir():
            fail("VVIP_INNER_ENTRY_SET_INVALID", "public/evidence roots are missing")

        source_bytes = _read_required(evidence_root / "source.json", "VVIP_SOURCE_INVALID")
        source = _assert_exact_keys(
            _parse_json_bytes(source_bytes, "VVIP_SOURCE_INVALID"),
            {"schema", "source_sha", "source_tree"},
            "VVIP_SOURCE_INVALID",
        )
        if source["schema"] != "VVIP_PRODUCTION_SOURCE_V1" or source["source_sha"] != release_sha:
            fail("VVIP_SOURCE_MISMATCH", "source evidence does not match approved release SHA")
        source_tree = source["source_tree"]
        if not isinstance(source_tree, str) or not SHA40_RE.fullmatch(source_tree):
            fail("VVIP_SOURCE_INVALID", "source tree is invalid")

        release_manifest_bytes = _read_required(
            public_root / "release-manifest.json", "VVIP_RELEASE_MANIFEST_INVALID"
        )
        release_manifest = _assert_exact_keys(
            _parse_json_bytes(release_manifest_bytes, "VVIP_RELEASE_MANIFEST_INVALID"),
            RELEASE_MANIFEST_FIELDS,
            "VVIP_RELEASE_MANIFEST_INVALID",
        )
        if (
            release_manifest["schemaVersion"] != 1
            or release_manifest["mode"] != "production"
            or release_manifest["sourceSha"] != release_sha
            or release_manifest["releaseEligible"] is not True
            or not isinstance(release_manifest["configurationErrors"], list)
            or release_manifest["configurationErrors"]
            or not isinstance(release_manifest["forbiddenFindings"], list)
            or release_manifest["forbiddenFindings"]
            or not isinstance(release_manifest["files"], dict)
            or not release_manifest["files"]
        ):
            fail("VVIP_RELEASE_MANIFEST_INVALID", "embedded Production release manifest is not eligible")

        declared_files: dict[str, str] = {}
        for raw_path, raw_digest in release_manifest["files"].items():
            path_value = _safe_relative(raw_path, "VVIP_RELEASE_MANIFEST_INVALID")
            if path_value == "release-manifest.json" or path_value in declared_files:
                fail("VVIP_RELEASE_MANIFEST_INVALID", "release manifest contains a reserved or duplicate path")
            if not isinstance(raw_digest, str) or not SHA256_RE.fullmatch(raw_digest):
                fail("VVIP_RELEASE_MANIFEST_INVALID", "release manifest contains an invalid file digest")
            declared_files[path_value] = raw_digest

        actual_public_files = sorted(
            path.relative_to(public_root).as_posix()
            for path in public_root.rglob("*")
            if path.is_file()
        )
        expected_public_files = sorted(["release-manifest.json", *declared_files])
        if actual_public_files != expected_public_files:
            fail("VVIP_PUBLIC_ENTRY_SET_INVALID", "verified public tree differs from release manifest")

        candidate_records: list[dict[str, str]] = []
        for relative in sorted(declared_files):
            file_path = public_root.joinpath(*relative.split("/"))
            if file_path.is_symlink() or not file_path.is_file():
                fail("VVIP_PUBLIC_ENTRY_SET_INVALID", "declared public path is not a regular file")
            actual_digest = _sha256_file(file_path)
            if actual_digest != declared_files[relative]:
                fail("VVIP_PUBLIC_HASH_MISMATCH", "public bytes do not match release manifest")
            candidate_records.append({"path": relative, "sha256": actual_digest})

        materials_bytes = _read_required(evidence_root / "materials.json", "VVIP_MATERIALS_INVALID")
        material_records = _validate_materials(
            _parse_json_bytes(materials_bytes, "VVIP_MATERIALS_INVALID"),
            release_sha,
            source_tree,
        )

        sbom_bytes = _read_required(evidence_root / "sbom.cdx.json", "VVIP_SBOM_INVALID")
        sbom = _parse_json_bytes(sbom_bytes, "VVIP_SBOM_INVALID")
        _validate_sbom(sbom, release_sha, source_tree, declared_files)

        bundle_bytes = _read_required(
            evidence_root / "release-bundle-manifest.json", "VVIP_RELEASE_BUNDLE_INVALID"
        )
        bundle = _assert_exact_keys(
            _parse_json_bytes(bundle_bytes, "VVIP_RELEASE_BUNDLE_INVALID"),
            BUNDLE_FIELDS,
            "VVIP_RELEASE_BUNDLE_INVALID",
        )
        if (
            bundle["bundle_version"] != "SVEF_RELEASE_BUNDLE_V1"
            or bundle["source_sha"] != release_sha
            or bundle["source_tree"] != source_tree
            or bundle["created_by"] != "github-actions:production-release-artifact"
        ):
            fail("VVIP_RELEASE_BUNDLE_INVALID", "Production release bundle identity is invalid")
        for field in (
            "candidate_manifest_sha256",
            "candidate_content_sha256",
            "sbom_sha256",
            "materials_sha256",
        ):
            if not isinstance(bundle[field], str) or not SHA256_RE.fullmatch(bundle[field]):
                fail("VVIP_RELEASE_BUNDLE_INVALID", "Production release bundle contains an invalid digest")

        if bundle["candidate_manifest_sha256"] != _sha256_bytes(release_manifest_bytes):
            fail("VVIP_RELEASE_BUNDLE_MISMATCH", "release manifest digest is not bundle-bound")
        if bundle["candidate_content_sha256"] != _sha256_bytes(_canonical_json_bytes(candidate_records)):
            fail("VVIP_RELEASE_BUNDLE_MISMATCH", "public content digest is not bundle-bound")
        if bundle["sbom_sha256"] != _sha256_bytes(sbom_bytes):
            fail("VVIP_RELEASE_BUNDLE_MISMATCH", "SBOM digest is not bundle-bound")
        if bundle["materials_sha256"] != _sha256_bytes(_canonical_json_bytes(material_records)):
            fail("VVIP_RELEASE_BUNDLE_MISMATCH", "materials digest is not bundle-bound")

        source_public = public_root
        source_public.replace(output_public)
        return {
            "source_sha": release_sha,
            "source_tree": source_tree,
            "public_file_count": len(declared_files),
        }
    except Exception:
        if output_public.exists():
            shutil.rmtree(output_public, ignore_errors=True)
        raise
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify sealed VVIP Production release artifacts")
    subparsers = parser.add_subparsers(dest="phase", required=True)

    outer = subparsers.add_parser("outer", help="verify GitHub ZIP and sealed inner checksum")
    outer.add_argument("--artifact-zip", required=True, type=Path)
    outer.add_argument("--github-artifact-digest", required=True)
    outer.add_argument("--release-sha", required=True)
    outer.add_argument("--extract-root", required=True, type=Path)

    inner = subparsers.add_parser("inner", help="verify attested inner bundle and emit public bytes")
    inner.add_argument("--inner-tar", required=True, type=Path)
    inner.add_argument("--release-sha", required=True)
    inner.add_argument("--output-public", required=True, type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        if args.phase == "outer":
            inner_path = verify_outer_artifact(
                artifact_zip=args.artifact_zip,
                github_artifact_digest=args.github_artifact_digest,
                release_sha=args.release_sha,
                extract_root=args.extract_root,
            )
            print("VVIP_OUTER_ARTIFACT=PASS")
            print(f"VVIP_INNER_TARBALL={inner_path}")
            return 0

        result = verify_inner_bundle(
            inner_tar=args.inner_tar,
            release_sha=args.release_sha,
            output_public=args.output_public,
        )
        print("VVIP_INNER_ARTIFACT=PASS")
        print(f"VVIP_SOURCE_SHA={result['source_sha']}")
        print(f"VVIP_SOURCE_TREE={result['source_tree']}")
        print(f"VVIP_PUBLIC_FILES={result['public_file_count']}")
        return 0
    except VerificationError as exc:
        print("VVIP_PRODUCTION_ARTIFACT=BLOCKED", file=sys.stderr)
        print(f"CODE={exc.code}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
