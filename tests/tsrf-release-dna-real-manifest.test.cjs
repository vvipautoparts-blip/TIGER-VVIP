'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { sha256Hex } = require('../scripts/tsrf/evidence/contracts.cjs');
const { deriveReleaseDna } = require('../scripts/tsrf/evidence/release-dna.cjs');

const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_TREE = 'b'.repeat(40);

function write(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function realCandidateFixture() {
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrf-real-manifest-'));
  const files = {
    'index.html': Buffer.from('<!doctype html><title>VVIP candidate</title>\n'),
    'runtime-config.js': Buffer.from('window.__VVIP_RUNTIME_CONFIG__ = Object.freeze({});\n'),
  };
  for (const [relativePath, bytes] of Object.entries(files)) {
    write(candidateDir, relativePath, bytes);
  }
  const fileDigests = Object.fromEntries(
    Object.entries(files).map(([relativePath, bytes]) => [relativePath, sha256Hex(bytes)]),
  );
  write(candidateDir, 'release-manifest.json', `${JSON.stringify({
    schemaVersion: 1,
    mode: 'candidate',
    sourceSha: SOURCE_SHA,
    releaseEligible: true,
    configurationErrors: [],
    forbiddenFindings: [],
    files: fileDigests,
  }, null, 2)}\n`);
  return candidateDir;
}

function derive(candidateDir) {
  return deriveReleaseDna({
    repositoryRoot: path.resolve(__dirname, '..'),
    candidateDir,
    environmentClass: 'STAGING_CANDIDATE',
    git: {
      headSha: () => SOURCE_SHA,
      treeSha: () => SOURCE_TREE,
    },
    fsApi: fs,
  });
}

test('Release DNA accepts the actual V14 release-manifest.json schema without synthetic fileCount', (t) => {
  const candidateDir = realCandidateFixture();
  t.after(() => fs.rmSync(candidateDir, { recursive: true, force: true }));
  const dna = derive(candidateDir);
  assert.match(dna.frontend_build_sha256, /^[0-9a-f]{64}$/);
});

test('Release DNA rejects inconsistent eligibility metadata even if releaseEligible is forged true', (t) => {
  const candidateDir = realCandidateFixture();
  t.after(() => fs.rmSync(candidateDir, { recursive: true, force: true }));
  const manifestPath = path.join(candidateDir, 'release-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.configurationErrors = ['hidden error'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.throws(
    () => derive(candidateDir),
    (error) => error.code === 'RELEASE_DNA_FRONTEND_INELIGIBLE',
  );
});

test('Release DNA rejects unmanifested candidate bytes under the real manifest schema', (t) => {
  const candidateDir = realCandidateFixture();
  t.after(() => fs.rmSync(candidateDir, { recursive: true, force: true }));
  write(candidateDir, 'unexpected.js', 'unexpected\n');
  assert.throws(
    () => derive(candidateDir),
    (error) => error.code === 'RELEASE_DNA_FRONTEND_UNDECLARED_FILE',
  );
});
