'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const shellJs = fs.readFileSync(path.join(root, 'scripts/social/core-shell.js'), 'utf8');
const bootstrapPath = path.join(root, 'scripts/nexus/bootstrap.js');

function readBootstrap() {
  assert.equal(fs.existsSync(bootstrapPath), true, 'NEXUS bootstrap must exist');
  return fs.readFileSync(bootstrapPath, 'utf8');
}

test('home feed is the default social destination', () => {
  assert.match(shellJs, /destinationFromHash\(\) \|\| 'home'/);
});

test('social shell loads NEXUS runtime convergence', () => {
  assert.match(shellJs, /scripts\/nexus\/bootstrap\.js|\.\.\/nexus\/bootstrap\.js/);
});

test('persistent TIGER Command is normalized and dead primary video control is removed', () => {
  const source = readBootstrap();
  assert.match(source, /TIGER Command|أوامر TIGER/);
  assert.match(source, /social-nav-item--inactive/);
  assert.match(source, /remove\(\)|replaceWith\(/);
});
