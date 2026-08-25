#!/usr/bin/env python3
"""Deterministic repository clean-room audit, cleanup, and verification.

The implementation deliberately uses only the Python standard library.  It
keeps reports free of matched secret values and workspace-specific absolute
paths so that the generated artifacts are safe and portable.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tomllib
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable, Sequence
from urllib.parse import unquote


REPORT_JSON = PurePosixPath("reports/vvip-cleanroom-report.json")
REPORT_MARKDOWN = PurePosixPath("reports/VVIP_CLEANROOM_REPORT.md")
REPORT_JSON_NAME = "vvip-cleanroom-report.json"
REPORT_MARKDOWN_NAME = "VVIP_CLEANROOM_REPORT.md"
TOOL_PATH = PurePosixPath("tools/vvip_cleanroom.py")
REPORT_PATHS = {str(REPORT_JSON), str(REPORT_MARKDOWN)}
REPORT_SCHEMA_VERSION = 1
HASH_CHUNK_SIZE = 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 30
EXPECTED_ROOT_NAME = "TIGER-VVIP"
EXPECTED_BRANCH = "main"
EXPECTED_REMOTE_FRAGMENT = "vvipautoparts-blip/TIGER-VVIP"
REQUIRED_ANCESTORS = ("eab212d", "2c46f09")
PRODUCTION_SUPABASE_REF = "zelcngyyvbomuzokvuxo"

# Split forbidden values so this active tracked source never contains them.
FORBIDDEN_RULES = (
    ("forbidden_ref_1", "".join(("xadas", "wztjvmbrphaytog"))),
    ("forbidden_ref_2", "".join(("pr-90-global-", "control-20260720"))),
    ("forbidden_ref_3", "".join(("TIGER-VVIP-P08-", "OTP-BOOTSTRAP"))),
    ("forbidden_ref_4", "".join(("TIGER-VVIP-P09-", "FUTURE-LOGIN-20260719"))),
    (
        "forbidden_ref_5",
        "".join(("/work", "spaces/TIGER-VVIP-P08-", "OTP-BOOTSTRAP")),
    ),
    (
        "forbidden_ref_6",
        "".join(("/work", "spaces/TIGER-VVIP-P09-", "FUTURE-LOGIN-20260719")),
    ),
)

CONFIG_NAMES = {
    ".firebaserc",
    ".gitignore",
    "CNAME",
    "Dockerfile",
    "Makefile",
    "firebase.json",
    "jsconfig.json",
    "manifest.webmanifest",
    "package.json",
    "pyproject.toml",
    "requirements-dev.txt",
    "requirements.txt",
    "tsconfig.json",
}
CONFIG_SUFFIXES = {".json", ".toml", ".yaml", ".yml"}
DOCUMENTATION_SUFFIXES = {".md", ".rst", ".txt"}
ASSET_SUFFIXES = {
    ".avif",
    ".bmp",
    ".eot",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".ttf",
    ".webp",
    ".woff",
    ".woff2",
}
TEXT_SUFFIXES = {
    ".cjs",
    ".css",
    ".csv",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".rst",
    ".sh",
    ".sql",
    ".svg",
    ".toml",
    ".ts",
    ".tsv",
    ".txt",
    ".webmanifest",
    ".yaml",
    ".yml",
}
CACHE_DIRECTORY_NAMES = {
    ".cache",
    ".eslintcache",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".temp",
    "__pycache__",
    "htmlcov",
}
BUILD_DIRECTORY_NAMES = {"build", "coverage", "dist", "out", "test-results"}
DEPENDENCY_DIRECTORY_NAMES = {"bower_components", "node_modules", "vendor"}
LOCAL_ENVIRONMENT_ROOTS = frozenset({
    ".venv",
    "venv",
    ".virtualenv",
    ".tox",
    ".nox",
})
TEMP_SUFFIXES = {".bak", ".backup", ".orig", ".pyc", ".rej", ".swo", ".swp", ".temp", ".tmp"}
LOG_NAMES = {"npm-debug.log", "pnpm-debug.log", "yarn-error.log"}
PROTECTED_ROOTS = {".agents", ".codex", ".git", "reports", "tools"}
LEGAL_NAMES = {"copying", "license", "license.md", "notice", "notice.md"}
LOCKFILE_NAMES = {"bun.lock", "bun.lockb", "npm-shrinkwrap.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"}
SUSPICIOUS_TOKEN_RE = re.compile(
    r"(?:^|[._ -])(copy(?:[ _-]?\d+)?|final-final|old|backup|temp|duplicate|revised|fixed|conflict)(?:$|[._ -])",
    re.IGNORECASE,
)
WORKSPACE_PATH_RE = re.compile(r"/work" + r"spaces/", re.IGNORECASE)
SUPABASE_HOST_RE = re.compile(r"https://([a-z0-9]{20})\.supabase\.co", re.IGNORECASE)


@dataclass(frozen=True)
class FileEntry:
    relative_path: str
    size: int
    executable: bool


@dataclass(frozen=True)
class WalkResult:
    files: tuple[FileEntry, ...]
    directories: tuple[str, ...]
    symlinks: tuple[str, ...]
    broken_symlinks: tuple[str, ...]
    errors: tuple[dict[str, str], ...]


@dataclass(frozen=True)
class CommandResult:
    args: tuple[str, ...]
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False


@dataclass(frozen=True)
class ExecutionResult:
    accepted: bool
    cleanup_changes: int
    report: dict[str, object]


def relative_posix(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def sha256_file(path: Path, chunk_size: int = HASH_CHUNK_SIZE) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def read_text_file(path: Path) -> str | None:
    """Return UTF-8 text, or None when the file is binary/non-UTF-8."""
    try:
        with path.open("rb") as handle:
            prefix = handle.read(8192)
            if b"\0" in prefix:
                return None
            remainder = handle.read()
        return (prefix + remainder).decode("utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def run_command(
    args: Sequence[str],
    cwd: Path,
    *,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    input_text: str | None = None,
) -> CommandResult:
    """Run a subprocess with captured UTF-8 output and a hard timeout."""
    try:
        completed = subprocess.run(
            list(args),
            cwd=cwd,
            input=input_text,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
        return CommandResult(
            args=tuple(args),
            exit_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )
    except subprocess.TimeoutExpired as error:
        return CommandResult(
            args=tuple(args),
            exit_code=124,
            stdout=(error.stdout or "") if isinstance(error.stdout, str) else "",
            stderr=(error.stderr or "") if isinstance(error.stderr, str) else "",
            timed_out=True,
        )


def walk_repository(root: Path) -> WalkResult:
    """Walk without following symlinks or entering .git."""
    root = root.resolve()
    files: list[FileEntry] = []
    directories: list[str] = []
    symlinks: list[str] = []
    broken_symlinks: list[str] = []
    errors: list[dict[str, str]] = []
    pending = [root]

    while pending:
        directory = pending.pop()
        try:
            children = sorted(directory.iterdir(), key=lambda item: item.name.casefold())
        except OSError as error:
            rel = "." if directory == root else relative_posix(root, directory)
            errors.append({"path": rel, "error": type(error).__name__})
            continue
        for child in children:
            rel = relative_posix(root, child)
            if child.parent == root and child.name == ".git":
                continue
            try:
                if child.is_symlink():
                    symlinks.append(rel)
                    if not child.exists():
                        broken_symlinks.append(rel)
                    continue
                if child.is_dir():
                    directories.append(rel)
                    pending.append(child)
                    continue
                if child.is_file():
                    mode = child.stat(follow_symlinks=False).st_mode
                    files.append(
                        FileEntry(
                            relative_path=rel,
                            size=child.stat(follow_symlinks=False).st_size,
                            executable=bool(mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)),
                        )
                    )
            except OSError as error:
                errors.append({"path": rel, "error": type(error).__name__})

    return WalkResult(
        files=tuple(sorted(files, key=lambda item: item.relative_path)),
        directories=tuple(sorted(directories)),
        symlinks=tuple(sorted(symlinks)),
        broken_symlinks=tuple(sorted(broken_symlinks)),
        errors=tuple(sorted(errors, key=lambda item: item["path"])),
    )


def git_tracked_paths(root: Path) -> set[str]:
    result = run_command(("git", "ls-files", "-z"), root)
    if result.exit_code != 0:
        return set()
    return {item for item in result.stdout.split("\0") if item}


def git_ignored_paths(root: Path, paths: Iterable[str]) -> set[str]:
    candidates = sorted(set(paths))
    if not candidates:
        return set()
    result = run_command(
        ("git", "check-ignore", "--stdin"),
        root,
        input_text="\n".join(candidates) + "\n",
    )
    if result.exit_code not in (0, 1):
        return set()
    return {line for line in result.stdout.splitlines() if line}


def git_status_entries(root: Path) -> list[dict[str, str]]:
    """Return deterministic porcelain status, including untracked/ignored paths."""
    result = run_command(
        ("git", "status", "--short", "--ignored", "-z", "--untracked-files=all"),
        root,
    )
    if result.exit_code != 0:
        return []
    records = result.stdout.split("\0")
    entries: list[dict[str, str]] = []
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if len(record) < 4:
            continue
        status = record[:2]
        entry = {"status": status, "path": record[3:]}
        if status[0] in {"R", "C"} and index < len(records):
            entry["original_path"] = records[index]
            index += 1
        if entry["path"] not in REPORT_PATHS and entry.get("original_path") not in REPORT_PATHS:
            entries.append(entry)
    return sorted(
        entries,
        key=lambda item: (item["path"], item["status"], item.get("original_path", "")),
    )


def is_local_environment_path(relative_path: str) -> bool:
    parts = PurePosixPath(relative_path).parts
    return bool(parts and parts[0].casefold() in LOCAL_ENVIRONMENT_ROOTS)


def is_protected_path(relative_path: str) -> bool:
    path = PurePosixPath(relative_path)
    if not path.parts:
        return True
    if is_local_environment_path(relative_path):
        return False
    lower_parts = {part.casefold() for part in path.parts}
    generated_directory_names = {
        *(item.casefold() for item in CACHE_DIRECTORY_NAMES),
        *(item.casefold() for item in BUILD_DIRECTORY_NAMES),
        *(item.casefold() for item in DEPENDENCY_DIRECTORY_NAMES),
    }
    if lower_parts & generated_directory_names or path.suffix.casefold() == ".pyc":
        return False
    if path.parts[0] in PROTECTED_ROOTS:
        return True
    if path.name in LOCKFILE_NAMES or path.name.casefold() in LEGAL_NAMES:
        return True
    if path.parts[:2] == ("supabase", "migrations"):
        return True
    if path.parts[0] == "tests":
        return True
    if path.name.startswith(".env") and ("example" in path.name or "sample" in path.name):
        return True
    return False


def is_historical_review_transcript(relative_path: str) -> bool:
    path = PurePosixPath(relative_path)
    return (
        path.suffix.casefold() == ".md"
        and path.name.startswith("CODEX_REVIEW_ROUND")
        and "launch" in path.parts
    )


def garbage_reason(relative_path: str, *, tracked: bool, ignored: bool, is_dir: bool = False) -> str | None:
    path = PurePosixPath(relative_path)
    name = path.name
    lower_name = name.casefold()
    parts = {part.casefold() for part in path.parts}
    if is_local_environment_path(relative_path):
        return "dependency output"
    if is_protected_path(relative_path):
        return None
    if path.parts and path.parts[0] in {"approved", "backups"}:
        return "obsolete source snapshot archive"
    if path.parts[:1] == (".firebase",) and lower_name.startswith("hosting.") and lower_name.endswith(".cache"):
        return "generated Firebase hosting cache"
    if parts & {item.casefold() for item in CACHE_DIRECTORY_NAMES}:
        return "cache"
    if parts & {item.casefold() for item in DEPENDENCY_DIRECTORY_NAMES}:
        return "dependency output"
    if parts & {item.casefold() for item in BUILD_DIRECTORY_NAMES} and (ignored or not tracked):
        return "generated build/test output"
    if lower_name in {".coverage", ".ds_store", "thumbs.db"}:
        return "generated local artifact"
    if lower_name.endswith("~") or Path(lower_name).suffix in TEMP_SUFFIXES:
        return "temporary or backup file"
    if lower_name in LOG_NAMES or lower_name.startswith(("npm-debug.log", "pnpm-debug.log", "yarn-error.log")):
        return "debug log"
    if lower_name.endswith(".log") and not tracked:
        return "untracked log"
    return None


def classify_path(
    relative_path: str,
    *,
    tracked: bool,
    ignored: bool,
    executable: bool = False,
    empty: bool = False,
    is_dir: bool = False,
    duplicate: bool = False,
) -> tuple[str, ...]:
    path = PurePosixPath(relative_path)
    suffix = path.suffix.casefold()
    categories: set[str] = set()

    if tracked:
        if (
            relative_path in {str(REPORT_JSON), str(REPORT_MARKDOWN)}
            or relative_path == ".firebase/hosting..cache"
            or is_historical_review_transcript(relative_path)
        ):
            categories.add("tracked generated artifact")
        elif path.parts and path.parts[0] in {"docs", "approved", "backups"} or suffix in DOCUMENTATION_SUFFIXES:
            categories.add("tracked documentation")
        elif path.name in CONFIG_NAMES or suffix in CONFIG_SUFFIXES or (path.parts and path.parts[0] in {".github", ".vscode"}):
            categories.add("tracked configuration")
        else:
            categories.add("tracked source")
    elif ignored:
        categories.add("ignored generated artifact")
    else:
        categories.add("untracked file")

    lower_parts = {part.casefold() for part in path.parts}
    reason = garbage_reason(relative_path, tracked=tracked, ignored=ignored, is_dir=is_dir)
    if reason == "cache":
        categories.add("cache")
    if reason == "dependency output":
        categories.add("dependency output")
    if reason == "generated build/test output":
        categories.add("build output")
    if reason and "log" in reason:
        categories.add("log")
    if reason and ("temporary" in reason or "local artifact" in reason):
        categories.add("temporary file")
    if path.parts and path.parts[0] in {"approved", "backups"} or SUSPICIOUS_TOKEN_RE.search(path.name):
        categories.add("backup/copy")
    if duplicate:
        categories.add("exact duplicate")
    if SUSPICIOUS_TOKEN_RE.search(path.name):
        categories.add("suspicious near-duplicate filename")
    if empty and not is_dir:
        categories.add("empty file")
    if executable or suffix in {".sh", ".py"}:
        categories.add("executable script")
    if path.name == ".env" or path.name.startswith(".env."):
        categories.add("environment file")
    if (
        "security" in lower_parts
        or "auth" in path.name.casefold()
        or path.name.startswith(".env")
        or "functions" in lower_parts
    ):
        categories.add("secret-sensitive file")
    if (path.parts[:2] == ("supabase", "migrations") and suffix == ".sql") or re.match(r"^\d{8,14}_.*\.sql$", path.name):
        categories.add("migration")
    if suffix in ASSET_SUFFIXES:
        categories.add("asset")
    if "tests" in lower_parts and ("fixture" in path.name.casefold() or suffix in {".json", ".sql", ".mjs"}):
        categories.add("test fixture")
    return tuple(sorted(categories))


def _text_scan_worker(root: Path, relative_path: str) -> tuple[str, str | None]:
    return relative_path, read_text_file(root / relative_path)


def load_text_files(root: Path, relative_paths: Iterable[str]) -> dict[str, str]:
    candidates = sorted(
        path for path in set(relative_paths)
        if Path(path).suffix.casefold() in TEXT_SUFFIXES or Path(path).name in CONFIG_NAMES
    )
    texts: dict[str, str] = {}
    workers = min(32, max(1, (os.cpu_count() or 2) * 4))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        for relative_path, content in executor.map(lambda item: _text_scan_worker(root, item), candidates):
            if content is not None:
                texts[relative_path] = content
    return dict(sorted(texts.items()))


def scan_forbidden_references(root: Path, relative_paths: Iterable[str]) -> list[dict[str, object]]:
    texts = load_text_files(root, relative_paths)
    findings: list[dict[str, object]] = []
    rules = tuple((label, value.casefold()) for label, value in FORBIDDEN_RULES)
    for relative_path, text in texts.items():
        for line_number, line in enumerate(text.splitlines(), start=1):
            folded = line.casefold()
            matched_labels = [label for label, value in rules if value in folded]
            if matched_labels:
                for label in matched_labels:
                    findings.append({"path": relative_path, "line": line_number, "rule": label})
                continue
            if WORKSPACE_PATH_RE.search(line):
                findings.append({"path": relative_path, "line": line_number, "rule": "absolute_workspace_path"})
    return sorted(findings, key=lambda item: (str(item["path"]), int(item["line"]), str(item["rule"])))


def scan_supabase_references(texts: dict[str, str]) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for relative_path, text in texts.items():
        for line_number, line in enumerate(text.splitlines(), start=1):
            for match in SUPABASE_HOST_RE.finditer(line):
                project_ref = match.group(1).casefold()
                if project_ref != PRODUCTION_SUPABASE_REF:
                    findings.append({"path": relative_path, "line": line_number, "rule": "stale_supabase_project_ref"})
    return sorted(findings, key=lambda item: (str(item["path"]), int(item["line"])))


SECRET_PATTERNS = (
    ("private_key", re.compile(r"-----BEGIN(?: RSA| EC| OPENSSH)? PRIVATE KEY-----")),
    ("supabase_access_token", re.compile(r"sbp_[A-Za-z0-9_-]{20,}")),
    ("provider_secret_key", re.compile(r"sk_live_[A-Za-z0-9]{20,}")),
    ("github_pat", re.compile(r"ghp_[A-Za-z0-9]{36}")),
    ("aws_secret", re.compile(r"AWS_SECRET_ACCESS_KEY\s*[:=]\s*[\"'][A-Za-z0-9/+=]{40}[\"']")),
    ("credential_url", re.compile(r"postgres(?:ql)?://[^\s/:@]+:[^\s@]+@[^\s]+", re.IGNORECASE)),
    ("jwt_like_token", re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}")),
)


def scan_secrets(texts: dict[str, str]) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for relative_path, text in texts.items():
        lower = relative_path.casefold()
        if "secret-scan" in lower or relative_path in {str(TOOL_PATH), "tests/test_vvip_cleanroom.py"}:
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            for label, pattern in SECRET_PATTERNS:
                if pattern.search(line):
                    findings.append({"path": relative_path, "line": line_number, "rule": label, "value": "[REDACTED]"})
    return sorted(findings, key=lambda item: (str(item["path"]), int(item["line"]), str(item["rule"])))


HTML_REFERENCE_RE = re.compile(r"\b(?:src|href)\s*=\s*[\"']([^\"']+)[\"']", re.IGNORECASE)
CSS_REFERENCE_RE = re.compile(r"url\(\s*[\"']?([^\"')]+)", re.IGNORECASE)
JS_IMPORT_RE = re.compile(
    r"^\s*(?:import|export)\s+(?:[^\"'\n]+?\s+from\s+)?[\"']([^\"']+)[\"']",
    re.MULTILINE,
)
MARKDOWN_REFERENCE_RE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
SHELL_TARGET_RE = re.compile(r"(?:^|\s)(?:python3?|node|bash|source|\.)\s+([A-Za-z0-9_./-]+\.(?:py|js|mjs|cjs|sh))")
MANIFEST_SRC_RE = re.compile(r"[\"']src[\"']\s*:\s*[\"']([^\"']+)[\"']")


def _extract_references(relative_path: str, text: str) -> list[tuple[str, str]]:
    suffix = Path(relative_path).suffix.casefold()
    references: list[tuple[str, str]] = []
    if suffix == ".html":
        references.extend(("relative", match) for match in HTML_REFERENCE_RE.findall(text))
    if suffix == ".css":
        references.extend(("relative", match) for match in CSS_REFERENCE_RE.findall(text))
    if suffix in {".js", ".mjs", ".cjs", ".ts"}:
        references.extend(("relative", match) for match in JS_IMPORT_RE.findall(text))
    if suffix in DOCUMENTATION_SUFFIXES and not is_historical_review_transcript(relative_path):
        references.extend(("relative", match.split(maxsplit=1)[0]) for match in MARKDOWN_REFERENCE_RE.findall(text))
    if suffix in {".sh", ".yaml", ".yml"}:
        references.extend(("root", match) for match in SHELL_TARGET_RE.findall(text))
    if suffix in {".json", ".webmanifest"}:
        references.extend(("relative", match) for match in MANIFEST_SRC_RE.findall(text))
    if Path(relative_path).name == "sw.js":
        for match in re.findall(r"[\"']((?:\.?\.?/|/)[^\"']+\.[A-Za-z0-9]+)[\"']", text):
            references.append(("relative", match))
    return references


def _case_correct_path(root: Path, target: Path) -> Path | None:
    try:
        relative_parts = target.relative_to(root).parts
    except ValueError:
        return None
    current = root
    for part in relative_parts:
        if not current.is_dir():
            return None
        try:
            matches = [child for child in current.iterdir() if child.name.casefold() == part.casefold()]
        except OSError:
            return None
        if not matches:
            return None
        exact = next((child for child in matches if child.name == part), matches[0])
        current = exact
    return current


def _normalize_reference(root: Path, source: str, raw_target: str, base_kind: str) -> tuple[str, Path] | None:
    raw = unquote(raw_target.strip().strip("<>"))
    if not raw or raw.startswith(("#", "//")):
        return None
    scheme = raw.split(":", 1)[0].casefold() if ":" in raw else ""
    if scheme in {"data", "http", "https", "javascript", "mailto", "tel"}:
        return None
    if any(token in raw for token in ("${", "{{", "*", "?")):
        return None
    raw = raw.split("#", 1)[0].split("?", 1)[0]
    if not raw:
        return None
    if raw.startswith("/"):
        candidate = root / raw.lstrip("/")
    elif base_kind == "root":
        candidate = root / raw
    else:
        candidate = root / Path(source).parent / raw
    normalized = Path(os.path.normpath(candidate))
    try:
        normalized.relative_to(root)
    except ValueError:
        return raw, normalized
    if not Path(raw).suffix and not raw.endswith("/"):
        return None
    return raw, normalized


def _python_import_findings(root: Path, relative_path: str, text: str) -> list[dict[str, object]]:
    if Path(relative_path).suffix.casefold() != ".py":
        return []
    try:
        tree = ast.parse(text, filename=relative_path)
    except SyntaxError:
        return [{"source": relative_path, "line": 0, "target": relative_path, "kind": "python_syntax_error"}]
    findings: list[dict[str, object]] = []
    source_dir = (root / relative_path).parent
    for node in ast.walk(tree):
        module: str | None = None
        level = 0
        if isinstance(node, ast.ImportFrom):
            module = node.module
            level = node.level
        elif isinstance(node, ast.Import) and node.names:
            module = node.names[0].name
        if not module and not level:
            continue
        module_parts = module.split(".") if module else []
        if level:
            base = source_dir
            for _ in range(max(0, level - 1)):
                base = base.parent
        else:
            base = root
            if module_parts and not ((root / module_parts[0]).exists() or (root / f"{module_parts[0]}.py").exists()):
                continue
        target = base.joinpath(*module_parts)
        if not (target.with_suffix(".py").exists() or (target / "__init__.py").exists() or target.is_dir()):
            findings.append(
                {
                    "source": relative_path,
                    "line": getattr(node, "lineno", 0),
                    "target": ".".join(module_parts),
                    "kind": "missing_python_import",
                }
            )
    return findings


def scan_local_references(root: Path, relative_paths: Iterable[str]) -> list[dict[str, object]]:
    root = root.resolve()
    texts = load_text_files(root, relative_paths)
    findings: list[dict[str, object]] = []
    for source, text in texts.items():
        findings.extend(_python_import_findings(root, source, text))
        for base_kind, raw_target in _extract_references(source, text):
            normalized = _normalize_reference(root, source, raw_target, base_kind)
            if normalized is None:
                continue
            display_target, candidate = normalized
            try:
                candidate.relative_to(root)
            except ValueError:
                findings.append({"source": source, "line": 0, "target": display_target, "kind": "outside_repository"})
                continue
            if candidate.exists():
                continue
            corrected = _case_correct_path(root, candidate)
            kind = "case_mismatch" if corrected and corrected.exists() else "missing"
            findings.append({"source": source, "line": 0, "target": display_target, "kind": kind})
    unique = {
        (str(item["source"]), int(item["line"]), str(item["target"]), str(item["kind"])): item
        for item in findings
    }
    return [unique[key] for key in sorted(unique)]


def active_runtime_reference_targets(root: Path, relative_paths: Iterable[str]) -> set[str]:
    """Return local targets referenced by active runtime/configuration files."""
    active_paths = [
        path
        for path in relative_paths
        if not path.startswith(("approved/", "backups/", "docs/", "tests/"))
        and Path(path).suffix.casefold() in {".cjs", ".css", ".html", ".js", ".json", ".mjs", ".sh", ".ts", ".webmanifest", ".yaml", ".yml"}
    ]
    texts = load_text_files(root, active_paths)
    targets: set[str] = set()
    for source, text in texts.items():
        for base_kind, raw_target in _extract_references(source, text):
            normalized = _normalize_reference(root, source, raw_target, base_kind)
            if normalized is None:
                continue
            _, candidate = normalized
            try:
                targets.add(candidate.relative_to(root).as_posix())
            except ValueError:
                continue
    return targets


def duplicate_disposition(paths: Sequence[str]) -> tuple[str, str]:
    sorted_paths = sorted(paths)
    path_set = set(sorted_paths)
    parts = [PurePosixPath(path).parts for path in sorted_paths]
    suffixes = {PurePosixPath(path).suffix.casefold() for path in sorted_paths}
    if path_set == {"clerk-private-profile.html", "private-profile.html"}:
        return "intentional", "route compatibility aliases"
    if (
        len(sorted_paths) == 2
        and any(path.startswith("docs/") for path in sorted_paths)
        and any(path.startswith("project-control/docs/") for path in sorted_paths)
    ):
        return "intentional", "project-control package mirror"
    if (
        len(sorted_paths) == 2
        and any(path.startswith("project-control/database/") for path in sorted_paths)
        and any(path.startswith("supabase/migrations/") for path in sorted_paths)
    ):
        return "intentional", "source package and deployable migration"
    if path_set == {
        "docs/launch/pr35/CHANGED_FILES.allowlist",
        "docs/launch/pr35/CHANGED_FILES.final",
    }:
        return "intentional", "change-control verification pair"
    if all("tests" in path_parts for path_parts in parts):
        return "intentional", "test fixture duplication"
    if bool(suffixes) and suffixes <= ASSET_SUFFIXES:
        return "intentional", "static asset duplication"
    if all(path_parts[:2] == ("supabase", "migrations") for path_parts in parts):
        return "intentional", "preserved migration history"
    return "unexplained", "requires canonical-file proof"


def find_exact_duplicates(root: Path, files: Sequence[FileEntry]) -> list[dict[str, object]]:
    size_groups: dict[int, list[FileEntry]] = defaultdict(list)
    for entry in files:
        if (
            entry.size > 0
            and entry.relative_path not in {str(REPORT_JSON), str(REPORT_MARKDOWN)}
            and not is_local_environment_path(entry.relative_path)
        ):
            size_groups[entry.size].append(entry)
    candidates = [entry for entries in size_groups.values() if len(entries) > 1 for entry in entries]
    hashes: dict[str, str] = {}
    workers = min(32, max(1, (os.cpu_count() or 2) * 4))

    def hash_entry(entry: FileEntry) -> tuple[str, str]:
        return entry.relative_path, sha256_file(root / entry.relative_path)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        for relative_path, digest in executor.map(hash_entry, candidates):
            hashes[relative_path] = digest

    groups: dict[tuple[int, str], list[str]] = defaultdict(list)
    for entry in candidates:
        groups[(entry.size, hashes[entry.relative_path])].append(entry.relative_path)

    duplicates: list[dict[str, object]] = []
    for (size, digest), paths in sorted(groups.items()):
        if len(paths) < 2:
            continue
        sorted_paths = sorted(paths)
        disposition, reason = duplicate_disposition(sorted_paths)
        duplicates.append(
            {
                "sha256": digest,
                "size": size,
                "paths": sorted_paths,
                "disposition": disposition,
                "reason": reason,
            }
        )
    return duplicates


def suspicious_names(paths: Iterable[str]) -> list[str]:
    return sorted(path for path in set(paths) if SUSPICIOUS_TOKEN_RE.search(PurePosixPath(path).name))


def package_manager_state(root: Path) -> dict[str, object]:
    present_locks = sorted(name for name in LOCKFILE_NAMES if (root / name).exists())
    manifest = root / "package.json"
    errors: list[str] = []
    package_manager = "none"
    if manifest.exists():
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            data = None
            errors.append("invalid_package_json")
        declared = data.get("packageManager") if isinstance(data, dict) else None
        if isinstance(declared, str) and declared:
            package_manager = declared.split("@", 1)[0]
        elif len(present_locks) == 1:
            package_manager = {
                "package-lock.json": "npm",
                "npm-shrinkwrap.json": "npm",
                "pnpm-lock.yaml": "pnpm",
                "yarn.lock": "yarn",
                "bun.lock": "bun",
                "bun.lockb": "bun",
            }[present_locks[0]]
        else:
            package_manager = "npm" if not present_locks else "ambiguous"
    elif present_locks:
        errors.append("lockfile_without_package_manifest")
    if len(present_locks) > 1:
        errors.append("conflicting_lockfiles")
    return {"authoritative": package_manager, "lockfiles": present_locks, "errors": sorted(set(errors))}


def migration_state(root: Path) -> dict[str, object]:
    migration_root = root / "supabase" / "migrations"
    if not migration_root.is_dir():
        return {"files": [], "duplicate_versions": [], "invalid_names": []}
    files = sorted(path.name for path in migration_root.iterdir() if path.is_file())
    versions: list[str] = []
    invalid: list[str] = []
    for name in files:
        match = re.match(r"^([0-9]{8,14})_[a-z0-9_]+\.sql$", name)
        if match:
            versions.append(match.group(1))
        else:
            invalid.append(name)
    counts = Counter(versions)
    return {
        "files": files,
        "duplicate_versions": sorted(version for version, count in counts.items() if count > 1),
        "invalid_names": sorted(invalid),
    }


def supabase_config_findings(root: Path) -> list[dict[str, object]]:
    config_path = root / "supabase" / "config.toml"
    if not config_path.is_file():
        return []
    try:
        data = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError):
        return [{"path": "supabase/config.toml", "line": 0, "rule": "invalid_supabase_config"}]
    findings: list[dict[str, object]] = []
    if data.get("project_id") != PRODUCTION_SUPABASE_REF:
        findings.append({"path": "supabase/config.toml", "line": 0, "rule": "stale_supabase_config_project"})
    seed = data.get("db", {}).get("seed", {}) if isinstance(data.get("db"), dict) else {}
    if isinstance(seed, dict) and seed.get("enabled") is True:
        sql_paths = seed.get("sql_paths", [])
        if isinstance(sql_paths, list):
            for configured in sql_paths:
                if not isinstance(configured, str) or not configured:
                    continue
                matches = list(config_path.parent.glob(configured))
                if not matches:
                    findings.append(
                        {
                            "path": "supabase/config.toml",
                            "line": 0,
                            "rule": "missing_supabase_config_path",
                        }
                    )
    return sorted(findings, key=lambda item: (str(item["rule"]), str(item["path"])))


def _git_scope(root: Path) -> dict[str, object]:
    top = run_command(("git", "rev-parse", "--show-toplevel"), root)
    branch = run_command(("git", "branch", "--show-current"), root)
    remote = run_command(("git", "remote", "-v"), root)
    ancestor_checks = {
        commit: run_command(("git", "merge-base", "--is-ancestor", commit, "HEAD"), root).exit_code == 0
        for commit in REQUIRED_ANCESTORS
    }
    top_matches = False
    if top.exit_code == 0:
        try:
            top_matches = Path(top.stdout.strip()).resolve() == root.resolve()
        except OSError:
            top_matches = False
    return {
        "repository_root": top_matches and root.name == EXPECTED_ROOT_NAME,
        "branch": branch.exit_code == 0 and branch.stdout.strip() == EXPECTED_BRANCH,
        "remote": remote.exit_code == 0 and EXPECTED_REMOTE_FRAGMENT in remote.stdout,
        "required_ancestors": ancestor_checks,
    }


def _gate(status: str, count: int = 0, details: object | None = None) -> dict[str, object]:
    gate: dict[str, object] = {"status": status, "count": count}
    if details not in (None, [], {}):
        gate["details"] = details
    return gate


def _scope_passes(scope: dict[str, object]) -> bool:
    return bool(
        scope.get("repository_root")
        and scope.get("branch")
        and scope.get("remote")
        and all(bool(value) for value in dict(scope.get("required_ancestors", {})).values())
    )


def _diff_paths(root: Path) -> list[dict[str, str]]:
    result = run_command(("git", "diff", "--name-status", "HEAD"), root)
    if result.exit_code != 0:
        return []
    changes: list[dict[str, str]] = []
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if len(fields) >= 2 and fields[-1] not in REPORT_PATHS:
            changes.append({"status": fields[0], "path": fields[-1]})
    return sorted(changes, key=lambda item: (item["path"], item["status"]))


def build_report(root: Path, *, enforce_scope: bool) -> dict[str, object]:
    root = root.resolve()
    walk = walk_repository(root)
    all_paths = [entry.relative_path for entry in walk.files] + list(walk.directories) + list(walk.symlinks)
    tracked = git_tracked_paths(root)
    ignored = git_ignored_paths(root, all_paths)
    status_entries = git_status_entries(root)
    existing_tracked = sorted(path for path in tracked if (root / path).is_file() and not (root / path).is_symlink())
    texts = load_text_files(root, existing_tracked)
    forbidden = scan_forbidden_references(root, existing_tracked)
    forbidden_named = [item for item in forbidden if item["rule"] != "absolute_workspace_path"]
    workspace_paths = [item for item in forbidden if item["rule"] == "absolute_workspace_path"]
    stale_supabase = sorted(
        scan_supabase_references(texts) + supabase_config_findings(root),
        key=lambda item: (str(item["rule"]), str(item["path"]), int(item["line"])),
    )
    secrets = scan_secrets(texts)
    references = scan_local_references(root, existing_tracked)
    duplicates = find_exact_duplicates(root, walk.files)
    duplicate_paths = {path for group in duplicates for path in group["paths"]}
    unexplained_duplicates = [
        group for group in duplicates
        if group["disposition"] == "unexplained" and sum(path in tracked for path in group["paths"]) > 1
    ]
    suspicious = suspicious_names(all_paths)
    package = package_manager_state(root)
    migrations = migration_state(root)
    tracked_garbage = []
    for entry in walk.files:
        if entry.relative_path not in tracked:
            continue
        reason = garbage_reason(entry.relative_path, tracked=True, ignored=entry.relative_path in ignored)
        if reason:
            tracked_garbage.append({"path": entry.relative_path, "reason": reason})
    diff_check = run_command(("git", "diff", "--check"), root)
    scope = _git_scope(root) if enforce_scope else {
        "repository_root": True,
        "branch": True,
        "remote": True,
        "required_ancestors": {},
    }

    directory_inventory: list[dict[str, object]] = []
    for relative_path in walk.directories:
        prefix = relative_path.rstrip("/") + "/"
        directory_tracked = any(path.startswith(prefix) for path in tracked)
        directory_ignored = relative_path in ignored or any(path.startswith(prefix) for path in ignored)
        directory_inventory.append(
            {
                "path": relative_path,
                "type": "directory",
                "classifications": list(
                    classify_path(relative_path, tracked=directory_tracked, ignored=directory_ignored, is_dir=True)
                ),
            }
        )
    file_inventory: list[dict[str, object]] = []
    for entry in walk.files:
        is_report = entry.relative_path in {str(REPORT_JSON), str(REPORT_MARKDOWN)}
        file_inventory.append(
            {
                "path": entry.relative_path,
                "type": "file",
                "classifications": list(
                    classify_path(
                        entry.relative_path,
                        tracked=entry.relative_path in tracked,
                        ignored=entry.relative_path in ignored,
                        executable=entry.executable,
                        empty=entry.size == 0 and not is_report,
                        duplicate=entry.relative_path in duplicate_paths,
                    )
                ),
            }
        )
    symlink_inventory: list[dict[str, object]] = []
    for relative_path in walk.symlinks:
        classifications = ["broken symlink"] if relative_path in walk.broken_symlinks else []
        classifications.extend(
            classify_path(
                relative_path,
                tracked=relative_path in tracked,
                ignored=relative_path in ignored,
            )
        )
        symlink_inventory.append(
            {"path": relative_path, "type": "symlink", "classifications": sorted(set(classifications))}
        )

    gates = {
        "scope": _gate("pass" if _scope_passes(scope) else "fail", 0 if _scope_passes(scope) else 1, scope),
        "walk_errors": _gate("pass" if not walk.errors else "fail", len(walk.errors), list(walk.errors)),
        "broken_symlinks": _gate("pass" if not walk.broken_symlinks else "fail", len(walk.broken_symlinks), list(walk.broken_symlinks)),
        "local_reference_integrity": _gate("pass" if not references else "fail", len(references), references),
        "forbidden_legacy_identifiers": _gate("pass" if not forbidden_named else "fail", len(forbidden_named), forbidden_named),
        "portable_workspace_paths": _gate("pass" if not workspace_paths else "fail", len(workspace_paths), workspace_paths),
        "tracked_garbage": _gate("pass" if not tracked_garbage else "fail", len(tracked_garbage), tracked_garbage),
        "package_manager_consistency": _gate("pass" if not package["errors"] else "fail", len(package["errors"]), package),
        "tracked_duplicate_explanations": _gate("pass" if not unexplained_duplicates else "fail", len(unexplained_duplicates), unexplained_duplicates),
        "unique_migration_versions": _gate(
            "pass" if not migrations["duplicate_versions"] and not migrations["invalid_names"] else "fail",
            len(migrations["duplicate_versions"]) + len(migrations["invalid_names"]),
            {"duplicate_versions": migrations["duplicate_versions"], "invalid_names": migrations["invalid_names"]},
        ),
        "production_supabase_references": _gate("pass" if not stale_supabase else "fail", len(stale_supabase), stale_supabase),
        "secret_scan": _gate("pass" if not secrets else "fail", len(secrets), secrets),
        "git_diff_check": _gate("pass" if diff_check.exit_code == 0 else "fail", 0 if diff_check.exit_code == 0 else 1),
    }
    accepted = all(gate["status"] == "pass" for gate in gates.values())
    inventory = sorted(directory_inventory + file_inventory + symlink_inventory, key=lambda item: (str(item["path"]), str(item["type"])))
    classification_counts = Counter(
        category for item in inventory for category in item["classifications"]
    )
    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "repository": ".",
        "accepted": accepted,
        "summary": {
            "files": len(walk.files),
            "directories": len(walk.directories),
            "symlinks": len(walk.symlinks),
            "tracked_paths": len(tracked),
            "ignored_paths": len(ignored),
            "classification_counts": dict(sorted(classification_counts.items())),
        },
        "scope": scope,
        "package_manager": package,
        "migrations": migrations,
        "exact_duplicates": duplicates,
        "suspicious_names": suspicious,
        "working_tree_changes": _diff_paths(root),
        "git_status": status_entries,
        "gates": dict(sorted(gates.items())),
        "inventory": inventory,
    }


def render_markdown(report: dict[str, object]) -> str:
    summary = dict(report["summary"])
    gates = dict(report["gates"])
    lines = [
        "# VVIP TIGER Clean-room Report",
        "",
        f"Overall result: **{'PASS' if report['accepted'] else 'FAIL'}**",
        "",
        "## Inventory summary",
        "",
        f"- Files: {summary['files']}",
        f"- Directories: {summary['directories']}",
        f"- Symlinks: {summary['symlinks']}",
        f"- Git-tracked paths: {summary['tracked_paths']}",
        f"- Git-ignored paths observed: {summary['ignored_paths']}",
        "",
        "## Acceptance gates",
        "",
        "| Gate | Result | Findings |",
        "| --- | --- | ---: |",
    ]
    for name, gate_object in sorted(gates.items()):
        gate = dict(gate_object)
        lines.append(f"| `{name}` | {str(gate['status']).upper()} | {gate['count']} |")
    lines.extend(["", "## Package manager", ""])
    package = dict(report["package_manager"])
    lines.append(f"Authoritative package manager: **{package['authoritative']}**.")
    lines.extend(["", "## Exact duplicate analysis", ""])
    duplicates = list(report["exact_duplicates"])
    if not duplicates:
        lines.append("No exact duplicate groups were found.")
    else:
        for group_object in duplicates:
            group = dict(group_object)
            paths = ", ".join(f"`{path}`" for path in group["paths"])
            lines.append(f"- {group['disposition']}: {paths} — {group['reason']}")
    lines.extend(
        [
            "",
            "The complete deterministic path inventory and redacted finding details are in the JSON report.",
            "",
        ]
    )
    return "\n".join(lines)


def write_if_changed(path: Path, content: str) -> bool:
    encoded = content.encode("utf-8")
    try:
        if path.read_bytes() == encoded:
            return False
    except FileNotFoundError:
        pass
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return True


def resolve_report_paths(root: Path, report_dir: Path | None) -> tuple[Path, Path]:
    directory = (root / "reports") if report_dir is None else report_dir.resolve()
    return directory / REPORT_JSON_NAME, directory / REPORT_MARKDOWN_NAME


def _remove_path(root: Path, relative_path: str, *, tracked: bool) -> bool:
    target = root / relative_path
    if tracked:
        result = run_command(("git", "rm", "-r", "--", relative_path), root)
        if result.exit_code != 0:
            raise RuntimeError(f"git rm failed for {relative_path}: exit {result.exit_code}")
        return True
    if target.is_symlink() or target.is_file():
        target.unlink(missing_ok=True)
        return True
    if target.is_dir():
        shutil.rmtree(target)
        return True
    return False


def apply_cleanup(root: Path) -> int:
    walk = walk_repository(root)
    all_paths = [entry.relative_path for entry in walk.files] + list(walk.directories) + list(walk.symlinks)
    tracked = git_tracked_paths(root)
    ignored = git_ignored_paths(root, all_paths)
    active_targets = active_runtime_reference_targets(root, tracked)
    candidates: dict[str, str] = {}
    for broken in walk.broken_symlinks:
        if not is_protected_path(broken):
            candidates[broken] = "broken symlink"
    for entry in walk.files:
        reason = garbage_reason(
            entry.relative_path,
            tracked=entry.relative_path in tracked,
            ignored=entry.relative_path in ignored,
        )
        if reason:
            prefix = entry.relative_path.rstrip("/") + "/"
            if entry.relative_path.startswith(("approved/", "backups/")) and any(
                target == entry.relative_path or target.startswith(prefix) for target in active_targets
            ):
                continue
            candidates[entry.relative_path] = reason
    for relative_path in walk.directories:
        reason = garbage_reason(
            relative_path,
            tracked=any(path.startswith(relative_path.rstrip("/") + "/") for path in tracked),
            ignored=relative_path in ignored,
            is_dir=True,
        )
        if reason:
            prefix = relative_path.rstrip("/") + "/"
            if relative_path.split("/", 1)[0] in {"approved", "backups"} and any(
                target == relative_path or target.startswith(prefix) for target in active_targets
            ):
                continue
            candidates[relative_path] = reason

    # Prefer removing a candidate directory once rather than each child.
    selected: list[str] = []
    for relative_path in sorted(candidates, key=lambda item: (item.count("/"), item)):
        if any(relative_path == parent or relative_path.startswith(parent.rstrip("/") + "/") for parent in selected):
            continue
        selected.append(relative_path)

    changes = 0
    for relative_path in selected:
        if _remove_path(root, relative_path, tracked=relative_path in tracked or any(path.startswith(relative_path + "/") for path in tracked)):
            changes += 1

    # Remove now-empty untracked directories, deepest first, while preserving
    # tool/report roots and platform-owned metadata directories.
    refreshed = walk_repository(root)
    refreshed_tracked = git_tracked_paths(root)
    for relative_path in sorted(refreshed.directories, key=lambda item: (-item.count("/"), item)):
        if is_protected_path(relative_path):
            continue
        prefix = relative_path.rstrip("/") + "/"
        if any(path.startswith(prefix) for path in refreshed_tracked):
            continue
        directory = root / relative_path
        try:
            directory.rmdir()
            changes += 1
        except OSError:
            pass
    return changes


def execute(
    root: Path,
    mode: str,
    *,
    enforce_scope: bool = True,
    report_dir: Path | None = None,
) -> ExecutionResult:
    if mode not in {"audit", "apply", "verify"}:
        raise ValueError(f"unsupported mode: {mode}")
    root = root.resolve()
    json_path, markdown_path = resolve_report_paths(root, report_dir)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    cleanup_changes = apply_cleanup(root) if mode == "apply" else 0
    report = build_report(root, enforce_scope=enforce_scope)
    json_content = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    markdown_content = render_markdown(report)
    write_if_changed(json_path, json_content)
    write_if_changed(markdown_path, markdown_content)
    return ExecutionResult(accepted=bool(report["accepted"]), cleanup_changes=cleanup_changes, report=report)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--audit", action="store_true", help="scan and report without cleanup")
    modes.add_argument("--apply", action="store_true", help="remove high-confidence generated garbage, then report")
    modes.add_argument("--verify", action="store_true", help="verify every cleanroom acceptance gate")
    parser.add_argument(
        "--report-dir",
        type=Path,
        default=None,
        help="write volatile cleanroom evidence to this directory",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    mode = "audit" if args.audit else "apply" if args.apply else "verify"
    root = Path(__file__).resolve().parents[1]
    try:
        result = execute(root, mode, report_dir=args.report_dir)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"cleanroom error: {type(error).__name__}", file=sys.stderr)
        return 2
    json_path, markdown_path = resolve_report_paths(root, args.report_dir)
    print(f"cleanroom result: {'PASS' if result.accepted else 'FAIL'}")
    print(f"cleanup changes: {result.cleanup_changes}")
    print(f"json report: {json_path}")
    print(f"markdown report: {markdown_path}")
    return 0 if result.accepted else 1


if __name__ == "__main__":
    raise SystemExit(main())
