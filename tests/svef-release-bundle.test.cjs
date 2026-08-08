'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { sha256Hex } = require('../scripts/tsrf/evidence/contracts.cjs');
const {
  createReleaseBundleManifest,
  serializeReleaseBundleManifest,
} = require('../scripts/tsrf/svef/release-bundle.cjs');

const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_TREE = 'b'.repeat(40);

function write(root, relativePath, bytes) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, bytes);
  return absolute;
}

function fixture() {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'svef-bundle-repo-'));
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svef-bundle-candidate-'));

  write(repositoryRoot, 'requirements-dev.txt', 'jsonschema==4.23.0\n');
  write(repositoryRoot, 'supabase/config.toml', 'project_id = "vvip-local"\n');

  const candidateFiles = {
    'index.html': Buffer.from('<!doctype html><title>VVIP TIGER</title>\n'),
    'scripts/runtime/app.js': Buffer.from('console.log("vvip");\n'),
  };
  for (const [relativePath, bytes] of Object.entries(candidateFiles)) write(candidateDir, relativePath, bytes);

  const files = Object.fromEntries(
    Object.entries(candidateFiles).map(([relativePath, bytes]) => [relativePath, sha256Hex(bytes)]),
  );
  write(candidateDir, 'release-manifest.json', `${JSON.stringify({
    schemaVersion: 1,
    mode: 'candidate',
    sourceSha: SOURCE_SHA,
    releaseEligible: true,
    configurationErrors: [],
    forbiddenFindings: [],
    files,
  }, null, 2)}\n`);

  const sbomBytes = Buffer.from(JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    components: [{ type: 'library', name: 'jsonschema', version: '4.23.0' }],
  }));
  const materialRecords = Object.freeze([
    Object.freeze({ path: 'requirements-dev.txt', sha256: sha256Hex('jsonschema==4.23.0\n') }),
    Object.freeze({ path: 'supabase/config.toml', sha256: sha256Hex('project_id = "vvip-local"\n') }),
  ]);

  const git = {
    headSha: () => SOURCE_SHA,
    treeSha: () => SOURCE_TREE,
  };

  return { repositoryRoot, candidateDir, sbomBytes, materialRecords, git };
}

function build(f, overrides = {}) {
  return createReleaseBundleManifest({
    repositoryRoot: f.repositoryRoot,
    candidateDir: f.candidateDir,
    sbomBytes: f.sbomBytes,
    materialRecords: f.materialRecords,
    createdBy: 'github-actions:svef-release-candidate',
    git: f.git,
    fsApi: fs,
    ...overrides,
  });
}

function cleanup(t, f) {
  t.after(() => {
    fs.rmSync(f.repositoryRoot, { recursive: true, force: true });
    fs.rmSync(f.candidateDir, { recursive: true, force: true });
  });
}

test('release bundle derives exact source identity and all internal digests from trusted bytes', (t) => {
  const f = fixture();
  cleanup(t, f);
  const manifest = build(f);

  assert.deepEqual(Object.keys(manifest), [
    'bundle_version',
    'source_sha',
    'source_tree',
    'candidate_manifest_sha256',
    'candidate_content_sha256',
    'sbom_sha256',
    'materials_sha256',
    'created_by',
  ]);
  assert.equal(manifest.bundle_version, 'SVEF_RELEASE_BUNDLE_V1');
  assert.equal(manifest.source_sha, SOURCE_SHA);
  assert.equal(manifest.source_tree, SOURCE_TREE);
  for (const field of [
    'candidate_manifest_sha256',
    'candidate_content_sha256',
    'sbom_sha256',
    'materials_sha256',
  ]) assert.match(manifest[field], /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(manifest), true);
});

test('candidate manifest must be exact-source bound and release eligible', (t) => {
  const f = fixture();
  cleanup(t, f);

  const manifestPath = path.join(f.candidateDir, 'release-manifest.json');
  const original = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, `${JSON.stringify({ ...original, sourceSha: 'd'.repeat(40) })}\n`);
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_SOURCE_MISMATCH');

  fs.writeFileSync(manifestPath, `${JSON.stringify({ ...original, releaseEligible: false })}\n`);
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_INELIGIBLE');
});

test('candidate bytes are recomputed and undeclared missing or tampered files fail closed', (t) => {
  const f = fixture();
  cleanup(t, f);

  fs.appendFileSync(path.join(f.candidateDir, 'index.html'), '<!--tampered-->');
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_HASH_MISMATCH');

  const f2 = fixture();
  t.after(() => {
    fs.rmSync(f2.repositoryRoot, { recursive: true, force: true });
    fs.rmSync(f2.candidateDir, { recursive: true, force: true });
  });
  write(f2.candidateDir, 'unexpected.js', 'surprise\n');
  assert.throws(() => build(f2), (error) => error.code === 'SVEF_CANDIDATE_UNDECLARED_FILE');

  const f3 = fixture();
  t.after(() => {
    fs.rmSync(f3.repositoryRoot, { recursive: true, force: true });
    fs.rmSync(f3.candidateDir, { recursive: true, force: true });
  });
  fs.rmSync(path.join(f3.candidateDir, 'index.html'));
  assert.throws(() => build(f3), (error) => error.code === 'SVEF_CANDIDATE_FILE_MISSING');
});

test('SBOM and materials bytes are independently content bound before external attestation', (t) => {
  const f = fixture();
  cleanup(t, f);
  const baseline = build(f);

  const sbomChanged = build(f, { sbomBytes: Buffer.from(`${f.sbomBytes.toString('utf8')} `) });
  assert.notEqual(sbomChanged.sbom_sha256, baseline.sbom_sha256);

  const materialChanged = build(f, {
    materialRecords: Object.freeze([
      ...f.materialRecords,
      Object.freeze({ path: 'extra.lock', sha256: 'e'.repeat(64) }),
    ]),
  });
  assert.notEqual(materialChanged.materials_sha256, baseline.materials_sha256);
});

test('caller cannot inject authoritative digest source or provenance fields', (t) => {
  const f = fixture();
  cleanup(t, f);

  for (const key of ['source_sha', 'artifact_sha256', 'sbom_sha256', 'provenance_sha256', 'materials_sha256']) {
    assert.throws(
      () => createReleaseBundleManifest({
        repositoryRoot: f.repositoryRoot,
        candidateDir: f.candidateDir,
        sbomBytes: f.sbomBytes,
        materialRecords: f.materialRecords,
        createdBy: 'github-actions:svef-release-candidate',
        git: f.git,
        fsApi: fs,
        [key]: 'f'.repeat(64),
      }),
      (error) => error.code === 'SVEF_UNTRUSTED_INPUT',
    );
  }
});

test('symlinks and path escapes are rejected', (t) => {
  const f = fixture();
  cleanup(t, f);

  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'svef-external-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const externalFile = write(external, 'external.js', 'external\n');
  fs.symlinkSync(externalFile, path.join(f.candidateDir, 'linked.js'));
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_SYMLINK');
});

test('canonical serializer is deterministic and newline terminated', (t) => {
  const f = fixture();
  cleanup(t, f);
  const manifest = build(f);
  const serialized = serializeReleaseBundleManifest(manifest);
  assert.equal(serialized.endsWith('\n'), true);
  assert.equal(serialized, serializeReleaseBundleManifest(manifest));
  assert.deepEqual(JSON.parse(serialized), manifest);
});
