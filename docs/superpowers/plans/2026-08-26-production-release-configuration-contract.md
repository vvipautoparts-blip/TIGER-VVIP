# Production Release Configuration Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the missing protected Media Finalizer configuration path, enforce a canonical fail-closed Production URL contract, and make the existing CycloneDX 1.7 producer compatible with the promotion verifier.

**Architecture:** The protected `production-build` GitHub Environment supplies the public endpoint through `vars.TIGER_MEDIA_FINALIZER_URL`. The deterministic builder validates configuration without network access, embeds the accepted endpoint into hashed public bytes, and later builds those bytes exactly once. The promotion verifier independently validates the already-generated CycloneDX 1.7 evidence and never rebuilds application bytes.

**Tech Stack:** Python 3.12, Node.js built-in test runner, GitHub Actions, CycloneDX 1.7, GitHub artifact attestations.

**Spec:** `docs/superpowers/specs/2026-08-26-production-release-2026-security-convergence-design.md`

## Global Constraints

- Work only on `feat/production-release-2026-convergence-20260826`; do not edit `main` directly.
- No fallback, placeholder, workflow input, hard-coded endpoint, or second runtime authority.
- Do not print endpoint values, credentials, tokens, or user data.
- Do not perform a network liveness call inside the deterministic artifact builder.
- Production public bytes are built exactly once; promotion never rebuilds.
- External GitHub Actions remain pinned to verified full commit SHAs.
- No Production deployment or provider mutation before exact-head gates are GREEN.

---

### Task 1: Canonical Media Finalizer configuration contract

**Files:**
- Modify: `tests/test_vvip_public_release.py`
- Modify: `tools/vvip_public_release.py`

**Interfaces:**
- Consumes: `TIGER_MEDIA_FINALIZER_URL`, release mode, exact source SHA.
- Produces: `_is_canonical_media_finalizer_url(value: str) -> bool` and CLI flag `--validate-config-only` that validates without creating public bytes.

- [ ] **Step 1: Write failing behavior tests**

Add the following imports to `tests/test_vvip_public_release.py`:

```python
import contextlib
import io
```

Add these tests to `PublicReleaseTests`:

```python
    def test_production_rejects_noncanonical_or_nonpublic_media_finalizer_urls(self):
        invalid_urls = (
            "",
            "http://media.example.com/finalize",
            "https://user@media.example.com/finalize",
            "https://media.example.com/finalize?upload=1",
            "https://media.example.com/finalize#fragment",
            "https://media.example.com:8443/finalize",
            "https://127.0.0.1/finalize",
            "https://localhost/finalize",
            "https://media/finalize",
            "https://media.local/finalize",
            "https://MEDIA.example.com/finalize",
            "https://media.example.com/a/../finalize",
            "https://media.example.com//finalize",
            "https://media.example.com/%66inalize",
            "https://media.example.com\\finalize",
            " https://media.example.com/finalize",
        )
        for index, value in enumerate(invalid_urls):
            with self.subTest(value=value):
                with tempfile.TemporaryDirectory() as temp:
                    source = Path(temp) / "src"
                    output = Path(temp) / f"out-{index}"
                    source.mkdir()
                    self.fixture(source)
                    environment = self.production_env()
                    environment["TIGER_MEDIA_FINALIZER_URL"] = value
                    with mock.patch.dict(os.environ, environment, clear=False):
                        with self.assertRaisesRegex(
                            RuntimeError,
                            "production media finalizer URL must be canonical public https",
                        ):
                            module.build(source, output, mode="production", source_sha="a" * 40)

    def test_production_accepts_canonical_media_finalizer_url_with_default_tls_port(self):
        for value in (
            "https://media.example.com/finalize",
            "https://media.example.com:443/finalize",
        ):
            with self.subTest(value=value):
                with tempfile.TemporaryDirectory() as temp:
                    source = Path(temp) / "src"
                    output = Path(temp) / "out"
                    source.mkdir()
                    self.fixture(source)
                    environment = self.production_env()
                    environment["TIGER_MEDIA_FINALIZER_URL"] = value
                    with mock.patch.dict(os.environ, environment, clear=False):
                        manifest = module.build(
                            source,
                            output,
                            mode="production",
                            source_sha="a" * 40,
                        )
                    self.assertTrue(manifest["releaseEligible"])
                    runtime = (output / "runtime-config.js").read_text(encoding="utf-8")
                    self.assertIn(json.dumps(value), runtime)

    def test_configuration_only_validation_creates_no_public_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "must-not-exist"
            stdout = io.StringIO()
            with mock.patch.dict(os.environ, self.production_env(), clear=False):
                with contextlib.redirect_stdout(stdout):
                    status = module.main(
                        [
                            "--mode", "production",
                            "--source-sha", "a" * 40,
                            "--output", str(output),
                            "--validate-config-only",
                        ]
                    )
            self.assertEqual(status, 0)
            self.assertEqual(stdout.getvalue(), "VVIP_PUBLIC_RELEASE_CONFIG=PASS\n")
            self.assertFalse(output.exists())
```

