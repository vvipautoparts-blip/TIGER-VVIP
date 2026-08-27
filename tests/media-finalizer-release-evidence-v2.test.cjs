'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');

const H40_A = 'a'.repeat(40);
const H40_B = 'b'.repeat(40);
const H64 = (char) => char.repeat(64);

const REQUIRED_MATERIALS = [
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
];

function evidence() {
  const materials = {};
  REQUIRED_MATERIALS.forEach((name, index) => { materials[name] = H64(String.fromCharCode(97 + index)); });
  return {
    source: { commitSha: H40_A, treeSha: H40_B, immutable: true },
    materials,
    image: {
      repository: '211579682376.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer',
      manifestDigest: `sha256:${H64('c')}`,
      baseDigest: `sha256:${H64('d')}`,
    },
    database: { migrationSetSha256: H64('e') },
    sbom: {
      specVersion: '1.7',
      sha256: H64('f'),
      subjectDigest: `sha256:${H64('c')}`,
      path: 'artifacts/media-cell/media-finalizer.cdx.json',
      componentCount: 12,
    },
    scan: {
      status: 'COMPLETE',
      critical: 0,
      high: 0,
      medium: 0,
      low: 1,
      findingsSha256: H64('1'),
    },
    attestations: {
      provenance: { verified: true, evidenceSha256: H64('2') },
      sbom: { verified: true, evidenceSha256: H64('3') },
    },
  };
}

test('Cryptographic Genome is deterministic and changes with authoritative material', () => {
  assert.equal(fs.existsSync(GENOME_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-genome.cjs');
  const { createMediaCellGenome } = require(GENOME_HELPER);
  const first = createMediaCellGenome(evidence());
  const reordered = JSON.parse(JSON.stringify(evidence()));
  reordered.materials = Object.fromEntries(Object.entries(reordered.materials).reverse());
  const second = createMediaCellGenome(reordered);
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-cryptographic-genome-v1');
  assert.equal(first.algorithm, 'sha256');
  assert.match(first.id, /^[0-9a-f]{64}$/);

  const changed = evidence();
  changed.materials['services/media-finalizer/Dockerfile'] = H64('9');
  assert.notEqual(createMediaCellGenome(changed).id, first.id);
});

test('Release Passport 2.0 binds Genome and explicitly records sealed-build-only state', () => {
  assert.equal(fs.existsSync(PASSPORT_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-passport.cjs');
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const passport = createMediaCellPassport(evidence());
  assert.equal(passport.schemaVersion, 'tiger-release-passport-v2');
  assert.match(passport.genome.id, /^[0-9a-f]{64}$/);
  assert.equal(passport.image.repository.includes('.dkr.ecr.ap-northeast-2.amazonaws.com/'), true);
  assert.equal(passport.sbom.specVersion, '1.7');
  assert.equal(passport.sbom.subjectDigest, passport.image.manifestDigest);
  assert.equal(passport.scan.critical, 0);
  assert.equal(passport.scan.high, 0);
  assert.equal(passport.attestations.provenance.verified, true);
  assert.equal(passport.attestations.sbom.verified, true);
  assert.deepEqual(passport.deployment, {
    mode: 'sealed-build-only',
    runtimeRegion: 'ap-northeast-2',
    edgeControlRegion: 'us-east-1',
    regionalStack: null,
    edgeStack: null,
    lambdaVersion: null,
    cloudFrontDistribution: null,
    wafWebAcl: null,
  });
  assert.doesNotMatch(JSON.stringify(passport), /\bslsa\b/i);
});

test('Passport 2.0 rejects mismatched SBOM subject and secret-shaped material', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const mismatch = evidence();
  mismatch.sbom.subjectDigest = `sha256:${H64('9')}`;
  assert.throws(() => createMediaCellPassport(mismatch), /PASSPORT_/);

  const secret = evidence();
  secret.secretValue = 'sb_secret_forbidden';
  assert.throws(() => createMediaCellPassport(secret), /PASSPORT_SECRET_MATERIAL_REJECTED|PASSPORT_EVIDENCE_UNKNOWN/);
});
