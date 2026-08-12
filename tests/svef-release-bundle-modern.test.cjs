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

function write(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, value);
  return absolute;
}

function fixture() {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-repo-'));
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-candidate-'));

  const materialBytes = {
    'requirements-dev.txt': Buffer.from('jsonschema==4.26.0\n'),
    'supabase/config.toml': Buffer.from('project_id = "vvip-local"\n'),
  };
  for (const [relativePath, bytes] of Object.entries(materialBytes)) write(repositoryRoot, relativePath, bytes);

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

  const materialRecords = Object.freeze(
    Object.entries(materialBytes).map(([relativePath, bytes]) => Object.freeze({
      path: relativePath,
      sha256: sha256Hex(bytes),
    })),
  );

  return {
    repositoryRoot,
    candidateDir,
    sbomBytes: Buffer.from('{"bomFormat":"CycloneDX","specVersion":"1.6"}\n'),
    materialRecords,
    git: {
      headSha: () => SOURCE_SHA,
      treeSha: () => SOURCE_TREE,
    },
  };
}

function cleanup(t, ...fixtures) {
  t.after(() => {
    for (const f of fixtures) {
      fs.rmSync(f.repositoryRoot, { recursive: true, force: true });
      fs.rmSync(f.candidateDir, { recursive: true, force: true });
    }
  });
}

function build(f, overrides = {}) {
  return createReleaseBundleManifest({
    repositoryRoot: f.repositoryRoot,
    candidateDir: f.candidateDir,
    sbomBytes: f.sbomBytes,
    materialRecords: f.materialRecords,
    createdBy: 'github-actions:exact-sha-release',
    git: f.git,
    fsApi: fs,
    ...overrides,
  });
}

test('release bundle is exact-source bound, deterministic, immutable, and content addressed', (t) => {
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
  for (const key of ['candidate_manifest_sha256', 'candidate_content_sha256', 'sbom_sha256', 'materials_sha256']) {
    assert.match(manifest[key], /^[0-9a-f]{64}$/);
  }
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(serializeReleaseBundleManifest(manifest), serializeReleaseBundleManifest(build(f)));
});

test('candidate manifest must match exact source and be release eligible', (t) => {
  const f = fixture();
  cleanup(t, f);
  const manifestPath = path.join(f.candidateDir, 'release-manifest.json');
  const original = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  fs.writeFileSync(manifestPath, `${JSON.stringify({ ...original, sourceSha: 'd'.repeat(40) })}\n`);
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_SOURCE_MISMATCH');

  fs.writeFileSync(manifestPath, `${JSON.stringify({ ...original, releaseEligible: false })}\n`);
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_INELIGIBLE');
});

test('candidate file set and bytes are recomputed and fail closed on tampering', (t) => {
  const tampered = fixture();
  const undeclared = fixture();
  const missing = fixture();
  cleanup(t, tampered, undeclared, missing);

  fs.appendFileSync(path.join(tampered.candidateDir, 'index.html'), '<!--tampered-->');
  assert.throws(() => build(tampered), (error) => error.code === 'SVEF_CANDIDATE_HASH_MISMATCH');

  write(undeclared.candidateDir, 'unexpected.js', 'surprise\n');
  assert.throws(() => build(undeclared), (error) => error.code === 'SVEF_CANDIDATE_UNDECLARED_FILE');

  fs.rmSync(path.join(missing.candidateDir, 'index.html'));
  assert.throws(() => build(missing), (error) => error.code === 'SVEF_CANDIDATE_FILE_MISSING');
});

test('repository materials are verified against trusted bytes instead of trusting caller digests', (t) => {
  const f = fixture();
  cleanup(t, f);
  const baseline = build(f);

  fs.appendFileSync(path.join(f.repositoryRoot, 'requirements-dev.txt'), '# changed\n');
  assert.throws(() => build(f), (error) => error.code === 'SVEF_MATERIAL_HASH_MISMATCH');

  const changedRecords = f.materialRecords.map((record) => ({ ...record }));
  changedRecords[0].sha256 = sha256Hex(fs.readFileSync(path.join(f.repositoryRoot, changedRecords[0].path)));
  const changed = build(f, { materialRecords: changedRecords });
  assert.notEqual(changed.materials_sha256, baseline.materials_sha256);
});

test('repository material paths cannot escape the root or traverse symlinks', (t) => {
  const escaped = fixture();
  const linked = fixture();
  cleanup(t, escaped, linked);

  assert.throws(
    () => build(escaped, { materialRecords: [{ path: '../outside.lock', sha256: 'e'.repeat(64) }] }),
    (error) => error.code === 'SVEF_MATERIAL_PATH_ESCAPE',
  );

  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-material-external-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const externalFile = write(external, 'external.lock', 'external\n');
  fs.symlinkSync(externalFile, path.join(linked.repositoryRoot, 'linked.lock'));
  assert.throws(
    () => build(linked, { materialRecords: [{ path: 'linked.lock', sha256: sha256Hex('external\n') }] }),
    (error) => error.code === 'SVEF_MATERIAL_SYMLINK',
  );
});

test('candidate tree rejects symlinks and caller cannot inject authority-bearing bundle fields', (t) => {
  const f = fixture();
  cleanup(t, f);

  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-candidate-external-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const externalFile = write(external, 'external.js', 'external\n');
  fs.symlinkSync(externalFile, path.join(f.candidateDir, 'linked.js'));
  assert.throws(() => build(f), (error) => error.code === 'SVEF_CANDIDATE_SYMLINK');

  fs.rmSync(path.join(f.candidateDir, 'linked.js'));
  for (const key of ['source_sha', 'artifact_sha256', 'sbom_sha256', 'provenance_sha256', 'materials_sha256', 'authorized']) {
    assert.throws(
      () => createReleaseBundleManifest({
        repositoryRoot: f.repositoryRoot,
        candidateDir: f.candidateDir,
        sbomBytes: f.sbomBytes,
        materialRecords: f.materialRecords,
        createdBy: 'github-actions:exact-sha-release',
        git: f.git,
        fsApi: fs,
        [key]: key === 'authorized' ? true : 'f'.repeat(64),
      }),
      (error) => error.code === 'SVEF_UNTRUSTED_INPUT',
    );
  }
});

test('serializer is canonical and newline terminated', (t) => {
  const f = fixture();
  cleanup(t, f);
  const serialized = serializeReleaseBundleManifest(build(f));
  assert.equal(serialized.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(serialized), build(f));
});
