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
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-postmerge-repo-'));
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-postmerge-candidate-'));

  const materialBytes = Buffer.from('jsonschema==4.26.0\n');
  write(repositoryRoot, 'requirements-dev.txt', materialBytes);

  const candidateBytes = Buffer.from('<!doctype html><title>VVIP TIGER</title>\n');
  write(candidateDir, 'index.html', candidateBytes);

  const baseManifest = {
    schemaVersion: 1,
    mode: 'candidate',
    sourceSha: SOURCE_SHA,
    releaseEligible: true,
    configurationErrors: [],
    forbiddenFindings: [],
    files: {
      'index.html': sha256Hex(candidateBytes),
    },
  };

  const materialRecords = [{
    path: 'requirements-dev.txt',
    sha256: sha256Hex(materialBytes),
  }];

  return {
    repositoryRoot,
    candidateDir,
    baseManifest,
    materialRecords,
    sbomBytes: Buffer.from('{"bomFormat":"CycloneDX","specVersion":"1.6"}\n'),
    git: {
      headSha: () => SOURCE_SHA,
      treeSha: () => SOURCE_TREE,
    },
  };
}

function cleanup(t, f) {
  t.after(() => {
    fs.rmSync(f.repositoryRoot, { recursive: true, force: true });
    fs.rmSync(f.candidateDir, { recursive: true, force: true });
  });
}

function writeManifest(f, overrides = {}) {
  write(
    f.candidateDir,
    'release-manifest.json',
    `${JSON.stringify({ ...f.baseManifest, ...overrides }, null, 2)}\n`,
  );
}

function build(f) {
  return createReleaseBundleManifest({
    repositoryRoot: f.repositoryRoot,
    candidateDir: f.candidateDir,
    sbomBytes: f.sbomBytes,
    materialRecords: f.materialRecords,
    createdBy: 'github-actions:exact-sha-release',
    git: f.git,
    fsApi: fs,
  });
}

test('serialized release bundle round-trips through JSON parse without depending on insertion order', (t) => {
  const f = fixture();
  cleanup(t, f);
  writeManifest(f);

  const first = serializeReleaseBundleManifest(build(f));
  const parsed = JSON.parse(first);

  assert.equal(serializeReleaseBundleManifest(parsed), first);
});

test('candidate eligibility is independently fail-closed for mode and evidence arrays', (t) => {
  const f = fixture();
  cleanup(t, f);

  writeManifest(f, { mode: 'preview' });
  assert.throws(
    () => build(f),
    (error) => error.code === 'SVEF_CANDIDATE_MANIFEST_INVALID',
  );

  writeManifest(f, { configurationErrors: ['missing required production key'] });
  assert.throws(
    () => build(f),
    (error) => error.code === 'SVEF_CANDIDATE_INELIGIBLE',
  );

  writeManifest(f, { forbiddenFindings: ['forbidden release finding'] });
  assert.throws(
    () => build(f),
    (error) => error.code === 'SVEF_CANDIDATE_INELIGIBLE',
  );
});
