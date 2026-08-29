const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const socialRuntime = read('scripts/social/runtime-adapters.js');
const socialComposer = read('scripts/social/post-composer.js');
const releaseBuilder = read('tools/vvip_public_release.py');
const pagesWorkflow = read('.github/workflows/pages.yml');

test('browser exposes one current NEXUS Living Sector Object creation contract', () => {
  assert.match(socialRuntime, /vvip_social_post_create/);
  assert.match(socialRuntime, /p_sector_key/);
  assert.match(socialRuntime, /p_intent_class/);
  assert.match(socialComposer, /CREATE_SOCIAL_POST/);
  assert.match(socialComposer, /sectorId/);
  assert.match(socialComposer, /intent/);
  assert.equal(fs.existsSync('scripts/fusion/progressive-composer.js'), false);
  assert.equal(fs.existsSync('styles/fusion/progressive-composer.css'), false);
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
