from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from tools import vvip_cleanroom


class CleanroomUnitTests(unittest.TestCase):
    def test_chunked_sha256_matches_hashlib(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "large.bin"
            payload = (b"vvip-tiger\0" * 200_000) + b"tail"
            target.write_bytes(payload)

            self.assertEqual(
                vvip_cleanroom.sha256_file(target, chunk_size=4096),
                hashlib.sha256(payload).hexdigest(),
            )

    def test_read_text_detects_binary_and_decodes_utf8(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            arabic = root / "arabic.txt"
            binary = root / "image.bin"
            arabic.write_text("النمر VVIP", encoding="utf-8")
            binary.write_bytes(b"png\0payload")

            self.assertEqual(vvip_cleanroom.read_text_file(arabic), "النمر VVIP")
            self.assertIsNone(vvip_cleanroom.read_text_file(binary))

    def test_walk_does_not_enter_git_or_external_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as external:
            root = Path(directory)
            (root / ".git").mkdir()
            (root / ".git" / "secret").write_text("hidden", encoding="utf-8")
            (root / "source.js").write_text("export {};", encoding="utf-8")
            (Path(external) / "outside.js").write_text("outside", encoding="utf-8")
            (root / "outside-link").symlink_to(external, target_is_directory=True)

            inventory = vvip_cleanroom.walk_repository(root)
            relative_files = {item.relative_path for item in inventory.files}

            self.assertIn("source.js", relative_files)
            self.assertNotIn(".git/secret", relative_files)
            self.assertNotIn("outside-link/outside.js", relative_files)
            self.assertIn("outside-link", inventory.symlinks)

    def test_forbidden_scan_redacts_values_and_skips_binary(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            forbidden = "xadas" + "wztjvmbrphaytog"
            (root / "runtime.js").write_text(
                f'const ref = "{forbidden}";\nconst path = "/work" + "spaces/demo";\n',
                encoding="utf-8",
            )
            (root / "binary.bin").write_bytes(forbidden.encode() + b"\0")

            findings = vvip_cleanroom.scan_forbidden_references(root, ["runtime.js", "binary.bin"])
            serialized = json.dumps(findings, sort_keys=True)

            self.assertEqual(len(findings), 1)
            self.assertEqual(findings[0]["path"], "runtime.js")
            self.assertNotIn(forbidden, serialized)
            self.assertEqual(findings[0]["rule"], "forbidden_ref_1")

    def test_reference_scan_reports_missing_and_case_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "scripts").mkdir()
            (root / "scripts" / "App.js").write_text("export {};", encoding="utf-8")
            (root / "index.html").write_text(
                '<script src="scripts/app.js"></script>\n'
                '<link rel="stylesheet" href="styles/missing.css">\n',
                encoding="utf-8",
            )

            findings = vvip_cleanroom.scan_local_references(root, ["index.html", "scripts/App.js"])

            self.assertEqual(
                [(item["kind"], item["target"]) for item in findings],
                [
                    ("case_mismatch", "scripts/app.js"),
                    ("missing", "styles/missing.css"),
                ],
            )

    def test_reference_scan_ignores_import_text_embedded_in_node_command(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            test_file = root / "tests" / "runtime.test.cjs"
            target = root / "scripts" / "runtime.js"
            test_file.parent.mkdir()
            target.parent.mkdir()
            target.write_text("export const ready = true;\n", encoding="utf-8")
            test_file.write_text(
                "const command = `import { ready } from './scripts/runtime.js';`;\n",
                encoding="utf-8",
            )

            findings = vvip_cleanroom.scan_local_references(
                root, ["tests/runtime.test.cjs", "scripts/runtime.js"]
            )

            self.assertEqual(findings, [])

    def test_reference_scan_ignores_links_embedded_in_historical_review_transcript(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            transcript = root / "docs" / "launch" / "pr35" / "CODEX_REVIEW_ROUND1.md"
            transcript.parent.mkdir(parents=True)
            transcript.write_text(
                "Captured reviewer prompt: [removed fixture](./removed-fixture.js)\n",
                encoding="utf-8",
            )

            findings = vvip_cleanroom.scan_local_references(
                root, ["docs/launch/pr35/CODEX_REVIEW_ROUND1.md"]
            )

            self.assertEqual(findings, [])

    def test_required_duplicate_pairs_have_explicit_explanations(self) -> None:
        cases = {
            (
                "clerk-private-profile.html",
                "private-profile.html",
            ): "route compatibility aliases",
            (
                "docs/superpowers/specs/design.md",
                "project-control/docs/superpowers/specs/design.md",
            ): "project-control package mirror",
            (
                "project-control/database/001_schema.sql",
                "supabase/migrations/202607210001_schema.sql",
            ): "source package and deployable migration",
            (
                "docs/launch/pr35/CHANGED_FILES.allowlist",
                "docs/launch/pr35/CHANGED_FILES.final",
            ): "change-control verification pair",
        }
        for paths, expected_reason in cases.items():
            with self.subTest(paths=paths):
                disposition, reason = vvip_cleanroom.duplicate_disposition(list(paths))
                self.assertEqual(disposition, "intentional")
                self.assertEqual(reason, expected_reason)

    def test_git_status_entries_include_untracked_and_ignored_paths(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            CleanroomIntegrationTests().init_repo(root)
            (root / "untracked.txt").write_text("new\n", encoding="utf-8")
            cache = root / ".pytest_cache"
            cache.mkdir()
            (cache / "state").write_text("ignored\n", encoding="utf-8")

            entries = vvip_cleanroom.git_status_entries(root)
            statuses = {(item["status"], item["path"]) for item in entries}

            self.assertIn(("??", "untracked.txt"), statuses)
            self.assertIn(("!!", ".pytest_cache/state"), statuses)

    def test_firebase_hosting_cache_is_generated_garbage(self) -> None:
        self.assertEqual(
            vvip_cleanroom.garbage_reason(
                ".firebase/hosting.production.cache",
                tracked=False,
                ignored=True,
            ),
            "generated Firebase hosting cache",
        )


class CleanroomIntegrationTests(unittest.TestCase):
    def init_repo(self, root: Path) -> None:
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Cleanroom Test"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "cleanroom@example.invalid"], cwd=root, check=True)
        (root / ".gitignore").write_text(".pytest_cache/\n", encoding="utf-8")
        (root / "index.html").write_text("<!doctype html><title>VVIP</title>\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=root, check=True)

    def test_apply_removes_garbage_and_is_report_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            cache = root / ".pytest_cache"
            cache.mkdir()
            (cache / "state").write_text("generated", encoding="utf-8")
            (root / "debug.log").write_text("debug", encoding="utf-8")
            (root / "broken-link").symlink_to("missing-target")

            first = vvip_cleanroom.execute(root, "apply", enforce_scope=False)
            first_json = (root / "reports" / "vvip-cleanroom-report.json").read_bytes()
            first_markdown = (root / "reports" / "VVIP_CLEANROOM_REPORT.md").read_bytes()
            second = vvip_cleanroom.execute(root, "apply", enforce_scope=False)

            self.assertFalse(cache.exists())
            self.assertFalse((root / "debug.log").exists())
            self.assertFalse((root / "broken-link").exists())
            self.assertGreater(first.cleanup_changes, 0)
            self.assertEqual(second.cleanup_changes, 0)
            self.assertEqual(first_json, (root / "reports" / "vvip-cleanroom-report.json").read_bytes())
            self.assertEqual(first_markdown, (root / "reports" / "VVIP_CLEANROOM_REPORT.md").read_bytes())

    def test_reports_are_idempotent_after_staging(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            vvip_cleanroom.execute(root, "audit", enforce_scope=False)
            subprocess.run(["git", "add", "reports"], cwd=root, check=True)

            vvip_cleanroom.execute(root, "verify", enforce_scope=False)
            first_json = (root / "reports" / "vvip-cleanroom-report.json").read_bytes()
            vvip_cleanroom.execute(root, "verify", enforce_scope=False)

            self.assertEqual(
                first_json,
                (root / "reports" / "vvip-cleanroom-report.json").read_bytes(),
            )

    def test_apply_removes_caches_nested_under_protected_source_roots(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            for parent in ("tools", "tests"):
                cache = root / parent / "__pycache__"
                cache.mkdir(parents=True)
                (cache / "module.pyc").write_bytes(b"generated")

            vvip_cleanroom.execute(root, "apply", enforce_scope=False)

            self.assertFalse((root / "tools" / "__pycache__").exists())
            self.assertFalse((root / "tests" / "__pycache__").exists())

    def test_apply_removes_unreferenced_tracked_archive(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            archive = root / "approved"
            archive.mkdir()
            (archive / "snapshot.js").write_text("export const stale = true;\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=root, check=True)
            subprocess.run(["git", "commit", "-qm", "archive fixture"], cwd=root, check=True)

            result = vvip_cleanroom.execute(root, "apply", enforce_scope=False)

            self.assertGreater(result.cleanup_changes, 0)
            self.assertFalse(archive.exists())
            status = subprocess.run(
                ["git", "status", "--short"], cwd=root, check=True, text=True, stdout=subprocess.PIPE
            ).stdout
            self.assertIn("D  approved/snapshot.js", status)

    def test_apply_preserves_archive_referenced_by_active_runtime(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            archive = root / "backups"
            archive.mkdir()
            (archive / "compat.js").write_text("export const active = true;\n", encoding="utf-8")
            (root / "index.html").write_text(
                '<!doctype html><script src="backups/compat.js"></script>\n',
                encoding="utf-8",
            )
            subprocess.run(["git", "add", "."], cwd=root, check=True)
            subprocess.run(["git", "commit", "-qm", "referenced archive fixture"], cwd=root, check=True)

            vvip_cleanroom.execute(root, "apply", enforce_scope=False)

            self.assertTrue((archive / "compat.js").exists())

    def test_verify_fails_for_duplicate_migration_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            migrations = root / "supabase" / "migrations"
            migrations.mkdir(parents=True)
            (migrations / "202607210001_first.sql").write_text("select 1;\n", encoding="utf-8")
            (migrations / "202607210001_second.sql").write_text("select 2;\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=root, check=True)

            result = vvip_cleanroom.execute(root, "verify", enforce_scope=False)

            self.assertFalse(result.accepted)
            self.assertEqual(
                result.report["gates"]["unique_migration_versions"]["status"],
                "fail",
            )

    def test_verify_rejects_stale_supabase_config_and_missing_seed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.init_repo(root)
            supabase = root / "supabase"
            supabase.mkdir()
            (supabase / "config.toml").write_text(
                'project_id = "stale-preview"\n[db.seed]\nenabled = true\nsql_paths = ["./seed.sql"]\n',
                encoding="utf-8",
            )
            subprocess.run(["git", "add", "."], cwd=root, check=True)

            result = vvip_cleanroom.execute(root, "verify", enforce_scope=False)

            self.assertEqual(
                result.report["gates"]["production_supabase_references"]["status"],
                "fail",
            )
            details = result.report["gates"]["production_supabase_references"]["details"]
            self.assertEqual(
                [item["rule"] for item in details],
                ["missing_supabase_config_path", "stale_supabase_config_project"],
            )


if __name__ == "__main__":
    unittest.main()