The production mutation caught by these tests is either accepting an attacker-controlled/local endpoint or generating public bytes before the protected configuration contract is valid.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
python -m unittest -v tests/test_vvip_public_release.py
```

Expected: FAIL because malformed URLs are accepted by the current regular expression and `--validate-config-only` is not defined.

- [ ] **Step 3: Implement the canonical parser and validation-only path**

Add imports to `tools/vvip_public_release.py`:

```python
import ipaddress
from urllib.parse import urlsplit
```

Add this validator before `_runtime_config`:

```python
def _is_canonical_media_finalizer_url(value: str) -> bool:
    if not value or value != value.strip():
        return False
    if "\\" in value or any(ord(character) < 0x20 or ord(character) == 0x7F for character in value):
        return False
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        return False
    if (
        parsed.scheme != "https"
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or port not in (None, 443)
    ):
        return False
    expected_netloc = hostname if port is None else f"{hostname}:443"
    if parsed.netloc != expected_netloc:
        return False
    if hostname in {"localhost"} or hostname.endswith(".local") or "." not in hostname:
        return False
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        return False
    labels = hostname.split(".")
    if any(
        not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
        for label in labels
    ):
        return False
    if "%" in parsed.path or "//" in parsed.path:
        return False
    if any(segment in {".", ".."} for segment in parsed.path.split("/")):
        return False
    return bool(re.fullmatch(r"(?:/[A-Za-z0-9._~!$&'()*+,;=:@/-]*)?", parsed.path))
```

Replace the finalizer regular-expression branch in `_runtime_config` with:

```python
        finalizer_url = config["mediaFinalizerUrl"]
        if not _is_canonical_media_finalizer_url(finalizer_url):
            errors.append("production media finalizer URL must be canonical public https")
```

Add the CLI flag and early path in `main`:

```python
    parser.add_argument("--validate-config-only", action="store_true")
```

Immediately after parsing arguments and inside the existing `try` block:

```python
        if args.validate_config_only:
            _, config_errors = _runtime_config(args.mode, args.source_sha)
            if args.mode == "production" and config_errors:
                raise RuntimeError("production release blocked: " + "; ".join(config_errors))
            print("VVIP_PUBLIC_RELEASE_CONFIG=PASS")
            return 0
