from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import stat
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "release" / "verify-production-artifact.py"
SPEC = importlib.util.spec_from_file_location("verify_production_artifact", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load Production artifact verifier")
verifier = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verifier)

SOURCE_SHA = "a" * 40
SOURCE_TREE = "b" * 40
ARCHIVE_NAME = f"vvip-production-release-{SOURCE_SHA}.tar.gz"
CHECKSUM_NAME = f"vvip-production-release-{SOURCE_SHA}.sha256"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def canonical_file(value) -> bytes:
    return canonical_json(value) + b"\n"


def tar_bytes(entries: dict[str, bytes], *, link: tuple[str, str] | None = None) -> bytes:
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz", format=tarfile.PAX_FORMAT) as archive:
        for name, data in sorted(entries.items()):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mtime = 0
            info.uid = 0
            info.gid = 0
            archive.addfile(info, io.BytesIO(data))
        if link:
            name, target = link
            info = tarfile.TarInfo(name)
            info.type = tarfile.SYMTYPE
            info.linkname = target
            info.mtime = 0
            archive.addfile(info)
    return output.getvalue()


def zip_bytes(entries: list[tuple[zipfile.ZipInfo | str, bytes]]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return output.getvalue()


def patch_central_directory_file_size(payload: bytes, filename: str, declared_size: int) -> bytes:
    """Change only the central-directory uncompressed size without allocating that payload."""
    data = bytearray(payload)
    signature = b"PK\x01\x02"
    encoded_name = filename.encode("utf-8")
    offset = 0
    while True:
        index = data.find(signature, offset)
        if index < 0:
            raise AssertionError(f"central directory entry not found: {filename}")
        name_len = int.from_bytes(data[index + 28 : index + 30], "little")
        extra_len = int.from_bytes(data[index + 30 : index + 32], "little")
        comment_len = int.from_bytes(data[index + 32 : index + 34], "little")
        name_start = index + 46
        name_end = name_start + name_len
        if bytes(data[name_start:name_end]) == encoded_name:
            data[index + 24 : index + 28] = declared_size.to_bytes(4, "little")
            return bytes(data)
        offset = name_end + extra_len + comment_len


def valid_inner_tar(*, sbom_version: str = "1.7") -> bytes:
    public_file = b"<!doctype html><title>VVIP TIGER</title>\n"
    release_manifest = {
        "schemaVersion": 1,
        "mode": "production",
        "sourceSha": SOURCE_SHA,
        "releaseEligible": True,
        "configurationErrors": [],
        "forbiddenFindings": [],
        "files": {"index.html": sha256(public_file)},
    }
    release_manifest_bytes = (json.dumps(release_manifest, ensure_ascii=False, indent=2) + "\n").encode()
    candidate_records = [{"path": "index.html", "sha256": sha256(public_file)}]

    material_bytes = b"jsonschema==4.26.0\n"
    material_records = [{"path": "requirements-dev.txt", "sha256": sha256(material_bytes)}]
    materials = {
        "schema": "VVIP_PRODUCTION_MATERIALS_V1",
        "source_sha": SOURCE_SHA,
        "source_tree": SOURCE_TREE,
        "materials": material_records,
    }
    materials_bytes = canonical_file(materials)

    sbom = {
        "$schema": f"https://cyclonedx.org/schema/bom-{sbom_version}.schema.json",
        "bomFormat": "CycloneDX",
        "specVersion": sbom_version,
        "serialNumber": "urn:uuid:224d0ab4-2c8a-82c1-bda7-ee567c18e811",
        "version": 1,
        "metadata": {
            "lifecycles": [{"phase": "build"}],
            "component": {"type": "application", "name": "VVIP-TIGER", "version": SOURCE_SHA},
            "properties": [
                {"name": "vvip:source_sha", "value": SOURCE_SHA},
                {"name": "vvip:source_tree", "value": SOURCE_TREE},
                {"name": "vvip:generator", "value": "VVIP_PRODUCTION_FILE_INVENTORY_V1"},
            ],
        },
        "components": [
            {
                "type": "file",
                "name": "index.html",
                "hashes": [{"alg": "SHA-256", "content": sha256(public_file)}],
            }
        ],
    }
    sbom_bytes = canonical_file(sbom)
    source_bytes = canonical_file(
        {"schema": "VVIP_PRODUCTION_SOURCE_V1", "source_sha": SOURCE_SHA, "source_tree": SOURCE_TREE}
    )

    bundle = {
        "bundle_version": "SVEF_RELEASE_BUNDLE_V1",
        "source_sha": SOURCE_SHA,
        "source_tree": SOURCE_TREE,
        "candidate_manifest_sha256": sha256(release_manifest_bytes),
        "candidate_content_sha256": sha256(canonical_json(candidate_records)),
        "sbom_sha256": sha256(sbom_bytes),
        "materials_sha256": sha256(canonical_json(material_records)),
        "created_by": "github-actions:production-release-artifact",
    }
    bundle_bytes = canonical_file(bundle)

    return tar_bytes(
        {
            "public/index.html": public_file,
            "public/release-manifest.json": release_manifest_bytes,
            "evidence/source.json": source_bytes,
            "evidence/materials.json": materials_bytes,
            "evidence/sbom.cdx.json": sbom_bytes,
            "evidence/release-bundle-manifest.json": bundle_bytes,
        }
    )


def valid_outer_zip(inner: bytes | None = None) -> bytes:
    inner = inner if inner is not None else valid_inner_tar()
    checksum = f"{sha256(inner)}  {ARCHIVE_NAME}\n".encode()
    return zip_bytes([(ARCHIVE_NAME, inner), (CHECKSUM_NAME, checksum)])


class VerifyProductionArtifactTests(unittest.TestCase):
    def test_outer_verification_binds_github_digest_and_inner_checksum_without_inner_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact_zip = root / "artifact.zip"
            outer = valid_outer_zip()
            artifact_zip.write_bytes(outer)
            extracted = root / "outer"

            inner_path = verifier.verify_outer_artifact(
                artifact_zip=artifact_zip,
                github_artifact_digest=f"sha256:{sha256(outer)}",
                release_sha=SOURCE_SHA,
                extract_root=extracted,
            )

            self.assertEqual(inner_path, extracted / ARCHIVE_NAME)
            self.assertTrue(inner_path.is_file())
            self.assertEqual(sorted(p.name for p in extracted.iterdir()), sorted([ARCHIVE_NAME, CHECKSUM_NAME]))
            self.assertFalse((extracted / "public").exists(), "outer phase must not extract trusted inner bytes")

    def test_outer_rejects_bad_github_digest_extra_entry_symlink_and_bad_inner_checksum(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inner = valid_inner_tar()
            checksum = f"{sha256(inner)}  {ARCHIVE_NAME}\n".encode()

            cases: list[tuple[str, bytes, str]] = []
            good = valid_outer_zip(inner)
            cases.append(("digest", good, "VVIP_OUTER_DIGEST_MISMATCH"))
            cases.append(
                ("extra", zip_bytes([(ARCHIVE_NAME, inner), (CHECKSUM_NAME, checksum), ("extra.txt", b"x")]), "VVIP_OUTER_ENTRY_SET_INVALID")
            )
            symlink = zipfile.ZipInfo(ARCHIVE_NAME)
            symlink.create_system = 3
            symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
            cases.append(
                ("symlink", zip_bytes([(symlink, b"target"), (CHECKSUM_NAME, checksum)]), "VVIP_OUTER_ENTRY_TYPE_INVALID")
            )
            bad_checksum = f"{'0' * 64}  {ARCHIVE_NAME}\n".encode()
            cases.append(
                ("inner", zip_bytes([(ARCHIVE_NAME, inner), (CHECKSUM_NAME, bad_checksum)]), "VVIP_INNER_DIGEST_MISMATCH")
            )

            for label, payload, code in cases:
                with self.subTest(label=label):
                    artifact_zip = root / f"{label}.zip"
                    artifact_zip.write_bytes(payload)
                    digest = "sha256:" + ("0" * 64 if label == "digest" else sha256(payload))
                    with self.assertRaises(verifier.VerificationError) as ctx:
                        verifier.verify_outer_artifact(
                            artifact_zip=artifact_zip,
                            github_artifact_digest=digest,
                            release_sha=SOURCE_SHA,
                            extract_root=root / f"out-{label}",
                        )
                    self.assertEqual(ctx.exception.code, code)

    def test_outer_rejects_zero_length_and_oversized_declared_members_before_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            empty_checksum = f"{sha256(b'')}  {ARCHIVE_NAME}\n".encode()
            zero_length = zip_bytes([(ARCHIVE_NAME, b""), (CHECKSUM_NAME, empty_checksum)])
            oversized = patch_central_directory_file_size(
                valid_outer_zip(),
                ARCHIVE_NAME,
                512 * 1024 * 1024 + 1,
            )

            for label, payload in (("zero", zero_length), ("oversized", oversized)):
                with self.subTest(label=label):
                    artifact_zip = root / f"{label}.zip"
                    artifact_zip.write_bytes(payload)
                    extract_root = root / f"out-{label}"
                    with self.assertRaises(verifier.VerificationError) as ctx:
                        verifier.verify_outer_artifact(
                            artifact_zip=artifact_zip,
                            github_artifact_digest=f"sha256:{sha256(payload)}",
                            release_sha=SOURCE_SHA,
                            extract_root=extract_root,
                        )
                    self.assertEqual(ctx.exception.code, "VVIP_OUTER_ENTRY_SIZE_INVALID")
                    self.assertFalse(extract_root.exists(), "size rejection must happen before extraction")

    def test_inner_rejects_traversal_links_and_unexpected_top_level_entries_before_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cases = {
                "traversal": tar_bytes({"../escape.txt": b"x"}),
                "link": tar_bytes({"public/index.html": b"x"}, link=("public/link", "../../escape")),
                "top-level": tar_bytes({"unexpected/file.txt": b"x"}),
            }
            expected = {
                "traversal": "VVIP_INNER_PATH_INVALID",
                "link": "VVIP_INNER_ENTRY_TYPE_INVALID",
                "top-level": "VVIP_INNER_ENTRY_SET_INVALID",
            }
            for label, payload in cases.items():
                with self.subTest(label=label):
                    archive = root / f"{label}.tar.gz"
                    archive.write_bytes(payload)
                    output = root / f"public-{label}"
                    with self.assertRaises(verifier.VerificationError) as ctx:
                        verifier.verify_inner_bundle(
                            inner_tar=archive,
                            release_sha=SOURCE_SHA,
                            output_public=output,
                        )
                    self.assertEqual(ctx.exception.code, expected[label])
                    self.assertFalse(output.exists())

    def test_inner_validates_production_evidence_and_emits_only_verified_public_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / ARCHIVE_NAME
            archive.write_bytes(valid_inner_tar())
            output = root / "verified-public"

            result = verifier.verify_inner_bundle(
                inner_tar=archive,
                release_sha=SOURCE_SHA,
                output_public=output,
            )

            self.assertEqual(result["source_sha"], SOURCE_SHA)
            self.assertEqual(result["source_tree"], SOURCE_TREE)
            self.assertEqual(result["public_file_count"], 1)
            self.assertEqual((output / "index.html").read_text(), "<!doctype html><title>VVIP TIGER</title>\n")
            self.assertTrue((output / "release-manifest.json").is_file())

    def test_inner_rejects_legacy_cyclonedx_1_6_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / ARCHIVE_NAME
            archive.write_bytes(valid_inner_tar(sbom_version="1.6"))
            output = root / "verified-public"

            with self.assertRaises(verifier.VerificationError) as ctx:
                verifier.verify_inner_bundle(
                    inner_tar=archive,
                    release_sha=SOURCE_SHA,
                    output_public=output,
                )

            self.assertEqual(ctx.exception.code, "VVIP_SBOM_INVALID")
            self.assertFalse(output.exists())

    def test_inner_fails_closed_on_mode_source_hash_and_undeclared_public_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            good = valid_inner_tar()
            with tarfile.open(fileobj=io.BytesIO(good), mode="r:gz") as archive:
                entries = {
                    member.name: archive.extractfile(member).read()
                    for member in archive.getmembers()
                    if member.isfile()
                }

            release = json.loads(entries["public/release-manifest.json"])
            mutations = []

            wrong_mode = dict(entries)
            release_mode = {**release, "mode": "candidate"}
            wrong_mode["public/release-manifest.json"] = (json.dumps(release_mode, indent=2) + "\n").encode()
            mutations.append(("mode", wrong_mode, "VVIP_RELEASE_MANIFEST_INVALID"))

            wrong_source = dict(entries)
            source = json.loads(entries["evidence/source.json"])
            wrong_source["evidence/source.json"] = canonical_file({**source, "source_sha": "c" * 40})
            mutations.append(("source", wrong_source, "VVIP_SOURCE_MISMATCH"))

            bad_hash = dict(entries)
            bad_hash["public/index.html"] = b"tampered\n"
            mutations.append(("hash", bad_hash, "VVIP_PUBLIC_HASH_MISMATCH"))

            undeclared = dict(entries)
            undeclared["public/extra.js"] = b"unexpected\n"
            mutations.append(("extra", undeclared, "VVIP_PUBLIC_ENTRY_SET_INVALID"))

            for label, mutated, code in mutations:
                with self.subTest(label=label):
                    archive_path = root / f"{label}.tar.gz"
                    archive_path.write_bytes(tar_bytes(mutated))
                    with self.assertRaises(verifier.VerificationError) as ctx:
                        verifier.verify_inner_bundle(
                            inner_tar=archive_path,
                            release_sha=SOURCE_SHA,
                            output_public=root / f"out-{label}",
                        )
                    self.assertEqual(ctx.exception.code, code)


if __name__ == "__main__":
    unittest.main()
