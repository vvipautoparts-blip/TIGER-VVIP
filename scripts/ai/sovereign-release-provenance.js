'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PROVENANCE_SCHEMA = 'TIGER_RELEASE_PROVENANCE_V1';
const CONTEXT_SCHEMA = 'TIGER_TRUSTED_REPOSITORY_CONTEXT_V1';
const MANIFEST_SCHEMA = 'TIGER_RELEASE_PROVENANCE_MANIFEST_V1';
const PROVENANCE_CLASS = 'TRUSTED_GIT_CHECKOUT';
const HEX_256 = /^[0-9a-f]{64}$/;
const GIT_OBJECT = /^[0-9a-f]{40,64}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const GROUP_NAMES = Object.freeze([
  'frontend',
  'backend',
  'aiPolicy',
  'promptModel',
  'toolRegistry',
  'rlsPolicy',
  'securityConfig',
]);

const TRUSTED_CONTEXTS = new WeakSet();
const CONTEXT_INTERNALS = new WeakMap();

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, code) {
  if (!isPlainObject(value)) fail(code);
}

function assertExactKeys(value, allowed, code) {
  assertPlainObject(value, code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key) || !allowedSet.has(key)) fail(code);
  }
}

function assertBoundedString(value, min, max, code) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  if (/\u0000|[\u0001-\u001f\u007f]/.test(normalized)) fail(code);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalize(value, stack = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('PROVENANCE_CANONICAL_VALUE_INVALID');
    return value;
  }
  if (!value || typeof value !== 'object') fail('PROVENANCE_CANONICAL_VALUE_INVALID');
  if (stack.has(value)) fail('PROVENANCE_CANONICAL_CYCLE');

  stack.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry) => canonicalize(entry, stack));
  } else {
    if (!isPlainObject(value)) fail('PROVENANCE_CANONICAL_VALUE_INVALID');
    result = {};
    for (const key of Object.keys(value).sort()) {
      if (UNSAFE_KEYS.has(key) || value[key] === undefined) fail('PROVENANCE_CANONICAL_VALUE_INVALID');
      result[key] = canonicalize(value[key], stack);
    }
  }
  stack.delete(value);
  return result;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalStringify(value), 'utf8').digest('hex');
}

function runGit(repositoryRoot, args, code) {
  try {
    return execFileSync('git', args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    }).trim();
  } catch (_) {
    fail(code);
  }
}

function normalizeRealPath(input, code) {
  try {
    return fs.realpathSync(input);
  } catch (_) {
    fail(code);
  }
}

function readGitSnapshot(repositoryRoot) {
  const topLevel = normalizeRealPath(
    runGit(repositoryRoot, ['rev-parse', '--show-toplevel'], 'PROVENANCE_GIT_ROOT_INVALID'),
    'PROVENANCE_GIT_ROOT_INVALID',
  );
  if (topLevel !== repositoryRoot) fail('PROVENANCE_GIT_ROOT_MISMATCH');

  const commitSha = runGit(repositoryRoot, ['rev-parse', 'HEAD'], 'PROVENANCE_GIT_HEAD_INVALID').toLowerCase();
  const treeSha = runGit(repositoryRoot, ['rev-parse', 'HEAD^{tree}'], 'PROVENANCE_GIT_TREE_INVALID').toLowerCase();
  if (!GIT_OBJECT.test(commitSha) || !GIT_OBJECT.test(treeSha)) fail('PROVENANCE_GIT_OBJECT_INVALID');

  const status = runGit(
    repositoryRoot,
    ['status', '--porcelain=v1', '--untracked-files=all'],
    'PROVENANCE_GIT_STATUS_INVALID',
  );
  return { commitSha, treeSha, clean: status.length === 0 };
}

