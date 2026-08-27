'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SBOM_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');

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

test('Task 9 release-evidence authority files exist', () => {
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

test('build workflow is exact-main, OIDC-only, build-once, digest-bound, scanned, attested, verified, and SHA-pinned', () => {
  const source = read(WORKFLOW);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /id-token:\s*write/);
  assert.match(source, /attestations:\s*write/);
  assert.match(source, /contents:\s*read/);
  assert.doesNotMatch(source, /secrets\.|aws-access-key-id|aws-secret-access-key|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i);

  const uses = [...source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
  assert.ok(uses.length >= 4, 'EXPECTED_PINNED_ACTIONS');
  for (const value of uses) {
    assert.match(value, /^[^@\s]+@[0-9a-f]{40}$/, `ACTION_NOT_SHA_PINNED:${value}`);
  }

  assert.match(source, /git\s+rev-parse\s+origin\/main/);
  assert.match(source, /git\s+rev-parse\s+'?HEAD\^\{tree\}'?/);
  assert.match(source, /sha256sum\s+services\/media-finalizer\/package-lock\.json/);
  assert.match(source, /sha256sum\s+services\/media-finalizer\/Dockerfile/);
  assert.match(source, /sha256sum\s+infra\/media-finalizer\/template\.yaml/);
  assert.match(source, /sha256sum\s+infra\/media-finalizer\/guard\/media-finalizer\.guard/);
  assert.match(source, /public\.ecr\.aws\/lambda\/nodejs:24@sha256:[0-9a-f]{64}/);

  assert.equal((source.match(/\bdocker\s+build\b/g) || []).length, 1, 'IMAGE_MUST_BE_BUILT_ONCE');
  assert.match(source, /docker\s+push/);
  assert.match(source, /describe-images/);
  assert.match(source, /imageDigest/);
  assert.match(source, /image-scan-complete/);
  assert.match(source, /describe-image-scan-findings/);
  assert.match(source, /media-cell-sbom\.cjs/);
  assert.match(source, /specVersion[^\n]*1\.7|SPEC_VERSION[^\n]*1\.7/i);

  const attestIndex = source.indexOf('actions/attest@');
  const verifyIndex = source.indexOf('gh attestation verify');
  const passportIndex = source.indexOf('media-cell-passport.cjs');
  assert.ok(attestIndex >= 0, 'ATTESTATION_ACTION_REQUIRED');
  assert.ok(verifyIndex > attestIndex, 'ATTESTATION_MUST_BE_VERIFIED_AFTER_CREATION');
  assert.ok(passportIndex > verifyIndex, 'PASSPORT_MUST_FOLLOW_ATTESTATION_VERIFICATION');
  assert.match(source, /oci:\/\//);
  assert.match(source, /git\s+status\s+--porcelain/);
  assert.doesNotMatch(source, /cloudformation\s+(?:deploy|execute-change-set)|update-function-code|TIGER_MEDIA_FINALIZER_URL/i);
});