'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SBOM_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const SUPPLY_GATE = path.join(ROOT, 'scripts', 'release', 'media-cell-supply-gate.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');
const LEGACY_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');
const NEW_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'tiger-media-sovereign-sealed-build.yml');
const DOCKERFILE = path.join(ROOT, 'services', 'media-finalizer', 'Dockerfile');
const MASTER_SPEC = 'docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md';

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '');
}

test('Sovereign release evidence authorities replace the historical Passport v1 path', () => {
  for (const file of [SBOM_HELPER, GENOME_HELPER, SUPPLY_GATE, PASSPORT_HELPER, NEW_WORKFLOW]) read(file);
  const passport = read(PASSPORT_HELPER);
  assert.match(passport, /tiger-release-passport-v2/);
  assert.doesNotMatch(passport, /schemaVersion:\s*['"]tiger-release-passport-v1['"]/);
});

test('Media Finalizer Dockerfile remains Node.js 24 and base-image digest pinned', () => {
  const source = read(DOCKERFILE);
  assert.match(source, /^FROM\s+public\.ecr\.aws\/lambda\/nodejs:24@sha256:[0-9a-f]{64}$/m);
  assert.match(source, /npm\s+ci\s+--omit=dev/);
  assert.doesNotMatch(source, /^FROM\s+[^\n]+:(?:latest|24)\s*$/m);
});

test('legacy sealed-build workflow remains explicitly quarantined', () => {
  const source = read(LEGACY_WORKFLOW);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.match(source, new RegExp(MASTER_SPEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source, /exit\s+1/);
  assert.match(source, /^  contents: read$/m);
  assert.doesNotMatch(source, /id-token:\s*write|attestations:\s*write|configure-aws-credentials/i);
  assert.doesNotMatch(source, /docker\s+(?:build|push)|aws\s+ecr|gh\s+attestation|media-cell-passport\.cjs/i);
  assert.doesNotMatch(source, /infra\/media-finalizer\/template\.yaml/);
});