function createTrustedRepositoryContext(input) {
  assertExactKeys(input, ['repositoryRoot'], 'PROVENANCE_CONTEXT_UNKNOWN_FIELD');
  const requestedRoot = assertBoundedString(input.repositoryRoot, 1, 4096, 'PROVENANCE_ROOT_INVALID');
  const repositoryRoot = normalizeRealPath(requestedRoot, 'PROVENANCE_ROOT_INVALID');

  let stat;
  try {
    stat = fs.statSync(repositoryRoot);
  } catch (_) {
    fail('PROVENANCE_ROOT_INVALID');
  }
  if (!stat.isDirectory()) fail('PROVENANCE_ROOT_INVALID');

  const snapshot = readGitSnapshot(repositoryRoot);
  if (!snapshot.clean) fail('PROVENANCE_WORKTREE_DIRTY');

  const context = deepFreeze({
    schemaVersion: CONTEXT_SCHEMA,
    repositoryRoot,
    commitSha: snapshot.commitSha,
    treeSha: snapshot.treeSha,
    clean: true,
  });

  TRUSTED_CONTEXTS.add(context);
  CONTEXT_INTERNALS.set(context, { repositoryRoot, commitSha: snapshot.commitSha, treeSha: snapshot.treeSha });
  return context;
}

function assertTrustedContext(context) {
  if (!context || typeof context !== 'object' || !TRUSTED_CONTEXTS.has(context)) {
    fail('PROVENANCE_CONTEXT_UNTRUSTED');
  }
  const internal = CONTEXT_INTERNALS.get(context);
  if (!internal) fail('PROVENANCE_CONTEXT_UNTRUSTED');

  const snapshot = readGitSnapshot(internal.repositoryRoot);
  if (!snapshot.clean) fail('PROVENANCE_WORKTREE_DIRTY');
  if (snapshot.commitSha !== internal.commitSha || snapshot.treeSha !== internal.treeSha) {
    fail('PROVENANCE_CONTEXT_STALE');
  }
  return internal;
}

function assertSafeRelativePath(relativePath, code = 'PROVENANCE_PATH_INVALID') {
  const normalized = assertBoundedString(relativePath, 1, 1024, code);
  if (
    path.isAbsolute(normalized)
    || normalized.includes('\\')
    || normalized.startsWith('/')
    || normalized === '.'
    || normalized === '..'
    || normalized.split('/').includes('..')
    || normalized.split('/').includes('.')
    || normalized === '.git'
    || normalized.startsWith('.git/')
    || normalized.startsWith(':')
  ) {
    fail(code);
  }
  return normalized;
}

function resolveInsideRoot(repositoryRoot, relativePath) {
  const safePath = assertSafeRelativePath(relativePath);
  const absolutePath = path.resolve(repositoryRoot, ...safePath.split('/'));
  const prefix = `${repositoryRoot}${path.sep}`;
  if (!absolutePath.startsWith(prefix)) fail('PROVENANCE_PATH_ESCAPE');
  return { safePath, absolutePath };
}

function ensureTracked(repositoryRoot, relativePath) {
  runGit(
    repositoryRoot,
    ['--literal-pathspecs', 'ls-files', '--error-unmatch', '--', relativePath],
    'PROVENANCE_FILE_NOT_TRACKED',
  );
}

function measureTrackedRegularFile(repositoryRoot, relativePath) {
  const { safePath, absolutePath } = resolveInsideRoot(repositoryRoot, relativePath);
  let lstat;
  try {
    lstat = fs.lstatSync(absolutePath);
  } catch (_) {
    fail('PROVENANCE_FILE_MISSING');
  }
  if (lstat.isSymbolicLink()) fail('PROVENANCE_SYMLINK_REJECTED');
  if (!lstat.isFile()) fail('PROVENANCE_FILE_NOT_REGULAR');

  const realPath = normalizeRealPath(absolutePath, 'PROVENANCE_FILE_MISSING');
  const prefix = `${repositoryRoot}${path.sep}`;
  if (!realPath.startsWith(prefix)) fail('PROVENANCE_PATH_ESCAPE');

  ensureTracked(repositoryRoot, safePath);
  const bytes = fs.readFileSync(realPath);
  return deepFreeze({ path: safePath, sha256: sha256Bytes(bytes), size: bytes.length });
}

