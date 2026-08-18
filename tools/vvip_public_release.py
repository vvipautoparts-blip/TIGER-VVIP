#!/usr/bin/env python3
"""Build the exact, auditable public artifact for TIGER VVIP.

The builder copies only explicitly approved files. No directory or prefix is
implicitly public. Runtime configuration is generated at build time and
production fails closed when configuration or artifact markers are unsafe.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path, PurePosixPath
from typing import Iterable

PUBLIC_ROOT_FILES = (
    "index.html",
    "privacy-policy.html",
    "terms-of-service.html",
    "data-deletion.html",
    "manifest.webmanifest",
    "auth-clerk-index.js",
    "sw-vvip-static.js",
    "vvip-identity.css",
    "enhanced-components.css",
    "styles.css",
)

PUBLIC_STYLE_FILES = (
    "styles/vvip-pr29-home-marketplace.css",
    "styles/vvip-pr36-media.css",
    "styles/vvip-visual-trust-layer.css",
    "styles/fusion/f02-single-surface.css",
    "styles/fusion/progressive-composer.css",
    "styles/tiger-one/tokens.css",
    "styles/tiger-one/type.css",
    "styles/tiger-social/core-shell.css",
)

PUBLIC_ICON_FILES = (
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-192.svg",
    "icons/icon-512.svg",
)

PUBLIC_RUNTIME_FILES = (
    "scripts/runtime/vvip-runtime-loader.js",
    "scripts/runtime/vvip-marketplace-repository.js",
    "scripts/runtime/vvip-static-delivery.js",
)

PUBLIC_SCRIPT_FILES = (
    "scripts/vvip-pr30-resilience.js",
    "scripts/vvip-safe-ux-guard.js",
    "scripts/fusion/runtime-adapters.js",
    "scripts/fusion/marketplace-context.js",
    "scripts/fusion/f02-feed.js",
    "scripts/fusion/f03-capability-menu.js",
    "scripts/fusion/f04-search-fabric.js",
    "scripts/fusion/progressive-composer.js",
    "scripts/fusion/account-surface.js",
    "scripts/fusion/single-surface-controller.js",
    "scripts/social/runtime-adapters.js",
    "scripts/social/feed-read-model.js",
    "scripts/social/reactions-controller.js",
    "scripts/social/feed-controller.js",
    "scripts/social/post-composer.js",
    "scripts/social/friends-controller.js",
    "scripts/social/core-shell.js",
)

PUBLIC_MEDIA_FILES = (
    "scripts/media/pr36-signature.js",
    "scripts/media/pr36-policy.js",
    "scripts/media/pr36-geometry.js",
    "scripts/media/pr36-canvas-adapter.js",
    "scripts/media/pr36-worker-adapter.js",
    "scripts/media/pr36-scheduler.js",
    "scripts/media/pr36-session.js",
    "scripts/media/pr36-media-worker.js",
    "scripts/media/f05-heif-preflight.js",
    "scripts/media/f05-pr36-media-bridge.js",
    "scripts/media/f05-heif-adapter.js",
    "scripts/media/f05-heif-worker-client.js",
    "scripts/media/f05-heif-policy.js",
    "scripts/media/f05-heif-worker-core.js",
    "scripts/media/f05-derivative-privacy.js",
    "scripts/media/f05-worker-resilience.js",
    "scripts/media/pr36-controller.js",
)

PUBLIC_WORKER_FILES = (
    "workers/media/f05-heif-decoder.v1.js",
    "workers/media/f05-heif-decoder.v1.wasm",
    "workers/media/f05-heif-worker.js",
)

DENIED_SEGMENTS = {
    ".git", ".github", ".agent", ".agents", ".cursor", ".vscode",
    "tests", "docs", "project-control", "tools", "supabase", "reports",
    "operations-console", "design-system-preview", "experience-showcase",
    "user-journey-preview", "email-templates", "app",
}
DENIED_SUFFIXES = {".sql", ".md", ".txt", ".sh", ".py", ".cjs", ".mjs", ".ts"}

FORBIDDEN_PRODUCTION_MARKERS = {
    "CLERK_TEST_KEY": "pk_test_",
    "CLERK_DEV_DOMAIN": ".clerk.accounts.dev",
    "STATIC_LISTING_FIXTURES": "const listings = [",
    "EXPERIMENTAL_LISTING_FORM": "هذا النموذج تجريبي آمن",
    "LOCAL_ONLY_MEDIA": "لن يتم رفع الصور",
    "PUBLISH_NOT_IMPLEMENTED": "النشر الحقيقي قيد التجهيز",
    "FUTURE_PUBLISH_ONLY": "النشر الحقيقي سيتم تفعيله لاحقًا",
    "LOCAL_DRAFT_ONLY_PUBLISHER": "LOCAL_DRAFT_ONLY",
    "RETIRED_GITHUB_PAGES_URL": "vvipautoparts-blip." "github.io/TIGER-VVIP",
}

INDEX_REMOVE_SCRIPTS = (
    "auth-clerk-index.js",
    "scripts/vvip-pr30-resilience.js",
    "scripts/vvip-pr29-home-marketplace.js",
    "scripts/vvip-pr32-draft-preview.js",
    "scripts/vvip-pr31-create-listing-shell.js",
    "scripts/vvip-pr33-publish-readiness.js",
    "scripts/runtime/vvip-my-listings.js",
    "scripts/vvip-production-marketplace.js",
)

INDEX_REMOVE_STYLES = (
    "styles/vvip-pr31-create-listing-shell.css",
    "styles/vvip-pr32-draft-preview.css",
    "styles/vvip-pr33-publish-readiness.css",
    "styles/vvip-production-marketplace.css",
)

ACCOUNT_ROUTE_PATTERN = re.compile(
    r'href=(["\'])private-profile-p03\.html\1(?P<attrs>[^>]*)',
    flags=re.IGNORECASE,
)


def _safe_relative(path: str) -> str:
    normalized = PurePosixPath(path.replace("\\", "/"))
    if normalized.is_absolute() or ".." in normalized.parts:
        raise ValueError(f"unsafe public path: {path}")
    if any(part in DENIED_SEGMENTS for part in normalized.parts):
        raise ValueError(f"denied public path: {path}")
    if normalized.suffix.lower() in DENIED_SUFFIXES:
        raise ValueError(f"denied public suffix: {path}")
    return normalized.as_posix()


def _approved_exact_files() -> tuple[str, ...]:
    return (
        PUBLIC_ROOT_FILES
        + PUBLIC_STYLE_FILES
        + PUBLIC_ICON_FILES
        + PUBLIC_RUNTIME_FILES
        + PUBLIC_SCRIPT_FILES
        + PUBLIC_MEDIA_FILES
        + PUBLIC_WORKER_FILES
    )


def _copy(source: Path, output: Path, relative: str) -> None:
    safe = _safe_relative(relative)
    src = source / safe
    if not src.is_file():
        return
    destination = output / safe
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, destination)


def _close_account_routes(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        attrs = match.group("attrs")
        attrs = re.sub(r"\s+data-safe-nav(?:=(?:[\"'][^\"']*[\"']|[^\s>]+))?", "", attrs, flags=re.IGNORECASE)
        attrs = re.sub(r"\s+data-nav-target=(?:[\"']private-profile-p03\.html[\"']|private-profile-p03\.html)", "", attrs, flags=re.IGNORECASE)
        if not re.search(r"\bdata-account-route\b", attrs, flags=re.IGNORECASE):
            attrs += " data-account-route"
        return f'href="#marketplace"{attrs}'

    return ACCOUNT_ROUTE_PATTERN.sub(replace, text)


def _transform_index(text: str) -> str:
    text = re.sub(
        r"\s*<script[^>]+(?:data-clerk-publishable-key|clerk\.accounts\.dev)[^>]*></script>",
        "",
        text,
        flags=re.IGNORECASE,
    )
    for script in INDEX_REMOVE_SCRIPTS:
        text = re.sub(
            rf"\s*<script[^>]+src=[\"']{re.escape(script)}[\"'][^>]*></script>",
            "",
            text,
            flags=re.IGNORECASE,
        )
    for stylesheet in INDEX_REMOVE_STYLES:
        text = re.sub(
            rf"\s*<link[^>]+href=[\"']{re.escape(stylesheet)}[\"'][^>]*>",
            "",
            text,
            flags=re.IGNORECASE,
        )

    text = _close_account_routes(text)

    injection = """
  <script defer src="runtime-config.js"></script>
  <script defer src="scripts/runtime/vvip-runtime-loader.js"></script>
  <script defer src="scripts/runtime/vvip-marketplace-repository.js"></script>
  <script defer src="auth-clerk-index.js"></script>
  <script defer src="scripts/vvip-pr30-resilience.js"></script>
