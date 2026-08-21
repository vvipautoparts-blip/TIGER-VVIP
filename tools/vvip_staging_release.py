#!/usr/bin/env python3
"""Build an isolated exact-SHA TIGER Gate 6 staging artifact."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Iterable

import vvip_public_release

SHA40 = re.compile(r"^[0-9a-f]{40}$")
SUPABASE_ORIGIN = re.compile(r"^https://([a-z0-9]{20})\.supabase\.co/?$")
FORBIDDEN_PRODUCTION_REF = "zelcngyyvbomuzokvuxo"
PRIVILEGED_PUBLIC_VALUE = re.compile(
    r"(?:sb_secret_|service[_-]?role|private[_-]?key|admin[_-]?key|database[_-]?password)",
    re.IGNORECASE,
)
ALLOWED_PAYMENT_MODES = {"disabled", "sandbox"}
RUNTIME_KEYS = (
    "TIGER_ENVIRONMENT",
    "TIGER_CLERK_PUBLISHABLE_KEY",
    "TIGER_SUPABASE_URL",
    "TIGER_SUPABASE_PUBLISHABLE_KEY",
    "TIGER_DEFAULT_COUNTRY_CODE",
    "TIGER_MEDIA_FINALIZER_URL",
)


def _hashes(output: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "release-manifest.json":
            result[path.relative_to(output).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def _validate(
    source_sha: str,
    supabase_url: str,
    supabase_publishable_key: str,
    payment_mode: str,
) -> tuple[str, str]:
    if not SHA40.fullmatch(str(source_sha or "")):
        raise ValueError("staging source SHA must be an exact lowercase 40-character commit SHA")

    match = SUPABASE_ORIGIN.fullmatch(str(supabase_url or "").strip())
    if not match:
        raise ValueError("staging Supabase URL must be an https project origin")
    project_ref = match.group(1)
    if project_ref == FORBIDDEN_PRODUCTION_REF:
        raise ValueError("Production Supabase project is forbidden for Gate 6")

    public_key = str(supabase_publishable_key or "").strip()
    if not public_key or PRIVILEGED_PUBLIC_VALUE.search(public_key):
        raise ValueError("staging Supabase browser key must be publishable only")
    if payment_mode not in ALLOWED_PAYMENT_MODES:
        raise ValueError("Gate 6 payment mode must be disabled or sandbox")

    return project_ref, f"https://{project_ref}.supabase.co"


@contextmanager
def _runtime_environment(values: dict[str, str]):
    before = {key: os.environ.get(key) for key in RUNTIME_KEYS}
    try:
        for key in RUNTIME_KEYS:
            os.environ.pop(key, None)
        os.environ.update(values)
        yield
    finally:
        for key in RUNTIME_KEYS:
            os.environ.pop(key, None)
        for key, value in before.items():
            if value is not None:
                os.environ[key] = value


def _identity(source_sha: str, project_ref: str) -> str:
    payload = json.dumps(
        {
            "environment": "STAGING",
            "sourceSha": source_sha,
            "backendProvider": "supabase",
            "backendProjectRef": project_ref,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return f"""(() => {{
  'use strict';
  const identity = Object.freeze({payload});
  window.__TIGER_STAGING_IDENTITY__ = identity;
  document.documentElement.dataset.tigerEnvironment = 'STAGING';
}})();
"""


def build(
    source: Path,
    output: Path,
    *,
    source_sha: str,
    supabase_url: str,
    supabase_publishable_key: str,
    payment_mode: str,
) -> dict:
    project_ref, origin = _validate(
        source_sha,
        supabase_url,
        supabase_publishable_key,
        payment_mode,
    )

    with _runtime_environment(
        {
            "TIGER_ENVIRONMENT": "staging",
            "TIGER_SUPABASE_URL": origin,
            "TIGER_SUPABASE_PUBLISHABLE_KEY": supabase_publishable_key,
        }
    ):
        release = vvip_public_release.build(
            Path(source),
            Path(output),
            mode="staging",
            source_sha=source_sha,
            include_cname=False,
        )

    output = Path(output)
    (output / "staging-identity.js").write_text(
        _identity(source_sha, project_ref),
        encoding="utf-8",
    )

    index = output / "index.html"
    text = index.read_text(encoding="utf-8")
    marker = '  <script defer src="staging-identity.js"></script>\n'
    if "staging-identity.js" not in text:
        index.write_text(text.replace("</head>", f"{marker}</head>"), encoding="utf-8")

    if (output / "CNAME").exists():
        raise RuntimeError("staging artifact must not contain CNAME")

    gate6 = {
        "schema_version": 1,
        "environment": "staging",
        "source_sha": source_sha,
        "backend": {
            "provider": "supabase",
            "project_ref": project_ref,
            "url_origin": origin,
        },
        "frontend": {
            "provider": "cloudflare-pages",
            "status": "UNBOUND",
        },
        "data_mode": "SYNTHETIC_SANITIZED",
        "payment_mode": payment_mode,
        "production_ref_forbidden": FORBIDDEN_PRODUCTION_REF,
        "decision": "BLOCKED_PROVIDER",
        "eligible": False,
    }
    (output / "gate6-staging-manifest.json").write_text(
        json.dumps(gate6, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    release["mode"] = "staging"
    release["sourceSha"] = source_sha
    release["stagingIdentity"] = {
        "environment": "STAGING",
        "sourceSha": source_sha,
        "backendProjectRef": project_ref,
        "script": "staging-identity.js",
    }
    release["files"] = _hashes(output)
    (output / "release-manifest.json").write_text(
        json.dumps(release, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return gate6


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".")
    parser.add_argument("--output", default="dist/staging")
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--supabase-url", required=True)
    parser.add_argument("--supabase-publishable-key", required=True)
    parser.add_argument("--payment-mode", choices=("disabled", "sandbox", "live"), required=True)
    args = parser.parse_args(argv)

    try:
        manifest = build(
            Path(args.source),
            Path(args.output),
            source_sha=args.source_sha,
            supabase_url=args.supabase_url,
            supabase_publishable_key=args.supabase_publishable_key,
            payment_mode=args.payment_mode,
        )
    except Exception as exc:
        print(f"TIGER_GATE6_STAGING_ARTIFACT=BLOCKED\nREASON={exc}", file=sys.stderr)
        return 1

    print("TIGER_GATE6_STAGING_ARTIFACT=CANDIDATE")
    print(f"GATE6_SOURCE_SHA={manifest['source_sha']}")
    print(f"GATE6_BACKEND_REF={manifest['backend']['project_ref']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
