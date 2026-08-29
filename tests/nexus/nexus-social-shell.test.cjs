'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const shellJs = fs.readFileSync(path.join(root, 'scripts/social/core-shell.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/nexus/bootstrap.js'), 'utf8');

test('home feed is the default social destination', () => {
  assert.match(shellJs, /destinationFromHash\(\) \|\| 'home'/);
});

test('social shell loads NEXUS runtime convergence', () => {
  assert.match(shellJs, /scripts\/nexus\/bootstrap\.js|\.\.\/nexus\/bootstrap\.js/);
});

test('TIGER Command binds only to the canonical current DOM with no compatibility cleanup', () => {
  assert.match(bootstrap, /function bindCommand\s*\(/);
  assert.match(bootstrap, /NEXUS_CANONICAL_DOM_REQUIRED/);
  assert.doesNotMatch(bootstrap, /social-nav-item--inactive/);
  assert.doesNotMatch(bootstrap, /querySelectorAll\([^)]*inactive/);
});
