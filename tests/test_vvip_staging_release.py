from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).parents[1] / "tools"
MODULE_PATH = TOOLS / "vvip_staging_release.py"
sys.path.insert(0, str(TOOLS))


def load_module():
    assert MODULE_PATH.is_file(), "Gate 6 staging release builder must exist"
    spec = importlib.util.spec_from_file_location("vvip_staging_release", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def minimal_source(root: Path) -> Path:
    source = root / "source"
    source.mkdir()
    (source / "index.html").write_text(
        "<!doctype html><html><head></head><body>TIGER</body></html>\n",
        encoding="utf-8",
    )
    return source


def test_staging_builder_creates_isolated_exact_sha_artifact() -> None:
    module = load_module()
    source_sha = "0123456789abcdef0123456789abcdef01234567"
    project_ref = "abcdefghijklmnopqrst"
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        source = minimal_source(root)
        output = root / "out"
        old_env = dict(os.environ)
        try:
            manifest = module.build(
                source,
                output,
                source_sha=source_sha,
                supabase_url=f"https://{project_ref}.supabase.co",
                supabase_publishable_key="sb_publishable_gate6_staging_public",
                payment_mode="disabled",
            )
        finally:
            os.environ.clear()
            os.environ.update(old_env)

        gate6 = json.loads((output / "gate6-staging-manifest.json").read_text(encoding="utf-8"))
        release = json.loads((output / "release-manifest.json").read_text(encoding="utf-8"))
        runtime = (output / "runtime-config.js").read_text(encoding="utf-8")
        identity = (output / "staging-identity.js").read_text(encoding="utf-8")
        index = (output / "index.html").read_text(encoding="utf-8")

        assert manifest["source_sha"] == source_sha
        assert gate6["environment"] == "staging"
        assert gate6["source_sha"] == source_sha
        assert gate6["backend"]["provider"] == "supabase"
        assert gate6["backend"]["project_ref"] == project_ref
        assert gate6["backend"]["url_origin"] == f"https://{project_ref}.supabase.co"
        assert gate6["data_mode"] == "SYNTHETIC_SANITIZED"
        assert gate6["payment_mode"] == "disabled"
        assert gate6["production_ref_forbidden"] == "zelcngyyvbomuzokvuxo"
        assert gate6["eligible"] is False
        assert gate6["decision"] == "BLOCKED_PROVIDER"
        assert release["mode"] == "staging"
        assert release["sourceSha"] == source_sha
        assert '"environment":"staging"' in runtime
        assert f"https://{project_ref}.supabase.co" in runtime
        assert '"environment":"STAGING"' in identity
        assert source_sha in identity
        assert "staging-identity.js" in index
        assert not (output / "CNAME").exists()


def test_staging_builder_rejects_non_exact_sha() -> None:
    module = load_module()
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        source = minimal_source(root)
        output = root / "out"
        rc = module.main([
            "--source", str(source),
            "--output", str(output),
            "--source-sha", "not-a-sha",
            "--supabase-url", "https://abcdefghijklmnopqrst.supabase.co",
            "--supabase-publishable-key", "sb_publishable_gate6_staging_public",
            "--payment-mode", "disabled",
        ])
        assert rc == 1
        assert not output.exists()


def test_staging_builder_rejects_production_supabase_ref() -> None:
    module = load_module()
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        source = minimal_source(root)
        output = root / "out"
        rc = module.main([
            "--source", str(source),
            "--output", str(output),
            "--source-sha", "0123456789abcdef0123456789abcdef01234567",
            "--supabase-url", "https://zelcngyyvbomuzokvuxo.supabase.co",
            "--supabase-publishable-key", "sb_publishable_gate6_staging_public",
            "--payment-mode", "disabled",
        ])
        assert rc == 1
        assert not output.exists()


def test_staging_builder_rejects_privileged_key_and_live_payment() -> None:
    module = load_module()
    source_sha = "0123456789abcdef0123456789abcdef01234567"
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        source = minimal_source(root)
        for key, payment in (("service_role_forbidden", "disabled"), ("sb_publishable_public", "live")):
            output = root / f"out-{payment}-{len(key)}"
            rc = module.main([
                "--source", str(source),
                "--output", str(output),
                "--source-sha", source_sha,
                "--supabase-url", "https://abcdefghijklmnopqrst.supabase.co",
                "--supabase-publishable-key", key,
                "--payment-mode", payment,
            ])
            assert rc == 1
            assert not output.exists()
