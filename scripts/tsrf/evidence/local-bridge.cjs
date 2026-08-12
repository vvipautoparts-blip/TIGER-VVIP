'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  EvidenceError,
  canonicalJson,
  sha256Hex,
  assertNoForbiddenShape,
  deepFreeze,
} = require('./contracts.cjs');
const { deriveReleaseDna, computeReleaseDigest } = require('./release-dna.cjs');
const { createProofCapsule, serializeProofCapsule } = require('./proof-capsule.cjs');
const {
  assertStructuredArtifact,
  assertOutputDirectory,
  assertCleanSource,
  writeExclusive,
  cleanupCreated,
} = require('./bridge-safety.cjs');

const LOCAL_PROOF_FIELDS = Object.freeze([
  'test_version',
  'artifact_name',
  'started_at',
  'completed_at',
  'generated_at',
  'validation_results',
  'result',
]);
const LOCAL_PROOF_FIELD_SET = new Set(LOCAL_PROOF_FIELDS);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertLocalProofDescriptor(proof) {
  if (!isPlainObject(proof)) {
    fail('EVIDENCE_LOCAL_PROOF_INVALID', 'Local proof descriptor is invalid.');
  }

  assertNoForbiddenShape(proof);
  const keys = Object.keys(proof).sort();
  if (canonicalJson(keys) !== canonicalJson([...LOCAL_PROOF_FIELDS].sort())) {
    fail('EVIDENCE_LOCAL_PROOF_FIELD_INVALID', 'Local proof descriptor contains invalid fields.');
  }

  for (const field of LOCAL_PROOF_FIELDS) {
    if (!Object.hasOwn(proof, field)) {
      fail('EVIDENCE_LOCAL_PROOF_FIELD_INVALID', 'Local proof descriptor is missing a required field.');
    }
  }
  for (const key of Object.keys(proof)) {
    if (!LOCAL_PROOF_FIELD_SET.has(key)) {
      fail('EVIDENCE_LOCAL_PROOF_FIELD_INVALID', 'Local proof descriptor contains an invalid field.');
    }
  }

  if (proof.result !== 'PASS' && proof.result !== 'BLOCKED') {
    fail('EVIDENCE_RESULT_INVALID', 'Local proof result must be PASS or BLOCKED.');
  }
}

function buildLocalDbRebuildEvidence({
  repositoryRoot,
  candidateDir,
  outputDir,
  artifactPath,
  proof,
  trustedContext,
  git,
  fsApi = fs,
  nowMs,
  maxAgeMs,
  futureSkewMs,
}) {
  assertLocalProofDescriptor(proof);
  assertCleanSource(git, 'EVIDENCE_SOURCE_DIRTY');

  const safeArtifact = assertStructuredArtifact(fsApi, artifactPath);
  const safeOutputDir = assertOutputDirectory(fsApi, repositoryRoot, outputDir);

  if (path.basename(safeArtifact.absolute) !== proof.artifact_name) {
    fail('EVIDENCE_ARTIFACT_NAME_MISMATCH', 'Proof artifact name does not match the verified artifact.');
  }

  const releaseDna = deriveReleaseDna({
    repositoryRoot,
    candidateDir,
    environmentClass: 'STAGING_CANDIDATE',
    git,
    fsApi,
  });
  const releaseDigest = computeReleaseDigest(releaseDna);
  const artifactSha256 = sha256Hex(safeArtifact.bytes);

  assertCleanSource(git, 'EVIDENCE_SOURCE_CHANGED');

  const capsule = createProofCapsule({
    proof: {
      capsule_version: 'TSRF_PROOF_CAPSULE_V1',
      capsule_class: 'DB_REBUILD_PROOF_CAPSULE',
      release_digest: releaseDigest,
      source_sha: releaseDna.source_sha,
      source_tree: releaseDna.source_tree,
      environment: 'LOCAL',
      test_version: proof.test_version,
      artifact_name: proof.artifact_name,
      artifact_sha256: artifactSha256,
      started_at: proof.started_at,
      completed_at: proof.completed_at,
      generated_at: proof.generated_at,
      kill_switch_state: 'NOT_APPLICABLE',
      validation_results: { ...proof.validation_results },
      result: proof.result,
    },
    trustedContext,
    expectedReleaseDna: releaseDna,
    nowMs,
    maxAgeMs,
    futureSkewMs,
  });

  const capsuleJson = serializeProofCapsule(capsule);
  const releaseDnaJson = `${canonicalJson(releaseDna)}\n`;
  const manifest = deepFreeze({
    manifest_version: 'TSRF_EVIDENCE_MANIFEST_V1',
    proof_capsule_sha256: sha256Hex(capsuleJson),
    release_dna_sha256: sha256Hex(releaseDnaJson),
  });
  const manifestJson = `${canonicalJson(manifest)}\n`;

  const paths = {
    capsule: path.join(safeOutputDir, 'proof-capsule.json'),
    releaseDna: path.join(safeOutputDir, 'release-dna.json'),
    manifest: path.join(safeOutputDir, 'manifest.json'),
  };
  const created = [];
  try {
    writeExclusive(fsApi, paths.capsule, capsuleJson);
    created.push(paths.capsule);
    writeExclusive(fsApi, paths.releaseDna, releaseDnaJson);
    created.push(paths.releaseDna);
    writeExclusive(fsApi, paths.manifest, manifestJson);
    created.push(paths.manifest);
    assertCleanSource(git, 'EVIDENCE_SOURCE_CHANGED');
  } catch (error) {
    cleanupCreated(fsApi, created);
    throw error;
  }

  return deepFreeze({
    capsule,
    releaseDna,
    manifest,
    paths: deepFreeze({ ...paths }),
  });
}

module.exports = {
  buildLocalDbRebuildEvidence,
};
