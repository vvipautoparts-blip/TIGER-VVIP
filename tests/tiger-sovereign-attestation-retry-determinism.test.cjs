'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createVerifiedAttestationEvidence } = require('../scripts/release/media-cell-attestation-evidence.cjs');

const H64 = (char) => char.repeat(64);
const REPOSITORY = 'vvipautoparts-blip/TIGER-VVIP';
const ECR_REPOSITORY = '211579682376.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer';
const MANIFEST = `sha256:${H64('c')}`;
const PREDICATE = 'https://slsa.dev/provenance/v1';

function entry(timestamp) {
  return {
    attestation: {
      bundle: {
        verificationMaterial: {
          tlogEntries: [{ integratedTime: timestamp }],
        },
      },
    },
    verificationResult: {
      signature: {
        certificate: {
          notBefore: timestamp,
          notAfter: timestamp + 3600,
        },
      },
      verifiedTimestamps: [{ type: 'Tlog', timestamp }],
      statement: {
        subject: [{ name: ECR_REPOSITORY, digest: { sha256: H64('c') } }],
        predicateType: PREDICATE,
        predicate: {},
      },
    },
  };
}

const expected = {
  repository: REPOSITORY,
  signerWorkflow: 'github.com/vvipautoparts-blip/TIGER-VVIP/.github/workflows/tiger-media-sovereign-sealed-build.yml',
  sourceDigest: 'a'.repeat(40),
  sourceRef: 'refs/heads/main',
  subjectName: ECR_REPOSITORY,
  subjectDigest: MANIFEST,
  predicateType: PREDICATE,
};

test('duplicate verified attestations for the same stable authority do not change release identity', () => {
  const oneBundle = createVerifiedAttestationEvidence([entry(1000)], expected);
  const retryBundles = createVerifiedAttestationEvidence([entry(1000), entry(2000)], expected);

  assert.deepEqual(
    retryBundles,
    oneBundle,
    'Retry-created duplicate attestations must not change deterministic attestation evidence identity',
  );
  assert.equal(
    Object.hasOwn(oneBundle, 'verificationCount'),
    false,
    'Operational attestation multiplicity must not participate in deterministic release evidence',
  );
});