```

- [ ] **Step 4: Run the focused suite and verify GREEN**

Run:

```bash
python -m unittest -v tests/test_vvip_public_release.py
```

Expected: every test passes, both allowed endpoints are embedded verbatim, invalid endpoints fail closed, and validation-only mode creates no output directory.

- [ ] **Step 5: Inspect and commit Task 1**

Run:

```bash
git diff --check
git diff -- tests/test_vvip_public_release.py tools/vvip_public_release.py
git add tests/test_vvip_public_release.py tools/vvip_public_release.py
git commit -m "fix(release): validate canonical media finalizer endpoint"
```

### Task 2: Protected workflow wiring and early validation

**Files:**
- Modify: `tests/exact-artifact-production-promotion.test.cjs`
- Modify: `.github/workflows/production-release-artifact.yml`

**Interfaces:**
- Consumes: protected GitHub Environment variable `vars.TIGER_MEDIA_FINALIZER_URL`.
- Produces: `TIGER_MEDIA_FINALIZER_URL` in the builder job and an early configuration-only validation step.

- [ ] **Step 1: Write the failing workflow contract test**

Add this test to `tests/exact-artifact-production-promotion.test.cjs`:

```javascript
test('builder sources the media finalizer only from the protected environment and validates before build work', () => {
  const builder = readRequired(BUILDER_PATH, 'Production Release Artifact Builder workflow');
  const job = builder.slice(builder.indexOf('\n  build_seal_attest:'));

  assert.match(job, /environment:\s*\n\s{6}name:\s*production-build/);
  assert.match(job, /TIGER_MEDIA_FINALIZER_URL:\s*\$\{\{\s*vars\.TIGER_MEDIA_FINALIZER_URL\s*\}\}/);
  assert.doesNotMatch(job, /TIGER_MEDIA_FINALIZER_URL:\s*\$\{\{\s*(?:secrets|inputs)\./);
  assert.doesNotMatch(job, /TIGER_MEDIA_FINALIZER_URL:\s*https:\/\//);

  const validationIndex = job.indexOf('Validate protected Production configuration');
  const installIndex = job.indexOf('Install pinned verification dependencies');
  const buildIndex = job.indexOf('Build Production public bytes exactly once');
  assert.ok(validationIndex > 0, 'configuration validation step must exist');
  assert.ok(validationIndex < installIndex, 'configuration must fail closed before dependency installation');
  assert.ok(installIndex < buildIndex, 'public-byte build remains after verification');
  assert.equal((job.match(/--validate-config-only/g) || []).length, 1);
  assert.equal((job.match(/--output\s+"\$RUNNER_TEMP\/vvip-production-public"/g) || []).length, 1);
});
```

Change the existing build-once assertion to count the unique Production output argument rather than every invocation of the validation-capable tool:

```javascript
  assert.equal(
    (builder.match(/--output\s+"\$RUNNER_TEMP\/vvip-production-public"/g) || []).length,
    1,
    'Production public bytes must be built exactly once',
  );
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/exact-artifact-production-promotion.test.cjs
```

Expected: FAIL because the workflow does not map `TIGER_MEDIA_FINALIZER_URL` and has no early validation step.

- [ ] **Step 3: Wire the protected variable and early validation**

Add this builder-job environment mapping:

```yaml
      TIGER_MEDIA_FINALIZER_URL: ${{ vars.TIGER_MEDIA_FINALIZER_URL }}
```

Add this step immediately after `Set up Python` and before dependency installation:

```yaml
      - name: Validate protected Production configuration
        shell: bash
        run: |
          set -Eeuo pipefail
          python tools/vvip_public_release.py \
            --mode production \
            --source-sha "$RELEASE_SHA" \
            --validate-config-only
```

- [ ] **Step 4: Run workflow and builder tests and verify GREEN**

Run:

```bash
node --test tests/exact-artifact-production-promotion.test.cjs
python -m unittest -v tests/test_vvip_public_release.py
```

Expected: all tests pass; there is exactly one config-only validation and one public-byte output target.

- [ ] **Step 5: Inspect and commit Task 2**

Run:

```bash
git diff --check
git diff -- tests/exact-artifact-production-promotion.test.cjs .github/workflows/production-release-artifact.yml
git add tests/exact-artifact-production-promotion.test.cjs .github/workflows/production-release-artifact.yml
git commit -m "fix(release): wire protected media finalizer configuration"
```

### Task 3: CycloneDX 1.7 promotion-verifier convergence

**Files:**
- Modify: `tests/test_verify_production_artifact.py`
- Modify: `scripts/release/verify-production-artifact.py`

**Interfaces:**
- Consumes: deterministic `evidence/sbom.cdx.json` generated by `scripts/release/production-sbom.cjs`.
- Produces: fail-closed acceptance of the exact CycloneDX 1.7 header/identity and rejection of legacy 1.6 evidence.

- [ ] **Step 1: Upgrade the realistic fixture and write a legacy rejection test**

Change `valid_inner_tar` to accept a version argument:

```python
def valid_inner_tar(*, sbom_version: str = "1.7") -> bytes:
```

Make its SBOM mirror the actual generator:

```python
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
```

Add this integration test:

```python
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
```

The production mutation caught is allowing a stale producer/consumer schema mismatch to pass into promotion.

- [ ] **Step 2: Run the verifier tests and verify RED**

Run:

```bash
python -m unittest -v tests/test_verify_production_artifact.py
```

Expected: the valid 1.7 bundle is rejected by the stale verifier and the legacy 1.6 rejection test fails because the stale verifier accepts it.

- [ ] **Step 3: Enforce the exact 1.7 identity in the verifier**

Add this constant near the digest regular expressions:

```python
CYCLONEDX_UUIDV8_RE = re.compile(
    r"^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
```

Replace the SBOM header check with:

```python
    if (
        not isinstance(value, dict)
        or value.get("$schema") != "https://cyclonedx.org/schema/bom-1.7.schema.json"
        or value.get("bomFormat") != "CycloneDX"
        or value.get("specVersion") != "1.7"
        or value.get("version") != 1
        or not isinstance(value.get("serialNumber"), str)
        or not CYCLONEDX_UUIDV8_RE.fullmatch(value["serialNumber"])
    ):
        fail("VVIP_SBOM_INVALID", "CycloneDX SBOM header is invalid")
```

After confirming `metadata` is a dictionary, require the deterministic build lifecycle:

```python
    if metadata.get("lifecycles") != [{"phase": "build"}]:
        fail("VVIP_SBOM_INVALID", "CycloneDX lifecycle is invalid")
```

- [ ] **Step 4: Run producer and consumer suites and verify GREEN**

Run:

```bash
python -m unittest -v tests/test_verify_production_artifact.py
node --test tests/production-release-sbom.test.cjs tests/exact-artifact-production-promotion.test.cjs
```

Expected: the deterministic producer remains CycloneDX 1.7, the verifier accepts its realistic shape, and 1.6 fails closed.

- [ ] **Step 5: Inspect and commit Task 3**

Run:

```bash
git diff --check
git diff -- tests/test_verify_production_artifact.py scripts/release/verify-production-artifact.py
git add tests/test_verify_production_artifact.py scripts/release/verify-production-artifact.py
git commit -m "fix(release): converge promotion verifier on CycloneDX 1.7"
```

### Task 4: Integrated verification and remote checkpoint

**Files:**
- Verify: all files changed by Tasks 1–3
- Update only after exact-head evidence changes: `docs/MASTER_PROJECT_STATE.md`

**Interfaces:**
- Consumes: final branch tree and repository-defined checks.
- Produces: a reviewable exact-head commit/PR with traceable RED/GREEN evidence; no Production mutation.

- [ ] **Step 1: Run focused release regression suites**

Run:

```bash
python -m unittest -v tests/test_vvip_public_release.py tests/test_verify_production_artifact.py
node --test \
  tests/exact-artifact-production-promotion.test.cjs \
  tests/production-release-sbom.test.cjs \
  tests/release-workflow-hardening.test.cjs \
  tests/pages-production-artifact-isolation.test.cjs \
  tests/svef-release-bundle-modern.test.cjs \
  tests/svef-release-bundle-postmerge-hardening.test.cjs
```

Expected: zero failures, skips, todos, or warnings attributable to the changed release path.

- [ ] **Step 2: Run the full repository gate**

Run:

```bash
bash scripts/quality-gate.sh
```

Expected: exit code `0` and `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 3: Review the final integrated diff**

Run:

```bash
git status --short --branch
git diff --check HEAD~3..HEAD
git diff --stat 73dce62cab48b37f2e09f1e9feeafc1c800d76d8..HEAD
git log --oneline --decorate 73dce62cab48b37f2e09f1e9feeafc1c800d76d8..HEAD
```

Confirm the branch contains only the approved spec, plan, tests, release builder, workflow, and verifier changes. Confirm no secret or live endpoint value appears in the diff.

- [ ] **Step 4: Synchronize the exact branch and open a PR**

Push or synchronize the exact changed files to `feat/production-release-2026-convergence-20260826`, create a PR to `main`, and record its exact head SHA/tree. Do not merge until required CI/security checks are GREEN for that exact head.

- [ ] **Step 5: Continue at the verified checkpoint**

After exact-head GREEN, update `docs/MASTER_PROJECT_STATE.md` with the PR/head/tree/check evidence, perform the protected merge, and begin the next plan for the hardened reusable builder and immutable release. A missing or invalid live `TIGER_MEDIA_FINALIZER_URL` remains `BLOCKED_EXTERNAL`; it is never replaced with a fabricated endpoint.
