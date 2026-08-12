from __future__ import annotations

import hashlib
import importlib.util
import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "release" / "verify-production-artifact.py"
SPEC = importlib.util.spec_from_file_location("verify_production_artifact_size_limits", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load Production artifact verifier")
verifier = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verifier)

SOURCE_SHA = "a" * 40
ARCHIVE_NAME = f"vvip-production-release-{SOURCE_SHA}.tar.gz"
CHECKSUM_NAME = f"vvip-production-release-{SOURCE_SHA}.sha256"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def zip_bytes(entries: list[tuple[str, bytes]]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return output.getvalue()


def outer_zip(inner: bytes, checksum: bytes | None = None) -> bytes:
    if checksum is None:
        checksum = f"{sha256(inner)}  {ARCHIVE_NAME}\n".encode()
    return zip_bytes([(ARCHIVE_NAME, inner), (CHECKSUM_NAME, checksum)])


class VerifyProductionOuterSizeLimitTests(unittest.TestCase):
    def _verify(self, root: Path, payload: bytes, label: str) -> Path:
        artifact_zip = root / f"{label}.zip"
        artifact_zip.write_bytes(payload)
        output = root / f"out-{label}"
        with self.assertRaises(verifier.VerificationError) as ctx:
            verifier.verify_outer_artifact(
                artifact_zip=artifact_zip,
                github_artifact_digest=f"sha256:{sha256(payload)}",
                release_sha=SOURCE_SHA,
                extract_root=output,
            )
        self.assertEqual(ctx.exception.code, "VVIP_OUTER_ENTRY_SIZE_INVALID")
        self.assertFalse(output.exists(), "size rejection must happen before any outer member is written")
        return output

    def test_outer_rejects_zero_length_members_before_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._verify(root, outer_zip(b""), "zero-inner")

    def test_outer_rejects_member_expansion_beyond_name_specific_limits_before_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)

            inner = b"A" * 32
            with mock.patch.object(verifier, "MAX_OUTER_ARCHIVE_MEMBER_BYTES", 16, create=True):
                self._verify(root, outer_zip(inner), "oversized-inner")

            checksum = b"B" * 64
            with mock.patch.object(verifier, "MAX_OUTER_CHECKSUM_BYTES", 32, create=True):
                self._verify(root, outer_zip(b"valid-inner", checksum), "oversized-checksum")


if __name__ == "__main__":
    unittest.main()
