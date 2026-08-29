'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const builder = fs.readFileSync('tools/vvip_public_release.py', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

const requiredPublicFiles = [
  'styles/nexus/nexus.css',
  'scripts/nexus/living-sector-object.js',
  'scripts/nexus/pulse-vault.js',
  'scripts/nexus/sector-registry.js',
  'scripts/nexus/social-runtime-guard.js',
  'scripts/nexus/bootstrap.js',
];

test('sealed public release explicitly includes every NEXUS runtime dependency', () => {
  for (const relative of requiredPublicFiles) {
    assert.match(builder, new RegExp(relative.replaceAll('/', '\\/').replaceAll('.', '\\.')),
      `${relative} must be explicitly allowlisted in the public artifact`);
  }
});

test('primary public HTML is natively NEXUS and contains no old dead social shell affordance', () => {
  assert.match(indexHtml, /styles\/nexus\/nexus\.css/);
  assert.match(indexHtml, /ماذا تعرض أو تحتاج؟/);
  assert.match(indexHtml, /data-nexus-sector/);
  assert.match(indexHtml, /data-nexus-intent/);
  assert.match(indexHtml, /data-nexus-pulse-vault/);
  assert.match(indexHtml, /data-nexus-pulse-mode="NOW"/);
  assert.match(indexHtml, /data-nexus-pulse-mode="SMART"/);
  assert.match(indexHtml, /data-nexus-pulse-mode="PRECISE"/);
  assert.doesNotMatch(indexHtml, />بماذا تفكر؟</);
  assert.doesNotMatch(indexHtml, /social-nav-item--inactive/);
});
