'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  EvidenceError,
  canonicalJson,
  sha256Hex,
  assertSha40,
  assertSha256,
  deepFreeze,
} = require('../evidence/contracts.cjs');

const ALLOWED_KEYS = new Set([
  'repositoryRoot',
  'candidateDir',
  'sbomBytes',
  'materialRecords',
  'createdBy',
  'git',
  'fsApi',
]);

const MANIFEST_FIELDS = Object.freeze([
  'bundle_version',
  'source_sha',
  'source_tree',
  'candidate_manifest_sha256',
  'candidate_content_sha256',
  'sbom_sha256',
  'materials_sha256',
  'created_by',
]);

function fail(code, message) {
  throw new EvidenceError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function bytes(value, code, message) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') return Buffer.from(value);
  fail(code, message);
}

function realDirectory(fsApi, directory, code) {
  if (typeof directory !== 'string' || !directory.trim()) fail(code, 'Trusted directory is invalid.');
  const absolute = path.resolve(directory);
  let stat;
  try {
    stat = fsApi.lstatSync(absolute);
  } catch {
    fail(code, 'Trusted directory is unavailable.');
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(code, 'Trusted directory must be a real directory.');
  try {
    return { absolute, real: fsApi.realpathSync(absolute) };
  } catch {
    fail(code, 'Trusted directory identity cannot be resolved.');
  }
}

function normalizeRelative(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    fail('SVEF_CANDIDATE_PATH_INVALID', 'Candidate path is invalid.');
  }
  const normalized = relativePath.replaceAll('\\', '/');
  if (
    normalized === '.' ||
    normalized === '..' ||
    path.posix.isAbsolute(normalized) ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    normalized.startsWith('./') ||
    normalized.includes('//')
  ) {
    fail('SVEF_CANDIDATE_PATH_ESCAPE', 'Candidate path escaped its trusted root.');
  }
  return normalized;
}

function ensureInside(rootReal, targetReal) {
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) {
    fail('SVEF_CANDIDATE_PATH_ESCAPE', 'Candidate path escaped its trusted root.');
  }
}

function readCandidateFile(fsApi, candidate, relativePath, missingCode = 'SVEF_CANDIDATE_FILE_MISSING') {
  const normalized = normalizeRelative(relativePath);
  const absolute = path.resolve(candidate.absolute, ...normalized.split('/'));
  if (absolute !== candidate.absolute && !absolute.startsWith(`${candidate.absolute}${path.sep}`)) {
    fail('SVEF_CANDIDATE_PATH_ESCAPE', 'Candidate path escaped its trusted root.');
  }

  let stat;
  try {
    stat = fsApi.lstatSync(absolute);
  } catch {
    fail(missingCode, 'Declared candidate file is missing.');
  }
  if (stat.isSymbolicLink()) fail('SVEF_CANDIDATE_SYMLINK', 'Candidate files cannot be symlinks.');
  if (!stat.isFile()) fail('SVEF_CANDIDATE_FILE_TYPE_INVALID', 'Candidate entry must be a regular file.');

  let real;
  try {
    real = fsApi.realpathSync(absolute);
  } catch {
    fail(missingCode, 'Declared candidate file identity cannot be resolved.');
  }
  ensureInside(candidate.real, real);
  return fsApi.readFileSync(absolute);
}

function listCandidateFiles(fsApi, candidate) {
  const results = [];
  const walk = (directory) => {
    for (const entry of fsApi.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail('SVEF_CANDIDATE_SYMLINK', 'Candidate tree contains a symlink.');
      if (entry.isDirectory()) {
        ensureInside(candidate.real, fsApi.realpathSync(absolute));
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) fail('SVEF_CANDIDATE_FILE_TYPE_INVALID', 'Candidate tree contains a non-regular entry.');
      ensureInside(candidate.real, fsApi.realpathSync(absolute));
      results.push(path.relative(candidate.absolute, absolute).split(path.sep).join('/'));
    }
  };
  walk(candidate.absolute);
  results.sort();
  return results;
}

function parseCandidateManifest(fsApi, candidate, sourceSha) {
  const raw = readCandidateFile(
    fsApi,
    candidate,
    'release-manifest.json',
    'SVEF_CANDIDATE_MANIFEST_MISSING',
  );

  let manifest;
  try {
    manifest = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest is invalid JSON.');
  }
  if (!isPlainObject(manifest) || manifest.schemaVersion !== 1 || !isPlainObject(manifest.files)) {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest shape is invalid.');
  }
  if (manifest.sourceSha !== sourceSha) {
    fail('SVEF_CANDIDATE_SOURCE_MISMATCH', 'Candidate release manifest is bound to another source SHA.');
  }
  if (manifest.releaseEligible !== true) {
    fail('SVEF_CANDIDATE_INELIGIBLE', 'Candidate is not release eligible.');
  }

  const records = [];
  const seen = new Set();
  for (const declaredPath of Object.keys(manifest.files).sort()) {
    const normalized = normalizeRelative(declaredPath);
    if (normalized === 'release-manifest.json' || seen.has(normalized)) {
      fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate manifest path set is invalid.');
    }
    seen.add(normalized);
    const expected = manifest.files[declaredPath];
    try {
      assertSha256('candidate_file_sha256', expected);
    } catch {
      fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate manifest contains an invalid file digest.');
    }
    const actual = sha256Hex(readCandidateFile(fsApi, candidate, normalized));
    if (actual !== expected) {
      fail('SVEF_CANDIDATE_HASH_MISMATCH', 'Candidate file bytes do not match the release manifest.');
    }
    records.push({ path: normalized, sha256: actual });
  }

  if (records.length === 0) fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate manifest cannot be empty.');

  const actualPaths = listCandidateFiles(fsApi, candidate)
    .filter((relativePath) => relativePath !== 'release-manifest.json');
  const declaredPaths = records.map((record) => record.path);
  if (canonicalJson(actualPaths) !== canonicalJson(declaredPaths)) {
    const actualSet = new Set(actualPaths);
    const declaredSet = new Set(declaredPaths);
    if (declaredPaths.some((relativePath) => !actualSet.has(relativePath))) {
      fail('SVEF_CANDIDATE_FILE_MISSING', 'Candidate manifest declares a missing file.');
    }
    if (actualPaths.some((relativePath) => !declaredSet.has(relativePath))) {
      fail('SVEF_CANDIDATE_UNDECLARED_FILE', 'Candidate contains an undeclared file.');
    }
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate file set does not match its manifest.');
  }

  return { raw, records };
}

