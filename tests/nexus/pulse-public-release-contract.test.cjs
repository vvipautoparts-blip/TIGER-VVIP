'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../tools/vvip_public_release.py'), 'utf8');

test('sealed public artifact carries the complete current Pulse module graph only', () => {
  for (const file of [
    'scripts/nexus/pulse-runtime.js',
    'scripts/nexus/opportunity-radar.js',
    'scripts/nexus/pulse-surface.js',
  ]) assert.match(source, new RegExp(file.replaceAll('.', '\\.')));
  assert.doesNotMatch(source, /scripts\/nexus\/pulse-vault\.js/);
});