""".rstrip()
    text = text.replace("</head>", f"{injection}\n</head>")
    return text


def _decode_clerk_frontend_api(publishable_key: str) -> str | None:
    match = re.fullmatch(r"pk_(?:test|live)_(.+)", str(publishable_key or "").strip())
    if not match:
        return None
    payload = match.group(1).replace("-", "+").replace("_", "/")
    payload += "=" * ((4 - len(payload) % 4) % 4)
    try:
        decoded = base64.b64decode(payload, validate=True).decode("utf-8").rstrip("$").strip()
    except (ValueError, UnicodeDecodeError):
        return None
    if not re.fullmatch(r"[A-Za-z0-9.-]+", decoded) or ".." in decoded:
        return None
    return decoded.lower()


def _runtime_config(environment: str, source_sha: str) -> tuple[str, list[str]]:
    config = {
        "environment": environment,
        "sourceSha": source_sha,
        "clerkPublishableKey": os.environ.get("TIGER_CLERK_PUBLISHABLE_KEY", ""),
        "supabaseUrl": os.environ.get("TIGER_SUPABASE_URL", ""),
        "supabasePublishableKey": os.environ.get("TIGER_SUPABASE_PUBLISHABLE_KEY", ""),
        "defaultCountryCode": os.environ.get("TIGER_DEFAULT_COUNTRY_CODE", "").upper(),
        "mediaFinalizerUrl": os.environ.get("TIGER_MEDIA_FINALIZER_URL", "").strip(),
    }
    errors: list[str] = []
    if environment == "production":
        clerk_key = config["clerkPublishableKey"]
        if not clerk_key.startswith("pk_live_"):
            errors.append("production Clerk publishable key must start with pk_live_")
        else:
            frontend_api = _decode_clerk_frontend_api(clerk_key)
            if not frontend_api:
                errors.append("production Clerk publishable key payload is invalid")
            elif frontend_api == "clerk.accounts.dev" or frontend_api.endswith(".clerk.accounts.dev"):
                errors.append("production Clerk publishable key resolves to a development frontend API")
        if not re.fullmatch(r"https://[A-Za-z0-9.-]+", config["supabaseUrl"]):
            errors.append("production Supabase URL must be an https origin")
        public_key = config["supabasePublishableKey"]
        if not public_key or any(token in public_key.lower() for token in ("secret", "service_role")):
            errors.append("a public Supabase publishable/anon key is required")
        country = config["defaultCountryCode"]
        if country and not re.fullmatch(r"[A-Z]{2}", country):
            errors.append("default country code must be ISO alpha-2")
        finalizer_url = config["mediaFinalizerUrl"]
        if not re.fullmatch(r"https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?", finalizer_url):
            errors.append("production media finalizer URL must be an https URL without query or fragment")
    serialized = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    return f"window.__VVIP_RUNTIME_CONFIG__ = Object.freeze({serialized});\n", errors


def _hashes(output: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "release-manifest.json":
            rel = path.relative_to(output).as_posix()
            result[rel] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def _contains_active_clerk_dev_domain(text: str) -> bool:
    if ".clerk.accounts.dev" not in text:
        return False
    defensive_guard = re.compile(
        r"\.endsWith\(\s*[\"']\.clerk\.accounts\.dev[\"']\s*\)",
        flags=re.IGNORECASE,
    )
    return ".clerk.accounts.dev" in defensive_guard.sub("", text)


def _scan_markers(output: Path) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for path in sorted(output.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in {".html", ".js", ".css", ".json", ".webmanifest"}:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for code, marker in FORBIDDEN_PRODUCTION_MARKERS.items():
            if code == "CLERK_DEV_DOMAIN":
                matched = _contains_active_clerk_dev_domain(text)
            else:
                matched = marker in text
            if matched:
                findings.append({"code": code, "path": path.relative_to(output).as_posix()})
    return findings


def build(source: Path, output: Path, *, mode: str, source_sha: str, include_cname: bool = False) -> dict:
    source = source.resolve()
    output = output.resolve()
    if source == output or source in output.parents:
        raise ValueError("output must not contain source")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    for relative in _approved_exact_files():
        _copy(source, output, relative)
    if include_cname:
        _copy(source, output, "CNAME")

    index = output / "index.html"
    if not index.is_file():
        raise RuntimeError("public index.html is missing")
    index.write_text(_transform_index(index.read_text(encoding="utf-8")), encoding="utf-8")

    runtime_text, config_errors = _runtime_config(mode, source_sha)
    (output / "runtime-config.js").write_text(runtime_text, encoding="utf-8")

    findings = _scan_markers(output)
    manifest = {
        "schemaVersion": 1,
        "mode": mode,
        "sourceSha": source_sha,
        "releaseEligible": not findings and not config_errors,
        "configurationErrors": config_errors,
        "forbiddenFindings": findings,
        "files": _hashes(output),
    }
    (output / "release-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if mode == "production" and not manifest["releaseEligible"]:
        details = "; ".join(config_errors + [f"{item['code']}:{item['path']}" for item in findings])
        raise RuntimeError(f"production release blocked: {details}")
    return manifest


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".")
    parser.add_argument("--output", default="dist/public")
    parser.add_argument("--mode", choices=("candidate", "production"), default="candidate")
    parser.add_argument("--source-sha", default=os.environ.get("GITHUB_SHA", "unknown"))
    parser.add_argument("--include-cname", action="store_true")
    args = parser.parse_args(argv)
    try:
        manifest = build(
            Path(args.source), Path(args.output), mode=args.mode,
            source_sha=args.source_sha, include_cname=args.include_cname,
        )
    except Exception as exc:
        print(f"VVIP_PUBLIC_RELEASE=BLOCKED\nREASON={exc}", file=sys.stderr)
        return 1
    print(f"VVIP_PUBLIC_RELEASE={'PASS' if manifest['releaseEligible'] else 'CANDIDATE'}")
    print(f"PUBLIC_FILES={len(manifest['files'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
