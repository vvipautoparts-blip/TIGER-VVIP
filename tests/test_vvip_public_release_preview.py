from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "tools" / "vvip_public_release.py"
spec = importlib.util.spec_from_file_location("vvip_public_release_preview", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


def test_cli_supports_exact_sha_preview_artifact_with_visible_identity() -> None:
    source = MODULE_PATH.parents[1]
    exact_sha = "0123456789abcdef0123456789abcdef01234567"

    with tempfile.TemporaryDirectory() as temp:
        output = Path(temp) / "preview"
        rc = module.main([
            "--source", str(source),
            "--output", str(output),
            "--mode", "preview",
            "--source-sha", exact_sha,
        ])

        assert rc == 0
        manifest = json.loads((output / "release-manifest.json").read_text(encoding="utf-8"))
        assert manifest["mode"] == "preview"
        assert manifest["sourceSha"] == exact_sha

        runtime = (output / "runtime-config.js").read_text(encoding="utf-8")
        assert '"environment":"preview"' in runtime
        assert exact_sha in runtime

        identity = (output / "preview-identity.js").read_text(encoding="utf-8")
        assert '"environment":"PREVIEW"' in identity
        assert exact_sha in identity

        index = (output / "index.html").read_text(encoding="utf-8")
        assert 'preview-identity.js' in index
        assert not (output / "CNAME").exists()
