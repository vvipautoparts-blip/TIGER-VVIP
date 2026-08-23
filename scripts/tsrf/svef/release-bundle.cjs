'use strict';

const path = require('node:path');
const {
  canonicalJson,
  sha256Hex,
  assertNoForbiddenShape,
} = require('../evidence/contracts.cjs');

const BUNDLE_VERSION = 'SVEF_RELEASE_BUNDLE_V1';
const PRODUCTION_BUNDLE_VERSION = 'SVEF_PRODUCTION_RELEASE_BUNDLE_V2';
const MANIFEST_NAME = 'release-manifest.json';
const ALLOWED_INPUT_KEYS = new Set([
  'candidateDir',
  'createdBy',
  'fsApi',
  'git',
  'materialRecords',
  'repositoryRoot',
  'sbomBytes',
]);
const PRODUCTION_ALLOWED_INPUT_KEYS = new Set([
  ...ALLOWED_INPUT_KEYS,
  'marketGenesisSourceReadinessBytes',
]);
const OUTPUT_KEYS = Object.freeze([
  'bundle_version',
  'source_sha',
  'source_tree',
  'candidate_manifest_sha256',
  'candidate_content_sha256',
  'sbom_sha256',
  'materials_sha256',
  'created_by',
]);
const PRODUCTION_OUTPUT_KEYS = Object.freeze([
  'bundle_version',
  'source_sha',
  'source_tree',
  'candidate_manifest_sha256',
  'candidate_content_sha256',
  'sbom_sha256',
  'materials_sha256',
  'market_genesis_source_readiness_sha256',
  'created_by',
]);

class SvefReleaseBundleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SvefReleaseBundleError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new SvefReleaseBundleError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertInputShape(options, allowedKeys, { production = false } = {}) {
  if (!isPlainObject(options)) {
    fail('SVEF_INPUT_INVALID', 'Release-bundle options must be a plain object.');
  }
  for (const key of Object.keys(options)) {
    if (!allowedKeys.has(key)) {
      fail('SVEF_UNTRUSTED_INPUT', `Untrusted release-bundle input field: ${key}`);
    }
  }
  for (const key of ALLOWED_INPUT_KEYS) {
    if (!Object.hasOwn(options, key)) {
      fail('SVEF_INPUT_INVALID', `Missing required release-bundle input: ${key}`);
    }
  }
  if (production && !Object.hasOwn(options, 'marketGenesisSourceReadinessBytes')) {
    fail('MARKET_SOURCE_READINESS_MISSING', 'Market Genesis source-readiness evidence is required for Production V2.');
  }
}

function assertExactInputShape(options) {
  assertInputShape(options, ALLOWED_INPUT_KEYS);
}

function assertExactProductionInputShape(options) {
  assertInputShape(options, PRODUCTION_ALLOWED_INPUT_KEYS, { production: true });
}

function assertSha40(value, code, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    fail(code, `${label} must be a full lowercase 40-character Git SHA.`);
  }
  return value;
}

function assertSha256(value, code, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    fail(code, `${label} must be a lowercase SHA-256 digest.`);
  }
  return value;
}

function assertDirectory(fsApi, directory, code, label) {
  if (typeof directory !== 'string' || directory.length === 0) {
    fail(code, `${label} must be a directory path.`);
  }
  let stat;
  try {
    stat = fsApi.lstatSync(directory);
  } catch {
    fail(code, `${label} does not exist.`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fail(code, `${label} must be a real directory, not a symlink.`);
  }
  return path.resolve(directory);
}

function normalizeRelativePath(value, code) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    fail(code, 'Path must be a non-empty relative path.');
  }
  if (value.includes('\\') || path.posix.isAbsolute(value)) {
    fail(code, `Unsafe relative path: ${value}`);
  }
  const normalized = path.posix.normalize(value);
  if (
    normalized !== value ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/') ||
    value.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    fail(code, `Unsafe relative path: ${value}`);
  }
  return normalized;
}

function resolveWithinRoot(root, relativePath, code) {
  const absolute = path.resolve(root, ...relativePath.split('/'));
  const prefix = `${root}${path.sep}`;
  if (absolute === root || !absolute.startsWith(prefix)) {
    fail(code, `Path escapes trusted root: ${relativePath}`);
  }
  return absolute;
}

