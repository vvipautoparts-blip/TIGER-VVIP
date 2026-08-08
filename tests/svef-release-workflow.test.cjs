'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'svef-release-candidate.yml');
const CHECKOUT_V7_SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const SETUP_NODE_V6_SHA = '249970729cb0ef3589644e2896645e5dc5ba9c38';
const SETUP_PYTHON_V6_SHA = 'ece7cb06caefa5fff74198d8649806c4678c61a1';
const ATTEST_V3_SHA = 'daf44fb950173508f38bd2406030372c1d1162b1';
const UPLOAD_ARTIFACT_V4_SHA = 'ea165f8d65b6e75b540449e92b4886f43607fa02';

function workflow() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('SVEF release candidate has exact-source read/attest permissions and immutable actions', () => {
  const text = workflow();
  assert.match(text, /pull_request:[\s\S]*branches:[\s\S]*- main/);
  assert.match(text, /workflow_dispatch:[\s\S]*source_sha:/);
  assert.match(text, /permissions:\s*\n\s*contents:\s*read\s*\n\s*id-token:\s*write\s*\n\s*attestations:\s*write/);
  assert.match(text, new RegExp(`actions\\/checkout@${CHECKOUT_V7_SHA}`));
  assert.match(text, new RegExp(`actions\\/setup-node@${SETUP_NODE_V6_SHA}`));
  assert.match(text, new RegExp(`actions\\/setup-python@${SETUP_PYTHON_V6_SHA}`));
  assert.match(text, new RegExp(`actions\\/attest@${ATTEST_V3_SHA}`));
  assert.doesNotMatch(text, /actions\/attest-build-provenance@/);
  assert.match(text, new RegExp(`actions\\/upload-artifact@${UPLOAD_ARTIFACT_V4_SHA}`));
});

test('workflow checks out and verifies the exact requested or PR-head source SHA', () => {
  const text = workflow();
  assert.match(text, /SOURCE_SHA:\s*\$\{\{[\s\S]*github\.event\.pull_request\.head\.sha[\s\S]*inputs\.source_sha[\s\S]*\}\}/);
  assert.match(text, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(text, /git rev-parse HEAD/);
  assert.match(text, /git rev-parse HEAD\^\{tree\}/);
  assert.match(text, /test\s+"\$actual_sha"\s*=\s*"\$SOURCE_SHA"/);
});

test('workflow builds the V14 candidate exactly once outside the repository', () => {
  const text = workflow();
  const builds = text.match(/^\s*python\s+tools\/vvip_public_release\.py\b/gm) || [];
  assert.equal(builds.length, 1, 'release workflow must have one and only one candidate build command');
  assert.match(text, /--output\s+"\$RUNNER_TEMP\/vvip-candidate"/);
  assert.match(text, /--source-sha\s+"\$SOURCE_SHA"/);
  assert.match(text, /--mode\s+candidate/);
  assert.doesNotMatch(text, /dist\/public|dist\/candidate/);
});

test('workflow creates SBOM materials and deterministic release bundle before attestation', () => {
  const text = workflow();
  assert.match(text, /sbom\.cdx\.json/);
  assert.match(text, /materials\.json/);
  assert.match(text, /release-bundle-manifest\.json/);
  assert.match(text, /release-bundle\.cjs/);
  assert.match(text, /tar\s+--sort=name/);
  assert.match(text, /--mtime=['"]UTC 1970-01-01['"]/);
  assert.match(text, /--owner=0/);
  assert.match(text, /--group=0/);
  assert.match(text, /--numeric-owner/);
  assert.match(text, /gzip\s+-n/);
  assert.match(text, /sha256sum[\s\S]*svef-release-bundle-/);
});

test('custom SLSA predicate binds provenance to exact source SHA/tree instead of PR merge SHA', () => {
  const text = workflow();
  assert.match(text, /provenance-predicate\.json/);
  assert.match(text, /predicateType|predicate-type:\s*https:\/\/slsa\.dev\/provenance\/v1/);
  assert.match(text, /resolvedDependencies/);
  assert.match(text, /gitCommit:\s*process\.env\.SOURCE_SHA/);
  assert.match(text, /source_sha:\s*process\.env\.SOURCE_SHA/);
  assert.match(text, /source_tree:\s*process\.env\.SOURCE_TREE/);
  assert.doesNotMatch(text, /resolvedDependencies[\s\S]{0,500}github\.sha/);
});

test('OIDC attestation signs the exact deterministic bundle and is retained with provenance evidence', () => {
  const text = workflow();
  assert.match(text, /id:\s*attest/);
  assert.match(text, /subject-path:\s*\$\{\{\s*runner\.temp\s*\}\}[\s\S]*svef-release-bundle-/);
  assert.match(text, /predicate-path:\s*\$\{\{\s*runner\.temp\s*\}\}\/svef-release-metadata\/provenance-predicate\.json/);
  assert.match(text, /steps\.attest\.outputs\.bundle-path/);
  assert.match(text, /attestation-bundle\.jsonl/);
  assert.match(text, /attestation-bundle\.sha256/);
  assert.match(text, /provenance-predicate\.sha256/);
  assert.match(text, /name:\s*svef-release-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(text, /if-no-files-found:\s*error/);
});

test('release workflow is non-production and contains no uncontrolled upgrades or deployment authority', () => {
  const text = workflow();
  assert.doesNotMatch(text, /pip\s+install\s+--upgrade|python\s+-m\s+pip\s+install\s+--upgrade/i);
  assert.doesNotMatch(text, /environment:\s*(?:production|production-build|github-pages)/i);
  assert.doesNotMatch(text, /PRODUCTION_DB_PASSWORD|PRODUCTION_SERVICE_ROLE|SUPABASE_DB_PASSWORD|L4_ENABLED/);
  assert.doesNotMatch(text, /deploy-pages|upload-pages-artifact|supabase\s+db\s+push|supabase\s+functions\s+deploy/i);
});
