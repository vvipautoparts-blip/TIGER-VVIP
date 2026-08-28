'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'tiger-media-sovereign-sealed-build.yml');
const SBOM_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const ATTESTATION_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-attestation-evidence.cjs');
const H64 = (char) => char.repeat(64);
const SOURCE_REPOSITORY = 'vvipautoparts-blip/TIGER-VVIP';
const ECR_REPOSITORY = '211579682376.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer';
const MANIFEST = `sha256:${H64('c')}`;

function readWorkflow() {
  return fs.readFileSync(WORKFLOW, 'utf8').replace(/\r/g, '');
}

function rawSbom(timestamp, serialNumber) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.7',
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      component: { type: 'container', name: 'TIGER-media-finalizer' },
      properties: [],
    },
    components: [{ type: 'library', name: 'sharp', version: '0.35.3' }],
  };
}

function materials() {
  const names = [
    'services/media-finalizer/Dockerfile',
    'services/media-finalizer/package-lock.json',
    'infra/media-finalizer/foundation/template.yaml',
    'infra/media-finalizer/foundation/guard.guard',
    'infra/media-finalizer/regional/template.yaml',
    'infra/media-finalizer/regional/guard.guard',
    'infra/media-finalizer/edge/template.yaml',
    'infra/media-finalizer/edge/guard.guard',
  ];
  const chars = ['a', 'b', 'c', 'd', 'e', 'f', '1', '2'];
  return Object.fromEntries(names.map((name, index) => [name, H64(chars[index])]));
}

function genomeEvidence() {
  return {
    source: {
      repository: SOURCE_REPOSITORY,
      commitSha: 'a'.repeat(40),
      treeSha: 'b'.repeat(40),
      mainSha: 'a'.repeat(40),
      immutable: true,
      eligibility: {
        state: 'VERIFIED_CURRENT_PROTECTED_MAIN',
        dbConvergenceState: 'VERIFIED_LIVE',
        dbConvergenceEvidenceSha256: H64('4'),
      },
    },
    materials: materials(),
    image: {
      repository: ECR_REPOSITORY,
      manifestDigest: MANIFEST,
      baseDigest: `sha256:${H64('d')}`,
    },
    database: { migrationSetSha256: H64('e') },
    sbom: {
      specVersion: '1.7',
      sha256: H64('f'),
      subjectDigest: MANIFEST,
      path: 'artifacts/media-cell/oci-sbom.cdx.json',
      componentCount: 1,
    },
    attestations: {
      provenance: { verified: true, evidenceSha256: H64('2') },
      sbom: { verified: true, evidenceSha256: H64('3') },
    },
  };
}

function verificationDocument(timestamp, predicateType = 'https://slsa.dev/provenance/v1') {
  return [{
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
          subjectAlternativeName: 'https://github.com/vvipautoparts-blip/TIGER-VVIP/.github/workflows/tiger-media-sovereign-sealed-build.yml@refs/heads/main',
        },
      },
      verifiedTimestamps: [{ type: 'Tlog', timestamp }],
      statement: {
        subject: [{ name: ECR_REPOSITORY, digest: { sha256: H64('c') } }],
        predicateType,
        predicate: { buildDefinition: { buildType: 'https://actions.github.io/buildtypes/workflow/v1' } },
      },
    },
  }];
}

function attestationExpectation(predicateType = 'https://slsa.dev/provenance/v1') {
  return {
    repository: SOURCE_REPOSITORY,
    signerWorkflow: 'github.com/vvipautoparts-blip/TIGER-VVIP/.github/workflows/tiger-media-sovereign-sealed-build.yml',
    sourceDigest: 'a'.repeat(40),
    sourceRef: 'refs/heads/main',
    subjectName: ECR_REPOSITORY,
    subjectDigest: MANIFEST,
    predicateType,
  };
}

test('Release Passport reuses the canonical SBOM digest that passed the supply gate', () => {
  const workflow = readWorkflow();
  assert.doesNotMatch(
    workflow,
    /SBOM_SHA="\$\(sha256sum \/tmp\/tiger-media\/artifacts\/media-cell\/oci-sbom\.cdx\.json/,
    'SBOM identity must not hash newline-terminated artifact bytes independently of the validator',
  );
  assert.match(workflow, /sbomSha256/, 'Workflow must propagate the validator/supply-gate authoritative sbomSha256');
});