function assertNoSymlinkComponents(fsApi, root, relativePath, symlinkCode, missingCode) {
  const parts = relativePath.split('/');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fsApi.lstatSync(current);
    } catch {
      fail(missingCode, `Required file is missing: ${relativePath}`);
    }
    if (stat.isSymbolicLink()) {
      fail(symlinkCode, `Symlink traversal is forbidden: ${relativePath}`);
    }
  }
  return current;
}

function readRegularFile(fsApi, root, relativePath, { symlinkCode, missingCode, invalidCode }) {
  const absolute = resolveWithinRoot(root, relativePath, invalidCode);
  const walked = assertNoSymlinkComponents(fsApi, root, relativePath, symlinkCode, missingCode);
  if (walked !== absolute) {
    fail(invalidCode, `Path resolution mismatch: ${relativePath}`);
  }
  const stat = fsApi.lstatSync(absolute);
  if (!stat.isFile()) {
    fail(invalidCode, `Expected a regular file: ${relativePath}`);
  }
  return fsApi.readFileSync(absolute);
}

function listCandidateFiles(fsApi, candidateRoot) {
  const files = [];
  const walk = (absoluteDir, relativeDir) => {
    let names;
    try {
      names = fsApi.readdirSync(absoluteDir);
    } catch {
      fail('SVEF_CANDIDATE_TREE_INVALID', 'Candidate directory cannot be enumerated.');
    }
    names.sort();
    for (const name of names) {
      const absolute = path.join(absoluteDir, name);
      const relative = relativeDir ? `${relativeDir}/${name}` : name;
      let stat;
      try {
        stat = fsApi.lstatSync(absolute);
      } catch {
        fail('SVEF_CANDIDATE_TREE_INVALID', `Candidate entry cannot be inspected: ${relative}`);
      }
      if (stat.isSymbolicLink()) {
        fail('SVEF_CANDIDATE_SYMLINK', `Candidate symlinks are forbidden: ${relative}`);
      }
      if (stat.isDirectory()) {
        walk(absolute, relative);
      } else if (stat.isFile()) {
        files.push(relative.split(path.sep).join('/'));
      } else {
        fail('SVEF_CANDIDATE_TREE_INVALID', `Unsupported candidate entry type: ${relative}`);
      }
    }
  };
  walk(candidateRoot, '');
  return files.sort();
}

function parseCandidateManifest(fsApi, candidateRoot) {
  const manifestBytes = readRegularFile(fsApi, candidateRoot, MANIFEST_NAME, {
    symlinkCode: 'SVEF_CANDIDATE_SYMLINK',
    missingCode: 'SVEF_CANDIDATE_MANIFEST_MISSING',
    invalidCode: 'SVEF_CANDIDATE_MANIFEST_INVALID',
  });
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest is not valid JSON.');
  }
  if (!isPlainObject(manifest) || manifest.schemaVersion !== 1) {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest schemaVersion must be 1.');
  }
  if (manifest.mode !== 'candidate') {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest mode must be candidate.');
  }
  if (!isPlainObject(manifest.files) || Object.keys(manifest.files).length === 0) {
    fail('SVEF_CANDIDATE_MANIFEST_INVALID', 'Candidate release manifest must declare a non-empty file map.');
  }
  return { manifest, manifestBytes };
}

function parseProductionManifest(fsApi, productionRoot) {
  const manifestBytes = readRegularFile(fsApi, productionRoot, MANIFEST_NAME, {
    symlinkCode: 'SVEF_PRODUCTION_SYMLINK',
    missingCode: 'SVEF_PRODUCTION_MANIFEST_MISSING',
    invalidCode: 'SVEF_PRODUCTION_MANIFEST_INVALID',
  });
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail('SVEF_PRODUCTION_MANIFEST_INVALID', 'Production release manifest is not valid JSON.');
  }
  if (!isPlainObject(manifest) || manifest.schemaVersion !== 1) {
    fail('SVEF_PRODUCTION_MANIFEST_INVALID', 'Production release manifest schemaVersion must be 1.');
  }
  if (manifest.mode !== 'production') {
    fail('SVEF_PRODUCTION_MANIFEST_INVALID', 'Production release manifest mode must be production.');
  }
  if (!isPlainObject(manifest.files) || Object.keys(manifest.files).length === 0) {
    fail('SVEF_PRODUCTION_MANIFEST_INVALID', 'Production release manifest must declare a non-empty file map.');
  }
  return { manifest, manifestBytes };
}

