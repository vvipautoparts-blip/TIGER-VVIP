'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const BUILDER_PATH = path.join(ROOT, '.github', 'workflows', 'production-release-artifact.yml');
const PAGES_PATH = path.join(ROOT, '.github', 'workflows', 'pages.yml');
const IMMUTABLE_ACTION = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;

function readRequired(file, label) {
  assert.equal(fs.existsSync(file), true, `${label} must exist`);
  return fs.readFileSync(file, 'utf8');
}

function externalActions(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1] || null)
    .filter(Boolean)
    .filter((value) => !value.startsWith('./'));
}

function assertImmutableActions(text, label) {
  const mutable = externalActions(text).filter((action) => !IMMUTABLE_ACTION.test(action));
  assert.deepEqual(mutable, [], `${label} mutable actions: ${mutable.join(', ')}`);
}

test('Production Release Artifact Builder is manual-only, exact-main bound, and build-once', () => {
  const builder = readRequired(BUILDER_PATH, 'Production Release Artifact Builder workflow');

  assert.match(builder, /workflow_dispatch:/);
  assert.match(builder, /release_sha:/);
  assert.doesNotMatch(builder, /\n\s{2}push\s*:/, 'builder must not build automatically from push');
  assert.match(builder, /git\s+rev-parse\s+origin\/main/);
  assert.match(builder, /RELEASE_SHA_MISMATCH/);
  assert.match(builder, /--mode\s+production/);
  assert.match(builder, /--output\s+["']?\$RUNNER_TEMP\/vvip-production-public["']?/);
  assert.equal(
    (builder.match(/^\s*python\s+tools\/vvip_public_release\.py\b/gm) || []).length,
    1,
    'Production public bytes must be built exactly once',
  );
  assert.match(builder, /git\s+fetch[\s\S]*origin\s+main[\s\S]*SEAL_MAIN_SHA_MISMATCH/);
  assert.doesNotMatch(builder, /deploy-pages|upload-pages-artifact/i);
  assert.doesNotMatch(builder, /pages:\s*write/);
  assertImmutableActions(builder, 'builder');
});

test('builder seals deterministic inner bundle, SBOM, materials, digest, and attestation', () => {
  const builder = readRequired(BUILDER_PATH, 'Production Release Artifact Builder workflow');

  assert.match(builder, /createProductionReleaseBundleManifest/);
  assert.match(builder, /sbom\.cdx\.json/);
  assert.match(builder, /materials\.json/);
  assert.match(builder, /source\.json/);
  assert.match(builder, /release-bundle-manifest\.json/);
  assert.match(builder, /tar\s+--sort=name/);
  assert.match(builder, /--mtime=['"]UTC 1970-01-01['"]/);
  assert.match(builder, /--numeric-owner/);
  assert.match(builder, /gzip\s+-n/);
  assert.match(builder, /sha256sum/);
  assert.match(builder, /actions\/attest@[0-9a-f]{40}/);
  assert.match(builder, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(builder, /vvip-production-release-/);
});

test('Production promotion consumes artifact identity and contains zero application rebuilds', () => {
  const pages = readRequired(PAGES_PATH, 'Production promotion workflow');

  assert.match(pages, /workflow_dispatch:/);
  assert.match(pages, /release_sha:/);
  assert.match(pages, /artifact_id:/);
  assert.doesNotMatch(pages, /\n\s{2}push\s*:/);
  assert.match(pages, /actions:\s*read/);
  assert.doesNotMatch(pages, /tools\/vvip_public_release\.py/);
  assert.doesNotMatch(pages, /(?:npm|pnpm|yarn)\s+(?:run\s+)?build\b/i);
  assert.doesNotMatch(pages, /--mode\s+(?:candidate|production)/);
  assertImmutableActions(pages, 'promotion');
});

test('Production promotion independently proves GitHub artifact, run, SHA, digest, and attestation', () => {
  const pages = readRequired(PAGES_PATH, 'Production promotion workflow');

  assert.match(pages, /actions\/artifacts\/\$\{\{\s*inputs\.artifact_id\s*\}\}/);
  assert.match(pages, /workflow_run/);
  assert.match(pages, /head_sha/);
  assert.match(pages, /head_repository_id/);
  assert.match(pages, /expired/);
  assert.match(pages, /digest/);
  assert.match(pages, /workflow_dispatch/);
  assert.match(pages, /production-release-artifact\.yml/);
  assert.match(pages, /conclusion/);
  assert.match(pages, /success/);
  assert.match(pages, /gh\s+attestation\s+verify/);
  assert.match(pages, /verify-production-artifact\.py/);
});

test('Production promotion requires safe two-layer extraction before Pages upload', () => {
  const pages = readRequired(PAGES_PATH, 'Production promotion workflow');

  assert.match(pages, /artifact\.zip/);
  assert.match(pages, /vvip-production-release-/);
  assert.match(pages, /\.tar\.gz/);
  assert.match(pages, /verify-production-artifact\.py/);
  assert.match(pages, /upload-pages-artifact@[0-9a-f]{40}/);
  assert.doesNotMatch(pages, /unzip[^\n]*\$GITHUB_WORKSPACE|tar[^\n]*\$GITHUB_WORKSPACE/);
});

test('only final deploy job owns Pages and OIDC write authority', () => {
  const pages = readRequired(PAGES_PATH, 'Production promotion workflow');
  const jobsIndex = pages.indexOf('\njobs:');
  assert.ok(jobsIndex > 0);
  const header = pages.slice(0, jobsIndex);

  assert.match(header, /permissions:\s*\n\s{2}contents:\s*read[\s\S]*actions:\s*read/);
  assert.doesNotMatch(header, /pages:\s*write/);
  assert.doesNotMatch(header, /id-token:\s*write/);

  const deployIndex = pages.indexOf('\n  deploy:');
  assert.ok(deployIndex > 0, 'deploy job must exist');
  const preDeploy = pages.slice(jobsIndex, deployIndex);
  const deploy = pages.slice(deployIndex);

  assert.doesNotMatch(preDeploy, /pages:\s*write/);
  assert.doesNotMatch(preDeploy, /id-token:\s*write/);
  assert.match(deploy, /pages:\s*write/);
  assert.match(deploy, /id-token:\s*write/);
});