test('Attestation verification evidence is recursively canonicalized before hashing', () => {
  const workflow = readWorkflow();
  assert.doesNotMatch(
    workflow,
    /JSON\.stringify\(value, Object\.keys\(value\)\.sort\(\)\)/,
    'Top-level JSON replacer collapses nested verification objects',
  );
  assert.match(workflow, /canonicalJson|canonicalize/, 'Attestation evidence must use recursive canonicalization');
});

test('Attestation evidence identity excludes operational signing and transparency timestamps', () => {
  assert.equal(fs.existsSync(ATTESTATION_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-attestation-evidence.cjs');
  const { createVerifiedAttestationEvidence } = require(ATTESTATION_HELPER);
  const first = createVerifiedAttestationEvidence(verificationDocument(1000), attestationExpectation());
  const second = createVerifiedAttestationEvidence(verificationDocument(2000), attestationExpectation());
  assert.deepEqual(first, second, 'Operational attestation timestamps/certificate validity must not change release identity');
  assert.equal(first.verified, true);
  assert.equal(first.subject.name, ECR_REPOSITORY);
  assert.equal(first.subject.digest, MANIFEST);
  assert.equal(first.predicateType, 'https://slsa.dev/provenance/v1');
  assert.equal(first.source.repository, SOURCE_REPOSITORY);
  assert.equal(first.source.digest, 'a'.repeat(40));
  assert.equal(first.source.ref, 'refs/heads/main');
  assert.match(first.evidenceSha256, /^[0-9a-f]{64}$/);
});

test('OCI-pushed provenance and SBOM attestations are verified from the OCI registry', () => {
  const workflow = readWorkflow();
  const flags = workflow.match(/--bundle-from-oci/g) || [];
  assert.equal(flags.length, 2, 'Both OCI attestation verifications must fetch their bundles from ECR');
});

test('Immutable ECR image publishing is retry-safe without weakening immutable tags', () => {
  const workflow = readWorkflow();
  const buildPushStart = workflow.indexOf('- name: Build once and push once');
  assert.notEqual(buildPushStart, -1, 'BUILD_PUSH_STEP_MISSING');
  const buildPushEnd = workflow.indexOf('\n      - name:', buildPushStart + 1);
  const step = workflow.slice(buildPushStart, buildPushEnd === -1 ? undefined : buildPushEnd);
  const uniqueAttemptTag = /IMAGE_TAG=.*GITHUB_RUN_ID.*GITHUB_RUN_ATTEMPT|IMAGE_TAG=.*GITHUB_RUN_ATTEMPT.*GITHUB_RUN_ID/s.test(step);
  const validatedExistingDigest = /describe-images/.test(step) && /existing|EXISTING|already|ALREADY/.test(step);
  assert.equal(uniqueAttemptTag || validatedExistingDigest, true, 'Immutable publishing must use a unique per-attempt tag or safely validate/reuse an existing digest');
  assert.match(step, /MANIFEST_DIGEST/, 'Publishing must resolve the immutable manifest digest');
});

test('Enhanced continuous scanning accepts ACTIVE only with completed-findings evidence', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /ACTIVE/, 'CONTINUOUS_SCAN can report ACTIVE and must be handled explicitly');
  assert.match(workflow, /imageScanCompletedAt/, 'ACTIVE must be accepted only after evidence of at least one completed scan exists');
  assert.doesNotMatch(workflow, /status:\s*'COMPLETE'/, 'Normalized evidence must not falsely rewrite ACTIVE to COMPLETE');
});

test('Scan evidence hash binds the image subject and stable finding identities, not severity counters alone', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /enhancedFindings|findings\s*\|\|\s*\[\]/, 'Evidence projection must include actual scanner findings');
  assert.match(workflow, /findingArn|vulnerabilityId|\bname\b/, 'Evidence projection must include stable finding identifiers');
  assert.match(workflow, /MANIFEST_DIGEST|manifestDigest/, 'Evidence projection must bind findings to the exact OCI image subject');
  assert.doesNotMatch(workflow, /createHash\('sha256'\)\.update\(canonical\).*canonicalCounts/s, 'findingsSha256 must not be derived only from aggregate severity counters');
});