function verifyCandidateFiles(fsApi, candidateRoot, manifestFiles) {
  const declared = [];
  const seen = new Set();
  for (const [rawPath, expectedDigest] of Object.entries(manifestFiles)) {
    const relativePath = normalizeRelativePath(rawPath, 'SVEF_CANDIDATE_PATH_ESCAPE');
    if (relativePath === MANIFEST_NAME || seen.has(relativePath)) {
      fail('SVEF_CANDIDATE_MANIFEST_INVALID', `Duplicate or reserved candidate path: ${relativePath}`);
    }
    seen.add(relativePath);
    assertSha256(expectedDigest, 'SVEF_CANDIDATE_MANIFEST_INVALID', `Candidate digest for ${relativePath}`);
    const bytes = readRegularFile(fsApi, candidateRoot, relativePath, {
      symlinkCode: 'SVEF_CANDIDATE_SYMLINK',
      missingCode: 'SVEF_CANDIDATE_FILE_MISSING',
      invalidCode: 'SVEF_CANDIDATE_FILE_INVALID',
    });
    const actualDigest = sha256Hex(bytes);
    if (actualDigest !== expectedDigest) {
      fail('SVEF_CANDIDATE_HASH_MISMATCH', `Candidate bytes do not match manifest digest: ${relativePath}`);
    }
    declared.push(Object.freeze({ path: relativePath, sha256: actualDigest }));
  }

  declared.sort((a, b) => a.path.localeCompare(b.path));
  const actualFiles = listCandidateFiles(fsApi, candidateRoot).filter((item) => item !== MANIFEST_NAME);
  for (const relativePath of actualFiles) {
    if (!seen.has(relativePath)) {
      fail('SVEF_CANDIDATE_UNDECLARED_FILE', `Candidate contains undeclared file: ${relativePath}`);
    }
  }
  if (actualFiles.length !== seen.size) {
    fail('SVEF_CANDIDATE_FILE_MISSING', 'Candidate manifest and candidate tree file counts differ.');
  }
  return Object.freeze(declared);
}

function normalizeSbomBytes(value) {
  if (typeof value !== 'string' && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    fail('SVEF_SBOM_INVALID', 'SBOM must be non-empty text or bytes.');
  }
  if ((typeof value === 'string' && Buffer.byteLength(value) === 0) || (typeof value !== 'string' && value.byteLength === 0)) {
    fail('SVEF_SBOM_INVALID', 'SBOM must be non-empty text or bytes.');
  }
  return value;
}

function normalizeMarketSourceReadinessBytes(value) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    fail('MARKET_SOURCE_READINESS_INVALID', 'Market Genesis source-readiness evidence must be non-empty bytes.');
  }
  if (value.byteLength === 0) {
    fail('MARKET_SOURCE_READINESS_INVALID', 'Market Genesis source-readiness evidence must be non-empty bytes.');
  }
  return value;
}

function verifyMaterials(fsApi, repositoryRoot, materialRecords) {
  if (!Array.isArray(materialRecords) || materialRecords.length === 0) {
    fail('SVEF_MATERIALS_INVALID', 'Material records must be a non-empty array.');
  }
  const verified = [];
  const seen = new Set();
  for (const record of materialRecords) {
    if (!isPlainObject(record) || Object.keys(record).sort().join(',') !== 'path,sha256') {
      fail('SVEF_MATERIAL_RECORD_INVALID', 'Each material record must contain exactly path and sha256.');
    }
    const relativePath = normalizeRelativePath(record.path, 'SVEF_MATERIAL_PATH_ESCAPE');
    if (seen.has(relativePath)) {
      fail('SVEF_MATERIAL_DUPLICATE', `Duplicate material path: ${relativePath}`);
    }
    seen.add(relativePath);
    const expectedDigest = assertSha256(record.sha256, 'SVEF_MATERIAL_RECORD_INVALID', `Material digest for ${relativePath}`);
    const bytes = readRegularFile(fsApi, repositoryRoot, relativePath, {
      symlinkCode: 'SVEF_MATERIAL_SYMLINK',
      missingCode: 'SVEF_MATERIAL_FILE_MISSING',
      invalidCode: 'SVEF_MATERIAL_FILE_INVALID',
    });
    const actualDigest = sha256Hex(bytes);
    if (actualDigest !== expectedDigest) {
      fail('SVEF_MATERIAL_HASH_MISMATCH', `Material bytes do not match supplied digest: ${relativePath}`);
    }
    verified.push(Object.freeze({ path: relativePath, sha256: actualDigest }));
  }
  verified.sort((a, b) => a.path.localeCompare(b.path));
  return Object.freeze(verified);
}