function normalizeMaterials(materialRecords) {
  if (!Array.isArray(materialRecords) || materialRecords.length === 0 || materialRecords.length > 4096) {
    fail('SVEF_MATERIALS_INVALID', 'Release material records are invalid.');
  }

  const seen = new Set();
  const records = materialRecords.map((record) => {
    if (!isPlainObject(record) || canonicalJson(Object.keys(record).sort()) !== canonicalJson(['path', 'sha256'])) {
      fail('SVEF_MATERIALS_INVALID', 'Release material record shape is invalid.');
    }
    const materialPath = normalizeRelative(record.path);
    if (seen.has(materialPath)) fail('SVEF_MATERIALS_INVALID', 'Duplicate release material path.');
    seen.add(materialPath);
    try {
      assertSha256('material_sha256', record.sha256);
    } catch {
      fail('SVEF_MATERIALS_INVALID', 'Release material digest is invalid.');
    }
    return { path: materialPath, sha256: record.sha256 };
  });

  records.sort((a, b) => a.path.localeCompare(b.path));
  return records;
}

function validateCreatedBy(createdBy) {
  if (
    typeof createdBy !== 'string' ||
    createdBy.length < 3 ||
    createdBy.length > 160 ||
    !/^[A-Za-z0-9][A-Za-z0-9:._/-]*$/.test(createdBy)
  ) {
    fail('SVEF_BUILDER_IDENTITY_INVALID', 'Release bundle builder identity is invalid.');
  }
  return createdBy;
}

function createReleaseBundleManifest(options) {
  if (!isPlainObject(options)) fail('SVEF_INPUT_INVALID', 'Release bundle options are invalid.');
  for (const key of Object.keys(options)) {
    if (!ALLOWED_KEYS.has(key)) fail('SVEF_UNTRUSTED_INPUT', 'Caller supplied an authoritative release-bundle field.');
  }

  const {
    repositoryRoot,
    candidateDir,
    sbomBytes,
    materialRecords,
    createdBy,
    git,
    fsApi = fs,
  } = options;

  realDirectory(fsApi, repositoryRoot, 'SVEF_REPOSITORY_ROOT_INVALID');
  const candidate = realDirectory(fsApi, candidateDir, 'SVEF_CANDIDATE_ROOT_INVALID');
  if (!git || typeof git.headSha !== 'function' || typeof git.treeSha !== 'function') {
    fail('SVEF_GIT_IDENTITY_UNAVAILABLE', 'Trusted Git identity provider is unavailable.');
  }

  let sourceSha;
  let sourceTree;
  try {
    sourceSha = assertSha40('source_sha', git.headSha());
    sourceTree = assertSha40('source_tree', git.treeSha());
  } catch {
    fail('SVEF_GIT_IDENTITY_INVALID', 'Trusted Git identity is invalid.');
  }

  const candidateManifest = parseCandidateManifest(fsApi, candidate, sourceSha);
  const sbom = bytes(sbomBytes, 'SVEF_SBOM_INVALID', 'SBOM bytes are invalid.');
  if (sbom.length === 0) fail('SVEF_SBOM_INVALID', 'SBOM bytes cannot be empty.');
  const materials = normalizeMaterials(materialRecords);

  return deepFreeze({
    bundle_version: 'SVEF_RELEASE_BUNDLE_V1',
    source_sha: sourceSha,
    source_tree: sourceTree,
    candidate_manifest_sha256: sha256Hex(candidateManifest.raw),
    candidate_content_sha256: sha256Hex(canonicalJson(candidateManifest.records)),
    sbom_sha256: sha256Hex(sbom),
    materials_sha256: sha256Hex(canonicalJson(materials)),
    created_by: validateCreatedBy(createdBy),
  });
}

function serializeReleaseBundleManifest(manifest) {
  if (!isPlainObject(manifest) || canonicalJson(Object.keys(manifest)) !== canonicalJson(MANIFEST_FIELDS)) {
    fail('SVEF_MANIFEST_INVALID', 'Release bundle manifest shape is invalid.');
  }
  return `${canonicalJson(manifest)}\n`;
}

module.exports = {
  createReleaseBundleManifest,
  serializeReleaseBundleManifest,
};
