const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const repository = read('scripts/runtime/vvip-marketplace-repository.js');
const composer = read('scripts/fusion/progressive-composer.js');
const releaseBuilder = read('tools/vvip_public_release.py');
const pagesWorkflow = read('.github/workflows/pages.yml');

test('browser exposes exactly one current review-submission command', () => {
  assert.match(repository, /function submitForReview\(/);
  assert.match(repository, /vvip_marketplace_submit_for_review/);
  assert.doesNotMatch(repository, /\brequestPublication\b|\bcreateAndSubmit\b|\bprepareForPublication\b/);
  assert.match(composer, /\.submitForReview\(/);
  assert.doesNotMatch(composer, /\.(?:requestPublication|prepareForPublication)\(/);
});

test('production artifact is exact-allowlist only and has no rollback runtime', () => {
  assert.doesNotMatch(releaseBuilder, /vvip-marketplace-rollback\.js/);
  assert.doesNotMatch(releaseBuilder, /\bPUBLIC_PREFIXES\b/);
  assert.doesNotMatch(releaseBuilder, /for\s+prefix\s+in\s+/);
  assert.equal(fs.existsSync('scripts/runtime/vvip-marketplace-rollback.js'), false);
});

test('production promotion requires sovereign runtime and proves retired runtime is absent', () => {
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(pagesWorkflow, /VVIP_POST_DEPLOY_FORBIDDEN_PRESENT/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-marketplace-rollback\.js/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-my-listings\.js/);
});
