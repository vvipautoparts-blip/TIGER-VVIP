#!/usr/bin/env python3
"""Build an isolated, exact-SHA TIGER Preview artifact without deploying it."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Iterable

import vvip_public_release

SHA40 = re.compile(r"^[0-9a-f]{40}$")


def _hashes(output: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "release-manifest.json":
            rel = path.relative_to(output).as_posix()
            result[rel] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def _preview_identity(source_sha: str) -> str:
    payload = json.dumps(
        {"environment": "PREVIEW", "sourceSha": source_sha},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return f"""(() => {{
  'use strict';
  const identity = Object.freeze({payload});
  window.__TIGER_PREVIEW_IDENTITY__ = identity;
  document.documentElement.dataset.tigerEnvironment = 'PREVIEW';
  const mount = () => {{
    if (document.querySelector('[data-tiger-preview-badge]')) return;
    const badge = document.createElement('div');
    badge.setAttribute('data-tiger-preview-badge', '');
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', `TIGER Preview ${{identity.sourceSha.slice(0, 8)}}`);
    badge.textContent = `TIGER PREVIEW · ${{identity.sourceSha.slice(0, 8)}}`;
    Object.assign(badge.style, {{
      position: 'fixed',
      top: 'max(8px, env(safe-area-inset-top))',
      right: '10px',
      zIndex: '2147483647',
      padding: '6px 9px',
      borderRadius: '999px',
      font: '600 10px/1.2 system-ui, -apple-system, sans-serif',
      letterSpacing: '.08em',
      background: 'rgba(10, 10, 12, .78)',
      color: 'white',
      border: '1px solid rgba(255,255,255,.22)',
      backdropFilter: 'blur(12px)',
      pointerEvents: 'none'
    }});
    document.body.appendChild(badge);
  }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {{ once: true }});
  else mount();
}})();
"""


def build(source: Path, output: Path, *, source_sha: str) -> dict:
    if not SHA40.fullmatch(str(source_sha or "")):
        raise ValueError("preview source SHA must be an exact lowercase 40-character commit SHA")

    manifest = vvip_public_release.build(
        source,
        output,
        mode="preview",
        source_sha=source_sha,
        include_cname=False,
    )

    identity_path = output / "preview-identity.js"
    identity_path.write_text(_preview_identity(source_sha), encoding="utf-8")

    index = output / "index.html"
    text = index.read_text(encoding="utf-8")
    marker = '  <script defer src="preview-identity.js"></script>\n'
    if marker.strip() not in text:
        text = text.replace("</head>", f"{marker}</head>")
        index.write_text(text, encoding="utf-8")

    if (output / "CNAME").exists():
        raise RuntimeError("preview artifact must not contain CNAME")

    manifest["mode"] = "preview"
    manifest["sourceSha"] = source_sha
    manifest["previewIdentity"] = {
        "environment": "PREVIEW",
        "sourceSha": source_sha,
        "script": "preview-identity.js",
    }
    manifest["files"] = _hashes(output)
    (output / "release-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".")
    parser.add_argument("--output", default="dist/preview")
    parser.add_argument("--source-sha", required=True)
    args = parser.parse_args(argv)
    try:
        manifest = build(Path(args.source), Path(args.output), source_sha=args.source_sha)
    except Exception as exc:
        print(f"TIGER_PREVIEW_ARTIFACT=BLOCKED\nREASON={exc}", file=sys.stderr)
        return 1
    print(f"TIGER_PREVIEW_ARTIFACT={'PASS' if manifest['releaseEligible'] else 'CANDIDATE'}")
    print(f"PREVIEW_SOURCE_SHA={manifest['sourceSha']}")
    print(f"PREVIEW_FILES={len(manifest['files'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
