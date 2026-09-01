'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const builder = fs.readFileSync('tools/vvip_public_release.py', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

const requiredPublicFiles = [
  'styles/nexus/nexus.css',
  'scripts/nexus/living-sector-object.js',
  'scripts/nexus/sector-discovery.js',
  'scripts/nexus/pulse-runtime.js',
  'scripts/nexus/opportunity-radar.js',
  'scripts/nexus/pulse-surface.js',
  'scripts/nexus/social-runtime-guard.js',
  'scripts/nexus/bootstrap.js',
];

test('sealed public release explicitly includes every real NEXUS runtime dependency', () => {
  for (const relative of requiredPublicFiles) {
    assert.equal(fs.existsSync(relative), true, `${relative} must exist in the current tree`);
    assert.match(builder, new RegExp(relative.replaceAll('/', '\\/').replaceAll('.', '\\.')),
      `${relative} must be explicitly allowlisted in the public artifact`);
  }
  assert.equal(fs.existsSync('scripts/nexus/pulse-vault.js'), false,
    'superseded client-only pulse-vault.js must not be resurrected');
  assert.doesNotMatch(builder, /scripts\/nexus\/pulse-vault\.js/);
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
