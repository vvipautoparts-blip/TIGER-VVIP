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

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertTrustedStagingConfig(config) {
  if (!isPlainObject(config)) {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging identity is not proven.');
  }
  const keys = Object.keys(config).sort();
  if (canonicalJson(keys) !== canonicalJson(['environment_name', 'provenance', 'snapshot'])) {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging identity shape is invalid.');
  }
  if (config.provenance !== 'GITHUB_ENVIRONMENT_STAGING' || config.environment_name !== 'staging') {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging identity provenance is invalid.');
  }
  if (!isPlainObject(config.snapshot)) {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging configuration snapshot is missing.');
  }
  const snapshotKeys = Object.keys(config.snapshot).sort();
  const expectedKeys = [
    'identity_verifier_class',
    'max_output_tokens',
    'model',
    'prompt_version',
    'provider_endpoint',
  ];
  if (canonicalJson(snapshotKeys) !== canonicalJson(expectedKeys)) {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging configuration fields are invalid.');
  }
  assertNoForbiddenShape(config.snapshot);
  if (
    typeof config.snapshot.model !== 'string' ||
    config.snapshot.model.length < 1 ||
    config.snapshot.model.length > 160 ||
    typeof config.snapshot.prompt_version !== 'string' ||
    config.snapshot.prompt_version.length < 1 ||
    config.snapshot.prompt_version.length > 128 ||
    !Number.isSafeInteger(config.snapshot.max_output_tokens) ||
    config.snapshot.max_output_tokens < 128 ||
    config.snapshot.max_output_tokens > 4000 ||
    config.snapshot.provider_endpoint !== 'https://api.openai.com/v1/responses' ||
    config.snapshot.identity_verifier_class !== 'HTTPS'
  ) {
    fail('BLOCKED_STAGING_IDENTITY_UNPROVEN', 'Trusted Staging configuration values are invalid.');
  }
  return config;
}

function buildStagingEvidence({
  repositoryRoot,
  candidateDir,
  outputDir,
  artifactPath,
  proofInput,
  trustedContext,
  trustedStagingConfig,
  git,
  fsApi = fs,
  nowMs,
  maxAgeMs,
  futureSkewMs,
}) {
  if (!isPlainObject(proofInput) || proofInput.environment !== 'STAGING') {
    fail('EVIDENCE_ENVIRONMENT_BLOCKED', 'Staging Evidence Bridge accepts STAGING evidence only.');
  }

  const stagingConfig = assertTrustedStagingConfig(trustedStagingConfig);
  assertCleanSource(git, 'EVIDENCE_SOURCE_DIRTY');
  const safeArtifact = assertStructuredArtifact(fsApi, artifactPath);
  const safeOutputDir = assertOutputDirectory(fsApi, repositoryRoot, outputDir);

  if (path.basename(safeArtifact.absolute) !== proofInput.artifact_name) {
    fail('EVIDENCE_ARTIFACT_NAME_MISMATCH', 'Proof artifact name does not match the verified artifact.');
  }

  const releaseDna = deriveReleaseDna({
    repositoryRoot,
    candidateDir,
    environmentClass: 'STAGING_CANDIDATE',
    trustedStagingConfig: stagingConfig,
    git,
    fsApi,
  });

  const releaseDigest = computeReleaseDigest(releaseDna);
  const artifactSha256 = sha256Hex(safeArtifact.bytes);

  if (proofInput.release_digest !== releaseDigest) {
    fail('EVIDENCE_RELEASE_DIGEST_MISMATCH', 'Proof release digest does not match independently derived Release DNA.');
  }
  if (proofInput.source_sha !== releaseDna.source_sha) {
    fail('EVIDENCE_SOURCE_SHA_MISMATCH', 'Proof source SHA does not match trusted Git identity.');
  }
  if (proofInput.source_tree !== releaseDna.source_tree) {
    fail('EVIDENCE_SOURCE_TREE_MISMATCH', 'Proof source tree does not match trusted Git identity.');
  }
  if (proofInput.artifact_sha256 !== artifactSha256) {
    fail('EVIDENCE_ARTIFACT_HASH_MISMATCH', 'Proof artifact bytes do not match the declared digest.');
  }

  assertCleanSource(git, 'EVIDENCE_SOURCE_CHANGED');

  const capsule = createProofCapsule({
    proof: proofInput,
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
  buildStagingEvidence,
};
