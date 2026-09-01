'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

function bashArray(name) {
  const match = workflow.match(new RegExp(`${name}=\\(\\n([\\s\\S]*?)\\n\\s*\\)`));
  assert.ok(match, `${name} must exist in the Production promotion workflow`);
  return match[1]
    .split('\n')
    .map((line) => line.trim().replace(/^['\"]|['\"]$/g, ''))
    .filter(Boolean);
}

test('Production post-deploy smoke requires the current NEXUS public runtime graph, never retired parallel-product paths', () => {
  const required = bashArray('paths');
  const currentNexusPaths = [
    'styles/nexus/nexus.css',
    'scripts/nexus/living-sector-object.js',
    'scripts/nexus/sector-discovery.js',
    'scripts/nexus/pulse-runtime.js',
    'scripts/nexus/opportunity-radar.js',
    'scripts/nexus/pulse-surface.js',
    'scripts/nexus/social-runtime-guard.js',
    'scripts/nexus/bootstrap.js',
  ];
  const retiredRequiredPaths = [
    'scripts/runtime/vvip-marketplace-repository.js',
    'scripts/fusion/marketplace-context.js',
    'scripts/fusion/progressive-composer.js',
    'styles/fusion/progressive-composer.css',
  ];

  for (const relative of currentNexusPaths) {
    assert.equal(fs.existsSync(relative), true, `${relative} must exist on the exact NEXUS head`);
    assert.ok(required.includes(relative), `${relative} must be verified after Production deploy`);
  }
  for (const relative of retiredRequiredPaths) {
    assert.equal(fs.existsSync(relative), false, `${relative} must stay physically absent from the NEXUS tree`);
    assert.equal(required.includes(relative), false, `${relative} must never be a required Production artifact`);
  }
});

test('Production runtime probe is product-neutral and does not depend on a retired Marketplace table', () => {
  assert.doesNotMatch(workflow, /vvip_marketplace_listings/);
  assert.match(workflow, /supabase_url\s*\+\s*['\"]\/rest\/v1\/['\"]/);
});

test('Production promotion uses the current immutable checkout and setup-python pins', () => {
  assert.match(workflow, /actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);
  assert.match(workflow, /actions\/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1/);
  assert.doesNotMatch(workflow, /actions\/checkout@de0fac2e4500dabe0009e67214ff5f544a08e6b0/);
  assert.doesNotMatch(workflow, /actions\/setup-python@a079284f6907d469567d7000a6d0159d034d90b0/);
});
