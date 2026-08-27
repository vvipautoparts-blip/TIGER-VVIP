'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SBOM_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');
const MASTER_SPEC = 'docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md';

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

const H40_A = 'a'.repeat(40);
const H40_B = 'b'.repeat(40);
const H64_A = 'a'.repeat(64);
const H64_B = 'b'.repeat(64);
const H64_C = 'c'.repeat(64);
const H64_D = 'd'.repeat(64);
const H64_E = 'e'.repeat(64);
const H64_F = 'f'.repeat(64);

function validEvidence() {
  return {
    source: { commitSha: H40_A, treeSha: H40_B, immutable: true },
    materials: {
      'services/media-finalizer/package-lock.json': H64_A,
      'services/media-finalizer/Dockerfile': H64_B,
      'infra/media-finalizer/template.yaml': H64_C,
      'infra/media-finalizer/guard/media-finalizer.guard': H64_D,
    },
    image: {
      repository: '123456789012.dkr.ecr.us-east-1.amazonaws.com/tiger-media-finalizer',
      manifestDigest: `sha256:${H64_E}`,
      baseDigest: `sha256:${H64_F}`,
    },
    sbom: {
      specVersion: '1.7',
      sha256: H64_A,
      path: 'artifacts/media-cell/media-finalizer.cdx.json',
    },
    scan: { status: 'COMPLETE', findingsSha256: H64_B },
    attestations: {
      provenance: { verified: true, evidenceSha256: H64_C },
      sbom: { verified: true, evidenceSha256: H64_D },
    },
  };
}

test('release-evidence helper authorities and the quarantined legacy build entrypoint exist', () => {
  for (const file of [SBOM_HELPER, PASSPORT_HELPER, WORKFLOW]) read(file);
});

test('media-cell SBOM is deterministic CycloneDX 1.7 with sorted SHA-256 materials', () => {
  const { createMediaCellSbom } = require(SBOM_HELPER);
  const input = validEvidence();
  const first = createMediaCellSbom(input);
  const second = createMediaCellSbom(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(first, second);
  assert.equal(first.bomFormat, 'CycloneDX');
  assert.equal(first.specVersion, '1.7');
  assert.deepEqual(
    first.components.map((component) => component.name),
    Object.keys(input.materials).sort(),
  );
  for (const component of first.components) {
    assert.equal(component.hashes[0].alg, 'SHA-256');
    assert.match(component.hashes[0].content, /^[0-9a-f]{64}$/);
  }
});

test('release passport fails closed on missing, unknown, secret-shaped, or unverified evidence', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const good = validEvidence();
  const first = createMediaCellPassport(good);
  const second = createMediaCellPassport(JSON.parse(JSON.stringify(good)));
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-release-passport-v1');
  assert.equal(first.sbom.specVersion, '1.7');
  assert.equal(first.attestations.provenance.verified, true);
  assert.equal(first.attestations.sbom.verified, true);
  assert.doesNotMatch(JSON.stringify(first), /\bslsa\b/i);

  const missing = validEvidence();
  delete missing.image.manifestDigest;
  assert.throws(() => createMediaCellPassport(missing), /PASSPORT_EVIDENCE_INVALID/);

  const unknown = validEvidence();
  unknown.extra = true;
  assert.throws(() => createMediaCellPassport(unknown), /PASSPORT_EVIDENCE_UNKNOWN/);

  const unverified = validEvidence();
  unverified.attestations.provenance.verified = false;
  assert.throws(() => createMediaCellPassport(unverified), /PASSPORT_ATTESTATION_UNVERIFIED/);

  const secret = validEvidence();
  secret.secretValue = 'sb_secret_forbidden';
  assert.throws(() => createMediaCellPassport(secret), /PASSPORT_SECRET_MATERIAL_REJECTED|PASSPORT_EVIDENCE_UNKNOWN/);
});

test('legacy sealed-build workflow is explicitly quarantined until the Sovereign Constellation replacement exists', () => {
  const source = read(WORKFLOW).replace(/\r/g, '');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.match(source, new RegExp(MASTER_SPEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source, /exit\s+1/);
  assert.match(source, /^  contents: read$/m);
  assert.doesNotMatch(source, /id-token:\s*write|attestations:\s*write|configure-aws-credentials/i);
  assert.doesNotMatch(source, /docker\s+(?:build|push)|aws\s+ecr|gh\s+attestation|media-cell-passport\.cjs/i);
  assert.doesNotMatch(source, /infra\/media-finalizer\/template\.yaml/);
});
