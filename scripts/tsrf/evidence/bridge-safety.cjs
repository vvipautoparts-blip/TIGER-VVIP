'use strict';

const path = require('node:path');

const {
  EvidenceError,
  assertNoForbiddenShape,
  canonicalJson,
} = require('./contracts.cjs');

const MAX_STRUCTURED_ARTIFACT_BYTES = 256 * 1024;

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function lstatOrFail(fsApi, absolute, missingCode, message) {
  try {
    return fsApi.lstatSync(absolute);
  } catch {
    fail(missingCode, message);
  }
}

function assertStructuredArtifact(fsApi, artifactPath) {
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
  if (!Number.isSafeInteger(stat.size) || stat.size <= 0 || stat.size > MAX_STRUCTURED_ARTIFACT_BYTES) {
    fail('EVIDENCE_ARTIFACT_SIZE_INVALID', 'Proof artifact size is outside the bounded evidence contract.');
  }

  const bytes = fsApi.readFileSync(absolute);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('EVIDENCE_ARTIFACT_JSON_INVALID', 'Proof artifact must be valid structured JSON.');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('EVIDENCE_ARTIFACT_JSON_INVALID', 'Proof artifact must contain a JSON object.');
  }

  try {
    assertNoForbiddenShape(parsed);
    canonicalJson(parsed);
  } catch (error) {
    if (error instanceof EvidenceError) {
      fail('EVIDENCE_ARTIFACT_UNSAFE', 'Proof artifact contains unsafe or non-canonical structured data.');
    }
    throw error;
  }

  return Object.freeze({ absolute, bytes });
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

function cleanupCreated(fsApi, created) {
  for (const target of created) {
    try {
      fsApi.rmSync(target, { force: true });
    } catch {
      // Cleanup is best effort; callers preserve the original bounded error.
    }
  }
}

module.exports = {
  MAX_STRUCTURED_ARTIFACT_BYTES,
  assertStructuredArtifact,
  assertOutputDirectory,
  assertCleanSource,
  writeExclusive,
  cleanupCreated,
};