function validateManifest(manifest) {
  assertExactKeys(manifest, ['schemaVersion', 'groups', 'migrationsDirectory'], 'PROVENANCE_MANIFEST_UNKNOWN_FIELD');
  if (manifest.schemaVersion !== MANIFEST_SCHEMA) fail('PROVENANCE_MANIFEST_SCHEMA_INVALID');
  assertExactKeys(manifest.groups, GROUP_NAMES, 'PROVENANCE_MANIFEST_GROUP_INVALID');

  const normalizedGroups = {};
  for (const groupName of GROUP_NAMES) {
    const entries = manifest.groups[groupName];
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 4096) {
      fail('PROVENANCE_MANIFEST_GROUP_INVALID');
    }
    const seen = new Set();
    normalizedGroups[groupName] = entries.map((entry) => {
      const safePath = assertSafeRelativePath(entry, 'PROVENANCE_PATH_INVALID');
      if (seen.has(safePath)) fail('PROVENANCE_MANIFEST_DUPLICATE_PATH');
      seen.add(safePath);
      return safePath;
    });
  }

  return deepFreeze({
    schemaVersion: MANIFEST_SCHEMA,
    groups: normalizedGroups,
    migrationsDirectory: assertSafeRelativePath(manifest.migrationsDirectory, 'PROVENANCE_MIGRATIONS_PATH_INVALID'),
  });
}

function readManifest(repositoryRoot, manifestPath) {
  const measurement = measureTrackedRegularFile(repositoryRoot, manifestPath);
  const { absolutePath } = resolveInsideRoot(repositoryRoot, measurement.path);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (_) {
    fail('PROVENANCE_MANIFEST_JSON_INVALID');
  }
  return { manifest: validateManifest(parsed), measurement };
}

