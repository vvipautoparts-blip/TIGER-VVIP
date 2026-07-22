from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

GATE = (
    ROOT
    / "scripts"
    / "antigravity"
    / "read_only_gate.py"
)


def call_gate(
    name: str,
    args: dict | None = None,
) -> dict:
    payload = {
        "toolCall": {
            "name": name,
            "args": args or {},
        },
        "stepIdx": 0,
        "conversationId": "test",
        "workspacePaths": [str(ROOT)],
        "transcriptPath": "/tmp/test-transcript.jsonl",
        "artifactDirectoryPath": "/tmp/test-artifacts",
    }

    result = subprocess.run(
        ["python3", str(GATE)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=True,
    )

    return json.loads(result.stdout)


class AntigravityReadOnlyGateTests(unittest.TestCase):

    def test_allows_repository_reads(self) -> None:
        result = call_gate(
            "view_file",
            {
                "AbsolutePath": str(
                    ROOT / "README.md"
                )
            },
        )

        self.assertEqual(
            result["decision"],
            "allow",
        )

    def test_allows_directory_listing(self) -> None:
        result = call_gate(
            "list_dir",
            {
                "DirectoryPath": str(
                    ROOT / "docs"
                )
            },
        )

        self.assertEqual(
            result["decision"],
            "allow",
        )

    def test_denies_environment_reads(self) -> None:
        result = call_gate(
            "view_file",
            {
                "AbsolutePath": str(
                    ROOT / ".env.local"
                )
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )

    def test_denies_terminal_commands(self) -> None:
        result = call_gate(
            "run_command",
            {
                "CommandLine": "git status",
                "Cwd": str(ROOT),
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )

    def test_denies_file_creation(self) -> None:
        result = call_gate(
            "write_to_file",
            {
                "TargetFile": str(
                    ROOT / "forbidden.txt"
                )
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )

    def test_denies_file_editing(self) -> None:
        result = call_gate(
            "replace_file_content",
            {
                "TargetFile": str(
                    ROOT / "README.md"
                )
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )

    def test_web_read_requires_owner(self) -> None:
        result = call_gate(
            "read_url_content",
            {
                "Url": "https://example.com"
            },
        )

        self.assertEqual(
            result["decision"],
            "force_ask",
        )

    def test_blocks_secret_exfiltration(self) -> None:
        fake_token = "ghp_" + ("a" * 32)

        result = call_gate(
            "search_web",
            {
                "query": fake_token
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )

    def test_allows_read_only_subagent(self) -> None:
        result = call_gate(
            "define_subagent",
            {
                "name": "ux-planner",
                "enable_write_tools": False,
                "enable_mcp_tools": False,
            },
        )

        self.assertEqual(
            result["decision"],
            "allow",
        )

    def test_denies_writable_subagent(self) -> None:
        result = call_gate(
            "define_subagent",
            {
                "name": "writer",
                "enable_write_tools": True,
            },
        )

        self.assertEqual(
            result["decision"],
            "deny",
        )


if __name__ == "__main__":
    unittest.main()
