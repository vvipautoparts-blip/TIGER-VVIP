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

function lstatOrFail(fsApi, absolute, missingCode, message) {
  try {
    return fsApi.lstatSync(absolute);
  } catch {
    fail(missingCode, message);
  }
}

function assertArtifact(fsApi, artifactPath) {
  if (typeof artifactPath !== 'string' || artifactPath.length === 0) {
    fail('EVIDENCE_ARTIFACT_MISSING', 'Proof artifact is unavailable.');
  }
  const absolute = path.resolve(artifactPath);
  const stat = lstatOrFail(fsApi, absolute, 'EVIDENCE_ARTIFACT_MISSING', 'Proof artifact is unavailable.');
  if (stat.isSymbolicLink()) {
    fail('EVIDENCE_ARTIFACT_SYMLINK', 'Proof artifact cannot be a symlink.');
  }
  if (!stat.isFile()) {
    fail('EVIDENCE_ARTIFACT_TYPE_INVALID', 'Proof artifact must be a regular file.');
  }
  return absolute;
}

function assertOutputDirectory(fsApi, repositoryRoot, outputDir) {
  if (typeof outputDir !== 'string' || outputDir.length === 0) {
    fail('EVIDENCE_OUTPUT_INVALID', 'Evidence output directory is invalid.');
  }
  const absolute = path.resolve(outputDir);
  const stat = lstatOrFail(fsApi, absolute, 'EVIDENCE_OUTPUT_INVALID', 'Evidence output directory is unavailable.');
  if (stat.isSymbolicLink()) {
    fail('EVIDENCE_OUTPUT_SYMLINK', 'Evidence output directory cannot be a symlink.');
  }
  if (!stat.isDirectory()) {
    fail('EVIDENCE_OUTPUT_INVALID', 'Evidence output target must be a directory.');
  }

  let repositoryReal;
  let outputReal;
  try {
    repositoryReal = fsApi.realpathSync(path.resolve(repositoryRoot));
    outputReal = fsApi.realpathSync(absolute);
  } catch {
    fail('EVIDENCE_OUTPUT_INVALID', 'Evidence output identity cannot be resolved.');
  }
  if (outputReal === repositoryReal || outputReal.startsWith(`${repositoryReal}${path.sep}`)) {
    fail('EVIDENCE_OUTPUT_INSIDE_REPOSITORY', 'Evidence output must remain outside the source repository.');
  }
  return absolute;
}

function assertCleanSource(git, code) {
  if (!git || typeof git.statusPorcelain !== 'function') {
    fail('EVIDENCE_GIT_IDENTITY_UNAVAILABLE', 'Trusted Git status provider is unavailable.');
  }
  const status = git.statusPorcelain();
  if (typeof status !== 'string') {
    fail('EVIDENCE_GIT_IDENTITY_UNAVAILABLE', 'Trusted Git status response is invalid.');
  }
  if (status.trim() !== '') {
    fail(code, 'Source repository is not stable for evidence generation.');
  }
}

function writeExclusive(fsApi, target, content) {
  try {
    fsApi.writeFileSync(target, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch {
    fail('EVIDENCE_OUTPUT_COLLISION', 'Evidence output file could not be created exclusively.');
  }
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
  const safeArtifactPath = assertArtifact(fsApi, artifactPath);
  const safeOutputDir = assertOutputDirectory(fsApi, repositoryRoot, outputDir);

  if (path.basename(safeArtifactPath) !== proofInput.artifact_name) {
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
  const artifactSha256 = sha256Hex(fsApi.readFileSync(safeArtifactPath));

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
    for (const target of created) {
      try {
        fsApi.rmSync(target, { force: true });
      } catch {
        // Best-effort cleanup only; the original bounded EvidenceError is preserved.
      }
    }
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
