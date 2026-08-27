'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SERVICE = path.join(ROOT, 'services', 'media-finalizer');
const PACKAGE = path.join(SERVICE, 'package.json');
const LOCK = path.join(SERVICE, 'package-lock.json');
const DOCKERFILE = path.join(SERVICE, 'Dockerfile');
const DOCKERIGNORE = path.join(SERVICE, '.dockerignore');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-rehearsal.yml');

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

function exactSemver(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value || ''));
}

test('media finalizer has one exact Node 24 dependency authority with a committed npm lockfile', () => {
  const pkg = JSON.parse(read(PACKAGE));
  const lock = JSON.parse(read(LOCK));

  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, '>=24 <25');
  assert.deepEqual(Object.keys(pkg.dependencies || {}).sort(), [
    '@aws-sdk/client-secrets-manager',
    'sharp'
  ]);
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    assert.equal(exactSemver(version), true, `DEPENDENCY_MUST_BE_EXACT:${name}:${version}`);
    assert.equal(lock.packages[''].dependencies[name], version, `LOCK_ROOT_DEPENDENCY_MISMATCH:${name}`);
  }
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[''].engines.node, '>=24 <25');
});

test('Docker image is hermetic: immutable Lambda Node 24 base digest plus npm ci only', () => {
  const source = read(DOCKERFILE);
  assert.match(
    source,
    /^FROM\s+public\.ecr\.aws\/lambda\/nodejs:24@sha256:[0-9a-f]{64}\s*$/m,
    'LAMBDA_NODE24_BASE_IMAGE_MUST_BE_DIGEST_PINNED'
  );
  assert.match(source, /COPY\s+package\.json\s+package-lock\.json\s+\.\//);
  assert.match(source, /npm\s+ci\s+--omit=dev\b/);
  assert.doesNotMatch(source, /npm\s+install\b/);
  assert.match(source, /COPY\s+src\s+\.\/src/);
  assert.doesNotMatch(source, /\b(?:ARG|ENV)\b[^\n]*(?:SECRET|TOKEN|PASSWORD|SERVICE_ROLE|AWS_ACCESS_KEY|AWS_SECRET)/i);
});

test('Docker context excludes repository, tests, docs, credentials, local caches, and generated evidence', () => {
  const source = read(DOCKERIGNORE);
  for (const token of [
    '.git',
    '.github',
    'tests',
    'docs',
    '.env',
    'node_modules',
    'coverage',
    'artifacts',
    '*.log'
  ]) {
    assert.ok(source.split(/\r?\n/).includes(token), `DOCKERIGNORE_MISSING:${token}`);
  }
});

test('Node 24 rehearsal is exact-head, lockfile-driven, secret-free, and inspects the built image', () => {
  const source = read(WORKFLOW);
  assert.match(source, /runs-on:\s*ubuntu-24\.04/i);
  assert.match(source, /SOURCE_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/i);
  assert.match(source, /node-version:\s*["']?24["']?/i);
  assert.match(source, /working-directory:\s*services\/media-finalizer/i);
  assert.match(source, /npm\s+ci\b/);
  assert.match(source, /node\s+--test\s+tests\/media-finalizer-/i);
  assert.match(source, /docker\s+build\b/i);
  assert.match(source, /docker\s+inspect\b/i);
  assert.match(source, /docker\s+history\b/i);
  assert.match(source, /git\s+rev-parse\s+HEAD/i);
  assert.match(source, /git\s+status\s+--porcelain/i);
  assert.doesNotMatch(source, /aws-access-key-id|aws-secret-access-key|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i);
});