function hashMeasurements(measurements) {
  const ordered = [...measurements]
    .map((entry) => ({ path: entry.path, sha256: entry.sha256, size: entry.size }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return sha256Canonical(ordered);
}

function measureMigrations(repositoryRoot, migrationsDirectory) {
  const { safePath, absolutePath } = resolveInsideRoot(repositoryRoot, migrationsDirectory);
  let directoryStat;
  try {
    directoryStat = fs.lstatSync(absolutePath);
  } catch (_) {
    fail('PROVENANCE_MIGRATIONS_DIRECTORY_INVALID');
  }
  if (directoryStat.isSymbolicLink()) fail('PROVENANCE_SYMLINK_REJECTED');
  if (!directoryStat.isDirectory()) fail('PROVENANCE_MIGRATIONS_DIRECTORY_INVALID');

  const realDirectory = normalizeRealPath(absolutePath, 'PROVENANCE_MIGRATIONS_DIRECTORY_INVALID');
  if (realDirectory !== absolutePath) fail('PROVENANCE_MIGRATIONS_DIRECTORY_INVALID');

  const names = fs.readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.sql'))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (names.length < 1 || names.length > 4096) fail('PROVENANCE_MIGRATIONS_INVALID');

  return names.map((entry) => {
    if (entry.isSymbolicLink()) fail('PROVENANCE_SYMLINK_REJECTED');
    if (!entry.isFile()) fail('PROVENANCE_FILE_NOT_REGULAR');
    return measureTrackedRegularFile(repositoryRoot, `${safePath}/${entry.name}`);
  });
}

function buildReleaseProvenance(input) {
  assertExactKeys(input, ['trustedContext', 'manifestPath'], 'PROVENANCE_BUILD_UNKNOWN_FIELD');
  if (!Object.prototype.hasOwnProperty.call(input, 'trustedContext') || !Object.prototype.hasOwnProperty.call(input, 'manifestPath')) {
    fail('PROVENANCE_BUILD_REQUIRED_FIELD');
  }

  const internal = assertTrustedContext(input.trustedContext);
  const manifestPath = assertSafeRelativePath(input.manifestPath, 'PROVENANCE_MANIFEST_PATH_INVALID');
  const { manifest, measurement: manifestMeasurement } = readManifest(internal.repositoryRoot, manifestPath);

  const components = {};
  for (const groupName of GROUP_NAMES) {
    const measurements = manifest.groups[groupName].map((relativePath) => (
      measureTrackedRegularFile(internal.repositoryRoot, relativePath)
    ));
    components[groupName] = hashMeasurements(measurements);
  }

  const migrationDigests = measureMigrations(internal.repositoryRoot, manifest.migrationsDirectory)
    .map((entry) => ({ path: entry.path, sha256: entry.sha256, size: entry.size }));

  const envelope = {
    schemaVersion: PROVENANCE_SCHEMA,
    provenanceClass: PROVENANCE_CLASS,
    repository: {
      commitSha: internal.commitSha,
      treeSha: internal.treeSha,
      clean: true,
    },
    manifest: {
      path: manifestMeasurement.path,
      sha256: manifestMeasurement.sha256,
    },
    components,
    migrationDigests,
    buildArtifactAttested: false,
    deploymentAttested: false,
  };

  return deepFreeze({ ...envelope, digest: sha256Canonical(envelope) });
}

function verifyReleaseProvenanceIntegrity(provenance) {
  try {
    assertExactKeys(
      provenance,
      [
        'schemaVersion', 'provenanceClass', 'repository', 'manifest', 'components', 'migrationDigests',
        'buildArtifactAttested', 'deploymentAttested', 'digest',
      ],
      'PROVENANCE_INTEGRITY_INVALID',
    );
    if (provenance.schemaVersion !== PROVENANCE_SCHEMA || provenance.provenanceClass !== PROVENANCE_CLASS) return false;
    if (!HEX_256.test(String(provenance.digest || ''))) return false;
    if (provenance.buildArtifactAttested !== false || provenance.deploymentAttested !== false) return false;

    assertExactKeys(provenance.repository, ['commitSha', 'treeSha', 'clean'], 'PROVENANCE_INTEGRITY_INVALID');
    if (!GIT_OBJECT.test(String(provenance.repository.commitSha || ''))) return false;
    if (!GIT_OBJECT.test(String(provenance.repository.treeSha || ''))) return false;
    if (provenance.repository.clean !== true) return false;

    assertExactKeys(provenance.manifest, ['path', 'sha256'], 'PROVENANCE_INTEGRITY_INVALID');
    assertSafeRelativePath(provenance.manifest.path, 'PROVENANCE_INTEGRITY_INVALID');
    if (!HEX_256.test(String(provenance.manifest.sha256 || ''))) return false;

    assertExactKeys(provenance.components, GROUP_NAMES, 'PROVENANCE_INTEGRITY_INVALID');
    for (const groupName of GROUP_NAMES) {
      if (!HEX_256.test(String(provenance.components[groupName] || ''))) return false;
    }

    if (!Array.isArray(provenance.migrationDigests) || provenance.migrationDigests.length < 1 || provenance.migrationDigests.length > 4096) {
      return false;
    }
    const seen = new Set();
    let previousPath = null;
    for (const migration of provenance.migrationDigests) {
      assertExactKeys(migration, ['path', 'sha256', 'size'], 'PROVENANCE_INTEGRITY_INVALID');
      const migrationPath = assertSafeRelativePath(migration.path, 'PROVENANCE_INTEGRITY_INVALID');
      if (seen.has(migrationPath)) return false;
      if (previousPath !== null && previousPath.localeCompare(migrationPath) > 0) return false;
      seen.add(migrationPath);
      previousPath = migrationPath;
      if (!HEX_256.test(String(migration.sha256 || ''))) return false;
      if (!Number.isSafeInteger(migration.size) || migration.size < 0) return false;
    }

    const envelope = {
      schemaVersion: provenance.schemaVersion,
      provenanceClass: provenance.provenanceClass,
      repository: provenance.repository,
      manifest: provenance.manifest,
      components: provenance.components,
      migrationDigests: provenance.migrationDigests,
      buildArtifactAttested: provenance.buildArtifactAttested,
      deploymentAttested: provenance.deploymentAttested,
    };
    return sha256Canonical(envelope) === provenance.digest;
  } catch (_) {
    return false;
  }
}

module.exports = Object.freeze({
  PROVENANCE_SCHEMA,
  PROVENANCE_CLASS,
  createTrustedRepositoryContext,
  buildReleaseProvenance,
  verifyReleaseProvenanceIntegrity,
});