function assertCreatedBy(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) {
    fail('SVEF_CREATED_BY_INVALID', 'createdBy must be bounded printable text.');
  }
  try {
    assertNoForbiddenShape({ created_by: value });
  } catch {
    fail('SVEF_CREATED_BY_INVALID', 'createdBy contains forbidden evidence content.');
  }
  return value;
}

function trustedBundleInputs(options, { production = false } = {}) {
  if (production) {
    assertExactProductionInputShape(options);
  } else {
    assertExactInputShape(options);
  }
  const {
    candidateDir,
    createdBy,
    fsApi,
    git,
    materialRecords,
    repositoryRoot,
    sbomBytes,
  } = options;

  if (!fsApi || typeof fsApi.lstatSync !== 'function' || typeof fsApi.readFileSync !== 'function' || typeof fsApi.readdirSync !== 'function') {
    fail('SVEF_FS_INVALID', 'fsApi must provide synchronous file inspection and reading methods.');
  }
  if (!git || typeof git.headSha !== 'function' || typeof git.treeSha !== 'function') {
    fail('SVEF_GIT_INVALID', 'git must provide headSha() and treeSha().');
  }

  const trusted = {
    fsApi,
    materialRecords,
    trustedRepositoryRoot: assertDirectory(fsApi, repositoryRoot, 'SVEF_REPOSITORY_ROOT_INVALID', 'repositoryRoot'),
    trustedCandidateRoot: assertDirectory(fsApi, candidateDir, 'SVEF_CANDIDATE_ROOT_INVALID', 'candidateDir'),
    sourceSha: assertSha40(git.headSha(), 'SVEF_SOURCE_SHA_INVALID', 'Source SHA'),
    sourceTree: assertSha40(git.treeSha(), 'SVEF_SOURCE_TREE_INVALID', 'Source tree'),
    trustedCreatedBy: assertCreatedBy(createdBy),
    trustedSbomBytes: normalizeSbomBytes(sbomBytes),
  };

  if (production) {
    trusted.trustedMarketSourceReadinessBytes = normalizeMarketSourceReadinessBytes(
      options.marketGenesisSourceReadinessBytes,
    );
  }

  return Object.freeze(trusted);
}

function createBundleFromVerifiedManifest(trusted, manifest, manifestBytes) {
  const candidateRecords = verifyCandidateFiles(trusted.fsApi, trusted.trustedCandidateRoot, manifest.files);
  const verifiedMaterials = verifyMaterials(
    trusted.fsApi,
    trusted.trustedRepositoryRoot,
    trusted.materialRecords,
  );

  return Object.freeze({
    bundle_version: BUNDLE_VERSION,
    source_sha: trusted.sourceSha,
    source_tree: trusted.sourceTree,
    candidate_manifest_sha256: sha256Hex(manifestBytes),
    candidate_content_sha256: sha256Hex(canonicalJson(candidateRecords)),
    sbom_sha256: sha256Hex(trusted.trustedSbomBytes),
    materials_sha256: sha256Hex(canonicalJson(verifiedMaterials)),
    created_by: trusted.trustedCreatedBy,
  });
}

