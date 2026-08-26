'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/supply-chain-policy.v1.json');
const { verifySupplyChainEvidence } = require('../scripts/tsn26/release/supply-chain-proof.cjs');

const SOURCE_SHA = '1'.repeat(40);
const ARTIFACT_DIGEST = `sha256:${'2'.repeat(64)}`;

function validEvidence() {
  return {
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: SOURCE_SHA,
    artifact: { name: 'vvip-candidate', digest: ARTIFACT_DIGEST },
    provenance: {
      verified: true,
      predicate_type: 'https://slsa.dev/provenance/v1',
      slsa_version: '1.2',
      subject_digest: ARTIFACT_DIGEST,
      source_sha: SOURCE_SHA,
      builder_identity: 'https://github.com/vvipautoparts-blip/TIGER-VVIP/.github/workflows/v14-release-candidate.yml@refs/pull/328/merge',
      attestation_ref: 'attestation://github/provenance/1',
      digest: `sha256:${'3'.repeat(64)}`,
    },
    sbom: {
      verified: true,
      format: 'CycloneDX',
      spec_version: '1.7',
      artifact_digest: ARTIFACT_DIGEST,
      attestation_ref: 'attestation://github/sbom/1',
      digest: `sha256:${'4'.repeat(64)}`,
    },
    sigstore: {
      verified: true,
      certificate_identity_verified: true,
      trusted_root_verified: true,
      transparency_inclusion_verified: true,
      transparency_log: 'REKOR',
      bundle_ref: 'sigstore://bundle/1',
      bundle_digest: `sha256:${'5'.repeat(64)}`,
    },
  };
}

test('supply-chain proof passes only when provenance, SBOM and Sigstore evidence bind one exact artifact and source', () => {
  const proof = verifySupplyChainEvidence(validEvidence(), { policy, evaluatedAt: new Date('2026-08-26T06:30:00.000Z') });
  assert.equal(proof.status, 'PASS');
  assert.equal(proof.source_sha, SOURCE_SHA);
  assert.equal(proof.artifact_digest, ARTIFACT_DIGEST);
  assert.equal(proof.slsa_version, '1.2');
  assert.equal(proof.sbom_spec_version, '1.7');
  assert.equal(proof.transparency_inclusion_verified, true);
  assert.match(proof.digest, /^sha256:[0-9a-f]{64}$/);
});

test('cross-artifact or cross-source provenance is rejected fail closed', () => {
  const artifactMismatch = validEvidence();
  artifactMismatch.provenance.subject_digest = `sha256:${'9'.repeat(64)}`;
  assert.ok(verifySupplyChainEvidence(artifactMismatch, { policy }).failures.includes('PROVENANCE_ARTIFACT_DIGEST_MISMATCH'));

  const sourceMismatch = validEvidence();
  sourceMismatch.provenance.source_sha = '8'.repeat(40);
  assert.ok(verifySupplyChainEvidence(sourceMismatch, { policy }).failures.includes('PROVENANCE_SOURCE_SHA_MISMATCH'));
});

test('unverified certificate, trust root, or transparency inclusion cannot become a green signature proof', () => {
  for (const field of ['verified', 'certificate_identity_verified', 'trusted_root_verified', 'transparency_inclusion_verified']) {
    const evidence = validEvidence();
    evidence.sigstore[field] = false;
    const result = verifySupplyChainEvidence(evidence, { policy });
    assert.equal(result.status, 'FAIL');
  }
});

test('SLSA predicate and stable SBOM version are explicit policy boundaries', () => {
  const wrongPredicate = validEvidence();
  wrongPredicate.provenance.predicate_type = 'https://example.invalid/provenance';
  assert.ok(verifySupplyChainEvidence(wrongPredicate, { policy }).failures.includes('SLSA_PREDICATE_TYPE_MISMATCH'));

  const futureSbom = validEvidence();
  futureSbom.sbom.spec_version = '2.0';
  assert.ok(verifySupplyChainEvidence(futureSbom, { policy }).failures.includes('SBOM_SPEC_VERSION_NOT_ALLOWED'));
});

test('references and cryptographic digests are mandatory; booleans alone are never evidence', () => {
  const evidence = validEvidence();
  evidence.provenance.attestation_ref = '';
  evidence.sbom.digest = 'bad';
  evidence.sigstore.bundle_ref = '';
  const result = verifySupplyChainEvidence(evidence, { policy });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.failures.includes('PROVENANCE_REF_INVALID'));
  assert.ok(result.failures.includes('SBOM_DIGEST_INVALID'));
  assert.ok(result.failures.includes('SIGSTORE_BUNDLE_REF_INVALID'));
});
