const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function readOptional(path) {
  return fs.existsSync(path) ? read(path) : '';
}

const repository = read('scripts/runtime/vvip-marketplace-repository.js');
const composer = read('scripts/fusion/progressive-composer.js');
const releaseBuilder = read('tools/vvip_public_release.py');
const pagesWorkflow = read('.github/workflows/pages.yml');
const convergence = readOptional('supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql');

test('browser exposes exactly one sovereign publication command', () => {
  assert.match(repository, /function requestPublication\(/);
  assert.doesNotMatch(repository, /\bsubmitForReview\b|\bcreateAndSubmit\b|\bprepareForPublication\b/);
  assert.match(composer, /\.requestPublication\(/);
  assert.doesNotMatch(composer, /\.prepareForPublication\(/);
});

test('production artifact is exact-allowlist only and has no rollback runtime', () => {
  assert.doesNotMatch(releaseBuilder, /vvip-marketplace-rollback\.js/);
  assert.doesNotMatch(releaseBuilder, /\bPUBLIC_PREFIXES\b/);
  assert.doesNotMatch(releaseBuilder, /\.rglob\(/);
  assert.equal(fs.existsSync('scripts/runtime/vvip-marketplace-rollback.js'), false);
});

test('production promotion requires sovereign runtime and proves retired runtime is absent', () => {
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(pagesWorkflow, /VVIP_POST_DEPLOY_FORBIDDEN_PRESENT/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-marketplace-rollback\.js/);
  assert.match(pagesWorkflow, /scripts\/runtime\/vvip-my-listings\.js/);
});

test('forward convergence grants one authenticated publication authority and safely retires superseded ones', () => {
  const canonicalGrant = convergence.match(/grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_request_publication\s*\([^;]+?\)\s+to\s+authenticated\s*;/gi) || [];
  assert.equal(canonicalGrant.length, 1);
  assert.match(convergence, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(convergence, /drop\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.match(convergence, /to_regprocedure\s*\(\s*['"]public\.vvip_marketplace_submit_listing\(uuid,uuid\)['"]\s*\)/i);
  assert.match(convergence, /revoke all on function public\.vvip_marketplace_submit_listing\(uuid, uuid\) from public, anon, authenticated/i);
});
