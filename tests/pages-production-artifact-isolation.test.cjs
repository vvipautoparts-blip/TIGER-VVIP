'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'pages.yml');

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('production Pages upload consumes only verified previously-built bytes outside checkout', () => {
  const yaml = workflow();

  assert.match(yaml, /\$RUNNER_TEMP\/vvip-promotion\/artifact\.zip/);
  assert.match(yaml, /--extract-root\s+"\$RUNNER_TEMP\/vvip-promotion-outer"/);
  assert.match(yaml, /--output-public\s+"\$RUNNER_TEMP\/vvip-verified-public"/);
  assert.match(yaml, /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/vvip-verified-public/);
  assert.doesNotMatch(yaml, /tools\/vvip_public_release\.py/);
  assert.doesNotMatch(yaml, /(?:unzip|tar)[^\n]*\$GITHUB_WORKSPACE/);

  const outerIndex = yaml.indexOf('verify-production-artifact.py outer');
  const provenanceIndex = yaml.indexOf('gh attestation verify');
  const innerIndex = yaml.indexOf('verify-production-artifact.py inner');
  const pagesIndex = yaml.indexOf('actions/upload-pages-artifact@');
  assert.ok(outerIndex >= 0, 'outer digest/checksum verification must exist');
  assert.ok(provenanceIndex > outerIndex, 'attestation must be verified only after outer envelope validation');
  assert.ok(innerIndex > provenanceIndex, 'inner archive must not be trusted/extracted before attestation verification');
  assert.ok(pagesIndex > innerIndex, 'Pages packaging must consume only fully verified public bytes');
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