test('SBOM identity excludes volatile Syft serial number and generation timestamp', () => {
  const { bindRealContainerSbom, validateRealContainerSbom } = require(SBOM_HELPER);
  const first = bindRealContainerSbom(rawSbom('2026-08-28T07:00:00Z', 'urn:uuid:11111111-1111-4111-8111-111111111111'), { repository: ECR_REPOSITORY, manifestDigest: MANIFEST });
  const second = bindRealContainerSbom(rawSbom('2026-08-28T07:15:00Z', 'urn:uuid:22222222-2222-4222-8222-222222222222'), { repository: ECR_REPOSITORY, manifestDigest: MANIFEST });
  assert.equal(Object.hasOwn(first, 'serialNumber'), false, 'Volatile CycloneDX serialNumber must be normalized out');
  assert.equal(Object.hasOwn(first.metadata, 'timestamp'), false, 'Volatile Syft metadata.timestamp must be normalized out');
  assert.equal(validateRealContainerSbom(first, MANIFEST).sha256, validateRealContainerSbom(second, MANIFEST).sha256, 'Same OCI inventory must keep one deterministic SBOM identity across retries');
});

test('Genome binds repository, exact current-main eligibility, and DB convergence prerequisite evidence', () => {
  const { createMediaCellGenome } = require(GENOME_HELPER);
  const first = createMediaCellGenome(genomeEvidence());
  assert.equal(first.source.repository, SOURCE_REPOSITORY);
  assert.equal(first.source.mainSha, first.source.commitSha);
  assert.equal(first.source.eligibility.state, 'VERIFIED_CURRENT_PROTECTED_MAIN');
  assert.equal(first.source.eligibility.dbConvergenceState, 'VERIFIED_LIVE');

  const changed = genomeEvidence();
  changed.source.eligibility.dbConvergenceEvidenceSha256 = H64('5');
  assert.notEqual(createMediaCellGenome(changed).id, first.id, 'DB prerequisite evidence must participate in Genome identity');

  const wrongMain = genomeEvidence();
  wrongMain.source.mainSha = '9'.repeat(40);
  assert.throws(() => createMediaCellGenome(wrongMain), /GENOME_SOURCE_ELIGIBILITY_INVALID/);
});

test('Sealed Build verifies the exact customer-managed ECR KMS key ARN', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /TIGER_MEDIA_ECR_KMS_KEY_ARN:\s*\$\{\{\s*vars\.TIGER_MEDIA_ECR_KMS_KEY_ARN\s*\}\}/, 'Protected media-build environment must provide the foundation RepositoryKmsKeyArn');
  assert.match(workflow, /encryptionConfiguration\.kmsKey/, 'ECR repository inspection must read the actual KMS key identity');
  assert.match(workflow, /test\s+"\$kms_key"\s*=\s*"\$TIGER_MEDIA_ECR_KMS_KEY_ARN"/, 'Actual ECR KMS key must exactly equal the protected expected foundation key ARN');
});

test('Release Passport binds the explicit PASS supply-gate decision and retains digest-addressed gate evidence', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /artifacts\/media-cell\/supply-gate\.json/, 'Canonical supply-gate evidence must be retained for audit');
  assert.match(workflow, /SUPPLY_GATE_SHA/, 'Passport evidence must include the canonical supply-gate evidence digest');
  assert.match(workflow, /supplyGate/, 'Release evidence must bind the vulnerability gate decision');
  assert.doesNotMatch(workflow, /rm\s+-f[^\n]*supply-gate\.json/, 'Canonical supply-gate evidence must not be deleted before evidence upload');
});

test('Sealed Build refetches and proves protected main immediately before release evidence issuance', () => {
  const workflow = readWorkflow();
  const fetches = workflow.match(/git fetch --no-tags --prune origin '\+refs\/heads\/main:refs\/remotes\/origin\/main'/g) || [];
  assert.equal(fetches.length >= 2, true, 'Protected main must be fetched both at start and immediately before release evidence issuance');
  const generationIndex = workflow.indexOf('- name: Generate deterministic migration set Genome and Release Passport 2.0');
  assert.notEqual(generationIndex, -1, 'RELEASE_EVIDENCE_STEP_MISSING');
  const finalRevalidationIndex = workflow.lastIndexOf('FINAL_MAIN_SHA', generationIndex);
  assert.notEqual(finalRevalidationIndex, -1, 'FINAL_MAIN_REVALIDATION_MISSING');
  assert.equal(finalRevalidationIndex < generationIndex, true, 'Final main revalidation must occur before Passport generation');
  assert.match(workflow.slice(finalRevalidationIndex - 800, generationIndex), /test\s+"\$SOURCE_SHA"\s*=\s*"\$FINAL_MAIN_SHA"/, 'Final protected-main SHA must still equal release source');
});
