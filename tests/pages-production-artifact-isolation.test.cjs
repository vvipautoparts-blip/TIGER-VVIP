'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'pages.yml');

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('production Pages artifact is built outside the checkout source tree', () => {
  const yaml = workflow();

  assert.match(yaml, /--source\s+["']?\$GITHUB_WORKSPACE["']?/);
  assert.match(yaml, /--output\s+["']?\$RUNNER_TEMP\/vvip-public["']?/);
  assert.doesNotMatch(yaml, /--output\s+["']?dist\/public["']?/);
  assert.match(yaml, /path:\s*["']?\$\{\{\s*runner\.temp\s*\}\}\/vvip-public["']?/);
});

test('production deploy performs live owner-approved same-SHA public surface verification', () => {
  const yaml = workflow();

  assert.match(yaml, /name:\s*Verify deployed production surface/);
  assert.match(yaml, /VVIP_PAGE_URL:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/);
  assert.match(yaml, /VVIP_SOURCE_SHA:\s*\$\{\{\s*inputs\.release_sha\s*\}\}/);
  assert.doesNotMatch(
    yaml,
    /VVIP_SOURCE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/,
    'live verification must remain bound to the owner-approved release_sha input',
  );
  assert.match(yaml, /runtime-config\.js/);
  assert.match(yaml, /sw-vvip-static\.js/);
  assert.match(yaml, /scripts\/vvip-safe-ux-guard\.js/);
  assert.match(yaml, /grep\s+-Fq\s+["']?\$VVIP_SOURCE_SHA["']?/);
  assert.match(yaml, /npm\/@clerk\/ui@1\/dist\/ui\.browser\.js/);
  assert.match(yaml, /npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js/);
  assert.match(yaml, /rest\/v1\/vvip_marketplace_listings\?select=listing_id&limit=1/);
  assert.match(yaml, /VVIP_RUNTIME_DEPENDENCIES=PASS/);
  assert.match(yaml, /VVIP_POST_DEPLOY_SMOKE=PASS/);
});
