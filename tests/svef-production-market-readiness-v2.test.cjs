'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { sha256Hex } = require('../scripts/tsrf/evidence/contracts.cjs');
const {
  createProductionReleaseBundleManifest,
  createReleaseBundleManifest,
  serializeReleaseBundleManifest,
} = require('../scripts/tsrf/svef/release-bundle.cjs');

const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_TREE = 'b'.repeat(40);
const MARKET_EVIDENCE_BYTES = Buffer.from('{"schema":"TIGER_MARKET_GENESIS_SOURCE_READINESS_V1"}', 'utf8');

function write(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, value);
  return absolute;
}

function fixture(mode) {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-m11-repo-'));
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-svef-m11-candidate-'));
  const materialBytes = Buffer.from('jsonschema==4.26.0\n');
  const appBytes = Buffer.from('<!doctype html><title>VVIP TIGER</title>\n');
  write(repositoryRoot, 'requirements-dev.txt', materialBytes);
  write(candidateDir, 'index.html', appBytes);
  write(candidateDir, 'release-manifest.json', `${JSON.stringify({
    schemaVersion: 1,
    mode,
    sourceSha: SOURCE_SHA,
    releaseEligible: true,
    configurationErrors: [],
    forbiddenFindings: [],
    files: { 'index.html': sha256Hex(appBytes) },
  }, null, 2)}\n`);

  return {
    repositoryRoot,
    candidateDir,
    options: {
      repositoryRoot,
      candidateDir,
      sbomBytes: Buffer.from('{"bomFormat":"CycloneDX","specVersion":"1.6"}\n'),
      materialRecords: [{ path: 'requirements-dev.txt', sha256: sha256Hex(materialBytes) }],
      createdBy: mode === 'production'
        ? 'github-actions:production-release-artifact'
        : 'github-actions:exact-sha-release',
      git: { headSha: () => SOURCE_SHA, treeSha: () => SOURCE_TREE },
      fsApi: fs,
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

test('M11 keeps Candidate release bundle on exact V1 without Market evidence input', (t) => {
  const f = fixture('candidate');
  cleanup(t, f);
  const manifest = createReleaseBundleManifest(f.options);
  assert.equal(manifest.bundle_version, 'SVEF_RELEASE_BUNDLE_V1');
  assert.equal(Object.hasOwn(manifest, 'market_genesis_source_readiness_sha256'), false);
});

test('M11 Production bundle fails closed when Market Genesis source-readiness bytes are missing', (t) => {
  const f = fixture('production');
  cleanup(t, f);
  assert.throws(
    () => createProductionReleaseBundleManifest(f.options),
    (error) => error && error.code === 'MARKET_SOURCE_READINESS_MISSING',
  );
});

test('M11 Production bundle is exact V2 and binds the Market Genesis evidence bytes', (t) => {
  const f = fixture('production');
  cleanup(t, f);
  const manifest = createProductionReleaseBundleManifest({
    ...f.options,
    marketGenesisSourceReadinessBytes: MARKET_EVIDENCE_BYTES,
  });

  assert.deepEqual(Object.keys(manifest), [
    'bundle_version',
    'source_sha',
    'source_tree',
    'candidate_manifest_sha256',
    'candidate_content_sha256',
    'sbom_sha256',
    'materials_sha256',
    'market_genesis_source_readiness_sha256',
    'created_by',
  ]);
  assert.equal(manifest.bundle_version, 'SVEF_PRODUCTION_RELEASE_BUNDLE_V2');
  assert.equal(manifest.market_genesis_source_readiness_sha256, sha256Hex(MARKET_EVIDENCE_BYTES));
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(JSON.parse(serializeReleaseBundleManifest(manifest)).bundle_version, 'SVEF_PRODUCTION_RELEASE_BUNDLE_V2');
});

test('M11 Production bundle rejects empty Market Genesis evidence bytes', (t) => {
  const f = fixture('production');
  cleanup(t, f);
  assert.throws(
    () => createProductionReleaseBundleManifest({
      ...f.options,
      marketGenesisSourceReadinessBytes: Buffer.alloc(0),
    }),
    (error) => error && error.code === 'MARKET_SOURCE_READINESS_INVALID',
  );
});