function createProductionBundleFromVerifiedManifest(trusted, manifest, manifestBytes) {
  const candidateRecords = verifyCandidateFiles(trusted.fsApi, trusted.trustedCandidateRoot, manifest.files);
  const verifiedMaterials = verifyMaterials(
    trusted.fsApi,
    trusted.trustedRepositoryRoot,
    trusted.materialRecords,
  );

  return Object.freeze({
    bundle_version: PRODUCTION_BUNDLE_VERSION,
    source_sha: trusted.sourceSha,
    source_tree: trusted.sourceTree,
    candidate_manifest_sha256: sha256Hex(manifestBytes),
    candidate_content_sha256: sha256Hex(canonicalJson(candidateRecords)),
    sbom_sha256: sha256Hex(trusted.trustedSbomBytes),
    materials_sha256: sha256Hex(canonicalJson(verifiedMaterials)),
    market_genesis_source_readiness_sha256: sha256Hex(trusted.trustedMarketSourceReadinessBytes),
    created_by: trusted.trustedCreatedBy,
  });
}

function createReleaseBundleManifest(options) {
  const trusted = trustedBundleInputs(options);
  const { manifest, manifestBytes } = parseCandidateManifest(trusted.fsApi, trusted.trustedCandidateRoot);
  if (manifest.sourceSha !== trusted.sourceSha) {
    fail('SVEF_CANDIDATE_SOURCE_MISMATCH', 'Candidate release manifest source SHA does not match exact Git source.');
  }
  if (
    manifest.releaseEligible !== true ||
    !Array.isArray(manifest.configurationErrors) || manifest.configurationErrors.length !== 0 ||
    !Array.isArray(manifest.forbiddenFindings) || manifest.forbiddenFindings.length !== 0
  ) {
    fail('SVEF_CANDIDATE_INELIGIBLE', 'Candidate release manifest is not independently release eligible.');
  }
  return createBundleFromVerifiedManifest(trusted, manifest, manifestBytes);
}

function createProductionReleaseBundleManifest(options) {
  const trusted = trustedBundleInputs(options, { production: true });
  const { manifest, manifestBytes } = parseProductionManifest(trusted.fsApi, trusted.trustedCandidateRoot);
  if (manifest.sourceSha !== trusted.sourceSha) {
    fail('SVEF_PRODUCTION_SOURCE_MISMATCH', 'Production release manifest source SHA does not match exact Git source.');
  }
  if (
    manifest.releaseEligible !== true ||
    !Array.isArray(manifest.configurationErrors) || manifest.configurationErrors.length !== 0 ||
    !Array.isArray(manifest.forbiddenFindings) || manifest.forbiddenFindings.length !== 0
  ) {
    fail('SVEF_PRODUCTION_INELIGIBLE', 'Production release manifest is not independently release eligible.');
  }
  return createProductionBundleFromVerifiedManifest(trusted, manifest, manifestBytes);
}

function hasExactKeys(manifest, expectedKeys) {
  return Object.keys(manifest).length === expectedKeys.length
    && expectedKeys.every((key) => Object.hasOwn(manifest, key));
}

function serializeReleaseBundleManifest(manifest) {
  if (!isPlainObject(manifest)) {
    fail('SVEF_BUNDLE_MANIFEST_INVALID', 'Release-bundle manifest has an unexpected field set.');
  }
  const isCandidateV1 = manifest.bundle_version === BUNDLE_VERSION && hasExactKeys(manifest, OUTPUT_KEYS);
  const isProductionV2 = manifest.bundle_version === PRODUCTION_BUNDLE_VERSION
    && hasExactKeys(manifest, PRODUCTION_OUTPUT_KEYS);
  if (!isCandidateV1 && !isProductionV2) {
    fail('SVEF_BUNDLE_MANIFEST_INVALID', 'Release-bundle manifest has an unexpected field set or version.');
  }
  if (isProductionV2) {
    assertSha256(
      manifest.market_genesis_source_readiness_sha256,
      'SVEF_BUNDLE_MANIFEST_INVALID',
      'Market Genesis source-readiness digest',
    );
  }
  return `${canonicalJson(manifest)}\n`;
}

module.exports = {
  BUNDLE_VERSION,
  PRODUCTION_BUNDLE_VERSION,
  SvefReleaseBundleError,
  createProductionReleaseBundleManifest,
  createReleaseBundleManifest,
  serializeReleaseBundleManifest,
};
